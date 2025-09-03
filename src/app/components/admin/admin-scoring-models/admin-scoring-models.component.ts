// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import {
  Evaluation,
  ScoringModel,
  ItemStatus,
  RightSideDisplay,
  User,
} from 'src/app/generated/cite.api/model/models';
import { ScoringModelDataService } from 'src/app/data/scoring-model/scoring-model-data.service';
import { ScoringModelQuery } from 'src/app/data/scoring-model/scoring-model.query';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { AdminScoringModelEditDialogComponent } from '../admin-scoring-model-edit-dialog/admin-scoring-model-edit-dialog.component';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'app-admin-scoring-models',
    templateUrl: './admin-scoring-models.component.html',
    styleUrls: ['./admin-scoring-models.component.scss'],
    standalone: false
})
export class AdminScoringModelsComponent implements OnInit, OnDestroy {
  @Input() evaluationList: Evaluation[];
  scoringModelList: ScoringModel[] = [];
  sortedScoringModelList: ScoringModel[] = [];
  userList: User[] = [];
  pageSize: number = 50;
  pageIndex: number = 0;
  filterControl = new UntypedFormControl();
  filterString = '';
  filteredScoringModelList: ScoringModel[] = [];
  newScoringModel: ScoringModel = { id: '', description: '' };
  isLoading = false;
  topbarColor = '#ef3a47';
  displayedScoringModels: ScoringModel[] = [];
  addingNewScoringModel = false;
  newScoringModelDescription = '';
  editScoringModel: ScoringModel = {};
  previewScoringModelId = '';
  scoringCategoryId = '';
  itemStatuses = [
    ItemStatus.Pending,
    ItemStatus.Active,
    ItemStatus.Cancelled,
    ItemStatus.Complete,
    ItemStatus.Archived
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
  showAll = false;

  constructor(
    private settingsService: ComnSettingsService,
    private scoringModelDataService: ScoringModelDataService,
    private scoringModelQuery: ScoringModelQuery,
    private userDataService: UserDataService,
    private dialog: MatDialog,
    public dialogService: DialogService,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) {
    this.topbarColor = this.settingsService.settings.AppTopBarHexColor
      ? this.settingsService.settings.AppTopBarHexColor
      : this.topbarColor;
    this.scoringModelDataService.load();
    // observe the scoring models
    this.scoringModelQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(scoringModels => {
      this.scoringModelList = scoringModels;
    });
    // oberve the users
    this.userDataService.userList.pipe(takeUntil(this.unsubscribe$)).subscribe(users => {
      this.userList = users;
    });
    // subscribe to scoring models loading
    this.scoringModelQuery.selectLoading().pipe(takeUntil(this.unsubscribe$)).subscribe((isLoading) => {
      this.isBusy = isLoading;
    });

    this.filterControl.valueChanges
      .pipe(
        takeUntil(this.unsubscribe$)
      )
      .subscribe((term) => {
        this.filterString = term.trim().toLowerCase();
        this.applyFilter();
      });
    this.activatedRoute.queryParamMap
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((params) => {
        this.previewScoringModelId = params.get('scoringModelId');
      });
  }

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.scoringModelQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(models => {
      this.scoringModelList = Array.from(models);
      this.applyFilter();
    })
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
        rightSideDisplays: this.rightSideDisplays,
        canEdit: scoringModel?.id && !scoringModel.evaluationId
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

  applyFilter() {
    this.filteredScoringModelList = this.scoringModelList.filter(model =>
        (!this.filterString ||
        model.description.toLowerCase().includes(this.filterString)) &&
        ((this.showAll) || (!model.evaluationId && !this.showAll))
    );
    this.sortChanged(this.sort);
  }

  clearFilter() {
    this.filterControl.setValue('');
  }

  sortChanged(sort: Sort) {
    this.sort = sort;
    this.filteredScoringModelList.sort((a, b) => this.sortScoringModels(a, b, sort.active, sort.direction));
    this.applyPagination();
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

  scoringModelEvaluation(evaluationId: string): string {
    const evaluation = this.evaluationList?.find(m => m.id === evaluationId);
    const name = evaluation ? " - on " + evaluation.description : '';

    return name;
  }

  copyScoringModel(id: string): void {
    this.scoringModelDataService.copy(id);
  }

  previewScoringModel(scoringModelId: string) {
    this.router.navigate([], {
      queryParams: {
        section: 'Scoring Models',
        scoringModelId: scoringModelId,
      },
    });
  }

  downloadScoringModel(scoringModel: ScoringModel) {
    this.isBusy = true;
    this.scoringModelDataService.downloadJson(scoringModel.id).subscribe(
      (data) => {
        const url = window.URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.download = scoringModel.description + '-scoring-model.json';
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
    this.applyPagination();
  }

  applyPagination() {
    const startIndex = this.pageIndex * this.pageSize;
    this.displayedScoringModels = this.filteredScoringModelList.slice(startIndex, startIndex + this.pageSize);
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
