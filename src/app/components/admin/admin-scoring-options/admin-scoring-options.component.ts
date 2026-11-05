// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, OnDestroy, OnInit, inject, input } from '@angular/core';
import { ScoringOption, ItemStatus } from 'src/app/generated/cite.api/model/models';
import { ScoringOptionDataService } from 'src/app/data/scoring-option/scoring-option-data.service';
import { ScoringOptionQuery } from 'src/app/data/scoring-option/scoring-option.query';
import { ComnSettingsService, CrucibleDialogService } from '@cmusei/crucible-common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { AdminScoringOptionEditDialogComponent } from '../admin-scoring-option-edit-dialog/admin-scoring-option-edit-dialog.component';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatCheckbox } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { MatCard } from '@angular/material/card';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-admin-scoring-options',
    templateUrl: './admin-scoring-options.component.html',
    styleUrls: ['./admin-scoring-options.component.scss'],
    imports: [MatIconButton, MatIcon, MatCheckbox, FormsModule, MatCard, MatProgressSpinner]
})
export class AdminScoringOptionsComponent implements OnInit, OnDestroy {
  private settingsService = inject(ComnSettingsService);
  private scoringOptionDataService = inject(ScoringOptionDataService);
  private scoringOptionQuery = inject(ScoringOptionQuery);
  private dialog = inject(MatDialog);
  dialogService = inject(CrucibleDialogService);

  readonly scoringCategoryId = input<string>(undefined);
  readonly canEdit = input<boolean>(undefined);
  newScoringOption: ScoringOption = { id: '', description: '' };
  scoringOptionList: ScoringOption[];
  isLoading = false;
  topbarColor = '#ef3a47';
  addingNewScoringOption = false;
  newScoringOptionDescription = '';
  scoringOptions = [];
  itemStatuses = [
    ItemStatus.Pending,
    ItemStatus.Active,
    ItemStatus.Cancelled,
    ItemStatus.Complete,
    ItemStatus.Archived
  ];
  private unsubscribe$ = new Subject();

  constructor() {
    this.scoringOptionQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(scoringOptions => {
      this.scoringOptionList = [];
      scoringOptions.sort((a, b) => +a.displayOrder < +b.displayOrder ? -1 : 1).forEach(scoringOption => {
        this.scoringOptionList.push({ ...scoringOption });
      });
    });
  }

  ngOnInit() {
    this.scoringOptionDataService.loadByScoringCategory(this.scoringCategoryId());
  }

  addOrEditScoringOption(scoringOption: ScoringOption) {
    if (!scoringOption) {
      scoringOption = {
        scoringCategoryId: this.scoringCategoryId(),
        description: '',
        displayOrder: 0,
        value: 0.0,
        isModifier: false
      };
    } else {
      scoringOption = {... scoringOption};
    }
    const dialogRef = this.dialog.open(AdminScoringOptionEditDialogComponent, {
      minWidth: '400px',
      maxWidth: '90vw',
      width: 'auto',
      data: {
        scoringOption: scoringOption
      },
    });
    dialogRef.componentInstance.editComplete.subscribe((result) => {
      if (result.saveChanges && result.scoringOption) {
        this.saveScoringOption(result.scoringOption);
      }
      dialogRef.close();
    });
  }

  saveScoringOption(scoringOption: ScoringOption) {
    if (scoringOption.id) {
      this.scoringOptionDataService.updateScoringOption(scoringOption);
    } else {
      this.scoringOptionDataService.add(scoringOption);
    }
  }

  deleteScoringOptionRequest(scoringOption: ScoringOption) {
    this.dialogService
      .confirm({
        title: 'Delete Scoring Option',
        message: 'Are you sure that you want to delete ' + scoringOption.description + '?',
        confirmText: 'Delete',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.scoringOptionDataService.delete(scoringOption.id);
        }
      });
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
