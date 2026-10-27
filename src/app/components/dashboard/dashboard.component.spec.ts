// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatExpansionPanelHarness } from '@angular/material/expansion/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatTooltipModule } from '@angular/material/tooltip';
import { screen, within } from '@testing-library/angular';
import userEvent, {
  PointerEventsCheckLevel,
} from '@testing-library/user-event';
import { of } from 'rxjs';
import {
  ComnSettingsService,
  CrucibleDialogService,
} from '@cmusei/crucible-common';
import {
  Action,
  ActionService,
  DutyService,
  Evaluation,
  GalleryService,
  Move,
  ScoringModel,
  TeamMembershipsService,
  TeamPermission,
  TeamRolesService,
} from '../../generated/cite.api';
import { ActionQuery } from '../../data/action/action.query';
import { EvaluationStore } from '../../data/evaluation/evaluation.store';
import { MoveStore } from '../../data/move/move.store';
import { ScoringModelStore } from '../../data/scoring-model/scoring-model.store';
import { TeamStore } from '../../data/team/team.store';
import { TeamRoleDataService } from '../../data/team/team-role-data.service';
import { UnreadArticles } from '../../data/unread-articles/unread-articles';
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

// The API sends ISO strings at runtime; the generated model types them as Date.
const iso = (s: string) => s as unknown as Date;

const onTeam = (
  teamId: string,
  ...permissions: TeamPermission[]
): PermissionGrants => ({ team: [{ teamId, permissions }] });

const ACTION: Action = {
  id: 'a1',
  evaluationId: 'e1',
  teamId: 't1',
  moveNumber: 1,
  description: 'Isolate the mail server',
  isChecked: false,
};

type PanelName = 'Actions' | 'Duties' | 'Roles';

