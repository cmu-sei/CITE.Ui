// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { CRUCIBLE_DIALOG_IMPORTS } from '@cmusei/crucible-common';
import { TeamType } from '../../../generated/cite.api';
import { dialogRefStub } from '../../../test-utils/dialog-refs';
import { renderComponent } from '../../../test-utils/render-component';
import { AdminTeamTypeEditDialogComponent } from './admin-teamtype-edit-dialog.component';

async function renderTeamTypeDialog(canEdit: boolean) {
  const teamType: TeamType = {
    id: 'tt1',
    name: 'Agency',
    isOfficialScoreContributor: false,
    showTeamTypeAverage: true,
  };
  const editComplete = vi.fn();
  const rendered = await renderComponent(AdminTeamTypeEditDialogComponent, {
    declarations: [AdminTeamTypeEditDialogComponent],
    imports: [
      MatCheckboxModule,
      MatFormFieldModule,
      MatInputModule,
      ...CRUCIBLE_DIALOG_IMPORTS,
    ],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: { teamType, canEdit } },
      {
        provide: MatDialogRef,
        useValue: dialogRefStub<AdminTeamTypeEditDialogComponent>().dialogRef,
      },
    ],
    on: { editComplete },
  });
  return { ...rendered, editComplete, user: userEvent.setup() };
}

describe('AdminTeamTypeEditDialogComponent', () => {
  /**
   * Verifies: with canEdit the fields are editable and Save emits the edited team type.
   * Interacts with: the crucible-dialog Save button, the editComplete output.
   * Data: canEdit true; Official Score Contributor ticked.
   */
  it('saves the edited team type with canEdit', async () => {
    const { editComplete, user } = await renderTeamTypeDialog(true);
    const official = screen.getByRole('checkbox', {
      name: 'Official Score Contributor',
    });
    expect(official).toBeEnabled();

    await user.click(official);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(editComplete).toHaveBeenCalledWith({
      saveChanges: true,
      teamType: expect.objectContaining({
        id: 'tt1',
        name: 'Agency',
        isOfficialScoreContributor: true,
        showTeamTypeAverage: true,
      }),
    });
  });

  /**
   * Verifies: without canEdit every field and Save are disabled.
   * Interacts with: the rendered form and the crucible-dialog Save button.
   * Data: canEdit false.
   */
  it('is read-only without canEdit', async () => {
    await renderTeamTypeDialog(false);

    expect(screen.getByRole('textbox', { name: 'Name' })).toBeDisabled();
    expect(
      screen.getByRole('checkbox', { name: 'Official Score Contributor' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('checkbox', { name: 'Show TeamType Average' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
