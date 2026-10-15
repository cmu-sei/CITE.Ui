// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { screen } from '@testing-library/angular';
import userEvent, {
  PointerEventsCheckLevel,
} from '@testing-library/user-event';
import { NEVER, Observable, of } from 'rxjs';
import {
  ScoringModel,
  ScoringModelService,
  ScoringOptionSelection,
} from '../../../generated/cite.api';
import { DisplayOrderPipe } from '../../../utilities/sort-by-pipe';
import { ApiStub } from '../../../test-utils/api-stub';
import { renderComponent } from '../../../test-utils/render-component';
import { AdminPreviewComponent } from './admin-preview.component';

// The global stylesheets make every computed-style lookup slow in jsdom, and
// user-event's pointer-events check looks one up per ancestor on each click
// (about a second per click on this page under coverage). Clicks go to
// enabled, visible controls here, so the check is skipped.
const FAST_POINTER = { pointerEventsCheck: PointerEventsCheckLevel.Never };
// Role queries are slow here for the same reason, so the header and its
// buttons are found by their text and aria-label.

const MODEL: ScoringModel = {
  id: 'sm1',
  description: 'NCISS',
  displayScoringModelByMoveNumber: true,
  scoringCategories: [
    {
      id: 'c2',
      description: 'Information impact',
      displayOrder: 2,
      moveNumberFirstDisplay: 1,
      moveNumberLastDisplay: 2,
      scoringOptionSelection: ScoringOptionSelection.Single,
      scoringOptions: [{ id: 'o3', description: 'Exfiltration', value: 40 }],
    },
    {
      id: 'c1',
      description: 'Functional impact',
      displayOrder: 1,
      moveNumberFirstDisplay: 0,
      moveNumberLastDisplay: 1,
      scoringOptionSelection: ScoringOptionSelection.Single,
      scoringOptions: [
        { id: 'o2', description: 'Significant', displayOrder: 2, value: 50 },
        { id: 'o1', description: 'Minimal', displayOrder: 1, value: 10 },
      ],
    },
  ],
};

async function renderPreview(
  getScoringModel: () => Observable<ScoringModel> = () =>
    of(structuredClone(MODEL)),
) {
  const scoringModelApi = {
    getScoringModel: vi.fn(getScoringModel),
  } satisfies ApiStub<ScoringModelService>;
  const closeMe = vi.fn();
  const rendered = await renderComponent(AdminPreviewComponent, {
    declarations: [AdminPreviewComponent, DisplayOrderPipe],
    imports: [
      MatButtonModule,
      MatCheckboxModule,
      MatIconModule,
      MatTableModule,
    ],
    componentInputs: { scoringModelId: 'sm1' },
    on: { closeMe },
    providers: [{ provide: ScoringModelService, useValue: scoringModelApi }],
  });
  return {
    ...rendered,
    scoringModelApi,
    closeMe,
    user: userEvent.setup(FAST_POINTER),
  };
}

describe('AdminPreviewComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers, loads the scoring model and previews it move by move.
   * Interacts with: real ScoringModelDataService/ScoringModelQuery over a stubbed ScoringModelService, DisplayOrderPipe.
   * Data: NCISS displayed by move; Functional impact on moves 0-1, Information impact on moves 1-2.
   */
  it('renders with the default test providers', async () => {
    const { fixture, scoringModelApi } = await renderPreview();

    expect(fixture.componentInstance).toBeInstanceOf(AdminPreviewComponent);
    expect(scoringModelApi.getScoringModel).toHaveBeenCalledWith('sm1');
    expect(
      screen.getByText('Preview of NCISS', { selector: 'h2' }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByText(/^\s*Move \d\s*$/, { selector: 'div' })
        .map((m) => m.textContent?.trim()),
    ).toEqual(['Move 0', 'Move 1', 'Move 2']);
    // Functional impact shows on moves 0 and 1, Information impact on 1 and 2.
    expect(screen.getAllByText('1. Functional impact')).toHaveLength(2);
    expect(screen.getAllByText('2. Information impact')).toHaveLength(2);
  });

  /**
   * Verifies: Close Preview emits closeMe.
   * Interacts with: the Close Preview button, the closeMe output.
   * Data: the loaded model.
   */
  it('emits closeMe from Close Preview', async () => {
    const { closeMe, user } = await renderPreview();
    await user.click(screen.getByLabelText('Close Preview'));

    expect(closeMe).toHaveBeenCalledWith(true);
  });

  /**
   * Verifies: rendering before the scoring model arrives throws on scoringModel.description (current behavior).
   * Interacts with: the template header, a ScoringModelService.getScoringModel that never answers.
   * Data: getScoringModel returns NEVER.
   */
  it('throws while the scoring model is still loading', async () => {
    // Current behavior; see agent-docs/ui-test-bugs/cite.ui.md.
    await expect(renderPreview(() => NEVER)).rejects.toThrow(
      /reading 'description'/,
    );
  });
});
