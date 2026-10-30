// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { CrucibleDialogService } from '@cmusei/crucible-common';
import { Duty, DutyService, TeamService } from '../../../generated/cite.api';
import { DutyDataService } from '../../../data/duty/duty-data.service';
import { TeamDataService } from '../../../data/team/team-data.service';
import { ApiStub } from '../../../test-utils/api-stub';
import { dialogRefStub } from '../../../test-utils/dialog-refs';
import { matDialogStub } from '../../../test-utils/mat-dialog';
import { renderComponent } from '../../../test-utils/render-component';
import { AdminDutiesComponent } from './admin-duties.component';

const DUTIES: Duty[] = [
  {
    id: 'd1',
    evaluationId: 'e1',
    teamId: 't1',
    name: 'Scribe',
    users: [{ id: 'u1', name: 'Alice' }],
  },
  { id: 'd2', evaluationId: 'e1', teamId: 't2', name: 'Liaison', users: [] },
];

async function renderDuties(
  canEdit: boolean,
  { firstPassChecked = false } = {},
) {
  // the component reuses one duty object across its creates, so each call is recorded as a copy
  const created: Duty[] = [];
  const dutyApi = {
    getDutiesByEvaluation: vi.fn(() => of(structuredClone(DUTIES))),
    createDuty: vi.fn((duty?: Duty) => {
      created.push({ ...duty });
      return of({ ...duty, id: `new-${created.length}` });
    }),
    updateDuty: vi.fn((id: string, duty?: Duty) => of({ ...duty, id })),
    deleteDuty: vi.fn(() => of(null)),
  } satisfies ApiStub<DutyService>;
  const teamApi = {
    getEvaluationTeams: vi.fn(() =>
      of([
        { id: 't1', evaluationId: 'e1', name: 'Blue', shortName: 'B' },
        { id: 't2', evaluationId: 'e1', name: 'Red', shortName: 'R' },
      ]),
    ),
  } satisfies ApiStub<TeamService>;
  const confirm = vi.fn(() => dialogRefStub<unknown, boolean>(true).dialogRef);
  const dialogService: Pick<CrucibleDialogService, 'confirm'> = { confirm };
  const editDialog = matDialogStub();

  const rendered = await renderComponent(AdminDutiesComponent, {
    declarations: [AdminDutiesComponent],
    imports: [
      MatButtonModule,
      MatCardModule,
      MatFormFieldModule,
      MatIconModule,
      MatInputModule,
      MatProgressSpinnerModule,
      MatSelectModule,
      MatSortModule,
      MatTableModule,
    ],
    componentInputs: { selectedEvaluationId: 'e1', canEdit },
    providers: [
      { provide: DutyService, useValue: dutyApi },
      { provide: TeamService, useValue: teamApi },
      { provide: CrucibleDialogService, useValue: dialogService },
      { provide: MatDialog, useValue: editDialog.dialog },
    ],
    // ngAfterViewInit re-emits the initial sort, which changes the header's
    // aria-sort after the first pass was checked (pinned below; see
    // agent-docs/ui-test-bugs/cite.ui.md). The first pass therefore runs
    // without the dev-mode check unless a test asks for it.
    detectChangesOnRender: firstPassChecked,
  });
  if (!firstPassChecked) {
    rendered.fixture.detectChanges(false);
  }
  await rendered.fixture.whenStable();
  return {
    ...rendered,
    dutyApi,
    created,
    confirm,
    editDialog,
    user: userEvent.setup(),
  };
}

const row = (text: string) =>
  within(screen.getByRole('table'))
    .getByText(text, { exact: false })
    .closest('tr') as HTMLElement;

