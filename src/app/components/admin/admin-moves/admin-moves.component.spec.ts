// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSortModule } from '@angular/material/sort';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { CrucibleDialogService } from '@cmusei/crucible-common';
import { Move, MoveService } from '../../../generated/cite.api';
import { ApiStub } from '../../../test-utils/api-stub';
import { dialogRefStub } from '../../../test-utils/dialog-refs';
import { matDialogStub } from '../../../test-utils/mat-dialog';
import { renderComponent } from '../../../test-utils/render-component';
import { AdminMovesComponent } from './admin-moves.component';

const MOVES: Move[] = [
  { id: 'm1', evaluationId: 'e1', moveNumber: 1, description: 'Escalation' },
  { id: 'm0', evaluationId: 'e1', moveNumber: 0, description: 'Detection' },
];

async function renderMoves(canEdit: boolean) {
  const moveApi = {
    getByEvaluation: vi.fn(() => of(structuredClone(MOVES))),
    createMove: vi.fn((move?: Move) => of({ ...move, id: 'm-new' })),
    updateMove: vi.fn((id: string, move?: Move) => of({ ...move, id })),
    deleteMove: vi.fn(() => of(null)),
  } satisfies ApiStub<MoveService>;
  const confirm = vi.fn(() => dialogRefStub<unknown, boolean>(true).dialogRef);
  const dialogService: Pick<CrucibleDialogService, 'confirm'> = { confirm };
  const editDialog = matDialogStub();

  const rendered = await renderComponent(AdminMovesComponent, {
    declarations: [AdminMovesComponent],
    imports: [
      MatButtonModule,
      MatCardModule,
      MatExpansionModule,
      MatFormFieldModule,
      MatIconModule,
      MatInputModule,
      MatProgressSpinnerModule,
      MatSortModule,
    ],
    componentInputs: { evaluationId: 'e1', canEdit },
    providers: [
      { provide: MoveService, useValue: moveApi },
      { provide: CrucibleDialogService, useValue: dialogService },
      { provide: MatDialog, useValue: editDialog.dialog },
    ],
  });
  await rendered.fixture.whenStable();
  return {
    ...rendered,
    moveApi,
    confirm,
    editDialog,
    user: userEvent.setup(),
  };
}

const descriptions = () =>
  Array.from(document.querySelectorAll('mat-expansion-panel-header')).map(
    (header) => header.textContent?.replace(/\s+/g, ' ').trim(),
  );

describe('AdminMovesComponent', () => {
  /**
   * Verifies: the evaluation's moves are loaded and listed in move-number order.
   * Interacts with: real MoveDataService/MoveQuery over a stubbed MoveService.
   * Data: moves 1 and 0 returned out of order.
   */
  it('lists the moves of the evaluation by number', async () => {
    const { moveApi } = await renderMoves(true);

    expect(moveApi.getByEvaluation).toHaveBeenCalledWith('e1');
    expect(descriptions()).toEqual(['0 Detection', '1 Escalation']);
  });

  /**
   * Verifies: with canEdit Add and Delete are enabled and Edit opens the dialog with canEdit set.
   * Interacts with: the rendered buttons, matDialogStub (dialog data).
   * Data: canEdit true.
   */
  it('enables adding and deleting with canEdit', async () => {
    const { editDialog, user } = await renderMoves(true);

    expect(screen.getByRole('button', { name: 'Add Move' })).toBeEnabled();
    expect(
      screen.getAllByRole('button', { name: 'Delete Move' })[0],
    ).toBeEnabled();
    await user.click(screen.getAllByRole('button', { name: 'Edit Move' })[0]);
    expect(editDialog.config()?.data).toEqual({
      move: expect.objectContaining({ id: 'm0' }),
      canEdit: true,
    });
  });

  /**
   * Verifies: without canEdit Add and Delete are disabled and Edit opens the dialog read-only.
   * Interacts with: the rendered buttons, matDialogStub (dialog data).
   * Data: canEdit false.
   */
  it('disables adding and deleting without canEdit', async () => {
    const { editDialog, user } = await renderMoves(false);

    expect(screen.getByRole('button', { name: 'Add Move' })).toBeDisabled();
    for (const button of screen.getAllByRole('button', {
      name: 'Delete Move',
    })) {
      expect(button).toBeDisabled();
    }
    await user.click(screen.getAllByRole('button', { name: 'Edit Move' })[0]);
    expect(editDialog.config()?.data.canEdit).toBe(false);
  });

  /**
   * Verifies: Add opens the dialog with the next move number, and saving it creates the move.
   * Interacts with: matDialogStub (dialog data, editComplete), MoveService.createMove stub.
   * Data: canEdit true; two moves exist, so the new one is move 2.
   */
  it('creates a move saved in the add dialog', async () => {
    const { editDialog, moveApi, fixture, user } = await renderMoves(true);
    await user.click(screen.getByRole('button', { name: 'Add Move' }));
    const move = editDialog.config()?.data.move as Move;
    expect(move).toEqual(
      expect.objectContaining({ evaluationId: 'e1', moveNumber: 2 }),
    );

    editDialog.complete({
      saveChanges: true,
      move: { ...move, description: 'Recovery' },
    });
    fixture.detectChanges();

    expect(moveApi.createMove).toHaveBeenCalledWith(
      expect.objectContaining({ moveNumber: 2, description: 'Recovery' }),
    );
    expect(descriptions()).toContain('2 Recovery');
    expect(editDialog.close).toHaveBeenCalledOnce();
  });

  /**
   * Verifies: a confirmed Delete removes the move through the API and from the list.
   * Interacts with: CrucibleDialogService.confirm stub (answers true), MoveService.deleteMove stub.
   * Data: canEdit true; move 0 deleted.
   */
  it('deletes a move after confirmation', async () => {
    const { moveApi, confirm, fixture, user } = await renderMoves(true);
    await user.click(screen.getAllByRole('button', { name: 'Delete Move' })[0]);
    fixture.detectChanges();

    expect(confirm).toHaveBeenCalledOnce();
    expect(moveApi.deleteMove).toHaveBeenCalledWith('m0');
    expect(descriptions()).toEqual(['1 Escalation']);
  });
});
