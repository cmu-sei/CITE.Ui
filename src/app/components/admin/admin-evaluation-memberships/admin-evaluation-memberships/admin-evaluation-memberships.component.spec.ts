// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component, EventEmitter, Input, Output, Type } from '@angular/core';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import {
  EvaluationMembership,
  EvaluationMembershipsService,
  EvaluationPermission,
  EvaluationRole,
  EvaluationRolesService,
  Group,
  GroupService,
  SystemPermission,
  User,
  UserService,
} from '../../../../generated/cite.api';
import { ApiStub } from '../../../../test-utils/api-stub';
import {
  PermissionGrants,
  permissionDataProviders,
} from '../../../../test-utils/mock-permission-data.service';
import { renderComponent } from '../../../../test-utils/render-component';
import { AdminEvaluationMembershipsComponent } from './admin-evaluation-memberships.component';

@Component({ selector: 'app-admin-evaluation-membership-list', template: '' })
class NonMemberListStubComponent {
  @Input() users!: User[];
  @Input() groups!: Group[];
  @Input() canEdit!: boolean;
  @Output() createMembership = new EventEmitter<EvaluationMembership>();
}

@Component({ selector: 'app-admin-evaluation-member-list', template: '' })
class MemberListStubComponent {
  @Input() memberships!: EvaluationMembership[];
  @Input() users!: User[];
  @Input() groups!: Group[];
  @Input() roles!: EvaluationRole[];
  @Input() canEdit!: boolean;
  @Output() deleteMembership = new EventEmitter<string>();
  @Output() editMembership = new EventEmitter<EvaluationMembership>();
}

const onEvaluation = (
  evaluationId: string,
  ...permissions: EvaluationPermission[]
): PermissionGrants => ({ evaluation: [{ evaluationId, permissions }] });

