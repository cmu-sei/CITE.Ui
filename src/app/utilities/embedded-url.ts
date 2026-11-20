// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { AbstractControl, ValidationErrors } from '@angular/forms';

// A scoring model's right side embedded URL is loaded in an iframe, so only an
// absolute http or https URL is trusted: a javascript:, data: or other scheme,
// or a relative URL that frames CITE itself, could run script for whoever views
// the scoring model. The API refuses the same URLs.
export function isEmbeddableUrl(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }
  try {
    // no base, so a relative URL throws; the parser normalizes the scheme the
    // way the browser will when it loads the frame
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

// an empty URL is allowed: it clears the field
export function embeddedUrl(control: AbstractControl): ValidationErrors | null {
  const url = control.value as string | null;
  return !url || isEmbeddableUrl(url) ? null : { embeddedUrl: true };
}
