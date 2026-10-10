// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { CRUCIBLE_DIALOG_IMPORTS } from '@cmusei/crucible-common';
import { ScoringOption } from '../../../generated/cite.api';
import { dialogRefStub } from '../../../test-utils/dialog-refs';
import { renderComponent } from '../../../test-utils/render-component';
import { AdminScoringOptionEditDialogComponent } from './admin-scoring-option-edit-dialog.component';

async function renderOptionDialog(scoringOption: ScoringOption) {
  const editComplete = vi.fn();
  const rendered = await renderComponent(
    AdminScoringOptionEditDialogComponent,
    {
      declarations: [AdminScoringOptionEditDialogComponent],
      imports: [
        MatButtonModule,
        MatCheckboxModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatTooltipModule,
        ...CRUCIBLE_DIALOG_IMPORTS,
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { scoringOption } },
        {
          provide: MatDialogRef,
          useValue:
            dialogRefStub<AdminScoringOptionEditDialogComponent>().dialogRef,
        },
      ],
      on: { editComplete },
    },
  );
  return { ...rendered, editComplete, user: userEvent.setup() };
}

describe('AdminScoringOptionEditDialogComponent', () => {
  /**
   * Verifies: the dialog mounts with the default test providers and shows the option's fields.
   * Interacts with: MAT_DIALOG_DATA, the crucible-dialog shell.
   * Data: option o1 'Minimal' with value 10.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderOptionDialog({
      id: 'o1',
      description: 'Minimal',
      displayOrder: 1,
      value: 10,
      isModifier: false,
    });

    expect(fixture.componentInstance).toBeInstanceOf(
      AdminScoringOptionEditDialogComponent,
    );
    expect(
      screen.getByRole('heading', { name: 'Edit Scoring Option' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Value' })).toHaveValue('10');
  });

  /**
   * Verifies: Save emits the option with the modifier flag the user ticked.
   * Interacts with: the crucible-dialog Save button, the editComplete output.
   * Data: option o1, Is a Modifier ticked.
   */
  it('emits the edited option on Save', async () => {
    const { editComplete, user } = await renderOptionDialog({
      id: 'o1',
      description: 'Minimal',
      displayOrder: 1,
      value: 10,
      isModifier: false,
    });
    await user.click(screen.getByRole('checkbox', { name: 'Is a Modifier' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(editComplete).toHaveBeenCalledWith({
      saveChanges: true,
      scoringOption: {
        id: 'o1',
        description: 'Minimal',
        displayOrder: 1,
        value: 10,
        isModifier: true,
      },
    });
  });
});