async function renderDashboard(
  grants: PermissionGrants,
  {
    teamActiveBeforeRender = false,
    evaluation = {},
    moves = [
      {
        id: 'm1',
        evaluationId: 'e1',
        moveNumber: 1,
        description: 'Escalation',
      },
    ],
    activeMoveId = 'm1',
    scoringModel,
    actions = [ACTION],
    unreadArticles,
  }: {
    teamActiveBeforeRender?: boolean;
    evaluation?: Partial<Evaluation>;
    moves?: Move[];
    activeMoveId?: string;
    scoringModel?: ScoringModel;
    actions?: Action[];
    unreadArticles?: UnreadArticles;
  } = {},
) {
  const actionApi = {
    getActionsByEvaluationTeam: vi.fn(() => of(structuredClone(actions))),
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
    deleteDuty: vi.fn(() => of({})),
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
  const settingsService = {
    settings: { GalleryUiUrl: 'https://gallery.test/' },
  } as Pick<ComnSettingsService, 'settings'> as ComnSettingsService;
  const editDialog = matDialogStub();

  const rendered = await renderComponent(DashboardComponent, {
    declarations: [DashboardComponent],
    imports: [
      MatButtonModule,
      MatCardModule,
      MatCheckboxModule,
      MatExpansionModule,
      MatFormFieldModule,
      MatIconModule,
      MatSelectModule,
      MatTooltipModule,
    ],
    componentInputs: {
      myTeamId: 't1',
      noChanges: false,
      ...(unreadArticles ? { unreadArticles } : {}),
    },
    providers: [
      ...permissionDataProviders(grants),
      { provide: ActionService, useValue: actionApi },
      { provide: DutyService, useValue: dutyApi },
      { provide: TeamMembershipsService, useValue: membershipApi },
      { provide: GalleryService, useValue: galleryApi },
      { provide: TeamRolesService, useValue: teamRolesApi },
      { provide: CrucibleDialogService, useValue: dialogService },
      { provide: ComnSettingsService, useValue: settingsService },
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
          ...evaluation,
        },
      ]);
      evaluations.setActive('e1');
      if (scoringModel) {
        const models = testBed.inject(ScoringModelStore);
        models.set([scoringModel]);
        models.setActive(scoringModel.id);
      }
      const moveStore = testBed.inject(MoveStore);
      moveStore.set(moves);
      moveStore.setActive(activeMoveId);
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
  // matrix past the timeout under coverage. The panels and the Material
  // controls in them are read through their harnesses, and a panel's
  // buttons, named only by their title, are found by title within the
  // expanded panel.
  const loader = TestbedHarnessEnvironment.loader(rendered.fixture);
  const panelHarness = (name: PanelName) =>
    loader.getHarness(
      MatExpansionPanelHarness.with({ title: new RegExp(`^${name} \\(`) }),
    );
  const expand = async (name: PanelName) => {
    const harness = await panelHarness(name);
    await harness.expand();
    // NgModel applies its disabled state a microtask later.
    await rendered.fixture.whenStable();
    rendered.fixture.detectChanges();
    return {
      element: TestbedHarnessEnvironment.getNativeElement(
        await harness.host(),
      ) as HTMLElement,
      content: await harness.getHarnessLoaderForContent(),
    };
  };
  return {
    ...rendered,
    actionApi,
    confirm,
    dutyApi,
    membershipApi,
    editDialog,
    user,
    loader,
    panelHarness,
    expand,
  };
}

describe('DashboardComponent', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  /**
   * Verifies: the component mounts with the team's actions for the displayed move, listed in the Actions panel once it is opened.
   * Interacts with: real ActionDataService/ActionQuery over ActionService.getActionsByEvaluationTeam, real Evaluation/Move/Team queries, the Actions panel.
   * Data: evaluation e1 on move 1, team t1, one action on move 1.
   */
  it('lists the team actions for the displayed move', async () => {
    const { actionApi, expand, fixture } = await renderDashboard(
      onTeam('t1', TeamPermission.EditTeamScore),
    );
    const actions = await expand('Actions');

    expect(fixture.componentInstance).toBeInstanceOf(DashboardComponent);
    expect(actionApi.getActionsByEvaluationTeam).toHaveBeenCalledWith(
      'e1',
      't1',
    );
    expect(
      within(actions.element).getByText('Isolate the mail server'),
    ).toBeVisible();
  });

  /**
   * Verifies: the Actions, Duties and Roles panels start collapsed, each titled with its count, and a panel with nothing in it keeps its title with a zero count.
   * Interacts with: MatExpansionPanelHarness (title, expanded state), real Action/Duty/membership data services.
   * Data: per row, the team's actions on move 1 (one, or none); one duty; two team members.
   */
  it.each<{ label: string; actions: Action[]; titles: string[] }>([
    {
      label: 'one action',
      actions: [ACTION],
      titles: ['Actions (1)', 'Duties (1)', 'Roles (2)'],
    },
    {
      label: 'no actions',
      actions: [],
      titles: ['Actions (0)', 'Duties (1)', 'Roles (2)'],
    },
  ])(
    'shows each panel collapsed with its count for $label',
    async ({ actions, titles }) => {
      const { loader } = await renderDashboard(
        onTeam('t1', TeamPermission.EditTeamScore),
        { actions },
      );
      const panels = await loader.getAllHarnesses(MatExpansionPanelHarness);

      expect(await Promise.all(panels.map((p) => p.getTitle()))).toEqual(
        titles,
      );
      expect(await Promise.all(panels.map((p) => p.isExpanded()))).toEqual([
        false,
        false,
        false,
      ]);
    },
  );

  describe('situation card', () => {
    /**
     * Verifies: on the current move the card shows the move's title with the evaluation's situation time, in the viewer's zone with the zone named, and the evaluation's situation description.
     * Interacts with: setCompleteSituationDescription(), formatSituationTime(), real Evaluation/Move stores.
     * Data: TZ America/New_York; evaluation e1 on move 1, situation time 12 Oct 2026 16:00 UTC (an ISO string).
     */
    it('shows the current move with its situation in the viewer zone', async () => {
      vi.stubEnv('TZ', 'America/New_York');
      await renderDashboard(onTeam('t1', TeamPermission.EditTeamScore), {
        evaluation: { situationTime: iso('2026-10-12T16:00:00Z') },
      });

      expect(screen.getByText('Escalation')).toBeVisible();
      expect(
        screen.getByText(/^Monday, October 12, 2026 at 12:00\sPM EDT$/),
      ).toBeVisible();
      expect(screen.getByText('Ransom note found')).toBeVisible();
      expect(screen.queryByText('Previous move')).not.toBeInTheDocument();
    });

    /**
     * Verifies: a move before the current one is labelled Previous move and shows its own situation time and description instead of the evaluation's.
     * Interacts with: setCompleteSituationDescription(), formatSituationTime(), the active move in the real MoveStore.
     * Data: TZ America/New_York; evaluation on move 2; move 1 (12 Nov 2026 16:00 UTC, 'Phishing email') displayed.
     */
    it('shows a previous move with its own situation', async () => {
      vi.stubEnv('TZ', 'America/New_York');
      await renderDashboard(onTeam('t1', TeamPermission.EditTeamScore), {
        evaluation: {
          currentMoveNumber: 2,
          situationTime: iso('2026-10-12T16:00:00Z'),
        },
        moves: [
          {
            id: 'm1',
            evaluationId: 'e1',
            moveNumber: 1,
            description: 'Initial access',
            situationTime: iso('2026-11-12T16:00:00Z'),
            situationDescription: '<p>Phishing email</p>',
          },
          { id: 'm2', evaluationId: 'e1', moveNumber: 2, description: 'Escalation' },
        ],
        activeMoveId: 'm1',
      });

      expect(screen.getByText('Previous move')).toBeVisible();
      expect(screen.getByText('Initial access')).toBeVisible();
      expect(
        screen.getByText(/^Thursday, November 12, 2026 at 11:00\sAM EST$/),
      ).toBeVisible();
      expect(screen.getByText('Phishing email')).toBeVisible();
      expect(screen.queryByText('Ransom note found')).not.toBeInTheDocument();
    });

    /**
     * Verifies: with showPastSituationDescriptions the card lists every earlier move under Previous Moves, each with its time and description; without it no earlier move is listed.
     * Interacts with: the active ScoringModel's showPastSituationDescriptions, real MoveStore.
     * Data: TZ America/New_York; evaluation and displayed move on 2; move 1 at 12 Nov 2026 16:00 UTC with 'Phishing email'; per row, the flag.
     */
    it.each([
      { label: 'on', show: true },
      { label: 'off', show: false },
    ])(
      'lists the earlier moves with past situations $label',
      async ({ show }) => {
        vi.stubEnv('TZ', 'America/New_York');
        await renderDashboard(onTeam('t1', TeamPermission.EditTeamScore), {
          evaluation: { currentMoveNumber: 2 },
          scoringModel: { id: 'sm1', showPastSituationDescriptions: show },
          moves: [
            {
              id: 'm1',
              evaluationId: 'e1',
              moveNumber: 1,
              description: 'Initial access',
              situationTime: iso('2026-11-12T16:00:00Z'),
              situationDescription: '<p>Phishing email</p>',
            },
            { id: 'm2', evaluationId: 'e1', moveNumber: 2, description: 'Escalation' },
          ],
          activeMoveId: 'm2',
        });

        expect(screen.getByText('Escalation')).toBeVisible();
        expect(screen.getByText('Ransom note found')).toBeVisible();
        if (show) {
          expect(screen.getByText('Previous Moves')).toBeVisible();
          const pastMove = screen
            .getByText('Initial access')
            .closest('.past-move') as HTMLElement;
          expect(pastMove).not.toBeNull();
          expect(
            within(pastMove).getByText(
              /^Thursday, November 12, 2026 at 11:00\sAM EST$/,
            ),
          ).toBeVisible();
          expect(within(pastMove).getByText('Phishing email')).toBeVisible();
        } else {
          expect(screen.queryByText('Previous Moves')).not.toBeInTheDocument();
          expect(screen.queryByText('Initial access')).not.toBeInTheDocument();
          expect(screen.queryByText('Phishing email')).not.toBeInTheDocument();
        }
      },
    );

    /**
     * Verifies: a situation with no time shows no time line.
     * Interacts with: formatSituationTime() (empty for no time), the card's time block.
     * Data: evaluation e1 on move 1 with no situation time.
     */
    it('leaves the time out when the situation has none', async () => {
      await renderDashboard(onTeam('t1', TeamPermission.EditTeamScore));

      expect(screen.getByText('Escalation')).toBeVisible();
      // The shape of every situation time (see the tests above).
      expect(
        screen.queryByText(/^\w+day, \w+ \d{1,2}, \d{4} at \d{1,2}:\d{2}\s[AP]M \w+$/),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
    });

    /**
     * Verifies: with no displayed move the dashboard shows no situation card.
     * Interacts with: setCompleteSituationDescription() with no matching move.
     * Data: no moves stored or active; the evaluation still has a situation description.
     */
    it('shows no situation without a displayed move', async () => {
      await renderDashboard(onTeam('t1', TeamPermission.EditTeamScore), {
        moves: [],
        activeMoveId: null,
      });

      expect(screen.queryByText('Ransom note found')).not.toBeInTheDocument();
      expect(document.querySelector('.situation-card')).toBeNull();
    });
  });

  describe('Gallery card', () => {
    /**
     * Verifies: with unread articles the card counts them and links to the evaluation's exhibit wall in Gallery.
     * Interacts with: the unreadArticles input, the evaluation's galleryExhibitId, ComnSettingsService GalleryUiUrl.
     * Data: exhibit ex1; 3 unread; GalleryUiUrl https://gallery.test/.
     */
    it('links to Gallery with the unread count', async () => {
      await renderDashboard(onTeam('t1', TeamPermission.EditTeamScore), {
        evaluation: { galleryExhibitId: 'ex1' },
        unreadArticles: { id: 'e1', count: '3' },
      });

      expect(screen.getByText('3 unread in Gallery')).toBeVisible();
      expect(screen.getByRole('link', { name: 'Open Gallery' })).toHaveAttribute(
        'href',
        'https://gallery.test/?exhibit=ex1&section=wall',
      );
    });

    /**
     * Verifies: with nothing unread the card says so and offers no link.
     * Interacts with: the unreadArticles input, the evaluation's galleryExhibitId.
     * Data: exhibit ex1; 0 unread.
     */
    it('says every Gallery item is read', async () => {
      await renderDashboard(onTeam('t1', TeamPermission.EditTeamScore), {
        evaluation: { galleryExhibitId: 'ex1' },
        unreadArticles: { id: 'e1', count: '0' },
      });

      expect(screen.getByText('All Gallery items read')).toBeVisible();
      expect(screen.queryByText('Open Gallery')).not.toBeInTheDocument();
    });

    /**
     * Verifies: an evaluation without a Gallery exhibit shows no Gallery card, whatever the unread count.
     * Interacts with: the evaluation's galleryExhibitId, the unreadArticles input.
     * Data: no exhibit; 3 unread.
     */
    it('shows no Gallery card without an exhibit', async () => {
      await renderDashboard(onTeam('t1', TeamPermission.EditTeamScore), {
        unreadArticles: { id: 'e1', count: '3' },
      });

      expect(screen.queryByText('3 unread in Gallery')).not.toBeInTheDocument();
      expect(screen.queryByText('All Gallery items read')).not.toBeInTheDocument();
      expect(screen.queryByText('Open Gallery')).not.toBeInTheDocument();
    });
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
   * Interacts with: real PermissionDataService (canManageTeam, canSubmitTeamScore, canEditTeamScore), the controls in the opened Actions and Roles panels.
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
      const { expand } = await renderDashboard(grants);
      const actions = await expand('Actions');
      const roles = await expand('Roles');

      expect(
        (within(actions.element).getByTitle('Edit Actions') as HTMLButtonElement)
          .disabled,
      ).toBe(!editActions);
      const actionCheck = await actions.content.getHarness(MatCheckboxHarness);
      expect(await actionCheck.isDisabled()).toBe(!tickActions);
      // Bob's role select (Alice is not the signed-in user either).
      const [, bobRole] = await roles.content.getAllHarnesses(MatSelectHarness);
      expect(await bobRole.isDisabled()).toBe(!changeRoles);
    },
  );

  /**
   * Verifies: ticking an action sends the check to the API and the rendered checkbox shows the action as checked.
   * Interacts with: the Actions panel's checkbox (Space through user-event), ActionService.checkAction stub, real ActionDataService/ActionQuery.
   * Data: EditTeamScore on t1; action a1 unchecked.
   */
  it('checks an action with EditTeamScore', async () => {
    const { actionApi, expand, fixture, user } = await renderDashboard(
      onTeam('t1', TeamPermission.EditTeamScore),
    );
    // A role query for the checkbox costs about a second here and a pointer
    // click another (see FAST_POINTER), enough to time out under coverage on a
    // loaded machine. The harness finds the Actions panel's checkbox cheaply,
    // and the user ticks it from the keyboard.
    const actions = await expand('Actions');
    const checkbox = await actions.content.getHarness(MatCheckboxHarness);
    const host = TestbedHarnessEnvironment.getNativeElement(
      await checkbox.host(),
    ) as HTMLElement;
    expect(actions.element).toContainElement(host);
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
   * Interacts with: the opened Duties panel, matDialogStub (dialog data).
   * Data: SubmitTeamScore on t1.
   */
  it('edits duties with SubmitTeamScore', async () => {
    const { editDialog, expand, user } = await renderDashboard(
      onTeam('t1', TeamPermission.SubmitTeamScore),
    );
    const duties = await expand('Duties');
    await user.click(within(duties.element).getByTitle('Edit Duties'));
    await user.click(within(duties.element).getByTitle('Edit Duty'));

    expect(editDialog.config()?.data.canEdit).toBe(true);
  });

  /**
   * Verifies: Delete Duty asks with the standard Crucible delete wording, naming the duty, before deleting it.
   * Interacts with: the opened Duties panel in edit mode, CrucibleDialogService.confirm stub (answers true), DutyService.deleteDuty stub.
   * Data: SubmitTeamScore on t1; duty Scribe deleted.
   */
  it('confirms deleting a duty by name', async () => {
    const { confirm, dutyApi, expand, user } = await renderDashboard(
      onTeam('t1', TeamPermission.SubmitTeamScore),
    );
    const duties = await expand('Duties');
    await user.click(within(duties.element).getByTitle('Edit Duties'));
    await user.click(within(duties.element).getByTitle('Delete Duty'));

    expect(confirm).toHaveBeenCalledWith({
      title: 'Delete Duty',
      message: 'Are you sure that you want to delete Scribe?',
      confirmText: 'Delete',
    });
    expect(dutyApi.deleteDuty).toHaveBeenCalledWith('d1');
  });

  /**
   * Verifies: EditTeamScore (a near miss for submitting) leaves Edit Duties disabled but offers the assignee select.
   * Interacts with: the opened Duties panel.
   * Data: EditTeamScore on t1.
   */
  it('keeps Edit Duties disabled without SubmitTeamScore', async () => {
    const { expand } = await renderDashboard(
      onTeam('t1', TeamPermission.EditTeamScore),
    );
    const duties = await expand('Duties');

    expect(within(duties.element).getByTitle('Edit Duties')).toBeDisabled();
    expect(await duties.content.getAllHarnesses(MatSelectHarness)).toHaveLength(
      1,
    );
  });

  /**
   * Verifies: ViewTeam shows duty assignees as text instead of the assignee select.
   * Interacts with: the opened Duties panel.
   * Data: ViewTeam on t1; Scribe is assigned to Alice.
   */
  it('shows duty assignees read-only without EditTeamScore', async () => {
    const { expand } = await renderDashboard(
      onTeam('t1', TeamPermission.ViewTeam),
    );
    const duties = await expand('Duties');

    expect(await duties.content.getAllHarnesses(MatSelectHarness)).toEqual([]);
    expect(within(duties.element).getByText('Alice')).toBeVisible();
  });

  /**
   * Verifies: picking a new role for a team member changes it on the page only; nothing is sent to the API (current behavior).
   * Interacts with: the role select in the opened Roles panel (MatSelectHarness), TeamMembershipsService.updateTeamMembership stub.
   * Data: ManageTeam on t1; Bob made Lead.
   */
  it('changes a member role without saving it', async () => {
    const { expand, membershipApi } = await renderDashboard(
      onTeam('t1', TeamPermission.ManageTeam),
    );
    const roles = await expand('Roles');
    const [, bobRole] = await roles.content.getAllHarnesses(MatSelectHarness);
    await bobRole.clickOptions({ text: 'Lead' });

    expect(await bobRole.getValueText()).toBe('Lead');
    // Current behavior; see agent-docs/ui-test-bugs/cite.ui.md.
    expect(membershipApi.updateTeamMembership).not.toHaveBeenCalled();
  });
});
