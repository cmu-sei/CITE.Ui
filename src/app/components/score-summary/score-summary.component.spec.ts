// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
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
    });

    expect(fixture.componentInstance).toBeInstanceOf(ScoreSummaryComponent);
    expect(
      screen.getByRole('heading', { name: 'Score Summary' }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual([
      'Level 5 - Emergency',
      'Level 4 - Severe',
      'Level 3 - High',
      'Level 2 - Medium',
      'Level 1 - Low',
      'Level 0 - Baseline',
    ]);
    expect(screen.getByText('No Active Submission')).toBeInTheDocument();
  });

  /**
   * Verifies: each submission of the active move is placed in its severity level, labelled by who scored it.
   * Interacts with: real SubmissionStore/SubmissionQuery (selectAll, selectActive).
   * Data: move 1 has a user 91.004, a team average 70 and an official 40; a move 0 submission is ignored.
   */
  it('places the active move submissions in their levels', async () => {
    const { fixture } = await renderComponent(ScoreSummaryComponent, {
      declarations: [ScoreSummaryComponent],
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

    // the scores listed under a level, as "type score"
    const levelScores = (name: string) => {
      const list = screen.queryByRole('list', { name: `Scores in ${name}` });
      return list
        ? within(list)
            .getAllByRole('listitem')
            .map((chip) => chip.textContent?.replace(/\s+/g, ' ').trim())
        : [];
    };
    expect(levelScores('Emergency')).toEqual(['User 91']);
    expect(levelScores('High')).toEqual(['Team Avg 70']);
    expect(levelScores('Low')).toEqual(['Official 40']);
    expect(levelScores('Baseline')).toEqual([]);
    expect(screen.getByText('Move 1')).toBeInTheDocument();
    expect(screen.queryByText('No Active Submission')).not.toBeInTheDocument();
  });

  /**
   * Verifies: the level and score of the submission shown on the scoresheet are marked as current.
   * Interacts with: real SubmissionStore/SubmissionQuery (selectAll, selectActive).
   * Data: move 2 has a team 80 (active) and a group average 80; a user 20 sits in Baseline.
   */
  it('marks the active submission and its level', async () => {
    const { fixture } = await renderComponent(ScoreSummaryComponent, {
      declarations: [ScoreSummaryComponent],
    });
    const store = TestBed.inject(SubmissionStore);
    store.set([
      { id: 't', moveNumber: 2, score: 80, teamId: 't1' },
      { id: 'g', moveNumber: 2, score: 80, groupId: 'g1', scoreIsAnAverage: true },
      { id: 'u', moveNumber: 2, score: 20, userId: 'u1' },
    ]);
    store.setActive('t');
    fixture.detectChanges();

    const level = (name: string) =>
      screen.getByRole('heading', { name: new RegExp(name) }).closest('li');
    expect(level('Severe')).toHaveClass('current');
    expect(level('Baseline')).not.toHaveClass('current');
    const chips = within(
      screen.getByRole('list', { name: 'Scores in Severe' }),
    ).getAllByRole('listitem');
    expect(chips.map((chip) => chip.classList.contains('active'))).toEqual([
      true,
      false,
    ]);
    expect(chips[1]).toHaveTextContent('Group Avg');
  });

  /**
   * Verifies: the scoring model's own severity levels replace the defaults, with their colors and ranges.
   * Interacts with: the selectedScoringModel input; real SubmissionStore/SubmissionQuery.
   * Data: levels Calm from 0 and Storm from 60; a team score of 72 is active.
   */
  it('shows the scoring models own severity levels', async () => {
    const { fixture } = await renderComponent(ScoreSummaryComponent, {
      declarations: [ScoreSummaryComponent],
      inputs: {
        selectedScoringModel: {
          severityLevels: [
            { name: 'Calm', minimumScore: 0, color: '#FFFFFF', description: 'Nothing happening' },
            { name: 'Storm', minimumScore: 60, color: '#8B0000', description: '' },
          ],
        },
      },
    });
    const store = TestBed.inject(SubmissionStore);
    store.set([{ id: 't', moveNumber: 1, score: 72, teamId: 't1' }]);
    store.setActive('t');
    fixture.detectChanges();

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual(['Level 1 - Storm', 'Level 0 - Calm']);
    expect(screen.getByText('60+')).toBeInTheDocument();
    expect(screen.getByText('<60')).toBeInTheDocument();
    expect(screen.getByText('Nothing happening')).toBeInTheDocument();
    const storm = screen.getByRole('heading', { name: 'Level 1 - Storm' }).closest('li') as HTMLElement;
    expect(storm).toHaveClass('current');
    expect(storm.querySelector('.level-swatch')).toHaveStyle({ backgroundColor: '#8B0000', color: '#FFFFFF' });
  });
});
