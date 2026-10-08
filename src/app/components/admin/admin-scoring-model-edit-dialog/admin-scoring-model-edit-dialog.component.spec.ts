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
import { AngularEditorModule } from '@kolkov/angular-editor';
import { CRUCIBLE_DIALOG_IMPORTS } from '@cmusei/crucible-common';
import {
  ItemStatus,
  RightSideDisplay,
  ScoringModel,
} from '../../../generated/cite.api';
import { dialogRefStub } from '../../../test-utils/dialog-refs';
import { renderComponent } from '../../../test-utils/render-component';
import { AdminScoringModelEditDialogComponent } from './admin-scoring-model-edit-dialog.component';

// The global stylesheets make every computed-style lookup slow in jsdom, and
// user-event's pointer-events check looks one up per ancestor on each click
// (about a second per click on this page under coverage). Clicks go to
// enabled, visible controls here, so the check is skipped.
const FAST_POINTER = { pointerEventsCheck: PointerEventsCheckLevel.Never };

async function renderModelDialog(
  canEdit: boolean,
  model: Partial<ScoringModel> = {},
) {
  const scoringModel: ScoringModel = {
    id: 'sm1',
    description: 'NCISS',
    status: ItemStatus.Active,
    calculationEquation: '{average}',
    useUserScore: true,
    useTeamScore: false,
    useOfficialScore: true,
    useTeamAverageScore: false,
    useTypeAverageScore: false,
    rightSideDisplay: RightSideDisplay.EmbeddedUrl,
    rightSideEmbeddedUrl: 'https://gallery.test/',
    ...model,
  };
  const editComplete = vi.fn();
  const rendered = await renderComponent(AdminScoringModelEditDialogComponent, {
    declarations: [AdminScoringModelEditDialogComponent],
    imports: [
      AngularEditorModule,
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
          scoringModel,
          itemStatuses: Object.values(ItemStatus),
          rightSideDisplays: Object.values(RightSideDisplay),
          canEdit,
        },
      },
      {
        provide: MatDialogRef,
        useValue:
          dialogRefStub<AdminScoringModelEditDialogComponent>().dialogRef,
      },
    ],
    on: { editComplete },
  });
  return { ...rendered, editComplete, user: userEvent.setup(FAST_POINTER) };
}

// Label queries: role queries over this many fields are slow in jsdom.
const checkbox = (name: string) => screen.getByLabelText(name);

// The dialog's own buttons, looked up inside its action bar (the form has an
// info button per field).
const save = () =>
  within(document.querySelector('mat-dialog-actions') as HTMLElement).getByRole(
    'button',
    { name: 'Save' },
  );

describe('AdminScoringModelEditDialogComponent', () => {
  /**
   * Verifies: with canEdit the fields are editable, team-average follows user scoring, and Save emits the edit.
   * Interacts with: the rendered form, the crucible-dialog Save button, the editComplete output.
   * Data: canEdit true; user scoring on, team scoring off; Use Team Scoring ticked.
   */
  it('saves the edited scoring model with canEdit', async () => {
    const { editComplete, user } = await renderModelDialog(true);
    expect(screen.getByLabelText('Scoring Model Description')).toBeEnabled();
    expect(checkbox('Use Team Average Scoring')).toBeEnabled();
    expect(checkbox('Use Type Average Scoring')).toBeDisabled();

    await user.click(checkbox('Use Team Scoring'));
    expect(checkbox('Use Type Average Scoring')).toBeEnabled();
    await user.click(save());

    expect(editComplete).toHaveBeenCalledWith({
      saveChanges: true,
      scoringModel: expect.objectContaining({
        id: 'sm1',
        useTeamScore: true,
        rightSideEmbeddedUrl: 'https://gallery.test/',
      }),
    });
  });

  /**
   * Verifies: without canEdit every field, including the dependent averages, and Save are disabled.
   * Interacts with: the rendered form and the crucible-dialog Save button.
   * Data: canEdit false; user and team scoring both on.
   */
  it('is read-only without canEdit', async () => {
    await renderModelDialog(false, { useTeamScore: true });

    expect(screen.getByLabelText('Scoring Model Description')).toBeDisabled();
    expect(checkbox('Use Individual User Scoring')).toBeDisabled();
    expect(checkbox('Use Team Average Scoring')).toBeDisabled();
    expect(checkbox('Use Type Average Scoring')).toBeDisabled();
    expect(screen.getByLabelText('Right Side URL')).toBeDisabled();
    expect(save()).toBeDisabled();
  });

  /**
   * Verifies: the URL field only shows for the EmbeddedUrl right-side display.
   * Interacts with: the rightSideDisplay form value.
   * Data: canEdit true; rightSideDisplay ScoreSummary.
   */
  it('hides the URL field for other right-side displays', async () => {
    await renderModelDialog(true, {
      rightSideDisplay: RightSideDisplay.ScoreSummary,
    });

    expect(screen.queryByLabelText('Right Side URL')).not.toBeInTheDocument();
  });
});