describe('AdminDutiesComponent', () => {
  /**
   * Verifies: the first checked change-detection pass fails with NG0100 because ngAfterViewInit re-emits the initial sort (current behavior).
   * Interacts with: MatSort/MatSortHeader, ComponentFixture.detectChanges with its dev-mode check.
   * Data: canEdit true; the default first render.
   */
  it('fails the first checked render with NG0100 from the initial sort', async () => {
    // Current behavior; see agent-docs/ui-test-bugs/cite.ui.md.
    await expect(
      renderDuties(true, { firstPassChecked: true }),
    ).rejects.toThrow(/NG0100.*aria-sort/);
  });

  /**
   * Verifies: the evaluation's duties are listed with their team name and assigned users.
   * Interacts with: real DutyDataService/TeamDataService over stubbed endpoints.
   * Data: duties Scribe (Blue, Alice) and Liaison (Red, nobody).
   */
  it('lists the duties of the selected evaluation', async () => {
    const { dutyApi } = await renderDuties(true);

    expect(dutyApi.getDutiesByEvaluation).toHaveBeenCalledWith('e1');
    expect(row('Scribe')).toHaveTextContent('Blue');
    expect(row('Scribe')).toHaveTextContent('Alice');
    expect(row('Liaison')).toHaveTextContent('Red');
  });

  /**
   * Verifies: with canEdit the Add and Delete buttons are enabled.
   * Interacts with: the rendered buttons.
   * Data: canEdit true.
   */
  it('enables adding and deleting with canEdit', async () => {
    await renderDuties(true);

    expect(screen.getByRole('button', { name: 'Add Duty' })).toBeEnabled();
    expect(
      within(row('Liaison')).getByRole('button', { name: 'Delete Duty' }),
    ).toBeEnabled();
  });

  /**
   * Verifies: without canEdit the Add and Delete buttons are disabled, and Edit opens the dialog read-only.
   * Interacts with: the rendered buttons, matDialogStub (dialog data).
   * Data: canEdit false.
   */
  it('disables adding and deleting without canEdit', async () => {
    const { editDialog, user } = await renderDuties(false);

    expect(screen.getByRole('button', { name: 'Add Duty' })).toBeDisabled();
    expect(
      within(row('Liaison')).getByRole('button', { name: 'Delete Duty' }),
    ).toBeDisabled();

    await user.click(
      within(row('Liaison')).getByRole('button', { name: 'Edit Duty' }),
    );
    expect(editDialog.config()?.data.canEdit).toBe(false);
  });

  /**
   * Verifies: a confirmed Delete removes the duty through the API and from the table.
   * Interacts with: CrucibleDialogService.confirm stub (answers true), DutyService.deleteDuty stub.
   * Data: canEdit true; duty d2 deleted.
   */
  it('deletes a duty after confirmation', async () => {
    const { dutyApi, confirm, fixture, user } = await renderDuties(true);
    await user.click(
      within(row('Liaison')).getByRole('button', { name: 'Delete Duty' }),
    );
    fixture.detectChanges();

    expect(confirm).toHaveBeenCalledOnce();
    expect(dutyApi.deleteDuty).toHaveBeenCalledWith('d2');
    expect(
      within(screen.getByRole('table')).queryByText('Liaison'),
    ).not.toBeInTheDocument();
  });

  /**
   * Verifies: another evaluation's team and duty that reach the stores live are left out of the panel,
   * so adding a duty to all teams creates it for this evaluation's teams only.
   * Interacts with: the stores the SignalR handlers update, matDialogStub (editComplete), DutyService.createDuty stub.
   * Data: canEdit true; team t9 and duty d9 of e2 upserted; a duty added without a team.
   */
  it('keeps other evaluations out of the panel and out of an add to all teams', async () => {
    const { created, editDialog, fixture, user } = await renderDuties(true);
    TestBed.inject(TeamDataService).updateStore({ id: 't9', evaluationId: 'e2', name: 'Green', shortName: 'G' });
    TestBed.inject(DutyDataService).updateStore({ id: 'd9', evaluationId: 'e2', teamId: 't9', name: 'Other evaluation duty', users: [] });
    fixture.detectChanges();

    expect(within(screen.getByRole('table')).queryByText('Other evaluation duty')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add Duty' }));
    editDialog.complete({ saveChanges: true, duty: { evaluationId: 'e1', name: 'Timekeeper', teamId: '' } });

    expect(created.map((d) => d.teamId)).toEqual(['t1', 't2']);
  });

  /**
   * Verifies: Edit hands canEdit to the dialog, and a saved edit is sent to the API.
   * Interacts with: matDialogStub (dialog data, editComplete), DutyService.updateDuty stub.
   * Data: canEdit true; d1 renamed.
   */
  it('updates a duty saved in the edit dialog', async () => {
    const { dutyApi, editDialog, user } = await renderDuties(true);
    await user.click(
      within(row('Scribe')).getByRole('button', { name: 'Edit Duty' }),
    );
    expect(editDialog.config()?.data.canEdit).toBe(true);

    editDialog.complete({
      saveChanges: true,
      duty: { ...DUTIES[0], name: 'Note taker' },
    });

    expect(dutyApi.updateDuty).toHaveBeenCalledWith(
      'd1',
      expect.objectContaining({ name: 'Note taker' }),
    );
    expect(editDialog.close).toHaveBeenCalledOnce();
  });
});
