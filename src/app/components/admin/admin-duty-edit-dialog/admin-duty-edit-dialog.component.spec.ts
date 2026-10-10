// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { CRUCIBLE_DIALOG_IMPORTS } from '@cmusei/crucible-common';
import { Duty, Team } from '../../../generated/cite.api';
import { dialogRefStub } from '../../../test-utils/dialog-refs';
import { renderComponent } from '../../../test-utils/render-component';
import { AdminDutyEditDialogComponent } from './admin-duty-edit-dialog.component';

const TEAMS: Team[] = [
  { id: 't1', name: 'Blue' },
  { id: 't2', name: 'Red' },
];

async function renderDutyDialog(canEdit: boolean) {
  const duty: Duty = {
    id: 'd1',
    evaluationId: 'e1',
    teamId: 't1',
    name: 'Scribe',
  };
  const editComplete = vi.fn();
  const rendered = await renderComponent(AdminDutyEditDialogComponent, {
    declarations: [AdminDutyEditDialogComponent],
    imports: [
      MatFormFieldModule,
      MatInputModule,
      MatSelectModule,
      ...CRUCIBLE_DIALOG_IMPORTS,
    ],
    providers: [
      {
        provide: MAT_DIALOG_DATA,
        useValue: { duty, teamList: TEAMS, canEdit },
      },
      {
        provide: MatDialogRef,
        useValue: dialogRefStub<AdminDutyEditDialogComponent>().dialogRef,
      },
    ],
    on: { editComplete },
  });
  return { ...rendered, editComplete, user: userEvent.setup() };
}

describe('AdminDutyEditDialogComponent', () => {
  /**
   * Verifies: with canEdit the name field is editable and Save emits the edited duty.
   * Interacts with: the crucible-dialog Save button, the editComplete output.
   * Data: canEdit true; duty Scribe renamed to Note taker.
   */
  it('saves the edited duty with canEdit', async () => {
    const { editComplete, user } = await renderDutyDialog(true);
    const name = screen.getByRole('textbox', { name: 'Duty Name' });
    expect(name).toBeEnabled();

    await user.clear(name);
    await user.type(name, 'Note taker');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(editComplete).toHaveBeenCalledWith({
      saveChanges: true,
      duty: expect.objectContaining({
        id: 'd1',
        name: 'Note taker',
        teamId: 't1',
      }),
    });
  });

  /**
   * Verifies: without canEdit the form fields and Save are disabled.
   * Interacts with: the rendered form and the crucible-dialog Save button.
   * Data: canEdit false.
   */
  it('is read-only without canEdit', async () => {
    await renderDutyDialog(false);

    expect(screen.getByRole('textbox', { name: 'Duty Name' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Team' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  /**
   * Verifies: Cancel emits editComplete without changes.
   * Interacts with: the crucible-dialog Cancel button.
   * Data: canEdit true, nothing edited.
   */
  it('emits no changes on Cancel', async () => {
    const { editComplete, user } = await renderDutyDialog(true);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(editComplete).toHaveBeenCalledWith({
      saveChanges: false,
      duty: null,
    });
  });
});
