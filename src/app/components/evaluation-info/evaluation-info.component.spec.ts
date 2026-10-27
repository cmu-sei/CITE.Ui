// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { CrucibleDialogService } from '@cmusei/crucible-common';
import {
  Evaluation,
  EvaluationPermission,
  Move,
  SystemPermission,
  Team,
} from '../../generated/cite.api';
import { EvaluationInfoComponent } from './evaluation-info.component';
import { EvaluationStore } from '../../data/evaluation/evaluation.store';
import { MoveStore } from '../../data/move/move.store';
import { TeamStore } from '../../data/team/team.store';
import { TeamMembershipDataService } from '../../data/team/team-membership-data.service';
import { UserDataService } from '../../data/user/user-data.service';
import { Section } from '../home-app/section';
import {
  PermissionGrants,
  permissionDataProviders,
} from '../../test-utils/mock-permission-data.service';
import { dialogRefStub } from '../../test-utils/dialog-refs';
import { renderComponent } from '../../test-utils/render-component';

const MOVES: Move[] = [
  { id: 'm1', moveNumber: 1, description: 'Initial access' },
  { id: 'm2', moveNumber: 2, description: 'Lateral movement' },
  { id: 'm3', moveNumber: 3, description: 'Exfiltration' },
];

async function renderEvaluationInfo(
  overrides: {
    claims?: PermissionGrants;
    evaluation?: Partial<Evaluation>;
    confirm?: boolean;
    showAdminButton?: boolean;
    selectedSection?: Section;
    activeTeam?: boolean;
    teams?: Team[];
  } = {},
) {
  const evaluation: Evaluation = {
    id: 'e1',
    description: 'Ransomware exercise',
    currentMoveNumber: 1,
    showAdvanceButton: true,
    ...overrides.evaluation,
  };
  const confirm = vi.fn(
    () => dialogRefStub<unknown, boolean>(overrides.confirm ?? true).dialogRef,
  );
  const dialog: Pick<CrucibleDialogService, 'confirm'> = { confirm };
  const evaluationStore: Provider = {
    provide: EvaluationStore,
    useFactory: () => {
      const store = new EvaluationStore();
      store.set([evaluation]);
      store.setActive('e1');
      return store;
    },
  };
  const nextEvaluationMove = vi.fn();
  const changeSection = vi.fn();
  const changeTeam = vi.fn();

  const rendered = await renderComponent(EvaluationInfoComponent, {
    declarations: [EvaluationInfoComponent],
    imports: [MatButtonModule, MatIconModule, MatMenuModule, MatSelectModule],
    componentInputs: {
      evaluationList: [evaluation],
      moveList: [...MOVES],
      teamList: overrides.teams ?? [],
      myTeamId: 't1',
      selectedSection: overrides.selectedSection ?? Section.dashboard,
      noChanges: false,
      ...(overrides.showAdminButton === undefined
        ? {}
        : { showAdminButton: overrides.showAdminButton }),
    },
    on: { nextEvaluationMove, changeSection, changeTeam },
    providers: [
      ...permissionDataProviders(overrides.claims ?? {}),
      evaluationStore,
      TeamMembershipDataService,
      UserDataService,
      { provide: CrucibleDialogService, useValue: dialog },
    ],
  });

  // The home page loads the moves and activates the current one after this
  // component exists; do the same so the move subscription sees the inputs
  // and the permission that the constructor already resolved.
  const moveStore = rendered.fixture.debugElement.injector.get(MoveStore);
  moveStore.set(MOVES);
  moveStore.setActive(`m${evaluation.currentMoveNumber}`);
  if (overrides.activeTeam) {
    // The team buttons render once a team is selected; the home page
    // activates the user's team after this component exists.
    const teamStore = rendered.fixture.debugElement.injector.get(TeamStore);
    teamStore.set(overrides.teams ?? [{ id: 't1', shortName: 'BLUE' }]);
    teamStore.setActive('t1');
  }
  rendered.fixture.detectChanges();
  await rendered.fixture.whenStable();

  return {
    ...rendered,
    confirm,
    nextEvaluationMove,
    changeSection,
    changeTeam,
    user: userEvent.setup(),
  };
}

