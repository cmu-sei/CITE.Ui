// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { screen, within } from '@testing-library/angular';
import userEvent, {
  PointerEventsCheckLevel,
} from '@testing-library/user-event';
import { AngularEditorModule } from '@kolkov/angular-editor';
import {
  NgxMatDatepickerActions,
  NgxMatDatepickerApply,
  NgxMatDatepickerCancel,
  NgxMatDatepickerInput,
  NgxMatDatetimepicker,
} from '@ngxmc/datetime-picker';
import { CRUCIBLE_DIALOG_IMPORTS } from '@cmusei/crucible-common';
import { Evaluation, ItemStatus } from '../../../generated/cite.api';
import { dialogRefStub } from '../../../test-utils/dialog-refs';
import { renderComponent } from '../../../test-utils/render-component';
import { AdminEvaluationEditDialogComponent } from './admin-evaluation-edit-dialog.component';

// The global stylesheets make every computed-style lookup slow in jsdom, and
// user-event's pointer-events check looks one up per ancestor on each click
// (about a second per click on this page under coverage). Clicks go to
// enabled, visible controls here, so the check is skipped.
const FAST_POINTER = { pointerEventsCheck: PointerEventsCheckLevel.Never };

async function renderEvaluationDialog(canEdit: boolean, isExisting = true) {
  const evaluation: Evaluation = {
    id: isExisting ? 'e1' : undefined,
    description: 'Ransomware exercise',
    scoringModelId: 'sm1',
    status: ItemStatus.Active,
    currentMoveNumber: 1,
    situationTime: new Date('2026-01-05T14:30:00Z'),
    situationDescription: '<p>Day one</p>',
    showAdvanceButton: false,
  };
  const editComplete = vi.fn();
  const rendered = await renderComponent(AdminEvaluationEditDialogComponent, {
    declarations: [AdminEvaluationEditDialogComponent],
    imports: [
      AngularEditorModule,
      MatButtonModule,
      MatCheckboxModule,
      MatDatepickerModule,
      MatFormFieldModule,
      MatInputModule,
      MatNativeDateModule,
      MatSelectModule,
      NgxMatDatepickerActions,
      NgxMatDatepickerApply,
      NgxMatDatepickerCancel,
      NgxMatDatepickerInput,
      NgxMatDatetimepicker,
      ...CRUCIBLE_DIALOG_IMPORTS,
    ],
    providers: [
      {
        provide: MAT_DIALOG_DATA,
        useValue: {
          evaluation,
          scoringModels: [{ id: 'sm1', description: 'NCISS' }],
          itemStatuses: Object.values(ItemStatus),
          isExisting,
          canEdit,
        },
      },
      {
        provide: MatDialogRef,
        useValue: dialogRefStub<AdminEvaluationEditDialogComponent>().dialogRef,
      },
    ],
    on: { editComplete },
  });
  await rendered.fixture.whenStable();
  return { ...rendered, editComplete, user: userEvent.setup(FAST_POINTER) };
}

// The situation editor's toolbar holds dozens of buttons, and role queries
// over it are slow in jsdom; the dialog's own buttons are looked up inside its
// action bar, and the form fields by their labels.
const save = () =>
  within(document.querySelector('mat-dialog-actions') as HTMLElement).getByRole(
    'button',
    { name: 'Save' },
  );

describe('AdminEvaluationEditDialogComponent', () => {
  /**
   * Verifies: with canEdit the evaluation fields are editable (the scoring model stays fixed for an existing evaluation) and Save emits the edit.
   * Interacts with: the crucible-dialog Save button, the editComplete output.
   * Data: canEdit true, an existing evaluation; Show Advance Button ticked.
   */
  it('saves the edited evaluation with canEdit', async () => {
    const { editComplete, user } = await renderEvaluationDialog(true);
    expect(screen.getByLabelText('Evaluation Description')).toBeEnabled();
    expect(screen.getByLabelText('Scoring Model')).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    await user.click(screen.getByLabelText('Show Advance Button'));
    await user.click(save());

    expect(editComplete).toHaveBeenCalledWith({
      saveChanges: true,
      evaluation: expect.objectContaining({
        id: 'e1',
        scoringModelId: 'sm1',
        showAdvanceButton: true,
      }),
    });
  });

  /**
   * Verifies: a new evaluation lets the user pick its scoring model.
   * Interacts with: the scoring model select.
   * Data: canEdit true, isExisting false.
   */
  it('lets a new evaluation pick its scoring model', async () => {
    await renderEvaluationDialog(true, false);

    expect(screen.getByLabelText('Scoring Model')).toHaveAttribute(
      'aria-disabled',
      'false',
    );
  });

  /**
   * Verifies: without canEdit every field, the date picker toggle and Save are disabled.
   * Interacts with: the rendered form, the datepicker toggle and the crucible-dialog Save button.
   * Data: canEdit false.
   */
  it('is read-only without canEdit', async () => {
    await renderEvaluationDialog(false);

    expect(screen.getByLabelText('Evaluation Description')).toBeDisabled();
    expect(screen.getByLabelText('Evaluation Status')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByLabelText('Show Advance Button')).toBeDisabled();
    expect(screen.getByLabelText('Open calendar')).toBeDisabled();
    expect(save()).toBeDisabled();
  });
});
