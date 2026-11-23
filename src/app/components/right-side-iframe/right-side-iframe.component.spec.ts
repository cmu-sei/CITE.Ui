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
   * Verifies: a frame on another origin keeps that origin: scripts, forms, popups, downloads and storage access, no top navigation or modals.
   * Interacts with: real ScoringModelStore and ScoringModelQuery.selectActive.
   * Data: scoring model sm1 with an https URL on another origin than the page's.
   */
  it('sandboxes a frame on another origin', async () => {
    const frame = await renderWithUrl('https://gallery.test/');

    expect(frame).toHaveAttribute('src', 'https://gallery.test/');
    expect(sandboxFlags(frame)).toEqual([
      'allow-downloads',
      'allow-forms',
      'allow-popups',
      'allow-popups-to-escape-sandbox',
      'allow-same-origin',
      'allow-scripts',
      'allow-storage-access-by-user-activation',
    ]);
  });

  /**
   * Verifies: a frame on CITE's own origin may run scripts but gets an opaque origin, so it can't reach CITE or lift its sandbox.
   * Interacts with: real ScoringModelStore and ScoringModelQuery.selectActive.
   * Data: scoring model sm1 with a URL on the page's own origin.
   */
  it('sandboxes a frame on CITE own origin more strictly', async () => {
    const url = `${window.location.origin}/scoringmodel/sm1`;
    const frame = await renderWithUrl(url);

    expect(frame).toHaveAttribute('src', url);
    expect(sandboxFlags(frame)).toEqual([
      'allow-downloads',
      'allow-forms',
      'allow-popups',
      'allow-scripts',
    ]);
  });

  /**
   * Verifies: the frame loads the parsed address, not the string as saved.
   * Interacts with: real ScoringModelStore and ScoringModelQuery.selectActive.
   * Data: scoring model sm1 with an https URL in surrounding spaces and upper case.
   */
  it('loads the parsed address', async () => {
    const frame = await renderWithUrl('  HTTPS://Gallery.Test/exhibit  ');

    expect(frame).toHaveAttribute('src', 'https://gallery.test/exhibit');
  });

  /**
   * Verifies: the refusal notice goes when no scoring model is active.
   * Interacts with: real ScoringModelStore and ScoringModelQuery.selectActive.
   * Data: scoring model sm1 with a javascript: URL, set active and then inactive.
   */
  it('clears the refusal notice when no model is active', async () => {
    const { fixture } = await renderComponent(RightSideIframeComponent, {
      declarations: [RightSideIframeComponent],
    });
    const store = TestBed.inject(ScoringModelStore);
    store.set([{ id: 'sm1', rightSideEmbeddedUrl: 'javascript:alert(1)' }]);
    store.setActive('sm1');
    fixture.detectChanges();
    expect(screen.getByRole('status')).toBeInTheDocument();

    store.setActive(null);
    fixture.detectChanges();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByTitle('focused app')).toBeInTheDocument();
  });

  /**
   * Verifies: a URL that isn't a full http(s) address gets no frame, and the pane says why.
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

    expect(screen.queryByTitle('focused app')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      "isn't a full http:// or https:// address",
    );
  });
});

// renders the frame for an active scoring model with the URL
async function renderWithUrl(url: string) {
  const { fixture } = await renderComponent(RightSideIframeComponent, {
    declarations: [RightSideIframeComponent],
  });
  const store = TestBed.inject(ScoringModelStore);
  store.set([{ id: 'sm1', rightSideEmbeddedUrl: url }]);
  store.setActive('sm1');
  fixture.detectChanges();
  return screen.getByTitle('focused app');
}

const sandboxFlags = (frame: HTMLElement) =>
  (frame.getAttribute('sandbox') ?? '').split(' ').sort();
