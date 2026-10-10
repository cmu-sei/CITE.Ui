// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from '@angular/core';
import { of } from 'rxjs';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  Evaluation,
  ItemStatus,
  ScoringCategory,
  ScoringModel,
  Submission,
  SubmissionService,
  TeamPermission,
  TeamPermissionClaim,
} from '../../generated/cite.api';
import { ScoresheetComponent } from './scoresheet.component';
import { DisplayOrderPipe } from '../../utilities/sort-by-pipe';
import { EvaluationStore } from '../../data/evaluation/evaluation.store';
import { ScoringModelStore } from '../../data/scoring-model/scoring-model.store';
import { SubmissionStore } from '../../data/submission/submission.store';
import { TeamStore } from '../../data/team/team.store';
import { UIDataService } from '../../data/ui/ui-data.service';
import { SubmissionDataService } from '../../data/submission/submission-data.service';
import { TeamMembershipDataService } from '../../data/team/team-membership-data.service';
import { UserDataService } from '../../data/user/user-data.service';
import { ApiStub } from '../../test-utils/api-stub';
import { permissionDataProviders } from '../../test-utils/mock-permission-data.service';
import { renderComponent } from '../../test-utils/render-component';

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
    displaying?: 'user' | 'team';
    myTeamId?: string;
    activeTeam?: boolean;
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
  new UIDataService().setSubmissionType('e1', overrides.displaying ?? 'team');

  const submissionApi = {
    clearSubmission: vi.fn((id: string) => of({ ...submission, id })),
    presetSubmission: vi.fn((id: string) => of({ ...submission, id })),
    updateSubmission: vi.fn((id: string, s?: Submission) => of({ ...s, id })),
  } satisfies ApiStub<SubmissionService>;

  const rendered = await renderComponent(ScoresheetComponent, {
    declarations: [ScoresheetComponent, DisplayOrderPipe],
    imports: [
      MatButtonModule,
      MatCheckboxModule,
      MatFormFieldModule,
      MatIconModule,
      MatInputModule,
      MatTableModule,
      MatTooltipModule,
    ],
    componentInputs: { myTeamId: overrides.myTeamId ?? 't1', noChanges: false },
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
    ],
  });
  return { ...rendered, submissionApi, user: userEvent.setup() };
}

// Buttons are looked up by label inside the header's button bar (Submit,
// Reopen, Clear, Preset). A role query, even scoped to the bar, computes
// styles up the nested mat-tables and took up to 3.2 s per test under
// test:coverage (5 s timeout); visibility is asserted on the one element
// found.
const buttonBar = () => document.querySelector<HTMLElement>('.move-buttons');
const button = (name: string): HTMLButtonElement | null => {
  const bar = buttonBar();
  return bar
    ? (within(bar).queryByText(name)?.closest('button') ?? null)
    : null;
};

const shownCategories = () =>
  screen.queryAllByText(/^\d+\. Category /).map((el) => el.textContent?.trim());

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
     * Data: categories for moves 5-6 only; submission on move 2.
     */
    it('says no responses are needed when no category applies', async () => {
      await renderScoresheet({
        model: { scoringCategories: [category('late', 5, 6, 1)] },
      });
      expect(
        screen.getByText('No responses required for this move.'),
      ).toBeInTheDocument();
      expect(button('Submit')).not.toBeInTheDocument();
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
      expect(button('Submit')).toBeVisible();
      expect(button('Submit')).toBeEnabled();
      expect(button('Clear')).not.toBeInTheDocument();
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
      expect(button('Clear')).toBeVisible();
      expect(button('Preset')).toBeVisible();
      expect(button('Submit')).not.toBeInTheDocument();
    });

    /**
     * Verifies: without team claims (or with claims on another team) the team score is read-only.
     * Interacts with: real PermissionDataService.hasTeamPermission.
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
      for (const name of ['Submit', 'Clear', 'Preset']) {
        expect(button(name)).not.toBeInTheDocument();
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
        expect(button(name)).toBeVisible();
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
      expect(button('Submit')).not.toBeInTheDocument();
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
        expect(button('Reopen')).toBeVisible();
      } else {
        expect(button('Reopen')).not.toBeInTheDocument();
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
      await user.click(button('Reopen')!);
      expect(submissionApi.updateSubmission).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({ id: 's1', status: ItemStatus.Active }),
      );
    });

    /**
     * Verifies: Clear and Preset each call their submission endpoint for the displayed submission.
     * Interacts with: user-event click, real SubmissionDataService, SubmissionService stub.
     * Data: user scoring on active submission s1; one button per row.
     */
    it.each([
      { name: 'Clear', endpoint: 'clearSubmission' },
      { name: 'Preset', endpoint: 'presetSubmission' },
    ] as const)(
      '$name calls $endpoint for the displayed submission',
      async ({ name, endpoint }) => {
        const { user, submissionApi } = await renderScoresheet({
          displaying: 'user',
        });
        await user.click(button(name)!);
        expect(submissionApi[endpoint]).toHaveBeenCalledWith('s1');
      },
    );
  });

  /**
   * Verifies: with a single score type and useSubmit, the Submit button is rendered but hidden.
   * Interacts with: showHeader/matHeaderClass(), the component's .no-display style (display: none).
   * Data: model with only useTeamScore and useSubmit; SubmitTeamScore on t1.
   */
  it('hides the Submit control when the model uses one score type', async () => {
    await renderScoresheet({
      model: { useUserScore: false, useTeamScore: true },
      teamClaims: [
        { teamId: 't1', permissions: [TeamPermission.SubmitTeamScore] },
      ],
    });
    expect(button('Submit')).toBeInTheDocument();
    expect(button('Submit')).not.toBeVisible();
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
});
