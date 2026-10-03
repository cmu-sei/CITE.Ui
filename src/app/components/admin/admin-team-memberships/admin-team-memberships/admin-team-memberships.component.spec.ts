// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component, EventEmitter, Input, Output, Type } from '@angular/core';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import {
  EvaluationPermission,
  SystemPermission,
  TeamMembership,
  TeamMembershipsService,
  TeamPermission,
  TeamRole,
  TeamRolesService,
  User,
  UserService,
} from '../../../../generated/cite.api';
import { AdminTeamMembershipsComponent } from './admin-team-memberships.component';
import { TeamMembershipDataService } from '../../../../data/team/team-membership-data.service';
import { TeamRoleDataService } from '../../../../data/team/team-role-data.service';
import { UserDataService } from '../../../../data/user/user-data.service';
import { ApiStub } from '../../../../test-utils/api-stub';
import {
  PermissionGrants,
  permissionDataProviders,
} from '../../../../test-utils/mock-permission-data.service';
import { renderComponent } from '../../../../test-utils/render-component';

@Component({ selector: 'app-admin-team-membership-list', template: '' })
class NonMemberListStubComponent {
  @Input() users!: User[];
  @Input() canEdit!: boolean;
  @Output() createMembership = new EventEmitter<TeamMembership>();
}

@Component({ selector: 'app-admin-team-member-list', template: '' })
class MemberListStubComponent {
  @Input() memberships!: TeamMembership[];
  @Input() users!: User[];
  @Input() roles!: TeamRole[];
  @Input() canEdit!: boolean;
  @Output() deleteMembership = new EventEmitter<string>();
  @Output() editMembership = new EventEmitter<TeamMembership>();
}

type MembershipApi = ApiStub<TeamMembershipsService>;

