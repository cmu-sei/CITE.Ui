// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, EventEmitter, Input, OnInit, Output, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { ScoringModel, ItemStatus, Team, User} from 'src/app/generated/cite.api/model/models';
import { ScoringModelDataService } from 'src/app/data/scoring-model/scoring-model-data.service';
import { ScoringModelQuery } from 'src/app/data/scoring-model/scoring-model.query';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { AdminScoringModelEditDialogComponent } from '../admin-scoring-model-edit-dialog/admin-scoring-model-edit-dialog.component';

@Component({
  selector: 'app-admin-scoring-models',
  templateUrl: './admin-scoring-models.component.html',
  styleUrls: ['./admin-scoring-models.component.scss'],
})
export class AdminScoringModelsComponent implements OnInit, OnDestroy {
  @Input() scoringModelList: ScoringModel[];
  @Input() filterControl: FormControl;
  @Input() filterString: string;
  @Input() pageSize: number;
  @Input() pageIndex: number;
  @Output() sortChange = new EventEmitter<Sort>();
  @Output() pageChange = new EventEmitter<PageEvent>();
  newScoringModel: ScoringModel = { id: '', description: '' };
  isLoading = false;
  topbarColor = '#ef3a47';
  addingNewScoringModel = false;
  newScoringModelDescription = '';
  editScoringModel: ScoringModel = {};
  scoringModels = [];
  selectedScoringModelId = '';
  itemStatuses = [
    ItemStatus.Pending,
    ItemStatus.Active,
    ItemStatus.Cancelled,
    ItemStatus.Complete
  ];
  private unsubscribe$ = new Subject();

  constructor(
    private settingsService: ComnSettingsService,
    private scoringModelDataService: ScoringModelDataService,
    private scoringModelQuery: ScoringModelQuery,
    private dialog: MatDialog,
    public dialogService: DialogService
  ) {
    this.topbarColor = this.settingsService.settings.AppTopBarHexColor
      ? this.settingsService.settings.AppTopBarHexColor
      : this.topbarColor;
    this.scoringModelDataService.load();
  }

  ngOnInit() {
    this.filterControl.setValue(this.filterString);
  }

  addOrEditScoringModel(scoringModel: ScoringModel) {
    if (!scoringModel) {
      scoringModel = {
        description: '',
        calculationEquation: '{average}',
        status: ItemStatus.Pending
      };
    } else {
      scoringModel = {... scoringModel};
    }
    const dialogRef = this.dialog.open(AdminScoringModelEditDialogComponent, {
      width: '800px',
      data: {
        scoringModel: scoringModel,
        itemStatuses: this.itemStatuses
      },
    });
    dialogRef.componentInstance.editComplete.subscribe((result) => {
      if (result.saveChanges && result.scoringModel) {
        this.saveScoringModel(result.scoringModel);
      }
      dialogRef.close();
    });
  }

  togglePanel(scoringModel: ScoringModel) {
    this.editScoringModel = this.editScoringModel.id === scoringModel.id ? this.editScoringModel = {} : this.editScoringModel = { ...scoringModel};
  }

  saveScoringModel(scoringModel: ScoringModel) {
    if (scoringModel.id) {
      this.scoringModelDataService.updateScoringModel(scoringModel);
    } else {
      this.scoringModelDataService.add(scoringModel);
    }
  }

  deleteScoringModelRequest(scoringModel: ScoringModel) {
    this.dialogService.confirm(
      'Delete this scoringModel?',
      'Are you sure that you want to delete ' + scoringModel.description + '?'
    ).subscribe((result) => {
      if (result["confirm"]) {
        this.scoringModelDataService.delete(scoringModel.id);
      }
    });
  }

  applyFilter(filterValue: string) {
    this.filterControl.setValue(filterValue);
  }

  sortChanged(sort: Sort) {
    this.sortChange.emit(sort);
  }

  paginatorEvent(page: PageEvent) {
    this.pageChange.emit(page);
  }

  paginateScoringModels(scoringModels: ScoringModel[], pageIndex: number, pageSize: number) {
    if (!scoringModels) {
      return [];
    }
    const startIndex = pageIndex * pageSize;
    const copy = scoringModels.slice();
    return copy.splice(startIndex, pageSize);
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
