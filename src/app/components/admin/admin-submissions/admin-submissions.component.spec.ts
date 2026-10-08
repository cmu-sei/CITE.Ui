// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ClipboardModule } from 'ngx-clipboard';
import { of } from 'rxjs';
import { CrucibleDialogService } from '@cmusei/crucible-common';
import {
  EvaluationPermission,
  ItemStatus,
  SubmissionService,
  TeamService,
} from '../../../generated/cite.api';
import { EvaluationStore } from '../../../data/evaluation/evaluation.store';
import { ApiStub } from '../../../test-utils/api-stub';
import { dialogRefStub } from '../../../test-utils/dialog-refs';
import {
  PermissionGrants,
  permissionDataProviders,
} from '../../../test-utils/mock-permission-data.service';
import { renderComponent } from '../../../test-utils/render-component';
import { AdminSubmissionsComponent } from './admin-submissions.component';

async function renderSubmissions(grants: PermissionGrants) {
  const submissionApi = {
    getByEvaluation: vi.fn(() =>
      of([
        {
          id: 's-official',
          evaluationId: 'e1',
          moveNumber: 1,
          score: 42.123,
          status: ItemStatus.Active,
        },
        {
          id: 's-team',
          evaluationId: 'e1',
          teamId: 't1',
          moveNumber: 1,
          score: 30,
          status: ItemStatus.Complete,
        },
      ]),
    ),
    deleteSubmission: vi.fn(() => of(null)),
  } satisfies ApiStub<SubmissionService>;
  const teamApi = {
    getEvaluationTeams: vi.fn(() =>
      of([{ id: 't1', evaluationId: 'e1', name: 'Blue Team' }]),
    ),
  } satisfies ApiStub<TeamService>;
  const confirm = vi.fn(() => dialogRefStub<unknown, boolean>(true).dialogRef);
  const dialogService: Pick<CrucibleDialogService, 'confirm'> = { confirm };

  const rendered = await renderComponent(AdminSubmissionsComponent, {
    declarations: [AdminSubmissionsComponent],
    imports: [
      ClipboardModule,
      MatButtonModule,
      MatCardModule,
      MatFormFieldModule,
      MatIconModule,
      MatPaginatorModule,
      MatProgressSpinnerModule,
      MatSelectModule,
      MatSortModule,
      MatTableModule,
    ],
    providers: [
      ...permissionDataProviders(grants),
      { provide: SubmissionService, useValue: submissionApi },
      { provide: TeamService, useValue: teamApi },
      { provide: CrucibleDialogService, useValue: dialogService },
    ],
    configureTestBed: (testBed) => {
      // The admin container loads the evaluations; seed what it would store.
      testBed.inject(EvaluationStore).set([
        { id: 'e1', description: 'Exercise A' },
        { id: 'e2', description: 'Exercise B' },
      ]);
    },
  });
  // The first select on the page is the Evaluation picker.
  const evaluationSelect = () =>
    TestbedHarnessEnvironment.loader(rendered.fixture).getHarness(
      MatSelectHarness,
    );
  const evaluationOptions = async () => {
    const select = await evaluationSelect();
    await select.open();
    const texts = await Promise.all(
      (await select.getOptions()).map((o) => o.getText()),
    );
    await select.close();
    return texts;
  };
  return {
    ...rendered,
    submissionApi,
    confirm,
    evaluationSelect,
    evaluationOptions,
    user: userEvent.setup(),
  };
}

describe('AdminSubmissionsComponent', () => {
  describe('canManageEvaluation gate', () => {
    /**
     * Verifies: only evaluations the user may manage are offered, and Edit on another evaluation is not enough.
     * Interacts with: real PermissionDataService.canManageEvaluation, the Evaluation select.
     * Data: ManageEvaluation on e1, EditEvaluation on e2.
     */
    it('offers only the evaluations the user manages', async () => {
      const { evaluationOptions } = await renderSubmissions({
        evaluation: [
          {
            evaluationId: 'e1',
            permissions: [EvaluationPermission.ManageEvaluation],
          },
          {
            evaluationId: 'e2',
            permissions: [EvaluationPermission.EditEvaluation],
          },
        ],
      });

      expect(await evaluationOptions()).toEqual(['Exercise A']);
    });

    /**
     * Verifies: Edit and Execute rights (near misses) offer no evaluation at all.
     * Interacts with: real PermissionDataService.canManageEvaluation, the Evaluation select.
     * Data: EditEvaluation and ExecuteEvaluation on e1 and e2.
     */
    it('offers no evaluation without ManageEvaluation', async () => {
      const near = [
        EvaluationPermission.EditEvaluation,
        EvaluationPermission.ExecuteEvaluation,
      ];
      const { evaluationOptions } = await renderSubmissions({
        evaluation: [
          { evaluationId: 'e1', permissions: near },
          { evaluationId: 'e2', permissions: near },
        ],
      });

      expect(await evaluationOptions()).toEqual([]);
    });
  });

  /**
   * Verifies: picking an evaluation loads its official and team submissions into the table.
   * Interacts with: the Evaluation select, real SubmissionDataService/SubmissionQuery and TeamDataService over stubbed endpoints.
   * Data: ManageEvaluation on e1; an official and a team submission for move 1.
   */
  it('lists the submissions of the picked evaluation', async () => {
    const { evaluationSelect, fixture, submissionApi } =
      await renderSubmissions({
        evaluation: [
          {
            evaluationId: 'e1',
            permissions: [EvaluationPermission.ManageEvaluation],
          },
        ],
      });
    await (await evaluationSelect()).clickOptions({ text: 'Exercise A' });
    fixture.detectChanges();

    expect(submissionApi.getByEvaluation).toHaveBeenCalledWith('e1');
    const rows = within(screen.getByRole('table'))
      .getAllByRole('row')
      .slice(1)
      .map((r) =>
        within(r)
          .getAllByRole('cell')
          .map((c) => c.textContent?.trim()),
      );
    expect(rows).toEqual([
      ['Official Score', 'Official', '1', '42.12', 'Active'],
      ['Blue Team', 'Team', '1', '30', 'Complete'],
    ]);
  });

  /**
   * Verifies: a confirmed Delete removes the submission through the API.
   * Interacts with: CrucibleDialogService.confirm stub (answers true), SubmissionService.deleteSubmission stub.
   * Data: ManageEvaluation on e1; the team submission deleted.
   */
  it('deletes a submission after confirmation', async () => {
    const { confirm, evaluationSelect, fixture, submissionApi, user } =
      await renderSubmissions({
        evaluation: [
          {
            evaluationId: 'e1',
            permissions: [EvaluationPermission.ManageEvaluation],
          },
        ],
      });
    await (await evaluationSelect()).clickOptions({ text: 'Exercise A' });
    fixture.detectChanges();

    const teamRow = within(screen.getByRole('table'))
      .getByText('Blue Team', { exact: false })
      .closest('tr') as HTMLElement;
    await user.click(
      within(teamRow).getByRole('button', { name: 'Delete Submission' }),
    );

    expect(confirm).toHaveBeenCalledOnce();
    expect(submissionApi.deleteSubmission).toHaveBeenCalledWith('s-team');
  });
});
