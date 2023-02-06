// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ScoringOption, ItemStatus } from 'src/app/generated/cite.api/model/models';
import { ScoringOptionDataService } from 'src/app/data/scoring-option/scoring-option-data.service';
import { ScoringOptionQuery } from 'src/app/data/scoring-option/scoring-option.query';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { AdminScoringOptionEditDialogComponent } from '../admin-scoring-option-edit-dialog/admin-scoring-option-edit-dialog.component';

@Component({
  selector: 'app-admin-scoring-options',
  templateUrl: './admin-scoring-options.component.html',
  styleUrls: ['./admin-scoring-options.component.scss'],
})
export class AdminScoringOptionsComponent implements OnInit, OnDestroy {
  @Input() scoringCategoryId: string;
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
    ItemStatus.Complete
  ];
  private unsubscribe$ = new Subject();

  constructor(
    private settingsService: ComnSettingsService,
    private scoringOptionDataService: ScoringOptionDataService,
    private scoringOptionQuery: ScoringOptionQuery,
    private dialog: MatDialog,
    public dialogService: DialogService
  ) {
    this.topbarColor = this.settingsService.settings.AppTopBarHexColor
      ? this.settingsService.settings.AppTopBarHexColor
      : this.topbarColor;
    this.scoringOptionQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(scoringOptions => {
      this.scoringOptionList = [];
      scoringOptions.sort((a, b) => +a.displayOrder < +b.displayOrder ? -1 : 1).forEach(scoringOption => {
        this.scoringOptionList.push({ ...scoringOption });
      });
    });
  }

  ngOnInit() {
    this.scoringOptionDataService.loadByScoringCategory(this.scoringCategoryId);
  }

  addOrEditScoringOption(scoringOption: ScoringOption) {
    if (!scoringOption) {
      scoringOption = {
        scoringCategoryId: this.scoringCategoryId,
        description: '',
        displayOrder: 0,
        value: 0.0,
        isModifier: false
      };
    } else {
      scoringOption = {... scoringOption};
    }
    const dialogRef = this.dialog.open(AdminScoringOptionEditDialogComponent, {
      width: '800px',
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
    this.dialogService.confirm(
      'Delete this scoringOption?',
      'Are you sure that you want to delete ' + scoringOption.description + '?'
    ).subscribe((result) => {
      if (result['confirm']) {
        this.scoringOptionDataService.delete(scoringOption.id);
      }
    });
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
