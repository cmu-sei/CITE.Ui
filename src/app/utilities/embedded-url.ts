// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { AbstractControl, ValidationErrors } from '@angular/forms';

// A scoring model's right side embedded URL is loaded in an iframe, so only a
// full http or https address is trusted: a javascript:, data: or other scheme,
// or a relative URL that frames CITE itself, could run script for whoever views
// the scoring model. The API refuses the same schemes.
//
// Returns the parsed URL, whose href is what the frame should load, or null
// when the URL isn't embeddable.
export function embeddableUrl(url: string | null | undefined): URL | null {
  const trimmed = url?.trim();
  // the URL parser accepts https:host, http:/host and https:\\host, and a frame
  // given one of those resolves it against CITE's own address; so the scheme
  // must be followed by // and then the host, not by more slashes or a
  // backslash, which the parser would also skip
  if (!trimmed || !/^https?:\/\/[^/\\]/i.test(trimmed)) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      parsed.hostname
      ? parsed
      : null;
  } catch {
    // http:// alone, or a malformed host
    return null;
  }
}

export function isEmbeddableUrl(url: string | null | undefined): boolean {
  return embeddableUrl(url) !== null;
}

// an empty URL is allowed: it clears the field
export function embeddedUrl(control: AbstractControl): ValidationErrors | null {
  const url = control.value as string | null;
  return !url || isEmbeddableUrl(url) ? null : { embeddedUrl: true };
}
