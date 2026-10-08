// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
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
import { Move } from '../../../generated/cite.api';
import { dialogRefStub } from '../../../test-utils/dialog-refs';
import { renderComponent } from '../../../test-utils/render-component';
import { AdminMoveEditDialogComponent } from './admin-move-edit-dialog.component';

// The global stylesheets make every computed-style lookup slow in jsdom, and
// user-event's pointer-events check looks one up per ancestor on each click
// (about a second per click on this page under coverage). Clicks go to
// enabled, visible controls here, so the check is skipped.
const FAST_POINTER = { pointerEventsCheck: PointerEventsCheckLevel.Never };

async function renderMoveDialog(canEdit: boolean) {
  const move: Move = {
    id: 'm1',
    evaluationId: 'e1',
    moveNumber: 1,
    description: 'Escalation',
    situationTime: new Date('2026-01-05T14:30:00Z'),
    situationDescription: '<p>Ransom note found</p>',
  };
  const editComplete = vi.fn();
  const rendered = await renderComponent(AdminMoveEditDialogComponent, {
    declarations: [AdminMoveEditDialogComponent],
    imports: [
      AngularEditorModule,
      MatButtonModule,
      MatDatepickerModule,
      MatFormFieldModule,
      MatInputModule,
      MatNativeDateModule,
      NgxMatDatepickerActions,
      NgxMatDatepickerApply,
      NgxMatDatepickerCancel,
      NgxMatDatepickerInput,
      NgxMatDatetimepicker,
      ...CRUCIBLE_DIALOG_IMPORTS,
    ],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: { move, canEdit } },
      {
        provide: MatDialogRef,
        useValue: dialogRefStub<AdminMoveEditDialogComponent>().dialogRef,
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

describe('AdminMoveEditDialogComponent', () => {
  /**
   * Verifies: with canEdit an edited move is emitted on Save and the date picker toggle is enabled.
   * Interacts with: the crucible-dialog Save button, the editComplete output, the datepicker toggle.
   * Data: canEdit true; move 1's description changed.
   */
  it('saves the edited move with canEdit', async () => {
    const { editComplete, user } = await renderMoveDialog(true);
    expect(screen.getByLabelText('Open calendar')).toBeEnabled();

    const description = screen.getByLabelText('Move Description');
    await user.clear(description);
    await user.type(description, 'Containment');
    await user.click(save());

    expect(editComplete).toHaveBeenCalledWith({
      saveChanges: true,
      move: expect.objectContaining({
        id: 'm1',
        description: 'Containment',
        situationTime: new Date('2026-01-05T14:30:00Z'),
      }),
    });
  });

  /**
   * Verifies: without canEdit Save stays disabled after an edit and the date picker toggle is disabled.
   * Interacts with: the crucible-dialog Save button, the datepicker toggle.
   * Data: canEdit false; the description edited anyway.
   */
  it('keeps Save disabled without canEdit', async () => {
    const { editComplete, user } = await renderMoveDialog(false);
    expect(screen.getByLabelText('Open calendar')).toBeDisabled();

    await user.type(screen.getByLabelText('Move Description'), ' changed');

    expect(save()).toBeDisabled();
    expect(editComplete).not.toHaveBeenCalled();
  });
});
