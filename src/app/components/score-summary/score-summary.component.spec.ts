// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MatTableModule } from '@angular/material/table';
import { screen, within } from '@testing-library/angular';
import { SubmissionStore } from '../../data/submission/submission.store';
import { renderComponent } from '../../test-utils/render-component';
import { ScoreSummaryComponent } from './score-summary.component';

describe('ScoreSummaryComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers and lists the six severity levels.
   * Interacts with: real SubmissionQuery (empty store).
   * Data: no submissions.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderComponent(ScoreSummaryComponent, {
      declarations: [ScoreSummaryComponent],
      imports: [MatTableModule],
    });

    expect(fixture.componentInstance).toBeInstanceOf(ScoreSummaryComponent);
    expect(
      screen.getByRole('heading', { name: 'Score Summary' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(7);
  });

  /**
   * Verifies: each submission of the active move is placed in its severity level, labelled by who scored it.
   * Interacts with: real SubmissionStore/SubmissionQuery (selectAll, selectActive).
   * Data: move 1 has a user 91.004, a team average 70 and an official 40; a move 0 submission is ignored.
   */
  it('places the active move submissions in their levels', async () => {
    const { fixture } = await renderComponent(ScoreSummaryComponent, {
      declarations: [ScoreSummaryComponent],
      imports: [MatTableModule],
    });
    const store = TestBed.inject(SubmissionStore);
    store.set([
      { id: 's1', moveNumber: 1, score: 91.004, userId: 'u1' },
      {
        id: 's2',
        moveNumber: 1,
        score: 70,
        teamId: 't1',
        scoreIsAnAverage: true,
      },
      { id: 's3', moveNumber: 1, score: 40 },
      { id: 's4', moveNumber: 0, score: 95, userId: 'u1' },
    ]);
    store.setActive('s1');
    fixture.detectChanges();

    const scoreCell = (level: string) =>
      within(
        screen
          .getByText(level, { selector: 'div' })
          .closest('mat-row') as HTMLElement,
      )
        .getAllByRole('cell')[0]
        .textContent?.trim();
    expect(scoreCell('Emergency')).toBe('91 (user)');
    expect(scoreCell('High')).toBe('70 (team-avg)');
    expect(scoreCell('Low')).toBe('40 (official)');
    expect(scoreCell('Baseline')).toBe('');
  });
});