const advanceButton = () =>
  screen.queryByRole('button', { name: 'Advance Move' });
const administrationButton = () =>
  screen.queryByRole('button', { name: 'Show Administration Page' });
const aggregateReportButton = () =>
  screen.queryByRole('button', { name: 'Aggregate Report' });

describe('EvaluationInfoComponent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  /**
   * Verifies: the displayed move, move count and evaluation description are shown.
   * Interacts with: real EvaluationStore/MoveStore, moveList and evaluationList inputs.
   * Data: evaluation e1 on move 1 of 3.
   */
  it('shows the move and the evaluation', async () => {
    await renderEvaluationInfo();
    expect(screen.getByText(/of\s+3/)).toBeInTheDocument();
    expect(screen.getByText(/Ransomware exercise/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Decrement Displayed Move' }),
    ).toBeDisabled();
  });

  describe('Advance Move gate', () => {
    const cases: Array<{
      label: string;
      claims: PermissionGrants;
      visible: boolean;
    }> = [
      {
        label: 'ManageEvaluation on e1',
        claims: {
          evaluation: [
            {
              evaluationId: 'e1',
              permissions: [EvaluationPermission.ManageEvaluation],
            },
          ],
        },
        visible: true,
      },
      {
        label: 'ExecuteEvaluation on e1',
        claims: {
          evaluation: [
            {
              evaluationId: 'e1',
              permissions: [EvaluationPermission.ExecuteEvaluation],
            },
          ],
        },
        visible: true,
      },
      {
        label: 'system ExecuteEvaluations',
        claims: { system: [SystemPermission.ExecuteEvaluations] },
        visible: true,
      },
      {
        label: 'system ManageEvaluations',
        claims: { system: [SystemPermission.ManageEvaluations] },
        visible: true,
      },
      {
        label: 'EditEvaluation on e1',
        claims: {
          evaluation: [
            {
              evaluationId: 'e1',
              permissions: [EvaluationPermission.EditEvaluation],
            },
          ],
        },
        visible: false,
      },
      {
        label: 'ExecuteEvaluation on another evaluation',
        claims: {
          evaluation: [
            {
              evaluationId: 'e2',
              permissions: [EvaluationPermission.ExecuteEvaluation],
            },
          ],
        },
        visible: false,
      },
      {
        label: 'system EditEvaluations',
        claims: { system: [SystemPermission.EditEvaluations] },
        visible: false,
      },
    ];

    /**
     * Verifies: the Advance Move button appears only for users who may manage or execute this evaluation;
     * near misses (Edit rights, Execute on another evaluation) leave it out.
     * Interacts with: real PermissionDataService.canAdvanceMove, real Evaluation/Move stores.
     * Data: per row, one system permission or evaluation claim; evaluation on move 1 of 3 with showAdvanceButton.
     */
    it.each(cases)(
      'Advance Move visible=$visible with $label',
      async ({ claims, visible }) => {
        await renderEvaluationInfo({ claims });
        if (visible) {
          expect(advanceButton()).toBeEnabled();
        } else {
          expect(advanceButton()).not.toBeInTheDocument();
        }
      },
    );

    /**
     * Verifies: after switching to an evaluation the user may not advance, the button is still offered.
     * Interacts with: real EvaluationStore/MoveStore after render, PermissionDataService.canAdvanceMove.
     * Data: ManageEvaluation on e1 only; the active evaluation switches to e2 and its current move is re-selected.
     */
    it('keeps the previous evaluation’s Advance Move permission after switching', async () => {
      const { fixture } = await renderEvaluationInfo({
        claims: {
          evaluation: [
            {
              evaluationId: 'e1',
              permissions: [EvaluationPermission.ManageEvaluation],
            },
          ],
        },
      });
      expect(advanceButton()).toBeInTheDocument();
      const evaluationStore =
        fixture.debugElement.injector.get(EvaluationStore);
      const moveStore = fixture.debugElement.injector.get(MoveStore);
      evaluationStore.upsert('e2', {
        description: 'Other exercise',
        currentMoveNumber: 1,
        showAdvanceButton: true,
      });
      evaluationStore.setActive('e2');
      moveStore.setActive('m2');
      moveStore.setActive('m1');
      fixture.detectChanges();
      expect(advanceButton()).toBeInTheDocument();
    });

    /**
     * Verifies: the evaluation's showAdvanceButton flag hides the button even for a manager.
     * Interacts with: Evaluation.showAdvanceButton.
     * Data: system ManageEvaluations; showAdvanceButton false.
     */
    it('hides Advance Move when the evaluation turns it off', async () => {
      await renderEvaluationInfo({
        claims: { system: [SystemPermission.ManageEvaluations] },
        evaluation: { showAdvanceButton: false },
      });
      expect(advanceButton()).not.toBeInTheDocument();
    });

    /**
     * Verifies: there is nothing to advance to from the last move.
     * Interacts with: getMaxMoveNumber() over the moveList input.
     * Data: system ManageEvaluations; evaluation on move 3 of 3.
     */
    it('hides Advance Move on the last move', async () => {
      await renderEvaluationInfo({
        claims: { system: [SystemPermission.ManageEvaluations] },
        evaluation: { currentMoveNumber: 3 },
      });
      expect(advanceButton()).not.toBeInTheDocument();
    });

    /**
     * Verifies: clicking Advance Move asks for confirmation and, once confirmed, emits the next move number.
     * Interacts with: CrucibleDialogService.confirm stub, nextEvaluationMove output, user-event click.
     * Data: system ManageEvaluations on move 1; the dialog answers true.
     */
    it('asks for confirmation before advancing', async () => {
      const { user, confirm, nextEvaluationMove } = await renderEvaluationInfo({
        claims: { system: [SystemPermission.ManageEvaluations] },
      });
      await user.click(advanceButton()!);
      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Advance to the next Move?' }),
      );
      expect(nextEvaluationMove).toHaveBeenCalledWith(2);
    });

    /**
     * Verifies: cancelling the confirmation does not advance the move.
     * Interacts with: CrucibleDialogService.confirm stub returning false, nextEvaluationMove output.
     * Data: system ManageEvaluations on move 1; dialog cancelled.
     */
    it('does not advance when the confirmation is cancelled', async () => {
      const { user, nextEvaluationMove } = await renderEvaluationInfo({
        claims: { system: [SystemPermission.ManageEvaluations] },
        confirm: false,
      });
      await user.click(advanceButton()!);
      expect(nextEvaluationMove).not.toHaveBeenCalled();
    });
  });
  describe('showAdminButton input', () => {
    /**
     * Verifies: with showAdminButton true the Administration and Aggregate Report buttons show, and Administration opens the admin page on its Evaluations section.
     * Interacts with: real Router (navigateByUrl spied), routerLink, real TeamStore activating t1.
     * Data: showAdminButton true; team t1 active; dashboard section.
     */
    it('shows Administration and Aggregate Report when showAdminButton is true', async () => {
      const { user } = await renderEvaluationInfo({
        showAdminButton: true,
        activeTeam: true,
      });
      const router = TestBed.inject(Router);
      const navigate = vi
        .spyOn(router, 'navigateByUrl')
        .mockResolvedValue(true);

      expect(aggregateReportButton()).toBeInTheDocument();
      await user.click(administrationButton()!);

      expect(navigate).toHaveBeenCalledOnce();
      expect(router.serializeUrl(navigate.mock.calls[0][0] as UrlTree)).toBe(
        '/admin?section=Evaluations',
      );
    });

    /**
     * Verifies: the Aggregate Report button switches the header to the aggregate section.
     * Interacts with: changeSection output, setSection().
     * Data: showAdminButton true; team t1 active; dashboard section.
     */
    it('opens the aggregate section from Aggregate Report', async () => {
      const { user, changeSection } = await renderEvaluationInfo({
        showAdminButton: true,
        activeTeam: true,
      });

      await user.click(aggregateReportButton()!);

      expect(changeSection).toHaveBeenCalledWith(Section.aggregate);
      expect(aggregateReportButton()).not.toBeInTheDocument();
      expect(administrationButton()).toBeInTheDocument();
    });

    /**
     * Verifies: on the aggregate section only Administration is offered; Aggregate Report is left out.
     * Interacts with: selectedSection input.
     * Data: showAdminButton true; team t1 active; aggregate section.
     */
    it('leaves Aggregate Report out while the aggregate section is shown', async () => {
      await renderEvaluationInfo({
        showAdminButton: true,
        activeTeam: true,
        selectedSection: Section.aggregate,
      });

      expect(administrationButton()).toBeInTheDocument();
      expect(aggregateReportButton()).not.toBeInTheDocument();
    });

    /**
     * Verifies: with showAdminButton false (the parent's canViewAdministration denied) neither Administration nor Aggregate Report shows, while the other section buttons do.
     * Interacts with: showAdminButton input, real TeamStore activating t1.
     * Data: showAdminButton false; team t1 active; dashboard section.
     */
    it('hides Administration and Aggregate Report when showAdminButton is false', async () => {
      await renderEvaluationInfo({
        showAdminButton: false,
        activeTeam: true,
      });

      expect(
        screen.getByRole('button', { name: 'Submission Review' }),
      ).toBeInTheDocument();
      expect(administrationButton()).not.toBeInTheDocument();
      expect(aggregateReportButton()).not.toBeInTheDocument();
    });
  });

  describe('team selector', () => {
    const TEAMS: Team[] = [
      { id: 't1', shortName: 'BLUE' },
      { id: 't2', shortName: 'RED' },
    ];

    /**
     * Verifies: with one team the header names it as the user's team, with no team menu.
     * Interacts with: teamList input, real TeamStore activating t1, getTeamShortName().
     * Data: teamList BLUE only; myTeamId t1.
     */
    it('names the only team without a menu', async () => {
      await renderEvaluationInfo({
        activeTeam: true,
        teams: [{ id: 't1', shortName: 'BLUE' }],
      });

      expect(screen.getByText('Team:')).toBeVisible();
      expect(screen.getByText('BLUE')).toBeVisible();
      // The menu button is named by its text, the selected team.
      expect(
        screen.queryByRole('button', { name: 'BLUE' }),
      ).not.toBeInTheDocument();
    });

    /**
     * Verifies: with several teams the menu button shows the selected team, and picking another team emits it and switches the label to Observing.
     * Interacts with: the Select a team menu (mat-menu), setActiveTeam(), the changeTeam output, getSelectedTeamShortName().
     * Data: teamList BLUE (t1, the user's team) and RED (t2); t1 active; the user picks RED.
     */
    it('switches to another team from the team menu', async () => {
      const { user, changeTeam } = await renderEvaluationInfo({
        activeTeam: true,
        teams: TEAMS,
      });
      const teamButton = screen.getByRole('button', { name: 'BLUE' });
      expect(teamButton).toHaveAttribute('title', 'Select a team');
      expect(screen.getByText('Team:')).toBeVisible();

      await user.click(teamButton);
      await user.click(await screen.findByRole('menuitem', { name: 'RED' }));

      expect(changeTeam).toHaveBeenCalledWith('t2');
      expect(screen.getByRole('button', { name: 'RED' })).toHaveAttribute(
        'title',
        'Select a team',
      );
      expect(screen.getByText('Observing:')).toBeVisible();
    });
  });
});
