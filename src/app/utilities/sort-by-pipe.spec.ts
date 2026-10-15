// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { DisplayOrderPipe, SortByPipe } from './sort-by-pipe';

// Pure pipes: instantiate directly, as the Angular pipe-testing guide does.
describe('DisplayOrderPipe', () => {
  /**
   * Verifies: items come back ordered by displayOrder, and the input array is left untouched.
   * Interacts with: DisplayOrderPipe.transform.
   * Data: three items with display orders 3, 1, 2.
   */
  it('orders by displayOrder without mutating the input', () => {
    const items = [
      { id: 'c', displayOrder: 3 },
      { id: 'a', displayOrder: 1 },
      { id: 'b', displayOrder: 2 },
    ];
    const sorted = new DisplayOrderPipe().transform(items);
    expect(sorted.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(items.map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });

  /**
   * Verifies: missing, empty and single-item inputs are returned as they are.
   * Interacts with: DisplayOrderPipe.transform guard.
   * Data: per row, undefined, [] or one item.
   */
  it.each([
    { kind: 'undefined', value: undefined as unknown as unknown[] },
    { kind: 'an empty array', value: [] },
    { kind: 'one item', value: [{ displayOrder: 5 }] },
  ])('passes through $kind', ({ value }) => {
    expect(new DisplayOrderPipe().transform(value)).toBe(value);
  });
});

describe('SortByPipe', () => {
  /**
   * Verifies: arrays of objects sort by the named column in either direction, as a new array.
   * Interacts with: SortByPipe.transform (lodash orderBy branch).
   * Data: three objects with names Carol, alice, Bob; per row, the direction.
   */
  it.each([
    { order: 'asc', names: ['Bob', 'Carol', 'alice'] },
    { order: 'desc', names: ['alice', 'Carol', 'Bob'] },
  ])('sorts objects by a column, $order', ({ order, names }) => {
    const people = [{ name: 'Carol' }, { name: 'alice' }, { name: 'Bob' }];
    const sorted = new SortByPipe().transform(people, order, 'name');
    expect(sorted.map((p) => p.name)).toEqual(names);
    expect(people.map((p) => p.name)).toEqual(['Carol', 'alice', 'Bob']);
  });

  /**
   * Verifies: with no order the input is returned as it is.
   * Interacts with: SortByPipe.transform guard.
   * Data: [3, 1, 2] with order ''.
   */
  it('returns the input when no order is given', () => {
    const values = [3, 1, 2];
    expect(new SortByPipe().transform(values, '')).toBe(values);
  });

  /**
   * Verifies: a plain array sorts descending.
   * Interacts with: SortByPipe.transform (1-D branch).
   * Data: [3, 1, 2] with order 'desc'.
   */
  it('sorts plain values descending', () => {
    expect(new SortByPipe().transform([3, 1, 2], 'desc')).toEqual([3, 2, 1]);
  });

  /**
   * Verifies: plain numbers sort as strings, so multi-digit values land out of numeric order.
   * Interacts with: SortByPipe.transform (1-D branch, Array.prototype.sort with no comparator).
   * Data: [10, 2, 1].
   */
  it('sorts plain numbers by their string form', () => {
    const pipe = new SortByPipe();
    expect(pipe.transform([10, 2, 1], 'asc')).toEqual([1, 10, 2]);
  });

  /**
   * Verifies: sorting a plain array reorders the input array itself.
   * Interacts with: SortByPipe.transform (1-D branch).
   * Data: [3, 1, 2] with order 'asc'.
   */
  it('sorts plain values in place', () => {
    const values = [3, 1, 2];
    const result = new SortByPipe().transform(values, 'asc');
    expect(result).toEqual([1, 2, 3]);
    expect(result).toBe(values);
  });
});
