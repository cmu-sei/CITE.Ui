// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, of } from 'rxjs';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CrucibleDialogService } from '@cmusei/crucible-common';
import {
  Evaluation,
  ItemStatus,
  Move,
  ScoringCategory,
  ScoringModel,
  ScoringOptionSelection,
  Submission,
  SubmissionComment,
  SubmissionService,
  TeamPermission,
  TeamPermissionClaim,
} from '../../generated/cite.api';
import { ScoresheetComponent } from './scoresheet.component';
import { DisplayOrderPipe } from '../../utilities/sort-by-pipe';
import { EvaluationStore } from '../../data/evaluation/evaluation.store';
import { MoveStore } from '../../data/move/move.store';
import { ScoringModelStore } from '../../data/scoring-model/scoring-model.store';
import { SubmissionStore } from '../../data/submission/submission.store';
import { TeamStore } from '../../data/team/team.store';
import { UIDataService } from '../../data/ui/ui-data.service';
import { SubmissionDataService } from '../../data/submission/submission-data.service';
import { TeamMembershipDataService } from '../../data/team/team-membership-data.service';
import { UserDataService } from '../../data/user/user-data.service';
import { ApiStub } from '../../test-utils/api-stub';
import { dialogRefStub } from '../../test-utils/dialog-refs';
import { permissionDataProviders } from '../../test-utils/mock-permission-data.service';
import { renderComponent } from '../../test-utils/render-component';
import {
  captureUnhandledRxErrors,
  flush,
} from '../../test-utils/unhandled-rx-errors';

// A real Akita store, already holding data when the component is built, as it
// is once the home page has loaded the evaluation.
function seededStore<S>(
  StoreClass: new () => S,
  seed: (store: S) => void,
): Provider {
  return {
    provide: StoreClass,
    useFactory: () => {
      const store = new StoreClass();
      seed(store);
      return store;
    },
  };
}

function category(
  id: string,
  first: number,
  last: number,
  order: number,
): ScoringCategory {
  return {
    id,
    description: `Category ${id}`,
    displayOrder: order,
    moveNumberFirstDisplay: first,
    moveNumberLastDisplay: last,
    // No options: option rows dereference the displayed submission, which is
    // not what these tests are about.
    scoringOptions: [],
  };
}

const MODEL: ScoringModel = {
  id: 'sm1',
  description: 'NCISS',
  displayScoringModelByMoveNumber: true,
  hideScoresOnScoreSheet: true,
  useSubmit: true,
  // Both user and team scores, so the header row (score type buttons and the
  // Submit/Clear/Preset controls) is shown.
  useUserScore: true,
  useTeamScore: true,
  scoringCategories: [
    category('one', 1, 1, 1),
    category('two', 2, 2, 2),
    category('always', 0, 9, 3),
  ],
};

async function renderScoresheet(
  overrides: {
    model?: Partial<ScoringModel>;
    evaluation?: Partial<Evaluation>;
    activeSubmission?: Partial<Submission> | null;
    teamClaims?: TeamPermissionClaim[];
    // null: no view saved yet (the user never picked User or Team).
    displaying?: 'user' | 'team' | null;
    myTeamId?: string;
    activeTeam?: boolean;
    moves?: Move[];
    confirm?: boolean;
    addSubmissionComment?: (
      id: string,
      comment?: SubmissionComment,
    ) => Observable<Submission>;
    changeSubmissionComment?: (
      id: string,
      commentId: string,
      comment?: SubmissionComment,
    ) => Observable<Submission>;
    removeSubmissionComment?: (
      id: string,
      commentId: string,
    ) => Observable<Submission>;
  } = {},
) {
  const evaluation: Evaluation = {
    id: 'e1',
    currentMoveNumber: 2,
    ...overrides.evaluation,
  };
  const submission =
    overrides.activeSubmission === null
      ? null
      : {
          id: 's1',
          evaluationId: 'e1',
          teamId: 't1',
          moveNumber: 2,
          score: 0,
          status: ItemStatus.Active,
          ...overrides.activeSubmission,
        };
  // UIDataService reads the submission type from localStorage when built.
  if (overrides.displaying !== null) {
    new UIDataService().setSubmissionType('e1', overrides.displaying ?? 'team');
  }

  const submissionApi = {
    clearSubmission: vi.fn((id: string) => of({ ...submission, id })),
    presetSubmission: vi.fn((id: string) => of({ ...submission, id })),
    updateSubmission: vi.fn((id: string, s?: Submission) => of({ ...s, id })),
    addSubmissionComment: vi.fn(
      overrides.addSubmissionComment ??
        ((id: string) => of({ ...submission, id })),
    ),
    changeSubmissionComment: vi.fn(
      overrides.changeSubmissionComment ??
        ((id: string) => of({ ...submission, id })),
    ),
    removeSubmissionComment: vi.fn(
      overrides.removeSubmissionComment ??
        ((id: string) => of({ ...submission, id })),
    ),
  } satisfies ApiStub<SubmissionService>;
  const confirm = vi.fn(
    () => dialogRefStub<unknown, boolean>(overrides.confirm ?? true).dialogRef,
  );
  const dialogService: Pick<CrucibleDialogService, 'confirm'> = { confirm };
  const selectDisplayedSubmission = vi.fn();

  const rendered = await renderComponent(ScoresheetComponent, {
    declarations: [ScoresheetComponent, DisplayOrderPipe],
    imports: [
      MatButtonModule,
      MatCardModule,
      MatCheckboxModule,
      MatFormFieldModule,
      MatIconModule,
      MatInputModule,
      MatProgressBarModule,
      MatTableModule,
      MatTooltipModule,
    ],
    componentInputs: { myTeamId: overrides.myTeamId ?? 't1', noChanges: false },
    on: { selectDisplayedSubmission },
    providers: [
      ...permissionDataProviders({ team: overrides.teamClaims ?? [] }),
      seededStore(EvaluationStore, (s) => {
        s.set([evaluation]);
        s.setActive('e1');
      }),
      seededStore(ScoringModelStore, (s) => {
        s.set([{ ...MODEL, ...overrides.model }]);
        s.setActive('sm1');
      }),
      seededStore(MoveStore, (s) => s.set(overrides.moves ?? [])),
      seededStore(TeamStore, (s) => {
        s.set([{ id: 't1', name: 'Red', memberships: [] }]);
        if (overrides.activeTeam !== false) s.setActive('t1');
      }),
      seededStore(SubmissionStore, (s) => {
        s.set(submission ? [submission] : []);
        if (submission) s.setActive(submission.id);
      }),
      SubmissionDataService,
      TeamMembershipDataService,
      UserDataService,
      { provide: SubmissionService, useValue: submissionApi },
      { provide: CrucibleDialogService, useValue: dialogService },
    ],
  });
  return {
    ...rendered,
    submissionApi,
    confirm,
    selectDisplayedSubmission,
    user: userEvent.setup(),
  };
}

