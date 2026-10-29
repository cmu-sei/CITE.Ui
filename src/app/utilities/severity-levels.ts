// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { ScoringModel, SeverityLevel } from 'src/app/generated/cite.api/model/models';

// The CISA National Cyber Incident Scoring System levels, used by any scoring
// model that has no severity levels of its own.
export const DEFAULT_SEVERITY_LEVELS: SeverityLevel[] = [
  {
    name: 'Baseline', minimumScore: 0, color: '#FFFFFF',
    description: 'Unsubstantiated or inconsequential event',
  },
  {
    name: 'Low', minimumScore: 35, color: '#90EE90',
    description: 'Unlikely to impact public health or safety, national security, economic security, foreign relations, civil liberties, or public confidence',
  },
  {
    name: 'Medium', minimumScore: 50, color: '#FFFF00',
    description: 'May impact public health or safety, national security, economic security, foreign relations, civil liberties, or public confidence.',
  },
  {
    name: 'High', minimumScore: 65, color: '#FF8C00',
    description: 'Likely to result in a demonstrable impact to public health or safety, national security, economic security, foreign relations, civil liberties, or public confidence',
  },
  {
    name: 'Severe', minimumScore: 75, color: '#8B0000',
    description: 'Likely to result in a significant impact to public health or safety, national security, economic security, foreign relations, or civil liberties.',
  },
  {
    name: 'Emergency', minimumScore: 90, color: '#000000',
    description: 'Poses an imminent threat to the provision of wide-scale critical infrastructure services, national government stability, or to the lives of U.S. persons',
  },
];

// A level as displayed: numbered from 0 at the lowest, with the range of
// scores it covers.
export interface DisplayedSeverityLevel extends SeverityLevel {
  level: number;
  // the next level's minimum, or null for the highest level
  nextMinimumScore: number | null;
  textColor: string;
}

// The scoring model's levels, or the defaults when it has none, highest first.
export function severityLevels(scoringModel: ScoringModel | null | undefined): DisplayedSeverityLevel[] {
  const levels = scoringModel?.severityLevels?.length ? scoringModel.severityLevels : DEFAULT_SEVERITY_LEVELS;
  const ascending = [...levels].sort((a, b) => (a.minimumScore ?? 0) - (b.minimumScore ?? 0));
  return ascending
    .map((level, index) => ({
      ...level,
      level: index,
      nextMinimumScore: index < ascending.length - 1 ? ascending[index + 1].minimumScore ?? 0 : null,
      textColor: readableTextColor(level.color),
    }))
    .reverse();
}

// Scores are compared as displayed, to two decimal places.
export function roundScore(score: number): number {
  return Math.round(((score ?? 0) + Number.EPSILON) * 100) / 100;
}

// The level a score falls in: the highest level whose minimum it reaches. A
// score below every minimum falls in the lowest level.
export function severityLevelForScore(levels: DisplayedSeverityLevel[], score: number): DisplayedSeverityLevel | undefined {
  const rounded = roundScore(score);
  return levels.find((level) => rounded >= (level.minimumScore ?? 0)) ?? levels[levels.length - 1];
}

export function severityLevelLabel(level: DisplayedSeverityLevel | undefined): string {
  return level ? `Level ${level.level} - ${level.name}` : '';
}

// e.g. "75-89.99"; "90+" for the highest level and "<35" for the lowest, which
// also holds every score below its own minimum
export function severityLevelRange(level: DisplayedSeverityLevel): string {
  const minimum = level.minimumScore ?? 0;
  const lowest = level.level === 0;
  if (level.nextMinimumScore == null) {
    return lowest ? 'Any score' : `${minimum}+`;
  }
  if (lowest) {
    return `<${level.nextMinimumScore}`;
  }
  return `${minimum}-${roundScore(level.nextMinimumScore - 0.01)}`;
}

// black or white, whichever contrasts more with a #rrggbb background
export function readableTextColor(background: string): string {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(background ?? '');
  if (!match) {
    return '#000000';
  }
  const [r, g, b] = match.slice(1).map((hex) => {
    const channel = parseInt(hex, 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // contrast with black beats contrast with white above this luminance
  return luminance > 0.179 ? '#000000' : '#FFFFFF';
}
