// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { FormControl } from '@angular/forms';
import { REFUSED_EMBEDDED_URLS } from '../test-utils/refused-embedded-urls';
import { embeddableUrl, embeddedUrl, isEmbeddableUrl } from './embedded-url';

describe('embedded URL', () => {
  /**
   * Verifies: an absolute http or https URL may be embedded.
   * Data: http and https URLs with a port, a query and a fragment.
   */
  it.each([
    'https://dashboard.example.com/d/1?kiosk=true#panel',
    'http://localhost:3000/',
    'HTTPS://GALLERY.TEST/',
  ])('accepts %s', (url) => {
    expect(isEmbeddableUrl(url)).toBe(true);
  });

  /**
   * Verifies: any other scheme, a relative URL and no URL at all are refused.
   * Data: REFUSED_EMBEDDED_URLS, null and an empty string.
   */
  it.each([...REFUSED_EMBEDDED_URLS, null, ''])('refuses %j', (url) => {
    expect(isEmbeddableUrl(url)).toBe(false);
    expect(embeddableUrl(url)).toBeNull();
  });

  /**
   * Verifies: the parsed URL, which the frame loads, is the normalized address, not the string as saved.
   * Data: an https URL with surrounding spaces and an upper-case scheme and host.
   */
  it('parses the URL the frame loads', () => {
    expect(embeddableUrl('  HTTPS://Gallery.Test/exhibit?id=1  ')?.href).toBe(
      'https://gallery.test/exhibit?id=1',
    );
  });

  /**
   * Verifies: the form validator flags a refused URL and lets an empty one, which clears the field, through.
   * Data: form controls holding a javascript: URL, an https URL, an empty string and null.
   */
  it('validates the form field, allowing it to be emptied', () => {
    expect(embeddedUrl(new FormControl('javascript:alert(1)'))).toEqual({
      embeddedUrl: true,
    });
    expect(embeddedUrl(new FormControl('https://gallery.test/'))).toBeNull();
    expect(embeddedUrl(new FormControl(''))).toBeNull();
    expect(embeddedUrl(new FormControl(null))).toBeNull();
  });
});
