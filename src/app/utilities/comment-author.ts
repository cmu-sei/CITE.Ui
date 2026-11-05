// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

/** What a comment is signed with when the API has left out who wrote it. */
export const HIDDEN_AUTHOR_LABEL = 'Team member';

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

/**
 * Whether the API left out who wrote a comment: on an evaluation that hides
 * names from observers, someone outside the team gets an empty author id.
 */
export function isAuthorHidden(createdBy: string | null | undefined): boolean {
  return !createdBy || createdBy === EMPTY_GUID;
}

/** The comment author's name, or "Team member" when the API left it out. */
export function commentAuthor(
  createdBy: string | null | undefined,
  userName: (id: string) => string,
): string {
  return isAuthorHidden(createdBy) ? HIDDEN_AUTHOR_LABEL : userName(createdBy);
}
