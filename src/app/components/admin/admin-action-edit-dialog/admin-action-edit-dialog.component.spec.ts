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
import { Action } from '../../../generated/cite.api';
import { dialogRefStub } from '../../../test-utils/dialog-refs';
import { renderComponent } from '../../../test-utils/render-component';
import { AdminActionEditDialogComponent } from './admin-action-edit-dialog.component';

async function renderActionDialog(action: Action) {
  const editComplete = vi.fn();
  const rendered = await renderComponent(AdminActionEditDialogComponent, {
    declarations: [AdminActionEditDialogComponent],
    imports: [
      MatFormFieldModule,
      MatInputModule,
      MatSelectModule,
      ...CRUCIBLE_DIALOG_IMPORTS,
    ],
    providers: [
      {
        provide: MAT_DIALOG_DATA,
        useValue: {
          action,
          moveList: [
            { id: 'm0', moveNumber: 0, description: 'Detection' },
            { id: 'm1', moveNumber: 1, description: 'Escalation' },
          ],
          teamList: [
            { id: 't1', name: 'Blue' },
            { id: 't2', name: 'Red' },
          ],
          allMovesValue: -999,
        },
      },
      {
        provide: MatDialogRef,
        useValue: dialogRefStub<AdminActionEditDialogComponent>().dialogRef,
      },
    ],
    on: { editComplete },
  });
  return { ...rendered, editComplete, user: userEvent.setup() };
}

describe('AdminActionEditDialogComponent', () => {
  /**
   * Verifies: the dialog mounts with the default test providers, titled for a new action.
   * Interacts with: MAT_DIALOG_DATA, the crucible-dialog shell.
   * Data: an action without an id.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderActionDialog({
      description: '',
      moveNumber: -999,
      teamId: '',
    });

    expect(fixture.componentInstance).toBeInstanceOf(
      AdminActionEditDialogComponent,
    );
    expect(
      screen.getByRole('heading', { name: 'Add Action' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  /**
   * Verifies: Save emits the action with the edited description, keeping the move as a string.
   * Interacts with: the crucible-dialog Save button, the editComplete output.
   * Data: action a1 on move 1, team t1, description changed.
   */
  it('emits the edited action on Save', async () => {
    const { editComplete, user } = await renderActionDialog({
      id: 'a1',
      description: 'Isolate the mail server',
      moveNumber: 1,
      teamId: 't1',
    });
    const description = screen.getByRole('textbox', {
      name: 'Action Description',
    });
    await user.clear(description);
    await user.type(description, 'Isolate every server');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(editComplete).toHaveBeenCalledWith({
      saveChanges: true,
      action: {
        id: 'a1',
        description: 'Isolate every server',
        moveNumber: '1',
        teamId: 't1',
      },
    });
  });
});
