// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { By } from '@angular/platform-browser';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { CrucibleDialogService } from '@cmusei/crucible-common';
import {
  ScoringCategory,
  ScoringCategoryService,
} from '../../../generated/cite.api';
import { ApiStub } from '../../../test-utils/api-stub';
import { dialogRefStub } from '../../../test-utils/dialog-refs';
import { matDialogStub } from '../../../test-utils/mat-dialog';
import { renderComponent } from '../../../test-utils/render-component';
import { AdminScoringCategoriesComponent } from './admin-scoring-categories.component';

@Component({ selector: 'app-admin-scoring-options', template: '' })
class ScoringOptionsStubComponent {
  @Input() scoringCategoryId!: string;
  @Input() canEdit!: boolean;
}

const CATEGORIES: ScoringCategory[] = [
  {
    id: 'c2',
    scoringModelId: 'sm1',
    description: 'Information impact',
    displayOrder: 2,
    moveNumberFirstDisplay: 0,
    moveNumberLastDisplay: 3,
  },
  {
    id: 'c1',
    scoringModelId: 'sm1',
    description: 'Functional impact',
    displayOrder: 1,
    moveNumberFirstDisplay: 0,
    moveNumberLastDisplay: 3,
  },
];

async function renderCategories(canEdit: boolean) {
  const categoryApi = {
    getScoringCategoriesByScoringModelId: vi.fn(() =>
      of(structuredClone(CATEGORIES)),
    ),
    updateScoringCategory: vi.fn((id: string, c?: ScoringCategory) =>
      of({ ...c, id }),
    ),
    deleteScoringCategory: vi.fn(() => of(null)),
  } satisfies ApiStub<ScoringCategoryService>;
  const confirm = vi.fn(() => dialogRefStub<unknown, boolean>(true).dialogRef);
  const dialogService: Pick<CrucibleDialogService, 'confirm'> = { confirm };
  const editDialog = matDialogStub();
  const scoringCategoryClick = vi.fn();

  const rendered = await renderComponent(AdminScoringCategoriesComponent, {
    declarations: [AdminScoringCategoriesComponent],
    imports: [
      MatButtonModule,
      MatCardModule,
      MatExpansionModule,
      MatIconModule,
      MatProgressSpinnerModule,
      ScoringOptionsStubComponent,
    ],
    componentInputs: {
      scoringModelId: 'sm1',
      canEdit,
      displayScoringModelbyMoveNumber: true,
    },
    on: { scoringCategoryClick },
    providers: [
      { provide: ScoringCategoryService, useValue: categoryApi },
      { provide: CrucibleDialogService, useValue: dialogService },
      { provide: MatDialog, useValue: editDialog.dialog },
    ],
  });
  await rendered.fixture.whenStable();
  return {
    ...rendered,
    categoryApi,
    confirm,
    editDialog,
    scoringCategoryClick,
    user: userEvent.setup(),
  };
}

const optionsStub = (
  fixture: Awaited<ReturnType<typeof renderCategories>>['fixture'],
) =>
  fixture.debugElement.query(By.directive(ScoringOptionsStubComponent))
    ?.componentInstance as ScoringOptionsStubComponent | undefined;

describe('AdminScoringCategoriesComponent', () => {
  /**
   * Verifies: the model's categories are loaded and listed in display order.
   * Interacts with: real ScoringCategoryDataService/ScoringCategoryQuery over a stubbed ScoringCategoryService.
   * Data: categories returned out of order.
   */
  it('lists the categories of the scoring model in display order', async () => {
    const { categoryApi } = await renderCategories(true);

    expect(
      categoryApi.getScoringCategoriesByScoringModelId,
    ).toHaveBeenCalledWith('sm1');
    const headers = Array.from(
      document.querySelectorAll('mat-expansion-panel-header'),
    ).map((h) => h.textContent?.replace(/\s+/g, ' ').trim());
    expect(headers).toEqual([
      'Functional impact 1 0 3',
      'Information impact 2 0 3',
    ]);
  });

  /**
   * Verifies: with canEdit Add, Edit and Delete are enabled and the expanded category's options get canEdit true.
   * Interacts with: the rendered buttons, the scoring-options child stub's canEdit input.
   * Data: canEdit true; Functional impact expanded.
   */
  it('enables editing with canEdit', async () => {
    const { fixture, scoringCategoryClick, user } =
      await renderCategories(true);

    expect(
      screen.getByRole('button', { name: 'Add Scoring Category' }),
    ).toBeEnabled();
    expect(
      screen.getAllByRole('button', { name: 'Edit Scoring Category' })[0],
    ).toBeEnabled();
    expect(
      screen.getAllByRole('button', { name: 'Delete Scoring Category' })[0],
    ).toBeEnabled();

    await user.click(screen.getByText('Functional impact'));
    expect(scoringCategoryClick).toHaveBeenCalledWith('c1');
    expect(optionsStub(fixture)?.scoringCategoryId).toBe('c1');
    expect(optionsStub(fixture)?.canEdit).toBe(true);
  });

  /**
   * Verifies: without canEdit Add, Edit and Delete are disabled and the options get canEdit false.
   * Interacts with: the rendered buttons, the scoring-options child stub's canEdit input.
   * Data: canEdit false; Functional impact expanded.
   */
  it('disables editing without canEdit', async () => {
    const { fixture, user } = await renderCategories(false);

    expect(
      screen.getByRole('button', { name: 'Add Scoring Category' }),
    ).toBeDisabled();
    for (const name of ['Edit Scoring Category', 'Delete Scoring Category']) {
      for (const button of screen.getAllByRole('button', { name })) {
        expect(button).toBeDisabled();
      }
    }

    await user.click(screen.getByText('Functional impact'));
    expect(optionsStub(fixture)?.canEdit).toBe(false);
  });

  /**
   * Verifies: Edit hands canEdit and the display-by-move flag to the dialog, and a saved edit is sent to the API.
   * Interacts with: matDialogStub (dialog data, editComplete), ScoringCategoryService.updateScoringCategory stub.
   * Data: canEdit true; Functional impact renamed.
   */
  it('updates a category saved in the edit dialog', async () => {
    const { categoryApi, editDialog, user } = await renderCategories(true);
    await user.click(
      screen.getAllByRole('button', { name: 'Edit Scoring Category' })[0],
    );
    expect(editDialog.config()?.data).toEqual(
      expect.objectContaining({
        scoringCategory: expect.objectContaining({ id: 'c1' }),
        displayScoringModelbyMoveNumber: true,
        canEdit: true,
      }),
    );

    editDialog.complete({
      saveChanges: true,
      scoringCategory: { ...CATEGORIES[1], description: 'Mission impact' },
    });

    expect(categoryApi.updateScoringCategory).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ description: 'Mission impact' }),
    );
  });

  /**
   * Verifies: a confirmed Delete removes the category through the API.
   * Interacts with: CrucibleDialogService.confirm stub (answers true), ScoringCategoryService.deleteScoringCategory stub.
   * Data: canEdit true; Information impact deleted.
   */
  it('deletes a category after confirmation', async () => {
    const { categoryApi, confirm, user } = await renderCategories(true);
    await user.click(
      screen.getAllByRole('button', { name: 'Delete Scoring Category' })[1],
    );

    expect(confirm).toHaveBeenCalledOnce();
    expect(categoryApi.deleteScoringCategory).toHaveBeenCalledWith('c2');
  });
});