async function renderMemberships(grants: PermissionGrants = {}) {
  const membershipApi = {
    getAllEvaluationMemberships: vi.fn(() =>
      of([
        { id: 'em1', evaluationId: 'e1', userId: 'u1', roleId: 'r1' },
        { id: 'em2', evaluationId: 'e1', groupId: 'g1', roleId: 'r1' },
      ]),
    ),
    createEvaluationMembership: vi.fn(
      (evaluationId: string, m?: EvaluationMembership) =>
        of({ ...m, evaluationId, id: 'em-new' }),
    ),
    updateEvaluationMembership: vi.fn((id: string, m?: EvaluationMembership) =>
      of({ ...m, id }),
    ),
    deleteEvaluationMembership: vi.fn(() => of(null)),
  } satisfies ApiStub<EvaluationMembershipsService>;
  const userApi = {
    getUsers: vi.fn(() =>
      of([
        { id: 'u1', name: 'Alice' },
        { id: 'u2', name: 'Bob' },
      ]),
    ),
  } satisfies ApiStub<UserService>;
  const rolesApi = {
    getAllEvaluationRoles: vi.fn(() => of([{ id: 'r1', name: 'Member' }])),
  } satisfies ApiStub<EvaluationRolesService>;
  const groupApi = {
    getAllGroups: vi.fn(() =>
      of([
        { id: 'g1', name: 'Analysts' },
        { id: 'g2', name: 'Responders' },
      ]),
    ),
  } satisfies ApiStub<GroupService>;

  const rendered = await renderComponent(AdminEvaluationMembershipsComponent, {
    declarations: [AdminEvaluationMembershipsComponent],
    imports: [NonMemberListStubComponent, MemberListStubComponent],
    componentInputs: { evaluationId: 'e1' },
    providers: [
      ...permissionDataProviders(grants),
      { provide: EvaluationMembershipsService, useValue: membershipApi },
      { provide: UserService, useValue: userApi },
      { provide: EvaluationRolesService, useValue: rolesApi },
      { provide: GroupService, useValue: groupApi },
    ],
  });
  const child = <T>(type: Type<T>): T =>
    rendered.fixture.debugElement.query(By.directive(type))
      .componentInstance as T;
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

const names = (items: { name?: string | null }[]) => items.map((i) => i.name);

describe('AdminEvaluationMembershipsComponent', () => {
  /**
   * Verifies: users and groups are split into members and non-members of the evaluation.
   * Interacts with: real EvaluationMembershipDataService, UserDataService/UserQuery, GroupDataService, EvaluationRoleDataService over stubbed endpoints.
   * Data: Alice and Analysts are members; Bob and Responders are not.
   */
  it('splits users and groups into members and non-members', async () => {
    const { members, nonMembers, membershipApi } = await renderMemberships();

    expect(membershipApi.getAllEvaluationMemberships).toHaveBeenCalledWith(
      'e1',
    );
    expect(names(members().users)).toEqual(['Alice']);
    expect(names(members().groups)).toEqual(['Analysts']);
    expect(names(members().roles)).toEqual(['Member']);
    expect(names(nonMembers().users)).toEqual(['Bob']);
    expect(names(nonMembers().groups)).toEqual(['Responders']);
  });

  /**
   * Verifies: adding a non-member creates the membership for this evaluation and moves it to the member list.
   * Interacts with: NonMemberList stub createMembership output, EvaluationMembershipsService.createEvaluationMembership stub.
   * Data: group Responders added.
   */
  it('adds a member through the non-member list', async () => {
    const { members, nonMembers, membershipApi, refresh } =
      await renderMemberships();
    nonMembers().createMembership.emit({ groupId: 'g2' });
    await refresh();

    expect(membershipApi.createEvaluationMembership).toHaveBeenCalledWith(
      'e1',
      {
        groupId: 'g2',
        evaluationId: 'e1',
      },
    );
    expect(names(members().groups)).toEqual(['Analysts', 'Responders']);
    expect(names(nonMembers().groups)).toEqual([]);
  });

  /**
   * Verifies: removing a member deletes the membership and returns the user to the non-member list.
   * Interacts with: MemberList stub deleteMembership output, EvaluationMembershipsService.deleteEvaluationMembership stub.
   * Data: Alice's membership em1 deleted.
   */
  it('removes a member through the member list', async () => {
    const { members, nonMembers, membershipApi, refresh } =
      await renderMemberships();
    members().deleteMembership.emit('em1');
    await refresh();

    expect(membershipApi.deleteEvaluationMembership).toHaveBeenCalledWith(
      'em1',
    );
    expect(names(nonMembers().users)).toEqual(['Alice', 'Bob']);
  });

  /**
   * Verifies: a role change from the member list is sent to the API.
   * Interacts with: MemberList stub editMembership output, EvaluationMembershipsService.updateEvaluationMembership stub.
   * Data: em1 given role r2.
   */
  it('edits a membership through the member list', async () => {
    const { members, membershipApi, refresh } = await renderMemberships();
    members().editMembership.emit({ id: 'em1', roleId: 'r2' });
    await refresh();

    expect(membershipApi.updateEvaluationMembership).toHaveBeenCalledWith(
      'em1',
      { id: 'em1', roleId: 'r2' },
    );
  });

  describe('canEdit gate', () => {
    /**
     * Verifies: ManageEvaluation on the evaluation enables both lists.
     * Interacts with: real PermissionDataService.canEditEvaluation, both list stubs' canEdit input.
     * Data: evaluation claim ManageEvaluation on e1.
     */
    it('allows editing with ManageEvaluation on the evaluation', async () => {
      const { members, nonMembers } = await renderMemberships(
        onEvaluation('e1', EvaluationPermission.ManageEvaluation),
      );

      expect(nonMembers().canEdit).toBe(true);
      expect(members().canEdit).toBe(true);
    });

    /**
     * Verifies: EditEvaluation on the evaluation also enables both lists (current behavior).
     * Interacts with: real PermissionDataService.canEditEvaluation, both list stubs' canEdit input.
     * Data: evaluation claim EditEvaluation on e1.
     */
    it('allows editing with EditEvaluation on the evaluation', async () => {
      const { members, nonMembers } = await renderMemberships(
        onEvaluation('e1', EvaluationPermission.EditEvaluation),
      );

      // Current behavior; see agent-docs/ui-test-bugs/cite.ui.md.
      expect(nonMembers().canEdit).toBe(true);
      expect(members().canEdit).toBe(true);
    });

    /**
     * Verifies: View-level rights, or Manage on another evaluation (near misses), leave both lists read-only.
     * Interacts with: real PermissionDataService.canEditEvaluation, both list stubs' canEdit input.
     * Data: system [ViewEvaluations], ViewEvaluation on e1, ManageEvaluation on e2.
     */
    it('denies editing without an edit grant on the evaluation', async () => {
      const { members, nonMembers } = await renderMemberships({
        system: [SystemPermission.ViewEvaluations],
        evaluation: [
          {
            evaluationId: 'e1',
            permissions: [EvaluationPermission.ViewEvaluation],
          },
          {
            evaluationId: 'e2',
            permissions: [EvaluationPermission.ManageEvaluation],
          },
        ],
      });

      expect(nonMembers().canEdit).toBe(false);
      expect(members().canEdit).toBe(false);
    });
  });
});
