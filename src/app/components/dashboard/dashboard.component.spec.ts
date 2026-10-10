// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatTooltipModule } from '@angular/material/tooltip';
import { screen, within } from '@testing-library/angular';
import userEvent, {
  PointerEventsCheckLevel,
} from '@testing-library/user-event';
import { of } from 'rxjs';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { CrucibleDialogService } from '@cmusei/crucible-common';
import {
  ActionService,
  DutyService,
  GalleryService,
  TeamMembershipsService,
  TeamPermission,
  TeamRolesService,
} from '../../generated/cite.api';
import { ActionQuery } from '../../data/action/action.query';
import { EvaluationStore } from '../../data/evaluation/evaluation.store';
import { MoveStore } from '../../data/move/move.store';
import { TeamStore } from '../../data/team/team.store';
import { TeamRoleDataService } from '../../data/team/team-role-data.service';
import { UserStore } from '../../data/user/user.store';
import { ApiStub } from '../../test-utils/api-stub';
import { dialogRefStub } from '../../test-utils/dialog-refs';
import { matDialogStub } from '../../test-utils/mat-dialog';
import {
  PermissionGrants,
  permissionDataProviders,
} from '../../test-utils/mock-permission-data.service';
import { renderComponent } from '../../test-utils/render-component';
import {
  captureUnhandledRxErrors,
  flush,
} from '../../test-utils/unhandled-rx-errors';
import { DashboardComponent } from './dashboard.component';

// The global stylesheets make every computed-style lookup slow in jsdom, and
// user-event's pointer-events check looks one up per ancestor on each click
// (about a second per click on this page under coverage). Clicks go to
// enabled, visible controls here, so the check is skipped.
const FAST_POINTER = { pointerEventsCheck: PointerEventsCheckLevel.Never };

const onTeam = (
  teamId: string,
  ...permissions: TeamPermission[]
): PermissionGrants => ({ team: [{ teamId, permissions }] });

async function renderDashboard(
  grants: PermissionGrants,
  { teamActiveBeforeRender = false } = {},
) {
  const actionApi = {
    getActionsByEvaluationTeam: vi.fn(() =>
      of([
        {
          id: 'a1',
          evaluationId: 'e1',
          teamId: 't1',
          moveNumber: 1,
          description: 'Isolate the mail server',
          isChecked: false,
        },
      ]),
    ),
    checkAction: vi.fn((id: string) => of({ id, isChecked: true })),
  } satisfies ApiStub<ActionService>;
  const dutyApi = {
    getDutiesByEvaluationTeam: vi.fn(() =>
      of([
        {
          id: 'd1',
          evaluationId: 'e1',
          teamId: 't1',
          name: 'Scribe',
          users: [{ id: 'u1' }],
        },
      ]),
    ),
  } satisfies ApiStub<DutyService>;
  const membershipApi = {
    getAllTeamMemberships: vi.fn(() =>
      of([
        { id: 'tm1', teamId: 't1', userId: 'u1', roleId: 'r-member' },
        { id: 'tm2', teamId: 't1', userId: 'u2', roleId: 'r-member' },
      ]),
    ),
    updateTeamMembership: vi.fn(),
  } satisfies ApiStub<TeamMembershipsService>;
  const galleryApi = {
    getEvaluationUnreadArticleCount: vi.fn(() => of({ count: '0' })),
  } satisfies ApiStub<GalleryService>;
  const teamRolesApi = {
    getAllTeamRoles: vi.fn(() =>
      of([
        { id: 'r-member', name: 'Member' },
        { id: 'r-lead', name: 'Lead' },
      ]),
    ),
  } satisfies ApiStub<TeamRolesService>;
  const confirm = vi.fn(() => dialogRefStub<unknown, boolean>(true).dialogRef);
  const dialogService: Pick<CrucibleDialogService, 'confirm'> = { confirm };
  const editDialog = matDialogStub();

  const rendered = await renderComponent(DashboardComponent, {
    declarations: [DashboardComponent],
    imports: [
      AngularEditorModule,
      MatButtonModule,
      MatCheckboxModule,
      MatFormFieldModule,
      MatIconModule,
      MatSelectModule,
      MatTooltipModule,
    ],
    componentInputs: { myTeamId: 't1', noChanges: false },
    providers: [
      ...permissionDataProviders(grants),
      { provide: ActionService, useValue: actionApi },
      { provide: DutyService, useValue: dutyApi },
      { provide: TeamMembershipsService, useValue: membershipApi },
      { provide: GalleryService, useValue: galleryApi },
      { provide: TeamRolesService, useValue: teamRolesApi },
      { provide: CrucibleDialogService, useValue: dialogService },
      { provide: MatDialog, useValue: editDialog.dialog },
    ],
    configureTestBed: (testBed) => {
      // The home page loads and activates these before the dashboard shows.
      testBed.inject(UserStore).set([
        { id: 'u1', name: 'Alice' },
        { id: 'u2', name: 'Bob' },
      ]);
      const evaluations = testBed.inject(EvaluationStore);
      evaluations.set([
        {
          id: 'e1',
          currentMoveNumber: 1,
          situationDescription: '<p>Ransom note found</p>',
        },
      ]);
      evaluations.setActive('e1');
      const moves = testBed.inject(MoveStore);
      moves.set([
        {
          id: 'm1',
          evaluationId: 'e1',
          moveNumber: 1,
          description: 'Escalation',
        },
      ]);
      moves.setActive('m1');
      testBed.inject(TeamRoleDataService).loadRoles().subscribe();
      const teams = testBed.inject(TeamStore);
      teams.set([{ id: 't1', name: 'Blue Team' }]);
      if (teamActiveBeforeRender) {
        teams.setActive('t1');
      }
    },
  });
  if (!teamActiveBeforeRender) {
    // On first load the home page activates the team after the dashboard
    // exists (the teams arrive later); do the same.
    rendered.fixture.debugElement.injector.get(TeamStore).setActive('t1');
    rendered.fixture.detectChanges();
  }
  const user = userEvent.setup(FAST_POINTER);
  // Role queries cost about a second each on this page in jsdom (the global
  // stylesheets make every computed-style lookup slow), which pushes the
  // matrix past the timeout under coverage. The section buttons are named
  // only by their title, so they are found by title within their section,
  // and the Material controls are read through their harnesses.
  const section = (heading: string) =>
    screen
      .getByText(heading, { selector: 'b' })
      .closest('.section-container') as HTMLElement;
  const button = (heading: string, title: string) =>
    within(section(heading)).getByTitle(title);
  const loader = TestbedHarnessEnvironment.loader(rendered.fixture);
  const expand = async (name: string, heading: string) => {
    await user.click(button(heading, `Expand the ${name}`));
    // NgModel applies its disabled state a microtask later.
    await rendered.fixture.whenStable();
    rendered.fixture.detectChanges();
    return section(heading);
  };
  return {
    ...rendered,
    actionApi,
    membershipApi,
    editDialog,
    user,
    section,
    button,
    loader,
    expand,
  };
}

