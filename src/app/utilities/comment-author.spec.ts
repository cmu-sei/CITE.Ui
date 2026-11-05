// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import {
  commentAuthor,
  HIDDEN_AUTHOR_LABEL,
  isAuthorHidden,
} from './comment-author';

const names: Record<string, string> = { u1: 'Alice' };
const userName = (id: string) => names[id] ?? '';

describe('commentAuthor', () => {
  /**
   * Verifies: an author the API left out (the empty id an observer gets on an evaluation that hides names, or none at all) is "Team member"; any other id is looked up.
   * Interacts with: isAuthorHidden, the userName lookup.
   * Data: per row, the comment's createdBy; Alice is u1.
   */
  it.each([
    { createdBy: '00000000-0000-0000-0000-000000000000', label: HIDDEN_AUTHOR_LABEL, hidden: true },
    { createdBy: null, label: HIDDEN_AUTHOR_LABEL, hidden: true },
    { createdBy: undefined, label: HIDDEN_AUTHOR_LABEL, hidden: true },
    { createdBy: 'u1', label: 'Alice', hidden: false },
    // an author missing from the user list is left blank, as before
    { createdBy: 'u9', label: '', hidden: false },
  ])('signs $createdBy as "$label"', ({ createdBy, label, hidden }) => {
    expect(isAuthorHidden(createdBy)).toBe(hidden);
    expect(commentAuthor(createdBy, userName)).toBe(label);
  });

  it('labels a hidden author Team member', () => {
    expect(HIDDEN_AUTHOR_LABEL).toBe('Team member');
  });
});
