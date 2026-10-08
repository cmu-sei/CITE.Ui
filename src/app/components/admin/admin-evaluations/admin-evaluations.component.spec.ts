// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component, Input, Type } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { By } from '@angular/platform-browser';
import { screen, within } from '@testing-library/angular';
import userEvent, {
  PointerEventsCheckLevel,
} from '@testing-library/user-event';
import { of } from 'rxjs';
import { CrucibleDialogService } from '@cmusei/crucible-common';
import {
  Evaluation,
  EvaluationPermission,
  EvaluationService,
  ItemStatus,
  ScoringModelService,
  SystemPermission,
  TeamMembershipsService,
} from '../../../generated/cite.api';
import { EvaluationStore } from '../../../data/evaluation/evaluation.store';
import { ApiStub } from '../../../test-utils/api-stub';
import { dialogRefStub } from '../../../test-utils/dialog-refs';
import { matDialogStub } from '../../../test-utils/mat-dialog';
import {
  PermissionGrants,
  permissionDataProviders,
} from '../../../test-utils/mock-permission-data.service';
import { renderComponent } from '../../../test-utils/render-component';
import { AdminEvaluationsComponent } from './admin-evaluations.component';

// The global stylesheets make every computed-style lookup slow in jsdom, and
// user-event's pointer-events check looks one up per ancestor on each click
// (about a second per click on this page under coverage). Clicks go to
// enabled, visible controls here, so the check is skipped.
const FAST_POINTER = { pointerEventsCheck: PointerEventsCheckLevel.Never };

@Component({ selector: 'app-admin-moves', template: '' })
class MovesStubComponent {
  @Input() evaluationId!: string;
  @Input() canEdit!: boolean;
}
@Component({ selector: 'app-admin-teams', template: '' })
class TeamsStubComponent {
  @Input() evaluationId!: string;
  @Input() canEdit!: boolean;
}
@Component({ selector: 'app-admin-actions', template: '' })
class ActionsStubComponent {
  @Input() selectedEvaluationId!: string;
  @Input() canEdit!: boolean;
}
@Component({ selector: 'app-admin-duties', template: '' })
class DutiesStubComponent {
  @Input() selectedEvaluationId!: string;
  @Input() canEdit!: boolean;
}
@Component({ selector: 'app-admin-evaluation-memberships', template: '' })
class EvaluationMembershipsStubComponent {
  @Input() evaluationId!: string;
  @Input() embedded!: boolean;
}

const MOVES = [
  { id: 'm0', moveNumber: 0 },
  { id: 'm1', moveNumber: 1 },
  { id: 'm2', moveNumber: 2 },
];
const EVALUATIONS: Evaluation[] = [
  {
    id: 'e1',
    description: 'Exercise A',
    status: ItemStatus.Active,
    currentMoveNumber: 1,
    createdBy: 'u1',
    dateCreated: new Date('2026-01-02T10:00:00Z'),
    moves: MOVES,
  },
  {
    id: 'e2',
    description: 'Exercise B',
    status: ItemStatus.Active,
    currentMoveNumber: 0,
    createdBy: 'u1',
    dateCreated: new Date('2026-01-02T10:00:00Z'),
    moves: MOVES,
  },
  {
    id: 'e3',
    description: 'Exercise C',
    status: ItemStatus.Complete,
    currentMoveNumber: 2,
    createdBy: 'u1',
    dateCreated: new Date('2026-01-02T10:00:00Z'),
    moves: MOVES,
  },
];

const onEvaluation = (
  evaluationId: string,
  ...permissions: EvaluationPermission[]
): PermissionGrants => ({ evaluation: [{ evaluationId, permissions }] });

