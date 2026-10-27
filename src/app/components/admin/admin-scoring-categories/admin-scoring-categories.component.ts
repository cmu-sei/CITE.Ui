// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, Input, OnDestroy, OnInit, inject, input, output } from '@angular/core';
import { ScoringCategory, ItemStatus, ScoringOptionSelection, ScoringModel} from 'src/app/generated/cite.api/model/models';
import { ScoringCategoryDataService } from 'src/app/data/scoring-category/scoring-category-data.service';
import { ScoringCategoryQuery } from 'src/app/data/scoring-category/scoring-category.query';
import { ComnSettingsService, CrucibleDialogService } from '@cmusei/crucible-common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import {
  AdminScoringCategoryEditDialogComponent
} from '../admin-scoring-category-edit-dialog/admin-scoring-category-edit-dialog.component';
import { MatAccordion, MatExpansionPanel, MatExpansionPanelHeader } from '@angular/material/expansion';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { AdminScoringOptionsComponent } from '../admin-scoring-options/admin-scoring-options.component';
import { MatCard } from '@angular/material/card';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-admin-scoring-categories',
    templateUrl: './admin-scoring-categories.component.html',
    styleUrls: ['./admin-scoring-categories.component.scss'],
    imports: [MatAccordion, MatIconButton, MatIcon, MatExpansionPanel, MatExpansionPanelHeader, AdminScoringOptionsComponent, MatCard, MatProgressSpinner]
})
export class AdminScoringCategoriesComponent implements OnInit, OnDestroy {
  private settingsService = inject(ComnSettingsService);
  private scoringCategoryDataService = inject(ScoringCategoryDataService);
  private scoringCategoryQuery = inject(ScoringCategoryQuery);
  private dialog = inject(MatDialog);
  dialogService = inject(CrucibleDialogService);

  readonly scoringModelId = input<string>(undefined);
  @Input() editScoringCategoryId: string;
  readonly canEdit = input<boolean>(undefined);
  readonly scoringCategoryClick = output<string>();
  readonly displayScoringModelbyMoveNumber = input<boolean>(undefined);
  newScoringCategory: ScoringCategory = { id: '', description: '' };
  scoringCategoryList: ScoringCategory[];
  isLoading = false;
  topbarColor = '#ef3a47';
  addingNewScoringCategory = false;
  newScoringCategoryDescription = '';
  scoringCategories = [];
  selectedScoringCategoryId = '';
  itemStatuses = [
    ItemStatus.Pending,
    ItemStatus.Active,
    ItemStatus.Cancelled,
    ItemStatus.Complete
  ];
  scoringOptionSelections = [
    ScoringOptionSelection.Single,
    ScoringOptionSelection.Multiple,
    ScoringOptionSelection.None
  ];
  private unsubscribe$ = new Subject();

  constructor() {
    this.scoringCategoryQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(scoringCategories => {
      this.scoringCategoryList = [];
      scoringCategories.sort((a, b) => +a.displayOrder < +b.displayOrder ? -1 : 1).forEach(scoringCategory => {
        this.scoringCategoryList.push({ ...scoringCategory });
      });
    });
  }

  ngOnInit() {
    this.scoringCategoryDataService.loadByScoringModel(this.scoringModelId());
  }

  addOrEditScoringCategory(scoringCategory: ScoringCategory) {
    if (!scoringCategory) {
      scoringCategory = {
        scoringModelId: this.scoringModelId(),
        description: '',
        displayOrder: 0,
        calculationEquation: '{max}',
        scoringWeight: 1.0,
        scoringOptionSelection: ScoringOptionSelection.Single,
        isModifierRequired: false
      };
    } else {
      scoringCategory = {... scoringCategory};
    }
    const dialogRef = this.dialog.open(AdminScoringCategoryEditDialogComponent, {
      minWidth: '400px',
      maxWidth: '90vw',
      width: 'auto',
      data: {
        scoringCategory: scoringCategory,
        displayScoringModelbyMoveNumber: this.displayScoringModelbyMoveNumber(),
        scoringOptionSelections: this.scoringOptionSelections,
        canEdit: this.canEdit()
      },
    });
    dialogRef.componentInstance.editComplete.subscribe((result) => {
      if (result.saveChanges && result.scoringCategory) {
        this.saveScoringCategory(result.scoringCategory);
      }
      dialogRef.close();
    });
  }

  togglePanel(scoringCategoryId: string) {
    this.editScoringCategoryId =
      this.editScoringCategoryId === scoringCategoryId ? this.editScoringCategoryId = '' : this.editScoringCategoryId = scoringCategoryId;
    this.scoringCategoryClick.emit(this.editScoringCategoryId);
  }

  saveScoringCategory(scoringCategory: ScoringCategory) {
    if (scoringCategory.id) {
      this.scoringCategoryDataService.updateScoringCategory(scoringCategory);
    } else {
      this.scoringCategoryDataService.add(scoringCategory);
    }
  }

  deleteScoringCategoryRequest(scoringCategory: ScoringCategory) {
    this.dialogService
      .confirm({
        title: 'Delete this scoringCategory?',
        message: 'Are you sure that you want to delete ' + scoringCategory.description + '?',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.scoringCategoryDataService.delete(scoringCategory.id);
        }
      });
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
