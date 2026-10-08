// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
  ItemStatus,
  ScoringModel,
  ScoringModelPermission,
  ScoringModelService,
  SystemPermission,
} from '../../../generated/cite.api';
import { ApiStub } from '../../../test-utils/api-stub';
import { dialogRefStub } from '../../../test-utils/dialog-refs';
import { matDialogStub } from '../../../test-utils/mat-dialog';
import {
  PermissionGrants,
  permissionDataProviders,
} from '../../../test-utils/mock-permission-data.service';
import { renderComponent } from '../../../test-utils/render-component';
import { AdminScoringModelsComponent } from './admin-scoring-models.component';

// The global stylesheets make every computed-style lookup slow in jsdom, and
// user-event's pointer-events check looks one up per ancestor on each click
// (about a second per click on this page under coverage). Clicks go to
// enabled, visible controls here, so the check is skipped.
const FAST_POINTER = { pointerEventsCheck: PointerEventsCheckLevel.Never };

@Component({ selector: 'app-admin-scoring-categories', template: '' })
class ScoringCategoriesStubComponent {
  @Input() scoringModelId!: string;
  @Input() editScoringCategoryId!: string;
  @Input() displayScoringModelbyMoveNumber!: boolean;
  @Input() canEdit!: boolean;
  @Output() scoringCategoryClick = new EventEmitter<string>();
}

@Component({ selector: 'app-admin-scoring-model-memberships', template: '' })
class ScoringModelMembershipsStubComponent {
  @Input() scoringModelId!: string;
}

const MODELS: ScoringModel[] = [
  { id: 'sm1', description: 'NCISS', status: ItemStatus.Active },
  { id: 'sm2', description: 'Custom', status: ItemStatus.Active },
  {
    id: 'sm3',
    description: 'NCISS copy',
    status: ItemStatus.Active,
    evaluationId: 'e1',
  },
];

const onModel = (
  scoringModelId: string,
  ...permissions: ScoringModelPermission[]
): PermissionGrants => ({ scoringModel: [{ scoringModelId, permissions }] });

async function renderScoringModels(grants: PermissionGrants) {
  const scoringModelApi = {
    getScoringModels: vi.fn(() => of(structuredClone(MODELS))),
    copyScoringModel: vi.fn((id: string) =>
      of({ ...MODELS[0], id: `${id}-copy`, description: 'NCISS (copy)' }),
    ),
    updateScoringModel: vi.fn((id: string, model?: ScoringModel) =>
      of({ ...model, id }),
    ),
    deleteScoringModel: vi.fn(() => of(null)),
  } satisfies ApiStub<ScoringModelService>;
  const confirm = vi.fn(() => dialogRefStub<unknown, boolean>(true).dialogRef);
  const dialogService: Pick<CrucibleDialogService, 'confirm'> = { confirm };
  const editDialog = matDialogStub();

  const rendered = await renderComponent(AdminScoringModelsComponent, {
    declarations: [AdminScoringModelsComponent],
    imports: [
      MatButtonModule,
      MatCardModule,
      MatCheckboxModule,
      MatExpansionModule,
      MatFormFieldModule,
      MatIconModule,
      MatInputModule,
      MatPaginatorModule,
      MatProgressSpinnerModule,
      MatSelectModule,
      MatSortModule,
      MatTableModule,
      ScoringCategoriesStubComponent,
      ScoringModelMembershipsStubComponent,
    ],
    providers: [
      ...permissionDataProviders(grants),
      { provide: ScoringModelService, useValue: scoringModelApi },
      { provide: CrucibleDialogService, useValue: dialogService },
      { provide: MatDialog, useValue: editDialog.dialog },
    ],
  });
  await rendered.fixture.whenStable();
  const user = userEvent.setup(FAST_POINTER);
  // Role queries cost up to a second each over this table in jsdom (the
  // global stylesheets make every computed-style lookup slow), so rows are
  // found by their text and the icon buttons, named only by their title, by
  // that title.
  const button = (title: string) => screen.getByTitle(title);
  const expand = async (description: string) => {
    await user.click(screen.getByText(description, { selector: 'td' }));
    return rendered.fixture.debugElement.query(
      By.directive(ScoringCategoriesStubComponent),
    ).componentInstance as ScoringCategoriesStubComponent;
  };
  return {
    ...rendered,
    scoringModelApi,
    confirm,
    editDialog,
    user,
    button,
    expand,
  };
}