async function renderEvaluations(grants: PermissionGrants) {
  const evaluationApi = {
    getEvaluation: vi.fn((id: string) =>
      of(structuredClone(EVALUATIONS.find((e) => e.id === id) ?? {})),
    ),
    copyEvaluation: vi.fn((id: string) =>
      of({ ...EVALUATIONS[0], id: `${id}-copy`, description: 'Copy' }),
    ),
    updateEvaluation: vi.fn((id: string, evaluation?: Evaluation) =>
      of({ ...evaluation, id }),
    ),
    setEvaluationCurrentMove: vi.fn((id: string, move: number) =>
      of({ ...EVALUATIONS.find((e) => e.id === id), currentMoveNumber: move }),
    ),
    deleteEvaluation: vi.fn(() => of(null)),
  } satisfies ApiStub<EvaluationService>;
  const scoringModelApi = {
    getScoringModels: vi.fn(() => of([{ id: 'sm1', description: 'NCISS' }])),
  } satisfies ApiStub<ScoringModelService>;
  // togglePanel's loadMemberships() calls getAllTeamMemberships but never
  // subscribes to the result, so no request is sent; the stub only has to
  // exist.
  const teamMembershipApi = {
    getAllTeamMemberships: vi.fn(() => of([])),
  } satisfies ApiStub<TeamMembershipsService>;
  const confirm = vi.fn(() => dialogRefStub<unknown, boolean>(true).dialogRef);
  const dialogService: Pick<CrucibleDialogService, 'confirm'> = { confirm };
  const editDialog = matDialogStub();

  const rendered = await renderComponent(AdminEvaluationsComponent, {
    declarations: [AdminEvaluationsComponent],
    imports: [
      MatButtonModule,
      MatCardModule,
      MatExpansionModule,
      MatFormFieldModule,
      MatIconModule,
      MatInputModule,
      MatPaginatorModule,
      MatProgressSpinnerModule,
      MatSelectModule,
      MatSortModule,
      MatTableModule,
      MovesStubComponent,
      TeamsStubComponent,
      ActionsStubComponent,
      DutiesStubComponent,
      EvaluationMembershipsStubComponent,
    ],
    providers: [
      ...permissionDataProviders(grants),
      { provide: EvaluationService, useValue: evaluationApi },
      { provide: ScoringModelService, useValue: scoringModelApi },
      { provide: TeamMembershipsService, useValue: teamMembershipApi },
      { provide: CrucibleDialogService, useValue: dialogService },
      { provide: MatDialog, useValue: editDialog.dialog },
    ],
    configureTestBed: (testBed) => {
      // The admin container loads the evaluations; seed what it would store.
      testBed.inject(EvaluationStore).set(structuredClone(EVALUATIONS));
    },
  });
  await rendered.fixture.whenStable();
  const user = userEvent.setup(FAST_POINTER);
  // Role queries cost up to a second each over this table in jsdom (the
  // global stylesheets make every computed-style lookup slow), so rows are
  // found by their text and the icon buttons, named only by their title, by
  // that title.
  const cell = (description: string) =>
    screen.getByText(description, { selector: 'td' });
  const row = (description: string) =>
    cell(description).closest('tr') as HTMLElement;
  const button = (description: string, title: string) =>
    within(row(description)).getByTitle(title);
  const headerButton = (title: string) => screen.getByTitle(title);
  const child = <T>(type: Type<T>): T | undefined =>
    rendered.fixture.debugElement.query(By.directive(type))
      ?.componentInstance as T | undefined;
  const expand = async (description: string) => {
    await user.click(cell(description));
    rendered.fixture.detectChanges();
  };
  return {
    ...rendered,
    evaluationApi,
    confirm,
    editDialog,
    user,
    row,
    button,
    headerButton,
    child,
    expand,
  };
}

const SECTION_STUBS: Type<{ canEdit: boolean }>[] = [
  MovesStubComponent,
  TeamsStubComponent,
  ActionsStubComponent,
  DutiesStubComponent,
];
const childGates = (child: <T>(type: Type<T>) => T | undefined) =>
  SECTION_STUBS.map((type) => child(type)?.canEdit);

