// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { screen } from '@testing-library/angular';
import userEvent, {
  PointerEventsCheckLevel,
} from '@testing-library/user-event';
import { of } from 'rxjs';
import {
  Evaluation,
  ItemStatus,
  ScoringModel,
  Submission,
  SubmissionService,
  TeamService,
} from '../../generated/cite.api';
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
// buttons are found by their text and aria-label.

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

async function renderAggregate() {
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
    imports: [MatButtonModule, MatIconModule, MatTableModule],
    componentInputs: {
      selectedEvaluation: EVALUATION,
      selectedScoringModel: SCORING_MODEL,
      moveList: [
        { id: 'm0', moveNumber: 0 },
        { id: 'm1', moveNumber: 1 },
        { id: 'm2', moveNumber: 2 },
      ],
    },
    providers: [
      { provide: SubmissionService, useValue: submissionApi },
      { provide: TeamService, useValue: teamApi },
    ],
    configureTestBed: (testBed) => {
      testBed.inject(UserStore).set([{ id: 'u1', name: 'Alice' }]);
    },
  });
  return { ...rendered, submissionApi, user: userEvent.setup(FAST_POINTER) };
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
   * Verifies: the toggle switches the report to team submissions, whose comments show without their author (current behavior).
   * Interacts with: the toggle button, the comment list's displaying check.
   * Data: the team submission's comment was written by Alice.
   */
  it('switches to team submissions without comment authors', async () => {
    const { user } = await renderAggregate();
    await user.click(
      screen.getByLabelText('Toggle between user and team scores'),
    );

    expect(
      screen.getByText(/Submissions Report for Ransomware exercise/, {
        selector: 'h2',
      }),
    ).toHaveTextContent('Team Submissions Report for Ransomware exercise');
    // Current behavior; see agent-docs/ui-test-bugs/cite.ui.md.
    expect(screen.getByText('Payroll offline')).toHaveTextContent(
      /^Payroll offline$/,
    );
  });
});
