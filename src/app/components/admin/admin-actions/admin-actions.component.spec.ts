// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
import {
  Action,
  ActionService,
  MoveService,
  TeamService,
} from '../../../generated/cite.api';
import { ApiStub } from '../../../test-utils/api-stub';
import { dialogRefStub } from '../../../test-utils/dialog-refs';
import { matDialogStub } from '../../../test-utils/mat-dialog';
import { renderComponent } from '../../../test-utils/render-component';
import { AdminActionsComponent } from './admin-actions.component';

const ACTIONS: Action[] = [
  {
    id: 'a1',
    evaluationId: 'e1',
    teamId: 't1',
    moveNumber: 1,
    description: 'Isolate the mail server',
  },
  {
    id: 'a2',
    evaluationId: 'e1',
    teamId: 't2',
    moveNumber: 0,
    description: 'Notify legal',
  },
];

async function renderActions(
  canEdit: boolean,
  { firstPassChecked = false } = {},
) {
  const actionApi = {
    getActionsByEvaluation: vi.fn(() => of(structuredClone(ACTIONS))),
    updateAction: vi.fn((id: string, action?: Action) => of({ ...action, id })),
    deleteAction: vi.fn(() => of(null)),
  } satisfies ApiStub<ActionService>;
  const moveApi = {
    getByEvaluation: vi.fn(() =>
      of([
        { id: 'm0', evaluationId: 'e1', moveNumber: 0 },
        { id: 'm1', evaluationId: 'e1', moveNumber: 1 },
      ]),
    ),
  } satisfies ApiStub<MoveService>;
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

  const rendered = await renderComponent(AdminActionsComponent, {
    declarations: [AdminActionsComponent],
    imports: [
      MatButtonModule,
      MatCardModule,
      MatCheckboxModule,
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
      { provide: ActionService, useValue: actionApi },
      { provide: MoveService, useValue: moveApi },
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
    actionApi,
    confirm,
    editDialog,
    user: userEvent.setup(),
  };
}

const row = (text: string) =>
  within(screen.getByRole('table'))
    .getByText(text, { exact: false })
    .closest('tr') as HTMLElement;

describe('AdminActionsComponent', () => {
  /**
   * Verifies: the first checked change-detection pass fails with NG0100 because ngAfterViewInit re-emits the initial sort (current behavior).
   * Interacts with: MatSort/MatSortHeader, ComponentFixture.detectChanges with its dev-mode check.
   * Data: canEdit true; the default first render.
   */
  it('fails the first checked render with NG0100 from the initial sort', async () => {
    // Current behavior; see agent-docs/ui-test-bugs/cite.ui.md.
    await expect(
      renderActions(true, { firstPassChecked: true }),
    ).rejects.toThrow(/NG0100.*aria-sort/);
  });

  /**
   * Verifies: the evaluation's actions are loaded and listed with their move and team name.
   * Interacts with: real ActionDataService/MoveDataService/TeamDataService over stubbed endpoints.
   * Data: two actions of e1, teams Blue and Red.
   */
  it('lists the actions of the selected evaluation', async () => {
    const { actionApi } = await renderActions(true);

    expect(actionApi.getActionsByEvaluation).toHaveBeenCalledWith('e1');
    expect(row('Isolate the mail server')).toHaveTextContent('Blue');
    expect(row('Notify legal')).toHaveTextContent('Red');
  });

  /**
   * Verifies: with canEdit the Add, Edit and Delete buttons are enabled.
   * Interacts with: the rendered buttons.
   * Data: canEdit true.
   */
  it('enables adding, editing and deleting with canEdit', async () => {
    await renderActions(true);

    expect(screen.getByRole('button', { name: 'Add Action' })).toBeEnabled();
    const actions = row('Notify legal');
    expect(
      within(actions).getByRole('button', { name: 'Edit Action' }),
    ).toBeEnabled();
    expect(
      within(actions).getByRole('button', { name: 'Delete Action' }),
    ).toBeEnabled();
  });

  /**
   * Verifies: without canEdit the Add, Edit and Delete buttons are disabled.
   * Interacts with: the rendered buttons.
   * Data: canEdit false.
   */
  it('disables adding, editing and deleting without canEdit', async () => {
    await renderActions(false);

    expect(screen.getByRole('button', { name: 'Add Action' })).toBeDisabled();
    const actions = row('Notify legal');
    expect(
      within(actions).getByRole('button', { name: 'Edit Action' }),
    ).toBeDisabled();
    expect(
      within(actions).getByRole('button', { name: 'Delete Action' }),
    ).toBeDisabled();
  });

  /**
   * Verifies: a confirmed Delete removes the action through the API and from the table.
   * Interacts with: CrucibleDialogService.confirm stub (answers true), ActionService.deleteAction stub.
   * Data: canEdit true; action a2 deleted.
   */
  it('deletes an action after confirmation', async () => {
    const { actionApi, confirm, fixture, user } = await renderActions(true);
    await user.click(
      within(row('Notify legal')).getByRole('button', {
        name: 'Delete Action',
      }),
    );
    fixture.detectChanges();

    expect(confirm).toHaveBeenCalledOnce();
    expect(actionApi.deleteAction).toHaveBeenCalledWith('a2');
    expect(
      within(screen.getByRole('table')).queryByText('Notify legal'),
    ).not.toBeInTheDocument();
  });

  /**
   * Verifies: saving the edit dialog sends the edited action to the API and closes the dialog.
   * Interacts with: matDialogStub (editComplete), ActionService.updateAction stub.
   * Data: canEdit true; a2's description changed.
   */
  it('updates an action saved in the edit dialog', async () => {
    const { actionApi, editDialog, user } = await renderActions(true);
    await user.click(
      within(row('Notify legal')).getByRole('button', { name: 'Edit Action' }),
    );
    expect(editDialog.config()?.data.action).toEqual(
      expect.objectContaining({ id: 'a2' }),
    );

    editDialog.complete({
      saveChanges: true,
      action: { ...ACTIONS[1], description: 'Notify counsel' },
    });

    expect(actionApi.updateAction).toHaveBeenCalledWith(
      'a2',
      expect.objectContaining({ description: 'Notify counsel' }),
    );
    expect(editDialog.close).toHaveBeenCalledOnce();
  });
});