describe('AdminEvaluationsComponent', () => {
  /**
   * Verifies: pending, active and complete evaluations are listed by description with their creator.
   * Interacts with: real EvaluationQuery and UserQuery, the status filter defaults.
   * Data: two active and one complete evaluation.
   */
  it('lists the evaluations by description', async () => {
    const { row } = await renderEvaluations({});

    expect(row('Exercise A')).toHaveTextContent('Active');
    expect(row('Exercise C')).toHaveTextContent('Complete');
  });

  describe('canCreateEvaluations gate', () => {
    /**
     * Verifies: system CreateEvaluations enables Add, Upload and Copy, and Copy calls the API.
     * Interacts with: real PermissionDataService.canCreateEvaluations, EvaluationService.copyEvaluation stub.
     * Data: system [CreateEvaluations].
     */
    it('enables Add, Upload and Copy with CreateEvaluations', async () => {
      const { button, headerButton, evaluationApi, user } =
        await renderEvaluations({
          system: [SystemPermission.CreateEvaluations],
        });

      expect(headerButton('Add Evaluation')).toBeEnabled();
      expect(headerButton('Upload Evaluation')).toBeEnabled();
      await user.click(button('Exercise A', 'Copy Exercise A'));
      expect(evaluationApi.copyEvaluation).toHaveBeenCalledWith('e1');
    });

    /**
     * Verifies: system EditEvaluations and ManageEvaluations (near misses) leave Add, Upload and Copy disabled.
     * Interacts with: real PermissionDataService.canCreateEvaluations.
     * Data: system [EditEvaluations, ManageEvaluations].
     */
    it('disables Add, Upload and Copy without CreateEvaluations', async () => {
      const { button, headerButton } = await renderEvaluations({
        system: [
          SystemPermission.EditEvaluations,
          SystemPermission.ManageEvaluations,
        ],
      });

      expect(headerButton('Add Evaluation')).toBeDisabled();
      expect(headerButton('Upload Evaluation')).toBeDisabled();
      expect(button('Exercise A', 'Copy Exercise A')).toBeDisabled();
    });
  });

  describe('canManageEvaluation gate', () => {
    /**
     * Verifies: ManageEvaluation on e1 enables Delete and the move controls for e1 only, and Increment Move advances it.
     * Interacts with: real PermissionDataService.canManageEvaluation/canEditEvaluation, EvaluationService.setEvaluationCurrentMove stub.
     * Data: evaluation claim ManageEvaluation on e1.
     */
    it('enables Delete and move controls with ManageEvaluation', async () => {
      const { button, evaluationApi, user } = await renderEvaluations(
        onEvaluation('e1', EvaluationPermission.ManageEvaluation),
      );

      expect(button('Exercise A', 'Delete Evaluation')).toBeEnabled();
      expect(button('Exercise A', 'Decrement Move')).toBeEnabled();
      expect(button('Exercise B', 'Delete Evaluation')).toBeDisabled();

      await user.click(button('Exercise A', 'Increment Move'));
      expect(evaluationApi.setEvaluationCurrentMove).toHaveBeenCalledWith(
        'e1',
        2,
      );
    });

    /**
     * Verifies: EditEvaluation on e1 (a near miss) leaves Delete and the move controls disabled.
     * Interacts with: real PermissionDataService.canManageEvaluation.
     * Data: evaluation claim EditEvaluation on e1.
     */
    it('disables Delete and move controls without ManageEvaluation', async () => {
      const { button } = await renderEvaluations(
        onEvaluation('e1', EvaluationPermission.EditEvaluation),
      );

      expect(button('Exercise A', 'Delete Evaluation')).toBeDisabled();
      expect(button('Exercise A', 'Decrement Move')).toBeDisabled();
      expect(button('Exercise A', 'Increment Move')).toBeDisabled();
    });

    /**
     * Verifies: a confirmed Delete removes the evaluation through the API.
     * Interacts with: CrucibleDialogService.confirm stub (answers true), EvaluationService.deleteEvaluation stub.
     * Data: system [ManageEvaluations]; Exercise B deleted.
     */
    it('deletes an evaluation after confirmation', async () => {
      const { button, confirm, evaluationApi, user } = await renderEvaluations({
        system: [SystemPermission.ManageEvaluations],
      });
      await user.click(button('Exercise B', 'Delete Evaluation'));

      expect(confirm).toHaveBeenCalledOnce();
      expect(evaluationApi.deleteEvaluation).toHaveBeenCalledWith('e2');
    });

    /**
     * Verifies: the Memberships panel renders without any ManageEvaluation grant (current behavior).
     * Interacts with: the expanded detail row, the memberships child stub.
     * Data: evaluation claim ViewEvaluation on e1 (no Manage anywhere).
     */
    it('shows the memberships panel without ManageEvaluation', async () => {
      const { child, expand } = await renderEvaluations(
        onEvaluation('e1', EvaluationPermission.ViewEvaluation),
      );
      await expand('Exercise A');

      // Current behavior; see agent-docs/ui-test-bugs/cite.ui.md.
      expect(
        screen.getByText('Memberships', { selector: 'h4' }),
      ).toBeInTheDocument();
      expect(child(EvaluationMembershipsStubComponent)?.evaluationId).toBe(
        'e1',
      );
    });
  });

  describe('canEdit gate', () => {
    /**
     * Verifies: EditEvaluation on an active evaluation gives moves, teams, actions and duties canEdit true and opens its dialog editable.
     * Interacts with: real PermissionDataService.canEditEvaluation, the four child stubs, matDialogStub.
     * Data: evaluation claim EditEvaluation on e1 (Active).
     */
    it('lets the sections and the dialog edit with EditEvaluation', async () => {
      const { button, child, editDialog, evaluationApi, expand, user } =
        await renderEvaluations(
          onEvaluation('e1', EvaluationPermission.EditEvaluation),
        );
      await expand('Exercise A');

      expect(evaluationApi.getEvaluation).toHaveBeenCalledWith('e1');
      expect(child(MovesStubComponent)?.evaluationId).toBe('e1');
      expect(childGates(child)).toEqual([true, true, true, true]);

      await user.click(button('Exercise A', 'Edit Evaluation'));
      expect(editDialog.config()?.data.canEdit).toBe(true);
    });

    /**
     * Verifies: ViewEvaluation on e1 plus EditEvaluation on e2 (near misses) leave e1's sections and dialog read-only.
     * Interacts with: real PermissionDataService.canEditEvaluation, the four child stubs, matDialogStub.
     * Data: ViewEvaluation on e1, EditEvaluation on e2.
     */
    it('keeps the sections and the dialog read-only without EditEvaluation', async () => {
      const { button, child, editDialog, expand, user } =
        await renderEvaluations({
          evaluation: [
            {
              evaluationId: 'e1',
              permissions: [EvaluationPermission.ViewEvaluation],
            },
            {
              evaluationId: 'e2',
              permissions: [EvaluationPermission.EditEvaluation],
            },
          ],
        });
      await expand('Exercise A');

      expect(childGates(child)).toEqual([false, false, false, false]);

      await user.click(button('Exercise A', 'Edit Evaluation'));
      expect(editDialog.config()?.data.canEdit).toBe(false);
    });

    /**
     * Verifies: a complete evaluation's sections are read-only even with system EditEvaluations.
     * Interacts with: the status part of canEdit(row), the four child stubs.
     * Data: system [EditEvaluations]; Exercise C is Complete.
     */
    it('keeps a complete evaluation read-only despite EditEvaluations', async () => {
      const { child, expand } = await renderEvaluations({
        system: [SystemPermission.EditEvaluations],
      });
      await expand('Exercise C');

      expect(childGates(child)).toEqual([false, false, false, false]);
    });
  });

  /**
   * Verifies: an evaluation saved in the edit dialog is sent to the API.
   * Interacts with: matDialogStub (editComplete), EvaluationService.updateEvaluation stub.
   * Data: system [EditEvaluations]; Exercise B renamed.
   */
  it('updates an evaluation saved in the edit dialog', async () => {
    const { button, editDialog, evaluationApi, user } = await renderEvaluations(
      {
        system: [SystemPermission.EditEvaluations],
      },
    );
    await user.click(button('Exercise B', 'Edit Evaluation'));

    editDialog.complete({
      saveChanges: true,
      evaluation: { ...EVALUATIONS[1], description: 'Exercise B2' },
    });

    expect(evaluationApi.updateEvaluation).toHaveBeenCalledWith(
      'e2',
      expect.objectContaining({ description: 'Exercise B2' }),
    );
  });
});
