// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component, EventEmitter, Input, Output, Type } from '@angular/core';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import {
  Group,
  GroupService,
  ScoringModelMembership,
  ScoringModelMembershipsService,
  ScoringModelPermission,
  ScoringModelRole,
  ScoringModelRolesService,
  SystemPermission,
  User,
  UserService,
} from '../../../../generated/cite.api';
import { ScoringModelStore } from '../../../../data/scoring-model/scoring-model.store';
import { ApiStub } from '../../../../test-utils/api-stub';
import {
  PermissionGrants,
  permissionDataProviders,
} from '../../../../test-utils/mock-permission-data.service';
import { renderComponent } from '../../../../test-utils/render-component';
import { AdminScoringModelMembershipsComponent } from './admin-scoring-model-memberships.component';

@Component({
  selector: 'app-admin-scoring-model-membership-list',
  template: '',
})
class NonMemberListStubComponent {
  @Input() users!: User[];
  @Input() groups!: Group[];
  @Input() canEdit!: boolean;
  @Output() createMembership = new EventEmitter<ScoringModelMembership>();
}

@Component({ selector: 'app-admin-scoring-model-member-list', template: '' })
class MemberListStubComponent {
  @Input() memberships!: ScoringModelMembership[];
  @Input() users!: User[];
  @Input() groups!: Group[];
  @Input() roles!: ScoringModelRole[];
  @Input() canEdit!: boolean;
  @Output() deleteMembership = new EventEmitter<string>();
  @Output() editMembership = new EventEmitter<ScoringModelMembership>();
}

const onModel = (
  scoringModelId: string,
  ...permissions: ScoringModelPermission[]
): PermissionGrants => ({ scoringModel: [{ scoringModelId, permissions }] });

async function renderMemberships(
  grants: PermissionGrants = {},
  { modelLoaded = true } = {},
) {
  const membershipApi = {
    getAllScoringModelMemberships: vi.fn(() =>
      of([{ id: 'smm1', scoringModelId: 'sm1', userId: 'u1', roleId: 'r1' }]),
    ),
    createScoringModelMembership: vi.fn(
      (scoringModelId: string, m?: ScoringModelMembership) =>
        of({ ...m, scoringModelId, id: 'smm-new' }),
    ),
    deleteScoringModelMembership: vi.fn(() => of(null)),
  } satisfies ApiStub<ScoringModelMembershipsService>;
  const userApi = {
    getUsers: vi.fn(() =>
      of([
        { id: 'u1', name: 'Alice' },
        { id: 'u2', name: 'Bob' },
      ]),
    ),
  } satisfies ApiStub<UserService>;
  const rolesApi = {
    getAllScoringModelRoles: vi.fn(() => of([{ id: 'r1', name: 'Editor' }])),
  } satisfies ApiStub<ScoringModelRolesService>;
  const groupApi = {
    getAllGroups: vi.fn(() => of([{ id: 'g1', name: 'Analysts' }])),
  } satisfies ApiStub<GroupService>;

  const rendered = await renderComponent(
    AdminScoringModelMembershipsComponent,
    {
      declarations: [AdminScoringModelMembershipsComponent],
      imports: [NonMemberListStubComponent, MemberListStubComponent],
      componentInputs: { scoringModelId: 'sm1' },
      providers: [
        ...permissionDataProviders(grants),
        { provide: ScoringModelMembershipsService, useValue: membershipApi },
        { provide: UserService, useValue: userApi },
        { provide: ScoringModelRolesService, useValue: rolesApi },
        { provide: GroupService, useValue: groupApi },
      ],
      configureTestBed: (testBed) => {
        if (modelLoaded) {
          testBed
            .inject(ScoringModelStore)
            .set([{ id: 'sm1', description: 'NCISS' }]);
        }
      },
    },
  );
  const child = <T>(type: Type<T>): T | undefined =>
    rendered.fixture.debugElement.query(By.directive(type))
      ?.componentInstance as T | undefined;
  const refresh = async () => {
    rendered.fixture.detectChanges();
    await rendered.fixture.whenStable();
  };
  await refresh();
  return {
    ...rendered,
    membershipApi,
    nonMembers: () => child(NonMemberListStubComponent),
    members: () => child(MemberListStubComponent),
    refresh,
  };
}

const names = (items: { name?: string | null }[] = []) =>
  items.map((i) => i.name);