async function renderMemberships(claims: PermissionGrants = {}) {
  const membershipApi = {
    getAllTeamMemberships: vi.fn(() =>
      of([{ id: 'tm1', teamId: 't1', userId: 'u1', roleId: 'member' }]),
    ),
    createTeamMembership: vi.fn((teamId: string, m?: TeamMembership) =>
      of({ ...m, teamId, id: 'tm-new' }),
    ),
    updateTeamMembership: vi.fn((id: string, m?: TeamMembership) =>
      of({ ...m, id }),
    ),
    deleteTeamMembership: vi.fn(() => of(null)),
  } satisfies MembershipApi;
  const userApi = {
    getUsers: vi.fn(() =>
      of([
        { id: 'u1', name: 'Alice' },
        { id: 'u2', name: 'Bob' },
        { id: 'u3', name: 'Carol' },
      ]),
    ),
  } satisfies ApiStub<UserService>;
  const rolesApi = {
    getAllTeamRoles: vi.fn(() => of([{ id: 'member', name: 'Member' }])),
  } satisfies ApiStub<TeamRolesService>;

  const rendered = await renderComponent(AdminTeamMembershipsComponent, {
    declarations: [AdminTeamMembershipsComponent],
    imports: [NonMemberListStubComponent, MemberListStubComponent],
    componentInputs: { teamId: 't1' },
    providers: [
      ...permissionDataProviders(claims),
      TeamMembershipDataService,
      TeamRoleDataService,
      UserDataService,
      { provide: TeamMembershipsService, useValue: membershipApi },
      { provide: UserService, useValue: userApi },
      { provide: TeamRolesService, useValue: rolesApi },
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

const names = (users: User[]) => users.map((u) => u.name);

describe('AdminTeamMembershipsComponent', () => {
  /**
   * Verifies: loaded users are split into team members and non-members, and memberships and roles reach the member list.
   * Interacts with: real TeamMembershipDataService/UserDataService/TeamRoleDataService and UserQuery over stubbed endpoints.
   * Data: users Alice, Bob, Carol; Alice is the only member of t1.
   */
  it('splits users into members and non-members', async () => {
    const { nonMembers, members, membershipApi } = await renderMemberships();
    expect(membershipApi.getAllTeamMemberships).toHaveBeenCalledWith('t1');
    expect(names(members().users)).toEqual(['Alice']);
    expect(names(nonMembers().users)).toEqual(['Bob', 'Carol']);
    expect(members().memberships.map((m) => m.id)).toEqual(['tm1']);
    expect(members().roles.map((r) => r.name)).toEqual(['Member']);
  });

  /**
   * Verifies: adding a non-member creates the membership for this team and moves the user to the member list.
   * Interacts with: NonMemberList stub createMembership output, TeamMembershipsService.createTeamMembership stub.
   * Data: Bob added to t1.
   */
  it('adds a member through the non-member list', async () => {
    const { nonMembers, members, membershipApi, refresh } =
      await renderMemberships();
    nonMembers().createMembership.emit({ userId: 'u2' });
    await refresh();
    expect(membershipApi.createTeamMembership).toHaveBeenCalledWith('t1', {
      userId: 'u2',
      teamId: 't1',
    });
    expect(names(members().users)).toEqual(['Alice', 'Bob']);
    expect(names(nonMembers().users)).toEqual(['Carol']);
  });

  /**
   * Verifies: removing a member deletes the membership and returns the user to the non-member list.
   * Interacts with: MemberList stub deleteMembership output, TeamMembershipsService.deleteTeamMembership stub.
   * Data: Alice's membership tm1 deleted.
   */
  it('removes a member through the member list', async () => {
    const { nonMembers, members, membershipApi, refresh } =
      await renderMemberships();
    members().deleteMembership.emit('tm1');
    await refresh();
    expect(membershipApi.deleteTeamMembership).toHaveBeenCalledWith('tm1');
    expect(names(members().users)).toEqual([]);
    expect(names(nonMembers().users)).toEqual(['Alice', 'Bob', 'Carol']);
  });

  /**
   * Verifies: changing a member's role sends the edited membership to the API and the member list gets the new role.
   * Interacts with: MemberList stub editMembership output and memberships input, TeamMembershipsService.updateTeamMembership stub.
   * Data: tm1 given role 'lead'.
   */
  it('edits a membership through the member list', async () => {
    const { members, membershipApi, refresh } = await renderMemberships();
    members().editMembership.emit({
      id: 'tm1',
      teamId: 't1',
      userId: 'u1',
      roleId: 'lead',
    });
    await refresh();
    expect(membershipApi.updateTeamMembership).toHaveBeenCalledWith(
      'tm1',
      expect.objectContaining({ roleId: 'lead' }),
    );
    expect(members().memberships.map((m) => [m.id, m.roleId])).toEqual([
      ['tm1', 'lead'],
    ]);
  });

  describe('canEdit gate', () => {
    /**
     * Verifies: system EditEvaluations currently turns membership editing on (a grant the API rejects).
     * Interacts with: real PermissionDataService.canEditEvaluation, both list stubs' canEdit input.
     * Data: system [EditEvaluations].
     */
    it('allows editing with system EditEvaluations', async () => {
      const { nonMembers, members } = await renderMemberships({
        system: [SystemPermission.EditEvaluations],
      });
      expect(nonMembers().canEdit).toBe(true);
      expect(members().canEdit).toBe(true);
    });

    /**
     * Verifies: View-level evaluation rights do not enable membership editing.
     * Interacts with: real PermissionDataService, both list stubs' canEdit input.
     * Data: system [ViewEvaluations] (View where Edit is checked).
     */
    it('denies editing with system ViewEvaluations', async () => {
      const { nonMembers, members } = await renderMemberships({
        system: [SystemPermission.ViewEvaluations],
      });
      expect(nonMembers().canEdit).toBe(false);
      expect(members().canEdit).toBe(false);
    });

    /**
     * Verifies: evaluation-scoped edit rights and the team's own ManageTeam claim do not enable editing.
     * Interacts with: real PermissionDataService.canEditEvaluation, both list stubs' canEdit input.
     * Data: EditEvaluation on evaluation e1 (the team's evaluation) and ManageTeam on t1.
     */
    it('ignores evaluation and team claims', async () => {
      const { nonMembers, members } = await renderMemberships({
        evaluation: [
          {
            evaluationId: 'e1',
            permissions: [EvaluationPermission.EditEvaluation],
          },
        ],
        team: [{ teamId: 't1', permissions: [TeamPermission.ManageTeam] }],
      });
      // The gate checks canEditEvaluation(teamId), so neither the claim on e1
      // nor ManageTeam on t1 matches it.
      expect(nonMembers().canEdit).toBe(false);
      expect(members().canEdit).toBe(false);
    });

    /**
     * Verifies: an evaluation claim whose id happens to equal the team id enables editing.
     * Interacts with: real PermissionDataService.canEditEvaluation.
     * Data: an EditEvaluation claim keyed 't1'.
     * Why: shows that the gate looks the evaluation claim up by the team id, not by the team's evaluation id.
     */
    it('matches evaluation claims against the team id', async () => {
      const { members } = await renderMemberships({
        evaluation: [
          {
            evaluationId: 't1',
            permissions: [EvaluationPermission.EditEvaluation],
          },
        ],
      });
      expect(members().canEdit).toBe(true);
    });
  });
});
