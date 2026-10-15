// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { screen, within } from '@testing-library/angular';
import userEvent, {
  PointerEventsCheckLevel,
} from '@testing-library/user-event';
import { CRUCIBLE_DIALOG_IMPORTS } from '@cmusei/crucible-common';
import {
  ScoringCategory,
  ScoringOptionSelection,
} from '../../../generated/cite.api';
import { dialogRefStub } from '../../../test-utils/dialog-refs';
import { renderComponent } from '../../../test-utils/render-component';
import { AdminScoringCategoryEditDialogComponent } from './admin-scoring-category-edit-dialog.component';

// The global stylesheets make every computed-style lookup slow in jsdom, and
// user-event's pointer-events check looks one up per ancestor on each click
// (about a second per click on this page under coverage). Clicks go to
// enabled, visible controls here, so the check is skipped.
const FAST_POINTER = { pointerEventsCheck: PointerEventsCheckLevel.Never };

async function renderCategoryDialog(
  canEdit: boolean,
  displayScoringModelbyMoveNumber = true,
) {
  const scoringCategory: ScoringCategory = {
    id: 'c1',
    description: 'Functional impact',
    displayOrder: 1,
    moveNumberFirstDisplay: 0,
    moveNumberLastDisplay: 3,
    calculationEquation: '{max}',
    scoringWeight: 1,
    scoringOptionSelection: ScoringOptionSelection.Single,
    isModifierRequired: false,
  };
  const editComplete = vi.fn();
  const rendered = await renderComponent(
    AdminScoringCategoryEditDialogComponent,
    {
      declarations: [AdminScoringCategoryEditDialogComponent],
      imports: [
        MatButtonModule,
        MatCheckboxModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
        MatTooltipModule,
        ...CRUCIBLE_DIALOG_IMPORTS,
      ],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            scoringCategory,
            canEdit,
            displayScoringModelbyMoveNumber,
            scoringOptionSelections: Object.values(ScoringOptionSelection),
          },
        },
        {
          provide: MatDialogRef,
          useValue:
            dialogRefStub<AdminScoringCategoryEditDialogComponent>().dialogRef,
        },
      ],
      on: { editComplete },
    },
  );
  return { ...rendered, editComplete, user: userEvent.setup(FAST_POINTER) };
}

// The dialog's own buttons, looked up inside its action bar (the form has an
// info button per field).
const save = () =>
  within(document.querySelector('mat-dialog-actions') as HTMLElement).getByRole(
    'button',
    { name: 'Save' },
  );

describe('AdminScoringCategoryEditDialogComponent', () => {
  /**
   * Verifies: with canEdit the fields are editable and Save emits the edited category.
   * Interacts with: the crucible-dialog Save button, the editComplete output.
   * Data: canEdit true; the equation changed to {sum}.
   */
  it('saves the edited category with canEdit', async () => {
    const { editComplete, user } = await renderCategoryDialog(true);
    const equation = screen.getByLabelText('Calculation Equation');
    expect(equation).toBeEnabled();

    await user.clear(equation);
    // user-event treats { as a key descriptor; {{ types a literal brace.
    await user.type(equation, '{{sum}');
    await user.click(save());

    expect(editComplete).toHaveBeenCalledWith({
      saveChanges: true,
      scoringCategory: expect.objectContaining({
        id: 'c1',
        calculationEquation: '{sum}',
        scoringOptionSelection: ScoringOptionSelection.Single,
      }),
    });
  });

  /**
   * Verifies: without canEdit every field and Save are disabled.
   * Interacts with: the rendered form and the crucible-dialog Save button.
   * Data: canEdit false.
   */
  it('is read-only without canEdit', async () => {
    await renderCategoryDialog(false);

    expect(
      screen.getByLabelText('Scoring Category Description'),
    ).toBeDisabled();
    expect(screen.getByLabelText('Calculation Equation')).toBeDisabled();
    expect(screen.getByLabelText('Modifier Selection Required')).toBeDisabled();
    expect(save()).toBeDisabled();
  });

  /**
   * Verifies: the move-range fields only appear when the scoring model displays by move number.
   * Interacts with: MAT_DIALOG_DATA.displayScoringModelbyMoveNumber.
   * Data: displayScoringModelbyMoveNumber false.
   */
  it('hides the move range when the model does not display by move', async () => {
    await renderCategoryDialog(true, false);

    expect(
      screen.queryByLabelText('First Move to Display'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Last Move to Display'),
    ).not.toBeInTheDocument();
  });
});
