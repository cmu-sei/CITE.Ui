// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { MoveStore } from './move.store';
import { MoveQuery } from './move.query';
import { recordEmissions } from '../../test-utils/record-emissions';

// Pure store + query tests: no TestBed, a fresh store per test.
describe('MoveQuery', () => {
  /**
   * Verifies: selectById emits the matching move and re-emits when that move changes.
   * Interacts with: MoveStore.set/update, MoveQuery.selectById.
   * Data: two moves; m1's description is updated once.
   */
  it('selectById tracks one move through updates', () => {
    const store = new MoveStore();
    const query = new MoveQuery(store);
    store.set([
      { id: 'm1', description: 'first' },
      { id: 'm2', description: 'second' },
    ]);
    const seen = recordEmissions(query.selectById('m1'));
    store.update('m1', { description: 'changed' });
    store.update('m2', { description: 'unrelated' });
    expect(seen.map((m) => m.description)).toEqual(['first', 'changed']);
  });

  /**
   * Verifies: selectAll() returns moves in store order, not by move number, because @QueryConfig sorts by 'name', a field moves lack.
   * Interacts with: MoveStore.set, MoveQuery.selectAll (QueryConfig sortBy).
   * Data: moves 3, 1, 2 stored in that order.
   */
  it('selectAll keeps store order instead of sorting by move number', async () => {
    const store = new MoveStore();
    const query = new MoveQuery(store);
    store.set([
      { id: 'm3', moveNumber: 3 },
      { id: 'm1', moveNumber: 1 },
      { id: 'm2', moveNumber: 2 },
    ]);
    const moves = await firstValueFrom(query.selectAll());
    expect(moves.map((m) => m.moveNumber)).toEqual([3, 1, 2]);
  });
});