describe('AdminScoringModelMembershipsComponent', () => {
  /**
   * Verifies: users and groups are split into members and non-members of the scoring model.
   * Interacts with: real ScoringModelMembershipDataService, UserDataService/UserQuery, GroupDataService, ScoringModelRoleDataService.
   * Data: Alice is a member; Bob and Analysts are not.
   */
  it('splits users and groups into members and non-members', async () => {
    const { members, nonMembers, membershipApi } = await renderMemberships();

    expect(membershipApi.getAllScoringModelMemberships).toHaveBeenCalledWith(
      'sm1',
    );
    expect(names(members()?.users)).toEqual(['Alice']);
    expect(names(members()?.roles)).toEqual(['Editor']);
    expect(names(nonMembers()?.users)).toEqual(['Bob']);
    expect(names(nonMembers()?.groups)).toEqual(['Analysts']);
  });

  /**
   * Verifies: nothing renders until the scoring model is in the store.
   * Interacts with: ScoringModelQuery.selectEntity.
   * Data: an empty scoring model store.
   */
  it('renders no lists before the scoring model is loaded', async () => {
    const { members, nonMembers } = await renderMemberships(
      onModel('sm1', ScoringModelPermission.ManageScoringModel),
      { modelLoaded: false },
    );

    expect(members()).toBeUndefined();
    expect(nonMembers()).toBeUndefined();
  });

  /**
   * Verifies: adding a non-member creates the membership for this scoring model.
   * Interacts with: NonMemberList stub createMembership output, ScoringModelMembershipsService.createScoringModelMembership stub.
   * Data: Bob added.
   */
  it('adds a member through the non-member list', async () => {
    const { members, nonMembers, membershipApi, refresh } =
      await renderMemberships();
    nonMembers()?.createMembership.emit({ userId: 'u2' });
    await refresh();

    expect(membershipApi.createScoringModelMembership).toHaveBeenCalledWith(
      'sm1',
      expect.objectContaining({ userId: 'u2' }),
    );
    expect(names(members()?.users)).toEqual(['Alice', 'Bob']);
  });

  /**
   * Verifies: removing a member deletes the membership through the API.
   * Interacts with: MemberList stub deleteMembership output, ScoringModelMembershipsService.deleteScoringModelMembership stub.
   * Data: smm1 deleted.
   */
  it('removes a member through the member list', async () => {
    const { members, membershipApi, refresh } = await renderMemberships();
    members()?.deleteMembership.emit('smm1');
    await refresh();

    expect(membershipApi.deleteScoringModelMembership).toHaveBeenCalledWith(
      'smm1',
    );
    expect(names(members()?.users)).toEqual([]);
  });

  describe('canManage$ gate', () => {
    /**
     * Verifies: ManageScoringModel on the scoring model enables both lists.
     * Interacts with: real PermissionDataService, both list stubs' canEdit input.
     * Data: scoring model claim ManageScoringModel on sm1.
     */
    it('allows editing with ManageScoringModel on the model', async () => {
      const { members, nonMembers } = await renderMemberships(
        onModel('sm1', ScoringModelPermission.ManageScoringModel),
      );

      expect(nonMembers()?.canEdit).toBe(true);
      expect(members()?.canEdit).toBe(true);
    });

    /**
     * Verifies: EditScoringModel on the model also enables both lists once the model emits (current behavior).
     * Interacts with: real PermissionDataService.canEditScoringModel via the scoringModel$ tap, both list stubs.
     * Data: scoring model claim EditScoringModel on sm1.
     */
    it('allows editing with EditScoringModel on the model', async () => {
      const { members, nonMembers } = await renderMemberships(
        onModel('sm1', ScoringModelPermission.EditScoringModel),
      );

      // Current behavior; see agent-docs/ui-test-bugs/cite.ui.md.
      expect(nonMembers()?.canEdit).toBe(true);
      expect(members()?.canEdit).toBe(true);
    });

    /**
     * Verifies: View rights on the model, system ViewScoringModels, or Manage on another model (near misses) leave both lists read-only.
     * Interacts with: real PermissionDataService, both list stubs' canEdit input.
     * Data: system [ViewScoringModels], ViewScoringModel on sm1, ManageScoringModel on sm2.
     */
    it('denies editing without an edit grant on the model', async () => {
      const { members, nonMembers } = await renderMemberships({
        system: [SystemPermission.ViewScoringModels],
        scoringModel: [
          {
            scoringModelId: 'sm1',
            permissions: [ScoringModelPermission.ViewScoringModel],
          },
          {
            scoringModelId: 'sm2',
            permissions: [ScoringModelPermission.ManageScoringModel],
          },
        ],
      });

      expect(nonMembers()?.canEdit).toBe(false);
      expect(members()?.canEdit).toBe(false);
    });
  });
});
