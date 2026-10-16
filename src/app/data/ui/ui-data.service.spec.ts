// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, beforeEach } from 'vitest';
import { UIDataService } from './ui-data.service';

// UIDataService has no dependencies; construct it directly so each test
// controls what is in localStorage when the constructor reads it.
describe('UIDataService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  /**
   * Verifies: a selection written by one instance is restored by the next, through localStorage.
   * Interacts with: localStorage 'uiState'.
   * Data: per row, one setter and the getter that reads it back for evaluation e1.
   */
  it.each<{
    setting: string;
    write: (service: UIDataService) => void;
    read: (service: UIDataService) => unknown;
    value: unknown;
  }>([
    {
      setting: 'evaluation',
      write: (s) => s.setEvaluation('e1'),
      read: (s) => s.getEvaluation(),
      value: 'e1',
    },
    {
      setting: 'move number',
      write: (s) => s.setMoveNumber('e1', 3),
      read: (s) => s.getMoveNumber('e1'),
      value: 3,
    },
    {
      setting: 'section',
      write: (s) => s.setSection('e1', 'scoresheet'),
      read: (s) => s.getSection('e1'),
      value: 'scoresheet',
    },
    {
      setting: 'team',
      write: (s) => s.setTeam('e1', 't1'),
      read: (s) => s.getTeam('e1'),
      value: 't1',
    },
    {
      setting: 'submission type',
      write: (s) => s.setSubmissionType('e1', 'team'),
      read: (s) => s.getSubmissionType('e1'),
      value: 'team',
    },
    {
      setting: 'theme',
      write: (s) => s.setTheme('dark-theme'),
      read: (s) => s.getTheme(),
      value: 'dark-theme',
    },
  ])('persists the $setting across instances', ({ write, read, value }) => {
    write(new UIDataService());
    expect(read(new UIDataService())).toBe(value);
  });

  /**
   * Verifies: a missing evaluation id is stored as 'blank'.
   * Interacts with: UIDataService.setEvaluation/getEvaluation.
   * Data: setEvaluation('').
   */
  it('records a missing evaluation as blank', () => {
    const service = new UIDataService();
    service.setEvaluation('');
    expect(service.getEvaluation()).toBe('blank');
  });

  /**
   * Verifies: the 'blank' fallback for a missing evaluation id is applied by only one side of each pair.
   * Interacts with: setMoveNumber/getMoveNumber, setSection/getSection.
   * Data: an empty evaluation id.
   */
  it('cannot read back move or section saved without an evaluation', () => {
    const service = new UIDataService();
    service.setMoveNumber('', 2);
    service.setSection('', 'dashboard');
    expect(service.getMoveNumber('')).toBeUndefined();
    expect(service.getSection('')).toBeUndefined();
    expect(service.getMoveNumber('blank')).toBe(2);
  });

  /**
   * Verifies: collapsing an expanded item collapses only that item.
   * Interacts with: setItemExpanded/setItemCollapsed/isItemExpanded.
   * Data: items a and b expanded, a collapsed.
   */
  it('collapses only the item asked for', () => {
    const service = new UIDataService();
    service.setItemExpanded('a');
    service.setItemExpanded('b');
    service.setItemCollapsed('a');
    expect(service.isItemExpanded('a')).toBe(false);
    expect(service.isItemExpanded('b')).toBe(true);
  });

  /**
   * Verifies: collapsing an item that is not expanded collapses the most recently expanded one instead.
   * Interacts with: setItemCollapsed/isItemExpanded.
   * Data: items a and b expanded; never-expanded item z collapsed.
   */
  it('collapsing an unknown item drops the last expanded item', () => {
    const service = new UIDataService();
    service.setItemExpanded('a');
    service.setItemExpanded('b');
    service.setItemCollapsed('z');
    expect(service.isItemExpanded('a')).toBe(true);
    expect(service.isItemExpanded('b')).toBe(false);
  });
});
