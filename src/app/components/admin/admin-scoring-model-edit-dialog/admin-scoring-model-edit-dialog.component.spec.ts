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

  /**
   * Verifies: a model without severity levels says it uses the defaults, and saving it keeps none.
   * Interacts with: the Severity Levels section and the crucible-dialog Save button.
   * Data: canEdit true; no severity levels; the description is edited so Save is enabled.
   */
  it('keeps the default severity levels unless they are customized', async () => {
    const { editComplete, user } = await renderModelDialog(true);
    expect(screen.getByText('Using the default CISA levels.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Scoring Model Description'), ' v2');
    await user.click(save());

    expect(editComplete).toHaveBeenCalledWith({
      saveChanges: true,
      scoringModel: expect.objectContaining({ severityLevels: [] }),
    });
  });

  /**
   * Verifies: Customize Levels loads the six default levels, highest first, as editable rows that are saved.
   * Interacts with: the Customize Levels button, a level's Name field and the Save button.
   * Data: canEdit true; no severity levels; Emergency renamed to Critical.
   */
  it('customizes the default severity levels', async () => {
    const { editComplete, user } = await renderModelDialog(true);

    await user.click(screen.getByRole('button', { name: 'Customize Levels' }));
    const names = screen.getAllByLabelText('Name') as HTMLInputElement[];
    expect(names.map((input) => input.value)).toEqual([
      'Emergency', 'Severe', 'High', 'Medium', 'Low', 'Baseline',
    ]);
    await user.clear(names[0]);
    await user.type(names[0], 'Critical');
    await user.click(save());

    const saved = editComplete.mock.calls[0][0].scoringModel.severityLevels;
    expect(saved).toHaveLength(6);
    expect(saved[0]).toEqual(expect.objectContaining({ name: 'Critical', minimumScore: 90, color: '#000000' }));
  });

  /**
   * Verifies: two levels with the same Minimum Score are flagged and can't be saved; Use Default Levels clears them.
   * Interacts with: the Minimum Score fields, the Save button and the Use Default Levels button.
   * Data: canEdit true; levels Low at 0 and High at 50; High changed to 0.
   */
  it('refuses severity levels that share a minimum score', async () => {
    const { editComplete, user } = await renderModelDialog(true, {
      severityLevels: [
        { name: 'Low', minimumScore: 0, color: '#00FF00', description: '' },
        { name: 'High', minimumScore: 50, color: '#FF0000', description: '' },
      ],
    });

    const minimums = screen.getAllByLabelText('Minimum Score');
    await user.clear(minimums[1]);
    await user.type(minimums[1], '0');

    expect(screen.getByRole('alert')).toHaveTextContent('Each level needs a different Minimum Score.');
    expect(save()).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Use Default Levels' }));
    expect(screen.getByText('Using the default CISA levels.')).toBeInTheDocument();
    await user.click(save());
    expect(editComplete).toHaveBeenCalledWith({
      saveChanges: true,
      scoringModel: expect.objectContaining({ severityLevels: [] }),
    });
  });

  /**
   * Verifies: without canEdit the severity levels are shown but can't be changed.
   * Interacts with: the Severity Levels section.
   * Data: canEdit false; one level.
   */
  it('shows the severity levels read-only without canEdit', async () => {
    await renderModelDialog(false, {
      severityLevels: [{ name: 'Only', minimumScore: 0, color: '#00FF00', description: 'All of it' }],
    });

    expect(screen.getByLabelText('Name')).toBeDisabled();
    expect(screen.getByLabelText('Color of Only')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove Only' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add Level' })).toBeDisabled();
  });
});
