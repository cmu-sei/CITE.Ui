// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { CRUCIBLE_DIALOG_IMPORTS } from '@cmusei/crucible-common';
import { dialogRefStub } from '../../../test-utils/dialog-refs';
import { renderComponent } from '../../../test-utils/render-component';
import { NameDialogComponent } from './name-dialog.component';

async function renderNameDialog(nameValue = 'Old name') {
  const { dialogRef, close } = dialogRefStub<NameDialogComponent>();
  const rendered = await renderComponent(NameDialogComponent, {
    declarations: [NameDialogComponent],
    imports: [MatFormFieldModule, MatInputModule, ...CRUCIBLE_DIALOG_IMPORTS],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: { nameValue } },
      { provide: MatDialogRef, useValue: dialogRef },
    ],
  });
  return { ...rendered, close };
}

describe('NameDialogComponent', () => {
  /**
   * Verifies: the dialog mounts with the default test providers and pre-fills the name field.
   * Interacts with: MAT_DIALOG_DATA, the crucible-dialog shell.
   * Data: nameValue 'Old name'.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderNameDialog();

    expect(fixture.componentInstance).toBeInstanceOf(NameDialogComponent);
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue(
      'Old name',
    );
  });

  /**
   * Verifies: Save closes the dialog with the data carrying the edited name.
   * Interacts with: the dialog ref's close spy, the crucible-dialog Save button.
   * Data: the name changed to 'New name'.
   */
  it('closes with the edited name on Save', async () => {
    const user = userEvent.setup();
    const { close } = await renderNameDialog();
    const input = screen.getByRole('textbox', { name: 'Name' });
    await user.clear(input);
    await user.type(input, 'New name');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(close).toHaveBeenCalledWith({ nameValue: 'New name' });
  });
});
