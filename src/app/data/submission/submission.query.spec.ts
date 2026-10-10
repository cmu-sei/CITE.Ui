// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { Submission } from '../../generated/cite.api';
import { SubmissionQuery } from './submission.query';
import { SubmissionStore } from './submission.store';
import { SubmissionType } from './submission.models';
import { TeamQuery } from '../team/team.query';
import { TeamStore } from '../team/team.store';
import { UserQuery } from '../user/user.query';
import { UserStore } from '../user/user.store';
import { recordEmissions } from '../../test-utils/record-emissions';

// Pure store + query tests: real submission, team and user stores, no TestBed.
function setup() {
  const submissionStore = new SubmissionStore();
  const teamStore = new TeamStore();
  const userStore = new UserStore();
  const query = new SubmissionQuery(
    submissionStore,
    new TeamQuery(teamStore),
    new UserQuery(userStore),
  );
  teamStore.set([
    { id: 't1', name: 'Red Team' },
    { id: 't2', name: 'blue team' },
  ]);
  userStore.set([{ id: 'u1', name: 'Alice' }]);
  return { query, submissionStore, teamStore, userStore };
}

function submission(overrides: Partial<Submission>): Submission {
  return { evaluationId: 'e1', moveNumber: 1, score: 0, ...overrides };
}

describe('SubmissionQuery.selectAllPopulated()', () => {
  /**
   * Verifies: each submission gets the submission type and display name for its owner.
   * Interacts with: real SubmissionStore/TeamQuery/UserQuery, SubmissionQuery.selectAllPopulated.
   * Data: one user, team, team-average, group-average and official submission on move 1.
   */
  it('names and types every kind of submission', async () => {
    const { query, submissionStore } = setup();
    submissionStore.set([
      submission({ id: 's-user', userId: 'u1' }),
      submission({ id: 's-team', teamId: 't1' }),
      submission({ id: 's-team-avg', teamId: 't1', scoreIsAnAverage: true }),
      submission({ id: 's-group', groupId: 'g1', scoreIsAnAverage: true }),
      submission({ id: 's-official' }),
    ]);
    const populated = await firstValueFrom(query.selectAllPopulated());
    const byId = Object.fromEntries(
      populated.map((s) => [s.id, [s.submissionType, s.name]]),
    );
    expect(byId).toEqual({
      's-user': [SubmissionType.user, 'Alice'],
      's-team': [SubmissionType.team, 'Red Team'],
      's-team-avg': [SubmissionType.teamAvg, 'Red Team'],
      // The group name lookup is commented out (TODO in the query), so the
      // group id is shown as the name.
      's-group': [SubmissionType.groupAvg, 'g1'],
      's-official': [SubmissionType.official, 'Official Score'],
    });
  });

  /**
   * Verifies: a user or team that is not loaded falls back to its id as the name.
   * Interacts with: SubmissionQuery.selectAllPopulated with TeamQuery/UserQuery missing the owner.
   * Data: submissions for unknown user u9 and unknown team t9.
   */
  it('falls back to the owner id when the owner is not loaded', async () => {
    const { query, submissionStore } = setup();
    submissionStore.set([
      submission({ id: 'a', userId: 'u9' }),
      submission({ id: 'b', teamId: 't9' }),
    ]);
    const populated = await firstValueFrom(query.selectAllPopulated());
    expect(populated.map((s) => s.name).sort()).toEqual(['t9', 'u9']);
  });

  /**
   * Verifies: results sort by move number descending, then submission type, then name case-insensitively.
   * Interacts with: SubmissionQuery.selectAllPopulated sort.
   * Data: two team submissions and a user submission on move 1, an official one on move 2.
   * Why: types compare as their display strings, so 'Official' < 'Team' < 'User'.
   */
  it('sorts by move descending, then type, then name', async () => {
    const { query, submissionStore } = setup();
    submissionStore.set([
      submission({ id: 'user-m1', userId: 'u1', moveNumber: 1 }),
      submission({ id: 'red-m1', teamId: 't1', moveNumber: 1 }),
      submission({ id: 'blue-m1', teamId: 't2', moveNumber: 1 }),
      submission({ id: 'official-m2', moveNumber: 2 }),
    ]);
    const populated = await firstValueFrom(query.selectAllPopulated());
    expect(populated.map((s) => s.id)).toEqual([
      'official-m2',
      'blue-m1',
      'red-m1',
      'user-m1',
    ]);
  });

  /**
   * Verifies: renaming a team re-emits the populated list with the new team name.
   * Interacts with: TeamStore.update feeding SubmissionQuery's combined stream.
   * Data: one team submission for t1; t1 renamed to 'Crimson'.
   */
  it('re-emits when a referenced team changes', () => {
    const { query, submissionStore, teamStore } = setup();
    submissionStore.set([submission({ id: 's1', teamId: 't1' })]);
    const seen = recordEmissions(query.selectAllPopulated());
    teamStore.update('t1', { name: 'Crimson' });
    expect(seen.map((list) => list[0].name)).toEqual(['Red Team', 'Crimson']);
  });

  /**
   * Verifies: populating copies submissions instead of mutating the stored entities.
   * Interacts with: SubmissionQuery.selectAllPopulated, SubmissionQuery.getEntity.
   * Data: one user submission.
   */
  it('leaves the stored submissions untouched', async () => {
    const { query, submissionStore } = setup();
    submissionStore.set([submission({ id: 's1', userId: 'u1' })]);
    await firstValueFrom(query.selectAllPopulated());
    expect(query.getEntity('s1')).not.toHaveProperty('name');
  });
});
