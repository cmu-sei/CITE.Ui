// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
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
import { ActionDataService } from '../../../data/action/action-data.service';
import { MoveDataService } from '../../../data/move/move-data.service';
import { TeamDataService } from '../../../data/team/team-data.service';
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
  // the component reuses one action object across its creates, so each call is recorded as a copy
  const created: Action[] = [];
  const actionApi = {
    getActionsByEvaluation: vi.fn(() => of(structuredClone(ACTIONS))),
    createAction: vi.fn((action?: Action) => {
      created.push({ ...action });
      return of({ ...action, id: `new-${created.length}` });
    }),
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
   * Verifies: another evaluation's team, move and action that reach the stores live are left out of the panel,
   * so adding to all teams and all moves creates actions for this evaluation's teams and moves only.
   * Interacts with: the stores the SignalR handlers update, matDialogStub (editComplete), ActionService.createAction stub.
   * Data: canEdit true; team t9, move m9 and action a9 of e2 upserted; an action added for all moves and all teams.
   */
  it('keeps other evaluations out of the panel and out of an add to all teams and moves', async () => {
    const { created, editDialog, fixture, user } = await renderActions(true);
    TestBed.inject(TeamDataService).updateStore({ id: 't9', evaluationId: 'e2', name: 'Green', shortName: 'G' });
    TestBed.inject(MoveDataService).updateStore({ id: 'm9', evaluationId: 'e2', moveNumber: 5 });
    TestBed.inject(ActionDataService).updateStore({
      id: 'a9', evaluationId: 'e2', teamId: 't9', moveNumber: 5, description: 'Other evaluation action',
    });
    fixture.detectChanges();

    expect(within(screen.getByRole('table')).queryByText('Other evaluation action')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add Action' }));
    expect(editDialog.config()?.data.teamList.map((t: { id: string }) => t.id)).toEqual(['t1', 't2']);
    editDialog.complete({
      saveChanges: true,
      action: { evaluationId: 'e1', description: 'Brief the board', moveNumber: -999, teamId: '' },
    });

    expect(created.map((a) => [a.moveNumber, a.teamId])).toEqual([
      [0, 't1'], [0, 't2'], [1, 't1'], [1, 't2'],
    ]);
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
