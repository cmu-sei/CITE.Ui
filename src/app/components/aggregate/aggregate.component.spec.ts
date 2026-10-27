// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { screen } from '@testing-library/angular';
import userEvent, {
  PointerEventsCheckLevel,
} from '@testing-library/user-event';
import { of } from 'rxjs';
import {
  Evaluation,
  ItemStatus,
  ScoringModel,
  ScoringOptionSelection,
  Submission,
  SubmissionService,
  TeamService,
} from '../../generated/cite.api';
import { UIDataService } from '../../data/ui/ui-data.service';
import { UserStore } from '../../data/user/user.store';
import { DisplayOrderPipe } from '../../utilities/sort-by-pipe';
import { ApiStub } from '../../test-utils/api-stub';
import { renderComponent } from '../../test-utils/render-component';
import { AggregateComponent } from './aggregate.component';

// The global stylesheets make every computed-style lookup slow in jsdom, and
// user-event's pointer-events check looks one up per ancestor on each click
// (about a second per click on this page under coverage). Clicks go to
// enabled, visible controls here, so the check is skipped.
const FAST_POINTER = { pointerEventsCheck: PointerEventsCheckLevel.Never };
// Role queries are slow here for the same reason, so the header and its
// buttons are found by their text.
const viewButton = (name: 'User' | 'Team') =>
  screen.getByText(name, { selector: '.view-buttons button *' });

const EVALUATION: Evaluation = {
  id: 'e1',
  description: 'Ransomware exercise',
  currentMoveNumber: 1,
};
const SCORING_MODEL: ScoringModel = {
  id: 'sm1',
  displayCommentTextBoxes: false,
  scoringCategories: [
    {
      id: 'c1',
      description: 'Functional impact',
      displayOrder: 1,
      scoringOptions: [{ id: 'o1', description: 'Minimal', value: 10 }],
    },
  ],
};
const withComment = (
  base: Submission,
  comment: string,
  createdBy: string,
): Submission => ({
  ...base,
  status: ItemStatus.Active,
  submissionCategories: [
    {
      scoringCategoryId: 'c1',
      submissionOptions: [
        {
          scoringOptionId: 'o1',
          isSelected: true,
          submissionComments: [{ id: `${base.id}-c`, comment, createdBy }],
        },
      ],
    },
  ],
});

// savedType: the view saved from the scoresheet (or before a print reload).
// isScored: set on the category, as the API marks a category with an equation.
// selection: replaces the category's option selection.
async function renderAggregate(
  savedType?: string,
  {
    observing,
    isScored,
    selection,
  }: {
    observing?: boolean;
    isScored?: boolean;
    selection?: ScoringOptionSelection;
  } = {},
) {
  const model: ScoringModel = {
    ...SCORING_MODEL,
    scoringCategories: SCORING_MODEL.scoringCategories?.map((c) => ({
      ...c,
      isScored,
      scoringOptionSelection: selection ?? c.scoringOptionSelection,
    })),
  };
  // UIDataService reads the submission type from localStorage when built.
  if (savedType) {
    new UIDataService().setSubmissionType('e1', savedType);
  }
  const selectDisplayedSubmission = vi.fn();
  const submissionApi = {
    getByEvaluation: vi.fn(() =>
      of([
        withComment(
          { id: 's-user', moveNumber: 1, userId: 'u1' },
          'Mail server down',
          'u1',
        ),
        withComment(
          { id: 's-team', moveNumber: 1, teamId: 't1' },
          'Payroll offline',
          'u1',
        ),
      ]),
    ),
  } satisfies ApiStub<SubmissionService>;
  const teamApi = {
    getEvaluationTeams: vi.fn(() =>
      of([{ id: 't1', name: 'Blue Team', shortName: 'BLU' }]),
    ),
  } satisfies ApiStub<TeamService>;
  const rendered = await renderComponent(AggregateComponent, {
    declarations: [AggregateComponent, DisplayOrderPipe],
    imports: [MatButtonModule, MatIconModule],
    componentInputs: {
      selectedEvaluation: EVALUATION,
      selectedScoringModel: model,
      moveList: [
        { id: 'm0', moveNumber: 0 },
        { id: 'm1', moveNumber: 1 },
        { id: 'm2', moveNumber: 2 },
      ],
      ...(observing === undefined ? {} : { observing }),
    },
    on: { selectDisplayedSubmission },
    providers: [
      { provide: SubmissionService, useValue: submissionApi },
      { provide: TeamService, useValue: teamApi },
    ],
    configureTestBed: (testBed) => {
      testBed.inject(UserStore).set([{ id: 'u1', name: 'Alice' }]);
    },
  });
  return {
    ...rendered,
    submissionApi,
    selectDisplayedSubmission,
    user: userEvent.setup(FAST_POINTER),
  };
}

