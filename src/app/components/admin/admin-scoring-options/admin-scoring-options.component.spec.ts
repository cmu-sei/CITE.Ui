// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { CrucibleDialogService } from '@cmusei/crucible-common';
import {
  ScoringOption,
  ScoringOptionService,
} from '../../../generated/cite.api';
import { ApiStub } from '../../../test-utils/api-stub';
import { dialogRefStub } from '../../../test-utils/dialog-refs';
import { matDialogStub } from '../../../test-utils/mat-dialog';
import { renderComponent } from '../../../test-utils/render-component';
import { AdminScoringOptionsComponent } from './admin-scoring-options.component';

const OPTIONS: ScoringOption[] = [
  {
    id: 'o2',
    scoringCategoryId: 'c1',
    description: 'Significant',
    displayOrder: 2,
    value: 50,
    isModifier: false,
  },
  {
    id: 'o1',
    scoringCategoryId: 'c1',
    description: 'Minimal',
    displayOrder: 1,
    value: 10,
    isModifier: false,
  },
];

async function renderOptions(canEdit: boolean) {
  const optionApi = {
    getScoringOptionsByScoringCategoryId: vi.fn(() =>
      of(structuredClone(OPTIONS)),
    ),
    createScoringOption: vi.fn((option?: ScoringOption) =>
      of({ ...option, id: 'o-new' }),
    ),
    deleteScoringOption: vi.fn(() => of(null)),
  } satisfies ApiStub<ScoringOptionService>;
  const confirm = vi.fn(() => dialogRefStub<unknown, boolean>(true).dialogRef);
  const dialogService: Pick<CrucibleDialogService, 'confirm'> = { confirm };
  const editDialog = matDialogStub();

  const rendered = await renderComponent(AdminScoringOptionsComponent, {
    declarations: [AdminScoringOptionsComponent],
    imports: [
      MatButtonModule,
      MatCardModule,
      MatCheckboxModule,
      MatIconModule,
      MatProgressSpinnerModule,
    ],
    componentInputs: { scoringCategoryId: 'c1', canEdit },
    providers: [
      { provide: ScoringOptionService, useValue: optionApi },
      { provide: CrucibleDialogService, useValue: dialogService },
      { provide: MatDialog, useValue: editDialog.dialog },
    ],
  });
  await rendered.fixture.whenStable();
  return {
    ...rendered,
    optionApi,
    confirm,
    editDialog,
    user: userEvent.setup(),
  };
}

const optionRows = () =>
  Array.from(document.querySelectorAll('.row')).map((r) =>
    r.textContent?.replace(/\s+/g, ' ').trim(),
  );

describe('AdminScoringOptionsComponent', () => {
  /**
   * Verifies: the category's options are loaded and listed in display order with their value.
   * Interacts with: real ScoringOptionDataService/ScoringOptionQuery over a stubbed ScoringOptionService.
   * Data: options returned out of order.
   */
  it('lists the options of the category in display order', async () => {
    const { optionApi } = await renderOptions(true);

    expect(optionApi.getScoringOptionsByScoringCategoryId).toHaveBeenCalledWith(
      'c1',
    );
    expect(optionRows()).toEqual(['Minimal 10 1', 'Significant 50 2']);
  });

  /**
   * Verifies: with canEdit Add, Edit and Delete are enabled.
   * Interacts with: the rendered buttons.
   * Data: canEdit true.
   */
  it('enables adding, editing and deleting with canEdit', async () => {
    await renderOptions(true);

    expect(
      screen.getByRole('button', { name: 'Add Scoring Option' }),
    ).toBeEnabled();
    expect(
      screen.getAllByRole('button', { name: 'Edit Scoring Option' })[0],
    ).toBeEnabled();
    expect(
      screen.getAllByRole('button', { name: 'Delete Scoring Option' })[0],
    ).toBeEnabled();
  });

  /**
   * Verifies: without canEdit Add, Edit and Delete are disabled.
   * Interacts with: the rendered buttons.
   * Data: canEdit false.
   */
  it('disables adding, editing and deleting without canEdit', async () => {
    await renderOptions(false);

    expect(
      screen.getByRole('button', { name: 'Add Scoring Option' }),
    ).toBeDisabled();
    for (const name of ['Edit Scoring Option', 'Delete Scoring Option']) {
      for (const button of screen.getAllByRole('button', { name })) {
        expect(button).toBeDisabled();
      }
    }
  });

  /**
   * Verifies: Add opens the dialog with a blank option for the category, and saving it creates the option.
   * Interacts with: matDialogStub (dialog data, editComplete), ScoringOptionService.createScoringOption stub.
   * Data: canEdit true; a new option 'Moderate'.
   */
  it('creates an option saved in the add dialog', async () => {
    const { editDialog, optionApi, user } = await renderOptions(true);
    await user.click(
      screen.getByRole('button', { name: 'Add Scoring Option' }),
    );
    const option = editDialog.config()?.data.scoringOption as ScoringOption;
    expect(option).toEqual(
      expect.objectContaining({ scoringCategoryId: 'c1', value: 0 }),
    );

    editDialog.complete({
      saveChanges: true,
      scoringOption: { ...option, description: 'Moderate', value: 25 },
    });

    expect(optionApi.createScoringOption).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Moderate', value: 25 }),
    );
  });

  /**
   * Verifies: a confirmed Delete removes the option through the API.
   * Interacts with: CrucibleDialogService.confirm stub (answers true), ScoringOptionService.deleteScoringOption stub.
   * Data: canEdit true; the first listed option (Minimal) deleted.
   */
  it('deletes an option after confirmation', async () => {
    const { optionApi, confirm, user } = await renderOptions(true);
    await user.click(
      screen.getAllByRole('button', { name: 'Delete Scoring Option' })[0],
    );

    expect(confirm).toHaveBeenCalledOnce();
    expect(optionApi.deleteScoringOption).toHaveBeenCalledWith('o1');
  });
});
