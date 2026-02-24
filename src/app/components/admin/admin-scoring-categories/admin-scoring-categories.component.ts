// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, EventEmitter, Input, Output, OnDestroy, OnInit } from '@angular/core';
import { ScoringCategory, ItemStatus, ScoringOptionSelection, ScoringModel} from 'src/app/generated/cite.api/model/models';
import { ScoringCategoryDataService } from 'src/app/data/scoring-category/scoring-category-data.service';
import { ScoringCategoryQuery } from 'src/app/data/scoring-category/scoring-category.query';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import {
  AdminScoringCategoryEditDialogComponent
} from '../admin-scoring-category-edit-dialog/admin-scoring-category-edit-dialog.component';

@Component({
    selector: 'app-admin-scoring-categories',
    templateUrl: './admin-scoring-categories.component.html',
    styleUrls: ['./admin-scoring-categories.component.scss'],
    standalone: false
})
export class AdminScoringCategoriesComponent implements OnInit, OnDestroy {
  @Input() scoringModelId: string;
  @Input() editScoringCategoryId: string;
  @Input() canEdit: boolean;
  @Output() scoringCategoryClick = new EventEmitter<string>();
  @Input() displayScoringModelbyMoveNumber: boolean;
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

  constructor(
    private settingsService: ComnSettingsService,
    private scoringCategoryDataService: ScoringCategoryDataService,
    private scoringCategoryQuery: ScoringCategoryQuery,
    private dialog: MatDialog,
    public dialogService: DialogService
  ) {
    this.scoringCategoryQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(scoringCategories => {
      this.scoringCategoryList = [];
      scoringCategories.sort((a, b) => +a.displayOrder < +b.displayOrder ? -1 : 1).forEach(scoringCategory => {
        this.scoringCategoryList.push({ ...scoringCategory });
      });
    });
  }

  ngOnInit() {
    this.scoringCategoryDataService.loadByScoringModel(this.scoringModelId);
  }

  addOrEditScoringCategory(scoringCategory: ScoringCategory) {
    if (!scoringCategory) {
      scoringCategory = {
        scoringModelId: this.scoringModelId,
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
      maxWidth: '90vw',
      width: 'auto',
      data: {
        scoringCategory: scoringCategory,
        displayScoringModelbyMoveNumber: this.displayScoringModelbyMoveNumber,
        scoringOptionSelections: this.scoringOptionSelections,
        canEdit: this.canEdit
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
    this.dialogService.confirm(
      'Delete this scoringCategory?',
      'Are you sure that you want to delete ' + scoringCategory.description + '?'
    ).subscribe((result) => {
      if (result['confirm']) {
        this.scoringCategoryDataService.delete(scoringCategory.id);
      }
    });
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
