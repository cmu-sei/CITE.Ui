// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { of } from 'rxjs';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { ScoringModel } from '../../generated/cite.api';
import { renderComponent } from '../../test-utils/render-component';
import { RightSideHtmlComponent } from './right-side-html.component';

describe('RightSideHtmlComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers and an editor for the scoring model's HTML block.
   * Interacts with: real SubmissionQuery, the real angular-editor.
   * Data: a scoring model whose rightSideHtmlBlock is a short paragraph.
   */
  it('renders with the default test providers', async () => {
    const scoringModel: ScoringModel = {
      id: 'sm1',
      rightSideHtmlBlock: '<p>Briefing</p>',
    };
    const { fixture } = await renderComponent(RightSideHtmlComponent, {
      declarations: [RightSideHtmlComponent],
      imports: [AngularEditorModule],
      componentInputs: { scoringModel$: of(scoringModel) },
    });
    await fixture.whenStable();

    expect(fixture.componentInstance).toBeInstanceOf(RightSideHtmlComponent);
    expect(
      fixture.nativeElement.querySelector('angular-editor'),
    ).toBeInTheDocument();
  });

  /**
   * Verifies: the editor container keeps the same class whether or not the top bar is hidden (the template does not bind getTopClass).
   * Interacts with: the rendered container.
   * Data: hideTopbar true, then false.
   */
  it.each([true, false])(
    'renders the plain container with hideTopbar %s',
    async (hideTopbar) => {
      const { fixture } = await renderComponent(RightSideHtmlComponent, {
        declarations: [RightSideHtmlComponent],
        imports: [AngularEditorModule],
        componentInputs: { scoringModel$: of({}), hideTopbar },
      });

      const container = fixture.nativeElement.querySelector('angular-editor')
        .parentElement as HTMLElement;
      expect(container.className).toBe('top-level-container');
    },
  );
});
