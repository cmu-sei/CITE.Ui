// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, beforeEach } from 'vitest';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { screen } from '@testing-library/angular';
import userEvent, {
  PointerEventsCheckLevel,
} from '@testing-library/user-event';
import { of } from 'rxjs';
import { ComnAuthService } from '@cmusei/crucible-common';
import { User } from 'oidc-client-ts';
import {
  Evaluation,
  ItemStatus,
  ScoringModel,
  ScoringOptionSelection,
  Submission,
} from '../../generated/cite.api';
import { EvaluationStore } from '../../data/evaluation/evaluation.store';
import { ScoringModelStore } from '../../data/scoring-model/scoring-model.store';
import { SubmissionStore } from '../../data/submission/submission.store';
import { TeamStore } from '../../data/team/team.store';
import { DisplayOrderPipe } from '../../utilities/sort-by-pipe';
import { renderComponent } from '../../test-utils/render-component';
import { ReportComponent } from './report.component';

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
  scoringCategories: [
    {
      id: 'c1',
      description: 'Functional impact',
      displayOrder: 1,
      scoringOptionSelection: ScoringOptionSelection.Single,
      scoringOptions: [
        { id: 'o1', description: 'Minimal', displayOrder: 1, value: 10 },
        { id: 'o2', description: 'Significant', displayOrder: 2, value: 50 },
      ],
    },
  ],
};
const selecting = (base: Submission, optionId: string): Submission => ({
  ...base,
  status: ItemStatus.Active,
  submissionCategories: [
    {
      scoringCategoryId: 'c1',
      submissionOptions: [{ scoringOptionId: optionId, isSelected: true }],
    },
  ],
});

async function renderReport() {
  // The component reads only user$ (UserDataService.setCurrentUser).
  const auth: Pick<ComnAuthService, 'user$'> = {
    user$: of(
      new User({
        access_token: 'test-token',
        token_type: 'Bearer',
        profile: {
          sub: 'u1',
          name: 'Alice',
          iss: 'https://keycloak.test',
          aud: 'cite-ui',
          exp: 0,
          iat: 0,
        },
      }),
    ),
  };
  const rendered = await renderComponent(ReportComponent, {
    declarations: [ReportComponent, DisplayOrderPipe],
    imports: [
      MatButtonModule,
      MatCheckboxModule,
      MatIconModule,
      MatTableModule,
      MatTooltipModule,
    ],
    componentInputs: {
      selectedEvaluation: EVALUATION,
      selectedScoringModel: SCORING_MODEL,
      moveList: [{ id: 'm1', moveNumber: 1 }],
    },
    providers: [{ provide: ComnAuthService, useValue: auth }],
    configureTestBed: (testBed) => {
      // The home page activates the evaluation, scoring model and team before
      // the report shows; the constructor reads them from the stores.
      const evaluations = testBed.inject(EvaluationStore);
      evaluations.set([EVALUATION]);
      evaluations.setActive('e1');
      const models = testBed.inject(ScoringModelStore);
      models.set([SCORING_MODEL]);
      models.setActive('sm1');
      const teams = testBed.inject(TeamStore);
      teams.set([{ id: 't1', name: 'Blue Team', shortName: 'BLU' }]);
      teams.setActive('t1');
      testBed
        .inject(SubmissionStore)
        .set([
          selecting(
            { id: 's-user', moveNumber: 1, userId: 'u1', score: 10 },
            'o1',
          ),
          selecting(
            { id: 's-team', moveNumber: 1, teamId: 't1', score: 50 },
            'o2',
          ),
        ]);
    },
  });
  return { ...rendered, user: userEvent.setup(FAST_POINTER) };
}

describe('ReportComponent', () => {
  beforeEach(() => localStorage.clear());

  /**
   * Verifies: the component mounts with the default test providers and shows the signed-in user's responses.
   * Interacts with: real SubmissionQuery.selectAllPopulated, EvaluationQuery, ScoringModelQuery, TeamQuery, CurrentUserQuery and UserDataService.setCurrentUser.
   * Data: Alice's submission selects Minimal; the team's selects Significant.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderReport();

    expect(fixture.componentInstance).toBeInstanceOf(ReportComponent);
    expect(
      screen.getByText(/Responses for Ransomware exercise/, { selector: 'h2' }),
    ).toHaveTextContent("Alice's Responses for Ransomware exercise");
    expect(screen.getByLabelText('Minimal')).toBeChecked();
    expect(screen.getByLabelText('Significant')).not.toBeChecked();
  });

  /**
   * Verifies: the toggle switches to the active team's responses.
   * Interacts with: the toggle button, real TeamQuery.selectActive.
   * Data: the active team BLU selected Significant.
   */
  it('switches to the team responses', async () => {
    const { user } = await renderReport();
    await user.click(
      screen.getByLabelText('Toggle between user and team scores'),
    );

    expect(
      screen.getByText(/Responses for Ransomware exercise/, { selector: 'h2' }),
    ).toHaveTextContent("BLU's Responses for Ransomware exercise");
    expect(screen.getByLabelText('Significant')).toBeChecked();
  });
});