describe('AggregateComponent', () => {
  beforeEach(() => localStorage.clear());

  /**
   * Verifies: the component mounts with the default test providers and reports user submissions for moves up to the current one.
   * Interacts with: SubmissionService.getByEvaluation and TeamService.getEvaluationTeams stubs, real UserQuery and UIDataService.
   * Data: current move 1; a user and a team submission on move 1, each with a comment.
   */
  it('renders with the default test providers', async () => {
    const { fixture, submissionApi } = await renderAggregate();

    expect(fixture.componentInstance).toBeInstanceOf(AggregateComponent);
    expect(submissionApi.getByEvaluation).toHaveBeenCalledWith('e1');
    expect(
      screen.getByText(/Submissions Report for Ransomware exercise/, {
        selector: 'h2',
      }),
    ).toHaveTextContent('User Submissions Report for Ransomware exercise');
    expect(
      screen
        .getAllByText('Move', { exact: false })
        .map((m) => m.textContent?.trim()),
    ).toEqual(['Move 0', 'Move 1']);
    expect(screen.getByText('Mail server down')).toBeInTheDocument();
    expect(screen.queryByText('Payroll offline')).not.toBeInTheDocument();
  });

  /**
   * Verifies: the Team button switches the report to team submissions, whose comments show their author, and reports the change for the home page to save.
   * Interacts with: the Team view button, the selectDisplayedSubmission output, the comment list's displaying check.
   * Data: the team submission's comment was written by Alice.
   */
  it('switches to team submissions with comment authors', async () => {
    const { user, selectDisplayedSubmission } = await renderAggregate();
    await user.click(viewButton('Team'));

    expect(
      screen.getByText(/Submissions Report for Ransomware exercise/, {
        selector: 'h2',
      }),
    ).toHaveTextContent('Team Submissions Report for Ransomware exercise');
    expect(selectDisplayedSubmission).toHaveBeenCalledExactlyOnceWith('team');
    expect(screen.getByText('Payroll offline')).toHaveTextContent(
      /^Payroll offline - Alice$/,
    );
  });

  /**
   * Verifies: the user view's comments show no author, since each row is already one user's.
   * Interacts with: the comment list's displaying check.
   * Data: Alice's own submission has the comment Mail server down.
   */
  it('shows user comments without an author', async () => {
    await renderAggregate();

    expect(screen.getByText('Mail server down')).toHaveTextContent(
      /^Mail server down$/,
    );
  });

  /**
   * Verifies: while observing another team, User is disabled as it is on the scoresheet.
   * Interacts with: the observing input, the User view button.
   * Data: observing true; the saved view is team, as the home page sets when observing.
   */
  it('disables User while observing another team', async () => {
    await renderAggregate('team', { observing: true });

    expect(viewButton('User').closest('button')).toBeDisabled();
    expect(viewButton('Team').closest('button')).toBeEnabled();
  });

  /**
   * Verifies: option values show on a scored category, not on an unscored one, and not on a scored one that takes no selections, as on the scoresheet.
   * Interacts with: the showValues check, ScoringCategory.isScored and scoringOptionSelection.
   * Data: per row, isScored and the selection on Functional impact; its option is worth 10; moves 0 and 1 are listed.
   */
  it.each<{
    isScored: boolean;
    selection?: ScoringOptionSelection;
    values: string[];
  }>([
    { isScored: true, values: ['10', '10'] },
    { isScored: false, values: [] },
    { isScored: true, selection: ScoringOptionSelection.None, values: [] },
  ])(
    'shows option values only when scored (isScored: $isScored, selection: $selection)',
    async ({ isScored, selection, values }) => {
      await renderAggregate(undefined, { isScored, selection });

      expect(
        Array.from(document.querySelectorAll('.option-value')).map((el) =>
          el.textContent?.trim(),
        ),
      ).toEqual(values);
    },
  );

  /**
   * Verifies: each option shows how many users or teams selected it and who they were.
   * Interacts with: the selected-count badge and Selected by names, the Team view button.
   * Data: move 0 has no submissions; Alice's and team BLU's move 1 submissions both select Minimal.
   */
  it('shows who selected each option', async () => {
    const { user } = await renderAggregate();
    // one per move, in move order
    const selections = () =>
      screen
        .getAllByText(/of \d+ selected/)
        .map((el) => el.textContent?.trim());
    const selectedBy = () =>
      Array.from(document.querySelectorAll('.selected-by .name-chip')).map(
        (chip) => chip.textContent?.trim(),
      );

    expect(selections()).toEqual(['0 of 0 selected:', '1 of 1 selected:']);
    expect(selectedBy()).toEqual(['Alice']);

    await user.click(viewButton('Team'));

    expect(selections()).toEqual(['0 of 0 selected:', '1 of 1 selected:']);
    expect(selectedBy()).toEqual(['BLU']);
  });

  /**
   * Verifies: the report opens on the saved Team view, so the choice made on the scoresheet (or before printing) is kept.
   * Interacts with: UIDataService.getSubmissionType, the selectDisplayedSubmission output.
   * Data: saved type team; the team submission's comment is Payroll offline.
   */
  it('opens on the saved team view', async () => {
    const { selectDisplayedSubmission } = await renderAggregate('team');

    expect(
      screen.getByText(/Submissions Report for Ransomware exercise/, {
        selector: 'h2',
      }),
    ).toHaveTextContent('Team Submissions Report for Ransomware exercise');
    expect(viewButton('Team').closest('button')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('Payroll offline')).toBeInTheDocument();
    expect(selectDisplayedSubmission).not.toHaveBeenCalled();
  });
});