describe('AdminScoringModelsComponent', () => {
  /**
   * Verifies: active scoring models not tied to an evaluation are listed by description.
   * Interacts with: real ScoringModelDataService/ScoringModelQuery over a stubbed ScoringModelService.
   * Data: two template models and one evaluation copy (hidden until Show All).
   */
  it('lists the template scoring models', async () => {
    await renderScoringModels({});

    const descriptions = within(screen.getByRole('table'))
      .getAllByRole('row')
      .slice(1)
      .map((r) =>
        r.querySelector('.mat-column-description')?.textContent?.trim(),
      )
      .filter(Boolean);
    expect(descriptions).toEqual(['Custom', 'NCISS']);
  });

  describe('canCreateScoringModels gate', () => {
    /**
     * Verifies: system CreateScoringModels enables Add, Upload and Copy, and Copy calls the API.
     * Interacts with: real PermissionDataService.canCreateScoringModels, ScoringModelService.copyScoringModel stub.
     * Data: system [CreateScoringModels].
     */
    it('enables Add, Upload and Copy with CreateScoringModels', async () => {
      const { button, scoringModelApi, user } = await renderScoringModels({
        system: [SystemPermission.CreateScoringModels],
      });

      expect(button('Add Scoring Model')).toBeEnabled();
      expect(button('Upload Scoring Model')).toBeEnabled();
      await user.click(button('Copy NCISS'));
      expect(scoringModelApi.copyScoringModel).toHaveBeenCalledWith('sm1');
    });

    /**
     * Verifies: system EditScoringModels and ManageScoringModels (near misses) leave Add, Upload and Copy disabled.
     * Interacts with: real PermissionDataService.canCreateScoringModels.
     * Data: system [EditScoringModels, ManageScoringModels].
     */
    it('disables Add, Upload and Copy without CreateScoringModels', async () => {
      const { button } = await renderScoringModels({
        system: [
          SystemPermission.EditScoringModels,
          SystemPermission.ManageScoringModels,
        ],
      });

      expect(button('Add Scoring Model')).toBeDisabled();
      expect(button('Upload Scoring Model')).toBeDisabled();
      expect(button('Copy NCISS')).toBeDisabled();
    });
  });

  describe('canManage gate', () => {
    /**
     * Verifies: ManageScoringModel on sm1 enables Delete for sm1 only, and a confirmed Delete calls the API.
     * Interacts with: real PermissionDataService.canManageScoringModel, CrucibleDialogService.confirm stub.
     * Data: scoring model claim ManageScoringModel on sm1.
     */
    it('enables Delete with ManageScoringModel on the model', async () => {
      const { button, confirm, scoringModelApi, user } =
        await renderScoringModels(
          onModel('sm1', ScoringModelPermission.ManageScoringModel),
        );

      expect(button('Delete NCISS')).toBeEnabled();
      expect(button('Delete Custom')).toBeDisabled();
      await user.click(button('Delete NCISS'));
      expect(confirm).toHaveBeenCalledOnce();
      expect(scoringModelApi.deleteScoringModel).toHaveBeenCalledWith('sm1');
    });

    /**
     * Verifies: EditScoringModel on the model (a near miss) leaves Delete disabled.
     * Interacts with: real PermissionDataService.canManageScoringModel.
     * Data: scoring model claim EditScoringModel on sm1.
     */
    it('disables Delete without ManageScoringModel', async () => {
      const { button } = await renderScoringModels(
        onModel('sm1', ScoringModelPermission.EditScoringModel),
      );

      expect(button('Delete NCISS')).toBeDisabled();
    });
  });

  describe('canEdit gate', () => {
    /**
     * Verifies: EditScoringModel on the model gives its categories canEdit true and opens its edit dialog editable.
     * Interacts with: real PermissionDataService.canEditScoringModel, the categories child stub, matDialogStub.
     * Data: scoring model claim EditScoringModel on sm1.
     */
    it('lets categories and the dialog edit with EditScoringModel', async () => {
      const { button, editDialog, expand, user } = await renderScoringModels(
        onModel('sm1', ScoringModelPermission.EditScoringModel),
      );

      const categories = await expand('NCISS');
      expect(categories.scoringModelId).toBe('sm1');
      expect(categories.canEdit).toBe(true);

      await user.click(button('Edit NCISS'));
      expect(editDialog.config()?.data.canEdit).toBe(true);
    });

    /**
     * Verifies: ViewScoringModel on the model, or EditScoringModel on another model, leaves categories and the dialog read-only.
     * Interacts with: real PermissionDataService.canEditScoringModel, the categories child stub, matDialogStub.
     * Data: ViewScoringModel on sm1 and EditScoringModel on sm2 (near misses for sm1).
     */
    it('keeps categories and the dialog read-only without EditScoringModel', async () => {
      const { button, editDialog, expand, user } = await renderScoringModels({
        scoringModel: [
          {
            scoringModelId: 'sm1',
            permissions: [ScoringModelPermission.ViewScoringModel],
          },
          {
            scoringModelId: 'sm2',
            permissions: [ScoringModelPermission.EditScoringModel],
          },
        ],
      });

      const categories = await expand('NCISS');
      expect(categories.canEdit).toBe(false);

      await user.click(button('Edit NCISS'));
      expect(editDialog.config()?.data.canEdit).toBe(false);
    });

    /**
     * Verifies: the edit dialog of a model copied into an evaluation is read-only even with system EditScoringModels.
     * Interacts with: real PermissionDataService.canEditScoringModel, the Show All checkbox, matDialogStub.
     * Data: system [EditScoringModels]; sm3 belongs to evaluation e1.
     */
    it('opens an evaluation copy read-only despite EditScoringModels', async () => {
      const { button, editDialog, user } = await renderScoringModels({
        system: [SystemPermission.EditScoringModels],
      });
      await user.click(screen.getByLabelText('Show All'));

      await user.click(button('Edit NCISS copy'));
      expect(editDialog.config()?.data.canEdit).toBe(false);
    });
  });

  /**
   * Verifies: a model saved in the edit dialog is sent to the API.
   * Interacts with: matDialogStub (editComplete), ScoringModelService.updateScoringModel stub.
   * Data: system [EditScoringModels]; Custom renamed.
   */
  it('updates a scoring model saved in the edit dialog', async () => {
    const { button, editDialog, scoringModelApi, user } =
      await renderScoringModels({
        system: [SystemPermission.EditScoringModels],
      });
    await user.click(button('Edit Custom'));

    editDialog.complete({
      saveChanges: true,
      scoringModel: { ...MODELS[1], description: 'Custom v2' },
    });

    expect(scoringModelApi.updateScoringModel).toHaveBeenCalledWith(
      'sm2',
      expect.objectContaining({ description: 'Custom v2' }),
    );
  });
});