describe('DashboardComponent', () => {
  beforeEach(() => localStorage.clear());

  /**
   * Verifies: the component mounts with the team's actions for the displayed move.
   * Interacts with: real ActionDataService/ActionQuery over ActionService.getActionsByEvaluationTeam, real Evaluation/Move/Team queries.
   * Data: evaluation e1 on move 1, team t1, one action on move 1.
   */
  it('lists the team actions for the displayed move', async () => {
    const { actionApi, fixture } = await renderDashboard(
      onTeam('t1', TeamPermission.EditTeamScore),
    );

    expect(fixture.componentInstance).toBeInstanceOf(DashboardComponent);
    expect(actionApi.getActionsByEvaluationTeam).toHaveBeenCalledWith(
      'e1',
      't1',
    );
    expect(screen.getByText('Isolate the mail server')).toBeInTheDocument();
  });

  /**
   * Verifies: creating the dashboard while a team is already active runs change detection from the constructor, which throws into the store subscription (current behavior).
   * Interacts with: TeamQuery.selectActive firing synchronously into updatePermissions' detectChanges, captureUnhandledRxErrors.
   * Data: team t1 active before the component is created (re-entering the dashboard section); EditTeamScore on t1.
   */
  it('throws from the constructor when a team is already active', async () => {
    const errors = captureUnhandledRxErrors();
    const { fixture } = await renderDashboard(
      onTeam('t1', TeamPermission.EditTeamScore),
      { teamActiveBeforeRender: true },
    );
    await flush();

    // Current behavior; see agent-docs/ui-test-bugs/cite.ui.md.
    expect(errors).toEqual([
      expect.objectContaining({
        message: expect.stringMatching(/Should be run in update mode/),
      }),
    ]);
    expect(fixture.componentInstance.canContributeToTeamScore).toBe(true);
  });

  /**
   * Verifies: which team permission enables editing actions, ticking actions and changing roles.
   * Interacts with: real PermissionDataService (canManageTeam, canSubmitTeamScore, canEditTeamScore), the rendered controls.
   * Data: one team claim per row; the last row grants ManageTeam on another team (a near miss).
   */
  it.each([
    {
      label: 'ManageTeam on t1',
      grants: onTeam('t1', TeamPermission.ManageTeam),
      editActions: true,
      tickActions: true,
      changeRoles: true,
    },
    {
      label: 'SubmitTeamScore on t1',
      grants: onTeam('t1', TeamPermission.SubmitTeamScore),
      editActions: true,
      tickActions: true,
      changeRoles: false,
    },
    {
      label: 'EditTeamScore on t1',
      grants: onTeam('t1', TeamPermission.EditTeamScore),
      editActions: false,
      tickActions: true,
      changeRoles: false,
    },
    {
      label: 'ViewTeam on t1',
      grants: onTeam('t1', TeamPermission.ViewTeam),
      editActions: false,
      tickActions: false,
      changeRoles: false,
    },
    {
      label: 'ManageTeam on t2',
      grants: onTeam('t2', TeamPermission.ManageTeam),
      editActions: false,
      tickActions: false,
      changeRoles: false,
    },
  ])(
    'with $label: edit actions $editActions, tick actions $tickActions, change roles $changeRoles',
    async ({ grants, editActions, tickActions, changeRoles }) => {
      const { button, expand, loader } = await renderDashboard(grants);
      await expand('permissions', 'Roles:');

      expect(button('Actions:', 'Edit Actions').hasAttribute('disabled')).toBe(
        !editActions,
      );
      const actionCheck = await loader.getHarness(MatCheckboxHarness);
      expect(await actionCheck.isDisabled()).toBe(!tickActions);
      // Bob's role select (Alice is not the signed-in user either).
      const [, bobRole] = await loader.getAllHarnesses(MatSelectHarness);
      expect(await bobRole.isDisabled()).toBe(!changeRoles);
    },
  );

  /**
   * Verifies: ticking an action sends the check to the API and the rendered checkbox shows the action as checked.
   * Interacts with: the Actions section's checkbox (Space through user-event), ActionService.checkAction stub, real ActionDataService/ActionQuery.
   * Data: EditTeamScore on t1; action a1 unchecked.
   */
  it('checks an action with EditTeamScore', async () => {
    const { actionApi, fixture, loader, section, user } = await renderDashboard(
      onTeam('t1', TeamPermission.EditTeamScore),
    );
    // A role query for the checkbox costs about a second here and a pointer
    // click another (see FAST_POINTER), enough to time out under coverage on a
    // loaded machine. The harness finds the Actions section's checkbox
    // cheaply, and the user ticks it from the keyboard.
    const checkbox = await loader.getHarness(
      MatCheckboxHarness.with({ ancestor: '.section-container' }),
    );
    const host = TestbedHarnessEnvironment.getNativeElement(
      await checkbox.host(),
    ) as HTMLElement;
    expect(section('Actions:')).toContainElement(host);
    const input = host.querySelector('input') as HTMLInputElement;
    expect(input).not.toBeChecked();

    input.focus();
    await user.keyboard(' ');
    fixture.detectChanges();

    expect(actionApi.checkAction).toHaveBeenCalledWith('a1');
    expect(
      fixture.debugElement.injector.get(ActionQuery).getEntity('a1'),
    ).toEqual(expect.objectContaining({ isChecked: true }));
    expect(input).toBeChecked();
  });

  /**
   * Verifies: SubmitTeamScore enables Edit Duties, and a duty opened from edit mode gets canEdit true.
   * Interacts with: the duties section, matDialogStub (dialog data).
   * Data: SubmitTeamScore on t1.
   */
  it('edits duties with SubmitTeamScore', async () => {
    const { button, editDialog, expand, user } = await renderDashboard(
      onTeam('t1', TeamPermission.SubmitTeamScore),
    );
    await expand('duties', 'Duties:');
    await user.click(button('Duties:', 'Edit Duties'));
    await user.click(button('Duties:', 'Edit Duty'));

    expect(editDialog.config()?.data.canEdit).toBe(true);
  });

  /**
   * Verifies: EditTeamScore (a near miss for submitting) leaves Edit Duties disabled but offers the assignee select.
   * Interacts with: the duties section.
   * Data: EditTeamScore on t1.
   */
  it('keeps Edit Duties disabled without SubmitTeamScore', async () => {
    const { button, expand, loader } = await renderDashboard(
      onTeam('t1', TeamPermission.EditTeamScore),
    );
    await expand('duties', 'Duties:');

    expect(button('Duties:', 'Edit Duties')).toBeDisabled();
    // The assignee select is the only select on the page with the roles
    // section collapsed.
    expect(await loader.getAllHarnesses(MatSelectHarness)).toHaveLength(1);
  });

  /**
   * Verifies: ViewTeam shows duty assignees as text instead of the assignee select.
   * Interacts with: the duties section.
   * Data: ViewTeam on t1; Scribe is assigned to Alice.
   */
  it('shows duty assignees read-only without EditTeamScore', async () => {
    const { expand, loader } = await renderDashboard(
      onTeam('t1', TeamPermission.ViewTeam),
    );
    const duties = await expand('duties', 'Duties:');

    expect(await loader.getAllHarnesses(MatSelectHarness)).toEqual([]);
    expect(within(duties).getByText('Alice')).toBeInTheDocument();
  });

  /**
   * Verifies: picking a new role for a team member changes it on the page only; nothing is sent to the API (current behavior).
   * Interacts with: the role select (MatSelectHarness), TeamMembershipsService.updateTeamMembership stub.
   * Data: ManageTeam on t1; Bob made Lead.
   */
  it('changes a member role without saving it', async () => {
    const { expand, loader, membershipApi } = await renderDashboard(
      onTeam('t1', TeamPermission.ManageTeam),
    );
    await expand('permissions', 'Roles:');
    const [, bobRole] = await loader.getAllHarnesses(MatSelectHarness);
    await bobRole.clickOptions({ text: 'Lead' });

    expect(await bobRole.getValueText()).toBe('Lead');
    // Current behavior; see agent-docs/ui-test-bugs/cite.ui.md.
    expect(membershipApi.updateTeamMembership).not.toHaveBeenCalled();
  });
});
