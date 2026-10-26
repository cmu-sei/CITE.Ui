// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import {
  readableTextColor,
  severityLevelForScore,
  severityLevelLabel,
  severityLevelRange,
  severityLevels,
} from './severity-levels';

describe('severity levels', () => {
  /**
   * Verifies: a scoring model without levels gets the six CISA levels, highest first and numbered from 0.
   * Data: a scoring model with an empty severityLevels list.
   */
  it('falls back to the default levels', () => {
    const levels = severityLevels({ severityLevels: [] });

    expect(levels.map(severityLevelLabel)).toEqual([
      'Level 5 - Emergency',
      'Level 4 - Severe',
      'Level 3 - High',
      'Level 2 - Medium',
      'Level 1 - Low',
      'Level 0 - Baseline',
    ]);
    expect(levels.map(severityLevelRange)).toEqual(['90+', '75-89.99', '65-74.99', '50-64.99', '35-49.99', '0-34.99']);
  });

  /**
   * Verifies: a scoring model's own levels are used whatever order they are saved in, numbered from the lowest.
   * Data: three levels saved out of order.
   */
  it('uses the scoring models own levels', () => {
    const levels = severityLevels({
      severityLevels: [
        { name: 'Mid', minimumScore: 40, color: '#FFFF00' },
        { name: 'Top', minimumScore: 80, color: '#000000' },
        { name: 'Floor', minimumScore: 0, color: '#FFFFFF' },
      ],
    });

    expect(levels.map(severityLevelLabel)).toEqual(['Level 2 - Top', 'Level 1 - Mid', 'Level 0 - Floor']);
    expect(levels.map((level) => level.textColor)).toEqual(['#FFFFFF', '#000000', '#000000']);
  });

  /**
   * Verifies: a score falls in the highest level it reaches, compared at two decimal places, and a score below
   * every minimum falls in the lowest level.
   * Data: the default levels; scores 34.99, 34.996, 100 and 120; levels starting at 10 and 50; score 3.
   */
  it('places a score in its level', () => {
    const defaults = severityLevels(null);
    const nameFor = (score: number) => severityLevelForScore(defaults, score).name;

    expect([nameFor(34.99), nameFor(34.996), nameFor(100), nameFor(120)]).toEqual(['Baseline', 'Low', 'Emergency', 'Emergency']);
    const raised = severityLevels({
      severityLevels: [
        { name: 'Some', minimumScore: 10, color: '#FFFFFF' },
        { name: 'Most', minimumScore: 50, color: '#000000' },
      ],
    });
    expect(severityLevelForScore(raised, 3).name).toBe('Some');
  });

  /**
   * Verifies: text on a level's color is black on light colors and white on dark ones, and black for a bad color.
   * Data: yellow, dark orange, dark red, black and an unparseable color.
   */
  it('picks a readable text color', () => {
    expect(['#FFFF00', '#FF8C00', '#8B0000', '#000000', 'red'].map(readableTextColor)).toEqual([
      '#000000', '#000000', '#FFFFFF', '#FFFFFF', '#000000',
    ]);
  });
});
