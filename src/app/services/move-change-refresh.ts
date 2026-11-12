// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { InjectionToken } from '@angular/core';

// When the current move changes, the hub sends the evaluation and then each of
// its moves within milliseconds, to every open page of the exercise. A page
// refetches what depends on the move once the burst is over, after a random
// delay of up to MOVE_CHANGE_MAX_JITTER_MS, so the pages do not all hit the
// API in the same second.
export const MOVE_CHANGE_DEBOUNCE_MS = 250;
export const MOVE_CHANGE_MAX_JITTER_MS = 3000;

/** Returns the delay, in milliseconds, before a page refetches after a move change. */
export const MOVE_CHANGE_JITTER = new InjectionToken<() => number>(
  'MOVE_CHANGE_JITTER',
  {
    providedIn: 'root',
    factory: () => () =>
      Math.floor(Math.random() * (MOVE_CHANGE_MAX_JITTER_MS + 1)),
  },
);