// The toolbar is the table's header cell, rendered whenever a category
// applies to the move. Its buttons (the User/Team view buttons and Submit,
// Reopen, Clear and Preset) are found by role inside it and picked by their
// text, which is their accessible name; an absence check therefore fails as
// soon as the control renders. The name is matched on the text rather than
// with the query's `name` option: computing accessible names over the nested
// mat-tables took about 2 s per test without coverage (README, "Role queries
// are slow on big templates").
const toolbar = () =>
  document.querySelector<HTMLElement>('.scoresheet-toolbar') as HTMLElement;
const toolbarButton = (name: string): HTMLButtonElement | null =>
  (within(toolbar())
    .queryAllByRole('button')
    .find((b) => b.textContent?.trim() === name) as HTMLButtonElement) ?? null;

// Each category heading holds its number badge and its description.
const shownCategories = () =>
  Array.from(document.querySelectorAll('.category-title')).map(
    (el) =>
      `${el.querySelector('.category-number')?.textContent?.trim()}. ` +
      el.querySelector('.category-text')?.textContent?.trim(),
  );

describe('ScoresheetComponent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('categories by move', () => {
    /**
     * Verifies: only the categories that span the active submission's move are listed.
     * Interacts with: real ScoringModel/Submission/Evaluation stores, DisplayOrderPipe, mat-table.
     * Data: submission for move 1; categories for move 1, move 2, and moves 0-9.
     */
    it("lists the categories for the active submission's move", async () => {
      await renderScoresheet({ activeSubmission: { moveNumber: 1 } });
      expect(shownCategories()).toEqual([
        '1. Category one',
        '3. Category always',
      ]);
    });

    /**
     * Verifies: before any submission is active, the evaluation's current move picks the categories.
     * Interacts with: real EvaluationStore (current move 2), empty SubmissionStore.
     * Data: no active submission; evaluation on move 2.
     * Why: regression for the 'remove flashing data display' fix, which fell back to the current move.
     */
    it("uses the evaluation's current move until a submission is active", async () => {
      await renderScoresheet({ activeSubmission: null });
      expect(shownCategories()).toEqual([
        '2. Category two',
        '3. Category always',
      ]);
    });

    /**
     * Verifies: a model not displayed by move lists every category in display order.
     * Interacts with: DisplayOrderPipe, mat-table.
     * Data: displayScoringModelByMoveNumber false.
     */
    it('lists every category when the model is not split by move', async () => {
      await renderScoresheet({
        model: { displayScoringModelByMoveNumber: false },
      });
      expect(shownCategories()).toEqual([
        '1. Category one',
        '2. Category two',
        '3. Category always',
      ]);
    });

    /**
     * Verifies: when no category applies to the displayed move the sheet says no responses are required.
     * Interacts with: haveSomeScoringCategories, mat-table header.
     * Data: categories for moves 5-6 only; submission on move 2; user view, where Submit would show if the toolbar rendered.
     */
    it('says no responses are needed when no category applies', async () => {
      await renderScoresheet({
        displaying: 'user',
        model: { scoringCategories: [category('late', 5, 6, 1)] },
      });
      expect(
        screen.getByText('No responses required for this move.'),
      ).toBeInTheDocument();
      expect(toolbarButton('Submit')).not.toBeInTheDocument();
    });
  });

  describe('team score permission gates', () => {
    /**
     * Verifies: with SubmitTeamScore on the active team, the team score can be submitted.
     * Interacts with: real PermissionDataService.hasTeamPermission, setFormatting().
     * Data: displaying 'team'; claim SubmitTeamScore on t1.
     */
    it('shows Submit with SubmitTeamScore', async () => {
      await renderScoresheet({
        teamClaims: [
          { teamId: 't1', permissions: [TeamPermission.SubmitTeamScore] },
        ],
      });
      expect(toolbarButton('Submit')).toBeVisible();
      expect(toolbarButton('Submit')).toBeEnabled();
      expect(toolbarButton('Clear')).not.toBeInTheDocument();
      expect(toolbarButton('Preset')).not.toBeInTheDocument();
    });

    /**
     * Verifies: with EditTeamScore on the active team, the team score can be cleared and preset but not submitted.
     * Interacts with: real PermissionDataService.hasTeamPermission, setFormatting().
     * Data: displaying 'team'; claim EditTeamScore on t1.
     */
    it('shows Clear and Preset with EditTeamScore', async () => {
      await renderScoresheet({
        teamClaims: [
          { teamId: 't1', permissions: [TeamPermission.EditTeamScore] },
        ],
      });
      expect(toolbarButton('Clear')).toBeVisible();
      expect(toolbarButton('Preset')).toBeVisible();
      expect(toolbarButton('Submit')).not.toBeInTheDocument();
    });

    /**
     * Verifies: with Submit and Edit claims on another team the team score is read-only, while the toolbar still renders its view buttons.
     * Interacts with: real PermissionDataService.hasTeamPermission, the toolbar's buttons by role and name.
     * Data: displaying 'team'; Submit and Edit claims on t2 only.
     */
    it('hides team score controls without a claim on the active team', async () => {
      await renderScoresheet({
        teamClaims: [
          {
            teamId: 't2',
            permissions: [
              TeamPermission.SubmitTeamScore,
              TeamPermission.EditTeamScore,
            ],
          },
        ],
      });
      expect(toolbarButton('Team')).toBeVisible();
      for (const name of ['Submit', 'Clear', 'Preset']) {
        expect(toolbarButton(name)).not.toBeInTheDocument();
      }
    });

    /**
     * Verifies: a user's own score can always be edited and submitted, whatever the team claims.
     * Interacts with: setFormatting() 'user' branch.
     * Data: displaying 'user'; no team claims.
     */
    it("always allows editing the user's own score", async () => {
      await renderScoresheet({ displaying: 'user' });
      for (const name of ['Submit', 'Clear', 'Preset']) {
        expect(toolbarButton(name)).toBeVisible();
      }
    });

    /**
     * Verifies: observing another team shows only the submission status, never the controls.
     * Interacts with: myTeamId input vs the active team.
     * Data: myTeamId t9 while t1 is active; user scoring; active submission.
     */
    it('shows only the status when observing another team', async () => {
      await renderScoresheet({ displaying: 'user', myTeamId: 't9' });
      expect(screen.getByText('Unsubmitted')).toBeVisible();
      for (const name of ['Submit', 'Clear', 'Preset']) {
        expect(toolbarButton(name)).not.toBeInTheDocument();
      }
    });

    /**
     * Verifies: Reopen on a completed current-move submission follows SubmitTeamScore on the active team;
     * near misses (EditTeamScore on t1, SubmitTeamScore on another team) hide it.
     * Interacts with: real PermissionDataService.hasTeamPermission, setFormatting() showReopenButton.
     * Data: displaying 'team'; submission s1 Complete on move 2 (the current move); per row, one team claim.
     */
    it.each<{ label: string; claim: TeamPermissionClaim; shown: boolean }>([
      {
        label: 'SubmitTeamScore on t1',
        claim: { teamId: 't1', permissions: [TeamPermission.SubmitTeamScore] },
        shown: true,
      },
      {
        label: 'EditTeamScore on t1',
        claim: { teamId: 't1', permissions: [TeamPermission.EditTeamScore] },
        shown: false,
      },
      {
        label: 'SubmitTeamScore on t2',
        claim: { teamId: 't2', permissions: [TeamPermission.SubmitTeamScore] },
        shown: false,
      },
    ])('Reopen shown=$shown with $label', async ({ claim, shown }) => {
      await renderScoresheet({
        activeSubmission: { status: ItemStatus.Complete },
        teamClaims: [claim],
      });
      if (shown) {
        expect(toolbarButton('Reopen')).toBeVisible();
        expect(within(toolbar()).getByText('Submitted')).toBeVisible();
      } else {
        expect(toolbarButton('Reopen')).not.toBeInTheDocument();
      }
    });

    /**
     * Verifies: clicking Reopen sends the displayed submission back to Active.
     * Interacts with: user-event click, real SubmissionDataService, SubmissionService.updateSubmission stub.
     * Data: displaying 'team'; SubmitTeamScore on t1; submission s1 Complete on the current move.
     */
    it('Reopen sets the submission back to Active', async () => {
      const { user, submissionApi } = await renderScoresheet({
        activeSubmission: { status: ItemStatus.Complete },
        teamClaims: [
          { teamId: 't1', permissions: [TeamPermission.SubmitTeamScore] },
        ],
      });
      await user.click(toolbarButton('Reopen')!);
      expect(submissionApi.updateSubmission).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({ id: 's1', status: ItemStatus.Active }),
      );
    });

    /**
     * Verifies: Clear and Preset each call their submission endpoint for the displayed submission; Clear only after the user confirms, Preset without asking.
     * Interacts with: user-event click, CrucibleDialogService.confirm stub (accepted), real SubmissionDataService, SubmissionService stub.
     * Data: user scoring on active submission s1; one button per row.
     */
    it.each([
      { name: 'Clear', endpoint: 'clearSubmission', asks: true },
      { name: 'Preset', endpoint: 'presetSubmission', asks: false },
    ] as const)(
      '$name calls $endpoint for the displayed submission',
      async ({ name, endpoint, asks }) => {
        const { user, submissionApi, confirm } = await renderScoresheet({
          displaying: 'user',
        });
        await user.click(toolbarButton(name)!);
        expect(submissionApi[endpoint]).toHaveBeenCalledWith('s1');
        expect(confirm).toHaveBeenCalledTimes(asks ? 1 : 0);
      },
    );

    /**
     * Verifies: Clear asks before it removes every selection, and keeps them when the user declines.
     * Interacts with: user-event click, CrucibleDialogService.confirm stub (declined), SubmissionService.clearSubmission stub.
     * Data: user scoring on active submission s1; the confirmation is cancelled.
     */
    it('keeps the selections when Clear is declined', async () => {
      const { user, submissionApi, confirm } = await renderScoresheet({
        displaying: 'user',
        confirm: false,
      });
      await user.click(toolbarButton('Clear')!);

      expect(confirm).toHaveBeenCalledWith({
        title: 'Clear all selections?',
        message: 'This removes every selection on this scoresheet. Are you sure?',
      });
      expect(submissionApi.clearSubmission).not.toHaveBeenCalled();
    });

    /**
     * Verifies: until the user picks a view, the scoresheet treats the shown submission's kind as the view: a user submission gets every control, a team submission follows the team claims; EditTeamScore on another team is the near miss.
     * Interacts with: setFormatting() fallback when UIDataService has no saved type, real PermissionDataService.hasTeamPermission.
     * Data: no saved submission type; per row, a user submission (userId u1) or a team submission, and the team claims.
     */
    it.each<{
      label: string;
      userId?: string;
      claims: TeamPermissionClaim[];
      shown: string[];
      hidden: string[];
    }>([
      {
        label: 'a user submission, no team claims',
        userId: 'u1',
        claims: [],
        shown: ['Submit', 'Clear', 'Preset'],
        hidden: [],
      },
      {
        label: 'a team submission, EditTeamScore t1',
        claims: [{ teamId: 't1', permissions: [TeamPermission.EditTeamScore] }],
        shown: ['Clear', 'Preset'],
        hidden: ['Submit'],
      },
      {
        label: 'a team submission, SubmitTeamScore t1',
        claims: [{ teamId: 't1', permissions: [TeamPermission.SubmitTeamScore] }],
        shown: ['Submit'],
        hidden: ['Clear', 'Preset'],
      },
      {
        label: 'a team submission, EditTeamScore t2',
        claims: [{ teamId: 't2', permissions: [TeamPermission.EditTeamScore] }],
        shown: [],
        hidden: ['Submit', 'Clear', 'Preset'],
      },
    ])(
      'with no saved view, $label shows $shown',
      async ({ userId, claims, shown, hidden }) => {
        await renderScoresheet({
          displaying: null,
          activeSubmission: { userId },
          teamClaims: claims,
        });
        for (const name of shown) {
          expect(toolbarButton(name)).toBeVisible();
        }
        for (const name of hidden) {
          expect(toolbarButton(name)).not.toBeInTheDocument();
        }
      },
    );
  });

  describe('view buttons', () => {
    /**
     * Verifies: the saved view's button is pressed and the others not; with no saved view the shown submission's kind is pressed.
     * Interacts with: the toolbar's User and Team toggle buttons (aria-pressed), UIDataService saved type.
     * Data: per row, the saved type (or none) and the shown submission (team, or user u1).
     */
    it.each<{
      label: string;
      displaying: 'user' | 'team' | null;
      userId?: string;
      pressed: string;
      unpressed: string;
    }>([
      { label: 'saved Team', displaying: 'team', userId: 'u1', pressed: 'Team', unpressed: 'User' },
      { label: 'saved User', displaying: 'user', pressed: 'User', unpressed: 'Team' },
      { label: 'no saved view and a team submission', displaying: null, pressed: 'Team', unpressed: 'User' },
      { label: 'no saved view and a user submission', displaying: null, userId: 'u1', pressed: 'User', unpressed: 'Team' },
    ])(
      'presses $pressed for $label',
      async ({ displaying, userId, pressed, unpressed }) => {
        await renderScoresheet({ displaying, activeSubmission: { userId } });

        expect(toolbarButton(pressed)).toHaveAttribute('aria-pressed', 'true');
        expect(toolbarButton(unpressed)).toHaveAttribute('aria-pressed', 'false');
      },
    );

    /**
     * Verifies: clicking a view button asks the parent for that submission.
     * Interacts with: user-event click, the selectDisplayedSubmission output.
     * Data: displaying 'team'; the user clicks User, then Team Avg.
     */
    it('emits the picked view', async () => {
      const { user, selectDisplayedSubmission } = await renderScoresheet();
      await user.click(toolbarButton('User')!);
      await user.click(toolbarButton('Team Avg')!);

      expect(selectDisplayedSubmission.mock.calls).toEqual([
        ['user'],
        ['team-avg'],
      ]);
    });

    /**
     * Verifies: observing another team disables the User and Team Avg buttons but keeps Team.
     * Interacts with: myTeamId input vs the active team.
     * Data: myTeamId t9 while t1 is active.
     */
    it('disables the personal views when observing another team', async () => {
      await renderScoresheet({ myTeamId: 't9' });

      expect(toolbarButton('User')).toBeDisabled();
      expect(toolbarButton('Team Avg')).toBeDisabled();
      expect(toolbarButton('Team')).toBeEnabled();
    });
  });

  describe('option controls', () => {
    /**
     * Verifies: the option checkboxes and the Add, Edit and Delete Comment buttons follow EditTeamScore on the active team (showModifyControls); SubmitTeamScore alone is the near miss that leaves the checkboxes disabled and the comment buttons out.
     * Interacts with: setFormatting() showModifyControls, real PermissionDataService.hasTeamPermission, the option rows (checkbox and comment buttons by label).
     * Data: displaying 'team'; one Single category with options 'Isolate the host' (comment c1) and 'Reset passwords'; per row, one claim on t1.
     */
    it.each<{ label: string; permission: TeamPermission; editable: boolean }>([
      { label: 'EditTeamScore', permission: TeamPermission.EditTeamScore, editable: true },
      { label: 'SubmitTeamScore', permission: TeamPermission.SubmitTeamScore, editable: false },
    ])(
      'option controls editable=$editable with $label on t1',
      async ({ permission, editable }) => {
        await renderScoresheet({
          model: {
            scoringCategories: [
              {
                ...category('cat-1', 0, 9, 1),
                scoringOptionSelection: ScoringOptionSelection.Single,
                scoringOptions: [
                  { id: 'opt-1', scoringCategoryId: 'cat-1', description: 'Isolate the host', displayOrder: 1 },
                  { id: 'opt-2', scoringCategoryId: 'cat-1', description: 'Reset passwords', displayOrder: 2 },
                ],
              },
            ],
          },
          activeSubmission: {
            submissionCategories: [
              {
                scoringCategoryId: 'cat-1',
                submissionOptions: [
                  {
                    id: 'so-1',
                    scoringOptionId: 'opt-1',
                    isSelected: false,
                    submissionComments: [{ id: 'c1', comment: 'Done at noon' }],
                  },
                  { id: 'so-2', scoringOptionId: 'opt-2', isSelected: false, submissionComments: [] },
                ],
              },
            ],
          },
          teamClaims: [{ teamId: 't1', permissions: [permission] }],
        });

        expect(screen.getByText('Done at noon')).toBeVisible();
        // The checkbox's own input, since mat-checkbox carries the state.
        const checkbox = screen.getByLabelText('Isolate the host') as HTMLInputElement;
        expect(checkbox.disabled).toBe(!editable);
        const commentButtons = ['Add Comment', 'Edit Comment', 'Delete Comment'];
        for (const name of commentButtons) {
          if (editable) {
            expect(screen.getAllByLabelText(name)[0]).toBeVisible();
          } else {
            expect(screen.queryAllByLabelText(name)).toEqual([]);
          }
        }
      },
    );
  });

  describe('category scores and option values', () => {
    /**
     * Verifies: a scored category shows its score beside the title and its option values; an unscored one shows neither; with scores hidden on the scoresheet, neither shows on any category.
     * Interacts with: categoryScore(), the category header's score badge, the showScores and showValues checks, ScoringCategory.isScored.
     * Data: per row, hideScoresOnScoreSheet; category Scored (isScored, score 30) with options worth 10 and 20; category Unscored (not isScored) with an option worth 5.
     */
    it.each([
      { hideScores: false, scoredScore: 'Score 30', scoredValues: ['10', '20'] },
      { hideScores: true, scoredScore: null, scoredValues: [] },
    ])(
      'shows the score and values only for scored categories (scores hidden: $hideScores)',
      async ({ hideScores, scoredScore, scoredValues }) => {
        await renderScoresheet({
          model: {
            hideScoresOnScoreSheet: hideScores,
            scoringCategories: [
              {
                ...category('scored', 0, 9, 1),
                isScored: true,
                scoringOptionSelection: ScoringOptionSelection.Multiple,
                scoringOptions: [
                  { id: 'opt-1', scoringCategoryId: 'scored', description: 'Isolate the host', displayOrder: 1, value: 10 },
                  { id: 'opt-2', scoringCategoryId: 'scored', description: 'Reset passwords', displayOrder: 2, value: 20 },
                ],
              },
              {
                ...category('unscored', 0, 9, 2),
                isScored: false,
                scoringOptionSelection: ScoringOptionSelection.Single,
                scoringOptions: [
                  { id: 'opt-3', scoringCategoryId: 'unscored', description: 'Notify legal', displayOrder: 1, value: 5 },
                ],
              },
            ],
          },
          activeSubmission: {
            submissionCategories: [
              {
                scoringCategoryId: 'scored',
                score: 30,
                submissionOptions: [
                  { id: 'so-1', scoringOptionId: 'opt-1', isSelected: true },
                  { id: 'so-2', scoringOptionId: 'opt-2', isSelected: true },
                ],
              },
              {
                scoringCategoryId: 'unscored',
                score: 0,
                submissionOptions: [{ id: 'so-3', scoringOptionId: 'opt-3', isSelected: false }],
              },
            ],
          },
        });
  
        const [scored, unscored] = Array.from(document.querySelectorAll('.category-card'));
        const score = (card: Element) =>
          card.querySelector('.category-score')?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
        const values = (card: Element) =>
          Array.from(card.querySelectorAll('.option-value')).map((v) => v.textContent?.trim());
        expect(score(scored)).toBe(scoredScore);
        expect(values(scored)).toEqual(scoredValues);
        expect(score(unscored)).toBeNull();
        expect(values(unscored)).toEqual([]);
      },
    );
  });

  describe('comment boxes', () => {
    const COMMENT_MODEL: Partial<ScoringModel> = {
      displayCommentTextBoxes: true,
      scoringCategories: [
        {
          ...category('cat-1', 0, 9, 1),
          scoringOptionSelection: ScoringOptionSelection.None,
          scoringOptions: [
            { id: 'opt-1', scoringCategoryId: 'cat-1', description: 'What happened?', displayOrder: 1 },
            { id: 'opt-2', scoringCategoryId: 'cat-1', description: 'Who is affected?', displayOrder: 2 },
          ],
        },
      ],
    };
    const COMMENT_SUBMISSION: Partial<Submission> = {
      submissionCategories: [
        {
          scoringCategoryId: 'cat-1',
          submissionOptions: [
            { id: 'so-1', scoringOptionId: 'opt-1', submissionComments: [] },
            { id: 'so-2', scoringOptionId: 'opt-2', submissionComments: [] },
          ],
        },
      ],
    };

    /**
     * Verifies: each comment box is a numbered question named by its option, editable while the team score can be submitted; EditTeamScore alone (a near miss) leaves it disabled.
     * Interacts with: the comment textareas by label, showSubmitButton, real PermissionDataService.hasTeamPermission.
     * Data: displayCommentTextBoxes with useSubmit; displaying 'team'; per row, one claim on t1.
     */
    it.each<{ label: string; permission: TeamPermission; editable: boolean }>([
      { label: 'SubmitTeamScore', permission: TeamPermission.SubmitTeamScore, editable: true },
      { label: 'EditTeamScore', permission: TeamPermission.EditTeamScore, editable: false },
    ])(
      'comment boxes editable=$editable with $label',
      async ({ permission, editable }) => {
        const { fixture } = await renderScoresheet({
          model: COMMENT_MODEL,
          activeSubmission: COMMENT_SUBMISSION,
          teamClaims: [{ teamId: 't1', permissions: [permission] }],
        });
        // NgModel applies its disabled state a microtask later.
        await fixture.whenStable();
        fixture.detectChanges();

        expect(screen.getByText('1.')).toBeVisible();
        expect(screen.getByText('2.')).toBeVisible();
        const box = screen.getByLabelText('What happened?');
        if (editable) {
          expect(box).toBeEnabled();
        } else {
          expect(box).toBeDisabled();
        }
      },
    );

    /**
     * Verifies: an answer typed into a comment box shows Saving… while its request is open and Saved once it returns.
     * Interacts with: user-event typing and tab (change event), real SubmissionDataService.addSubmissionComment, SubmissionService stub held open by a Subject.
     * Data: user scoring; the first box answered 'Yes'.
     */
    it('shows the save state of an answer', async () => {
      const response = new Subject<Submission>();
      const { fixture, user, submissionApi } = await renderScoresheet({
        displaying: 'user',
        model: COMMENT_MODEL,
        activeSubmission: COMMENT_SUBMISSION,
        addSubmissionComment: () => response,
      });
      const box = screen.getByLabelText('What happened?');
      box.focus();
      await user.type(box, 'Yes', { skipClick: true });
      await user.tab();

      expect(submissionApi.addSubmissionComment).toHaveBeenCalledWith('s1', {
        submissionOptionId: 'so-1',
        comment: 'Yes',
      });
      expect(screen.getByText('Saving…')).toBeVisible();

      response.next({ id: 's1', evaluationId: 'e1', moveNumber: 2 });
      response.complete();
      fixture.detectChanges();

      expect(screen.getByText('Saved')).toBeVisible();
      expect(screen.queryByText('Saving…')).not.toBeInTheDocument();
    });

    /**
     * Verifies: editing a saved answer sends the change, and emptying it removes the comment; either way the box shows Saving… while the request is open and Saved once it returns.
     * Interacts with: user-event clear, typing and tab (change event), real SubmissionDataService change/removeSubmissionComment, SubmissionService stubs held open by a Subject.
     * Data: user scoring; the first box holds comment c1 'Phishing'; per row, the text the user leaves and the endpoint it calls.
     */
    it.each<{
      label: string;
      text: string;
      endpoint: 'changeSubmissionComment' | 'removeSubmissionComment';
      args: unknown[];
    }>([
      {
        label: 'edited',
        text: 'No',
        endpoint: 'changeSubmissionComment',
        args: ['s1', 'c1', { id: 'c1', comment: 'No' }],
      },
      {
        label: 'emptied',
        text: '',
        endpoint: 'removeSubmissionComment',
        args: ['s1', 'c1'],
      },
    ])(
      'shows the save state of an answer $label',
      async ({ text, endpoint, args }) => {
        const response = new Subject<Submission>();
        const { fixture, user, submissionApi } = await renderScoresheet({
          displaying: 'user',
          model: COMMENT_MODEL,
          activeSubmission: {
            submissionCategories: [
              {
                scoringCategoryId: 'cat-1',
                submissionOptions: [
                  {
                    id: 'so-1',
                    scoringOptionId: 'opt-1',
                    submissionComments: [{ id: 'c1', comment: 'Phishing' }],
                  },
                  { id: 'so-2', scoringOptionId: 'opt-2', submissionComments: [] },
                ],
              },
            ],
          },
          changeSubmissionComment: () => response,
          removeSubmissionComment: () => response,
        });
        await fixture.whenStable();
        fixture.detectChanges();
        const box = screen.getByLabelText('What happened?');
        expect(box).toHaveValue('Phishing');

        box.focus();
        await user.clear(box);
        if (text) {
          await user.type(box, text, { skipClick: true });
        }
        await user.tab();

        expect(submissionApi[endpoint]).toHaveBeenCalledWith(...args);
        expect(screen.getByText('Saving…')).toBeVisible();

        response.next({ id: 's1', evaluationId: 'e1', moveNumber: 2 });
        response.complete();
        fixture.detectChanges();

        expect(screen.getByText('Saved')).toBeVisible();
        expect(screen.queryByText('Saving…')).not.toBeInTheDocument();
      },
    );

    /**
     * Verifies: switching to another submission clears the save states shown for the previous one.
     * Interacts with: real SubmissionStore (the parent activating another submission), commentSaveStates reset on a new active submission.
     * Data: user scoring; the first box of s1 saved; then s2, with the same questions, is made active.
     */
    it('clears the save state when another submission is shown', async () => {
      const { fixture, user } = await renderScoresheet({
        displaying: 'user',
        model: COMMENT_MODEL,
        activeSubmission: COMMENT_SUBMISSION,
      });
      const box = screen.getByLabelText('What happened?');
      box.focus();
      await user.type(box, 'Yes', { skipClick: true });
      await user.tab();
      fixture.detectChanges();
      expect(screen.getByText('Saved')).toBeVisible();

      // The parent activates another submission when the user changes view.
      const store = fixture.debugElement.injector.get(SubmissionStore);
      store.upsert('s2', {
        id: 's2',
        evaluationId: 'e1',
        teamId: 't1',
        moveNumber: 2,
        status: ItemStatus.Active,
        ...structuredClone(COMMENT_SUBMISSION),
      });
      store.setActive('s2');
      fixture.detectChanges();

      expect(screen.getByLabelText('What happened?')).toBeVisible();
      expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    });

    /**
     * Verifies: a failed save shows Not saved by the box, and the error also escapes the data service's own subscription to the app's ErrorHandler (current behavior).
     * Interacts with: user-event typing and tab, real SubmissionDataService.addSubmissionComment (shared request), captureUnhandledRxErrors.
     * Data: user scoring; the request for the first box fails with a 500.
     */
    it('shows Not saved when an answer fails to save', async () => {
      const errors = captureUnhandledRxErrors();
      const failure = new HttpErrorResponse({ status: 500 });
      const response = new Subject<Submission>();
      const { fixture, user } = await renderScoresheet({
        displaying: 'user',
        model: COMMENT_MODEL,
        activeSubmission: COMMENT_SUBMISSION,
        addSubmissionComment: () => response,
      });
      const box = screen.getByLabelText('What happened?');
      box.focus();
      await user.type(box, 'Yes', { skipClick: true });
      await user.tab();

      response.error(failure);
      await flush();
      fixture.detectChanges();

      expect(screen.getByText('Not saved')).toBeVisible();
      // The data service subscribes without an error callback; ErrorService,
      // the app's ErrorHandler, shows the error.
      expect(errors).toEqual([failure]);
    });
  });

  /**
   * Verifies: with a single score type and useSubmit, Submit is shown while the view buttons are left out.
   * Interacts with: showHeader (view buttons only), the toolbar's buttons by role and name.
   * Data: model with only useTeamScore and useSubmit; SubmitTeamScore on t1.
   */
  it('shows the Submit control when the model uses one score type', async () => {
    await renderScoresheet({
      model: { useUserScore: false, useTeamScore: true },
      teamClaims: [
        { teamId: 't1', permissions: [TeamPermission.SubmitTeamScore] },
      ],
    });
    expect(toolbarButton('Submit')).toBeVisible();
    expect(toolbarButton('Team')).not.toBeInTheDocument();
    expect(toolbarButton('User')).not.toBeInTheDocument();
  });

  /**
   * Verifies: a user with no active team is told they lack access.
   * Interacts with: real TeamStore holding a team that is not active.
   * Data: no active team; no active submission.
   */
  it('explains missing access when no team is active', async () => {
    await renderScoresheet({ activeSubmission: null, activeTeam: false });
    expect(
      screen.getByText(
        'You have not been given appropriate access to this application.',
      ),
    ).toBeInTheDocument();
  });

  describe('answered count', () => {
    /**
     * Verifies: with comment boxes on, each non-modifier option is a question, answered by a comment with text.
     * Interacts with: getAnsweredCounts() through the toolbar's Answered count, real ScoringModel/Submission stores.
     * Data: displayCommentTextBoxes; one category with options opt-1, opt-2 and modifier mod-1; a comment on opt-1 only.
     */
    it('counts each comment box as a question when comment boxes are on', async () => {
      await renderScoresheet({
        model: {
          displayCommentTextBoxes: true,
          scoringCategories: [
            {
              ...category('cat-1', 0, 9, 1),
              scoringOptions: [
                { id: 'opt-1', scoringCategoryId: 'cat-1', description: 'What happened?' },
                { id: 'opt-2', scoringCategoryId: 'cat-1', description: 'Who is affected?' },
                { id: 'mod-1', scoringCategoryId: 'cat-1', description: 'Modifier', isModifier: true },
              ],
            },
          ],
        },
        activeSubmission: {
          submissionCategories: [
            {
              scoringCategoryId: 'cat-1',
              submissionOptions: [
                {
                  id: 'so-1',
                  scoringOptionId: 'opt-1',
                  submissionComments: [{ id: 'c1', comment: 'an answer' }],
                },
                { id: 'so-2', scoringOptionId: 'opt-2', submissionComments: [] },
              ],
            },
          ],
        },
      });

      expect(screen.getByText('Answered 1 of 2')).toBeVisible();
    });

    /**
     * Verifies: without comment boxes, each category that takes a selection is one question, answered by a selected option; a None category is not counted.
     * Interacts with: getAnsweredCounts() through the toolbar's Answered count, isSelected().
     * Data: categories cat-1 and cat-2 (Single) and cat-3 (None), one option each; opt-1 selected, opt-2 not.
     */
    it('counts each selectable category as a question without comment boxes', async () => {
      const single = (id: string, option: string, order: number) => ({
        ...category(id, 0, 9, order),
        scoringOptionSelection: ScoringOptionSelection.Single,
        scoringOptions: [{ id: option, scoringCategoryId: id, description: `Option ${option}` }],
      });
      await renderScoresheet({
        model: {
          scoringCategories: [
            single('cat-1', 'opt-1', 1),
            single('cat-2', 'opt-2', 2),
            {
              ...single('cat-3', 'opt-3', 3),
              scoringOptionSelection: ScoringOptionSelection.None,
            },
          ],
        },
        activeSubmission: {
          submissionCategories: [
            {
              scoringCategoryId: 'cat-1',
              submissionOptions: [
                { id: 'so-1', scoringOptionId: 'opt-1', isSelected: true, submissionComments: [] },
              ],
            },
            {
              scoringCategoryId: 'cat-2',
              submissionOptions: [
                { id: 'so-2', scoringOptionId: 'opt-2', isSelected: false, submissionComments: [] },
              ],
            },
          ],
        },
      });

      expect(screen.getByText('Answered 1 of 2')).toBeVisible();
    });
  });

  /**
   * Verifies: a move with no questions lists no categories and names the next move that has questions, by its description.
   * Interacts with: getDisplayedScoringCategories(), getNextQuestionMove(), real MoveStore.
   * Data: categories on moves 0, 3 and 5; submission on move 1; move 3 described 'Move 3: Escalation'.
   */
  it('names the next move with questions on an empty move', async () => {
    await renderScoresheet({
      model: {
        scoringCategories: [
          category('cat-1', 0, 0, 1),
          category('cat-2', 3, 3, 2),
          category('cat-3', 5, 5, 3),
        ],
      },
      activeSubmission: { moveNumber: 1 },
      moves: [{ id: 'mv3', moveNumber: 3, description: 'Move 3: Escalation' }],
    });

    expect(shownCategories()).toEqual([]);
    expect(screen.getByText('No responses required for this move.')).toBeVisible();
    expect(screen.getByText('Questions open in Move 3: Escalation.')).toBeVisible();
  });

  /**
   * Verifies: the empty-move note names the next move by number when it has no description, and names none when no later move has questions.
   * Interacts with: getNextQuestionMove(), real MoveStore.
   * Data: submission on move 1; per row, the categories' moves and the stored moves.
   */
  it.each<{ label: string; first: number; moves: Move[]; note: string | null }>([
    { label: 'a later move without a description', first: 3, moves: [{ id: 'mv3', moveNumber: 3 }], note: 'Questions open in Move 3.' },
    { label: 'a later move not loaded', first: 4, moves: [], note: 'Questions open in Move 4.' },
    { label: 'no later move', first: 0, moves: [], note: null },
  ])('names the next move for $label', async ({ first, moves, note }) => {
    await renderScoresheet({
      model: { scoringCategories: [category('cat-1', first, first, 1)] },
      activeSubmission: { moveNumber: 1 },
      moves,
    });

    expect(screen.getByText('No responses required for this move.')).toBeVisible();
    if (note) {
      expect(screen.getByText(note)).toBeVisible();
    } else {
      expect(screen.queryByText(/^Questions open in/)).not.toBeInTheDocument();
    }
  });
});
