// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { LegacyPageEvent as PageEvent } from '@angular/material/legacy-paginator';
import { Sort } from '@angular/material/sort';
import { ScoringModel, ItemStatus, RightSideDisplay, User} from 'src/app/generated/cite.api/model/models';
import { ScoringModelDataService } from 'src/app/data/scoring-model/scoring-model-data.service';
import { ScoringModelQuery } from 'src/app/data/scoring-model/scoring-model.query';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { AdminScoringModelEditDialogComponent } from '../admin-scoring-model-edit-dialog/admin-scoring-model-edit-dialog.component';
import { UserDataService } from 'src/app/data/user/user-data.service';

@Component({
  selector: 'app-admin-scoring-models',
  templateUrl: './admin-scoring-models.component.html',
  styleUrls: ['./admin-scoring-models.component.scss'],
})
export class AdminScoringModelsComponent implements OnInit, OnDestroy {
  scoringModelList: ScoringModel[] = [];
  sortedScoringModelList: ScoringModel[] = [];
  userList: User[] = [];
  pageSize: number = 50;
  pageIndex: number = 0;
  filterControl: UntypedFormControl = this.scoringModelDataService.filterControl;
  filterString = '';
  newScoringModel: ScoringModel = { id: '', description: '' };
  isLoading = false;
  topbarColor = '#ef3a47';
  addingNewScoringModel = false;
  newScoringModelDescription = '';
  editScoringModel: ScoringModel = {};
  selectedScoringModelId = '';
  scoringCategoryId = '';
  itemStatuses = [
    ItemStatus.Pending,
    ItemStatus.Active,
    ItemStatus.Cancelled,
    ItemStatus.Complete
  ];
  rightSideDisplays = [
    RightSideDisplay.ScoreSummary,
    RightSideDisplay.HtmlBlock,
    RightSideDisplay.EmbeddedUrl,
    RightSideDisplay.Scoresheet,
    RightSideDisplay.None
  ];
  private unsubscribe$ = new Subject();
  sort: Sort = {active: 'description', direction: 'asc'};
  isBusy = false;
  uploadProgress = 0;
  @ViewChild('jsonInput') jsonInput: ElementRef<HTMLInputElement>;

  constructor(
    private settingsService: ComnSettingsService,
    private scoringModelDataService: ScoringModelDataService,
    private scoringModelQuery: ScoringModelQuery,
    private userDataService: UserDataService,
    private dialog: MatDialog,
    public dialogService: DialogService
  ) {
    this.topbarColor = this.settingsService.settings.AppTopBarHexColor
      ? this.settingsService.settings.AppTopBarHexColor
      : this.topbarColor;
    this.scoringModelDataService.load();
    // observe the scoring models
    this.scoringModelQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(scoringModels => {
      this.scoringModelList = scoringModels;
      this.sortedScoringModelList = this.getSortedScoringModels();
    });
    // oberve the users
    this.userDataService.userList.pipe(takeUntil(this.unsubscribe$)).subscribe(users => {
      this.userList = users;
    });
    // subscribe to scoring models loading
    this.scoringModelQuery.selectLoading().pipe(takeUntil(this.unsubscribe$)).subscribe((isLoading) => {
      this.isBusy = isLoading;
    });
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
        itemStatuses: this.itemStatuses,
        rightSideDisplays: this.rightSideDisplays
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
    this.editScoringModel =
      this.editScoringModel.id === scoringModel.id ? this.editScoringModel = {} : this.editScoringModel = { ...scoringModel};
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
      if (result['confirm']) {
        this.scoringModelDataService.delete(scoringModel.id);
      }
    });
  }

  applyFilter(filterValue: string) {
    this.filterControl.setValue(filterValue);
  }

  sortChanged(sort: Sort) {
    this.sort = sort && sort.direction ? sort : {active: 'description', direction: 'asc'};
    this.sortedScoringModelList = this.getSortedScoringModels();
  }

  getFilteredScoringModels(): ScoringModel[] {
    let filteredScoringModels: ScoringModel[] = [];
    if (this.scoringModelList) {
      this.scoringModelList.forEach(se => {
        filteredScoringModels.push({... se});
      });
      if (filteredScoringModels && filteredScoringModels.length > 0 && this.filterString) {
        const filterString = this.filterString.toLowerCase();
        filteredScoringModels = filteredScoringModels
          .filter((a) =>
            a.description.toLowerCase().includes(filterString)
          );
      }
    }
    return filteredScoringModels;
  }

  getSortedScoringModels() {
    const scoringModels = this.getFilteredScoringModels();
    scoringModels.sort((a, b) => this.sortScoringModels(a, b, this.sort.active, this.sort.direction));
    return scoringModels;
  }

  private sortScoringModels(
    a: ScoringModel,
    b: ScoringModel,
    column: string,
    direction: string
  ) {
    let returnValue = 0;
    const isAsc = direction !== 'desc';
    switch (column) {
      case 'dateCreated':
        returnValue = ( (a.dateCreated < b.dateCreated ? -1 : 1) * (isAsc ? 1 : -1) );
        break;
      case 'status':
        returnValue = ( (a.status < b.status ? -1 : 1) * (isAsc ? 1 : -1) );
        break;
      case 'createdBy':
        returnValue = ( (a.createdBy.toLowerCase() < b.createdBy.toLowerCase() ? -1 : 1) * (isAsc ? 1 : -1) );
        break;
      case 'description':
      default:
        returnValue = ( (a.description.toLowerCase() < b.description.toLowerCase() ? -1 : 1) * (isAsc ? 1 : -1) );
        break;
    }
    return returnValue;
  }

  getUserName(id: string) {
    const user = this.userList.find(u => u.id === id);
    return user ? user.name : '?';
  }

  copyScoringModel(id: string): void {
    this.scoringModelDataService.copy(id);
  }

  downloadScoringModel(scoringModel: ScoringModel) {
    this.isBusy = true;
    this.scoringModelDataService.downloadJson(scoringModel.id).subscribe(
      (data) => {
        const url = window.URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.download = scoringModel.description.endsWith('.json') ? scoringModel.description : scoringModel.description + '.json';
        link.click();
        this.isBusy = false;
      },
      (err) => {
        this.isBusy = false;
        window.alert('Error downloading file');
      },
      () => {
        this.isBusy = false;
      }
    );
  }

  uploadFile(fileType: string, mselId: string, teamId: string) {
    this.isBusy = true;
  }

  /**
   * Selects the file(s) to be uploaded. Called when file selection is changed
   */
  selectFile(e) {
    const file = e.target.files[0];
    if (!file) {
      this.isBusy = false;
      return;
    }
    this.uploadProgress = 0;
    this.isBusy = true;
    this.scoringModelDataService.uploadJson(file, 'events', true);
    this.jsonInput.nativeElement.value = null;
  }

  paginatorEvent(page: PageEvent) {
    this.pageSize = page.pageSize;
    this.pageIndex = page.pageIndex;
  }

  paginateScoringModels(pageIndex: number, pageSize: number) {
    const startIndex = pageIndex * pageSize;
    const copy = this.sortedScoringModelList.slice();
    return copy.splice(startIndex, pageSize);
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
