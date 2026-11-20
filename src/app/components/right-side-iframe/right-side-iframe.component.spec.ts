// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { screen } from '@testing-library/angular';
import { ScoringModelStore } from '../../data/scoring-model/scoring-model.store';
import { renderComponent } from '../../test-utils/render-component';
import { RightSideIframeComponent } from './right-side-iframe.component';
import { REFUSED_EMBEDDED_URLS } from '../../test-utils/refused-embedded-urls';

describe('RightSideIframeComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers and renders the focused-application frame.
   * Interacts with: real ScoringModelQuery (no active scoring model).
   * Data: an empty scoring model store.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderComponent(RightSideIframeComponent, {
      declarations: [RightSideIframeComponent],
    });

    expect(fixture.componentInstance).toBeInstanceOf(RightSideIframeComponent);
    expect(screen.getByTitle('focused app')).toBeInTheDocument();
  });

  /**
   * Verifies: the frame loads the active scoring model's rightSideEmbeddedUrl.
   * Interacts with: real ScoringModelStore and ScoringModelQuery.selectActive.
   * Data: scoring model sm1 with an embedded URL, set active after render.
   */
  it('points the frame at the active scoring model URL', async () => {
    const { fixture } = await renderComponent(RightSideIframeComponent, {
      declarations: [RightSideIframeComponent],
    });
    const store = TestBed.inject(ScoringModelStore);
    store.set([{ id: 'sm1', rightSideEmbeddedUrl: 'https://gallery.test/' }]);
    store.setActive('sm1');
    fixture.detectChanges();

    expect(screen.getByTitle('focused app')).toHaveAttribute(
      'src',
      'https://gallery.test/',
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  /**
   * Verifies: the frame is sandboxed: scripts, forms, popups and downloads in its own origin, no top navigation or modals.
   * Interacts with: the rendered iframe.
   * Data: an empty scoring model store.
   */
  it('sandboxes the frame', async () => {
    await renderComponent(RightSideIframeComponent, {
      declarations: [RightSideIframeComponent],
    });

    const sandbox = screen.getByTitle('focused app').getAttribute('sandbox');
    expect(sandbox.split(' ').sort()).toEqual([
      'allow-downloads',
      'allow-forms',
      'allow-popups',
      'allow-popups-to-escape-sandbox',
      'allow-same-origin',
      'allow-scripts',
    ]);
  });

  /**
   * Verifies: a URL that isn't an absolute http(s) URL is not loaded, and the pane says why.
   * Interacts with: real ScoringModelStore and ScoringModelQuery.selectActive.
   * Data: scoring model sm1 with each refused URL, set active after render.
   */
  it.each(REFUSED_EMBEDDED_URLS)('does not load %j', async (url) => {
    const { fixture } = await renderComponent(RightSideIframeComponent, {
      declarations: [RightSideIframeComponent],
    });
    const store = TestBed.inject(ScoringModelStore);
    store.set([{ id: 'sm1', rightSideEmbeddedUrl: url }]);
    store.setActive('sm1');
    fixture.detectChanges();

    expect(screen.getByTitle('focused app').getAttribute('src') ?? '').toBe('');
    expect(screen.getByRole('status')).toHaveTextContent(
      'not an http or https URL',
    );
  });
});
