// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { screen } from '@testing-library/angular';
import userEvent, {
  PointerEventsCheckLevel,
} from '@testing-library/user-event';
import { CRUCIBLE_DIALOG_IMPORTS } from '@cmusei/crucible-common';
import { Team } from '../../../generated/cite.api';
import { dialogRefStub } from '../../../test-utils/dialog-refs';
import { renderComponent } from '../../../test-utils/render-component';
import { AdminTeamEditDialogComponent } from './admin-team-edit-dialog.component';

// The global stylesheets make every computed-style lookup slow in jsdom, and
// user-event's pointer-events check looks one up per ancestor on each click
// (about a second per click on this page under coverage). Clicks go to
// enabled, visible controls here, so the check is skipped.
const FAST_POINTER = { pointerEventsCheck: PointerEventsCheckLevel.Never };

async function renderTeamDialog(team: Team) {
  const editComplete = vi.fn();
  const rendered = await renderComponent(AdminTeamEditDialogComponent, {
    declarations: [AdminTeamEditDialogComponent],
    imports: [
      MatCheckboxModule,
      MatFormFieldModule,
      MatInputModule,
      MatSelectModule,
      ...CRUCIBLE_DIALOG_IMPORTS,
    ],
    providers: [
      {
        provide: MAT_DIALOG_DATA,
        useValue: {
          team,
          teamTypeList: [{ id: 'tt1', name: 'Agency' }],
          userList: [],
        },
      },
      {
        provide: MatDialogRef,
        useValue: dialogRefStub<AdminTeamEditDialogComponent>().dialogRef,
      },
    ],
    on: { editComplete },
  });
  return { ...rendered, editComplete, user: userEvent.setup(FAST_POINTER) };
}

describe('AdminTeamEditDialogComponent', () => {
  /**
   * Verifies: the dialog mounts with the default test providers, titled for a new team, with Save disabled.
   * Interacts with: MAT_DIALOG_DATA, the crucible-dialog shell.
   * Data: an empty new team.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderTeamDialog({
      name: '',
      shortName: '',
      teamTypeId: '',
      evaluationId: 'e1',
    });

    expect(fixture.componentInstance).toBeInstanceOf(
      AdminTeamEditDialogComponent,
    );
    expect(
      screen.getByRole('heading', { name: 'Add Team' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  /**
   * Verifies: Save emits the team with its names trimmed.
   * Interacts with: the crucible-dialog Save button, the editComplete output.
   * Data: team t1; the name typed with surrounding spaces.
   */
  it('emits the trimmed team on Save', async () => {
    const { editComplete, user } = await renderTeamDialog({
      id: 't1',
      name: 'Blue Team',
      shortName: 'BLU',
      teamTypeId: 'tt1',
      hideScoresheet: false,
    });
    const name = screen.getByRole('textbox', { name: 'Name' });
    await user.clear(name);
    await user.type(name, '  Blue Cell  ');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(editComplete).toHaveBeenCalledWith({
      saveChanges: true,
      team: {
        id: 't1',
        name: 'Blue Cell',
        shortName: 'BLU',
        teamTypeId: 'tt1',
        hideScoresheet: false,
      },
    });
  });
});
