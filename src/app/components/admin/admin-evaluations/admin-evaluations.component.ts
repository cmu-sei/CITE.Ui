// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, ElementRef, Input, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import {
  Evaluation,
  ItemStatus,
  Move,
  User,
} from 'src/app/generated/cite.api/model/models';
import { EvaluationDataService } from 'src/app/data/evaluation/evaluation-data.service';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { ScoringModelDataService } from 'src/app/data/scoring-model/scoring-model-data.service';
import { ScoringModelQuery } from 'src/app/data/scoring-model/scoring-model.query';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { AdminEvaluationEditDialogComponent } from '../admin-evaluation-edit-dialog/admin-evaluation-edit-dialog.component';
import { UserQuery } from 'src/app/data/user/user.query';
import { TeamMembershipDataService } from 'src/app/data/team/team-membership-data.service';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';

@Component({
    selector: 'app-admin-evaluations',
    templateUrl: './admin-evaluations.component.html',
    styleUrls: ['./admin-evaluations.component.scss'],
    standalone: false
})

export class AdminEvaluationsComponent implements OnInit, OnDestroy {
  @Input() evaluationList: Evaluation[];
  pageIndex: number = 0;
  pageSize: number = 10;
  filterControl = new UntypedFormControl();
  filterString = '';
  newEvaluation: Evaluation = { id: '', description: '' };
  isLoading = false;
  topbarColor = '#ef3a47';
  addingNewEvaluation = false;
  newEvaluationDescription = '';
  editEvaluation: Evaluation = {};
  scoringModels = [];
  selectedScoringModelId = '';
  filteredEvaluationList: Evaluation[] = [];
  displayedEvaluations: Evaluation[] = [];
  itemStatuses = [
    ItemStatus.Pending,
    ItemStatus.Active,
    ItemStatus.Cancelled,
    ItemStatus.Complete,
    ItemStatus.Archived
  ];
  selectedStatuses = [ ItemStatus.Pending, ItemStatus.Active, ItemStatus.Complete ];
  private unsubscribe$ = new Subject();
  sort: Sort = {
    active: 'description',
    direction: 'asc'
  };
  userList: User[] = [];
  isBusy = false;
  uploadProgress = 0;
  canManageEvaluation = false;
  @ViewChild('jsonInput') jsonInput: ElementRef<HTMLInputElement>;

  constructor(
    private settingsService: ComnSettingsService,
    private evaluationDataService: EvaluationDataService,
    private evaluationQuery: EvaluationQuery,
    private permissionDataService: PermissionDataService,
    private scoringModelDataService: ScoringModelDataService,
    private scoringModelQuery: ScoringModelQuery,
    private teamMembershipDataService: TeamMembershipDataService,
    private userQuery: UserQuery,
    private dialog: MatDialog,
    public dialogService: DialogService
  ) {
    this.topbarColor = this.settingsService.settings.AppTopBarHexColor
      ? this.settingsService.settings.AppTopBarHexColor
      : this.topbarColor;
      // observe the scoring models
    this.scoringModelQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(scoringModels => {
      this.scoringModels = scoringModels;
      const scoringModel = scoringModels.find(sm => sm.status === ItemStatus.Active);
      this.selectedScoringModelId = !scoringModel ? '' : scoringModel.id;
    });
    this.scoringModelDataService.load();
    // oberve the users
    this.userQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(users => {
      this.userList = users;
    });
    // subscribe to evaluations loading
    this.evaluationQuery.selectLoading().pipe(takeUntil(this.unsubscribe$)).subscribe((isLoading) => {
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
  }

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.evaluationQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(evaluations => {
      this.evaluationList = Array.from(evaluations);
      this.applyFilter();
    });
  }

  addOrEditEvaluation(evaluation: Evaluation) {
    if (!evaluation) {
      evaluation = {
        description: '',
        currentMoveNumber: 0,
        status: ItemStatus.Pending,
        scoringModelId: this.selectedScoringModelId,
        situationDescription: '',
        situationTime: new Date()
      };
    } else {
      evaluation = { ...evaluation };
    }
    const dialogRef = this.dialog.open(AdminEvaluationEditDialogComponent, {
      width: '800px',
      data: {
        evaluation: evaluation,
        scoringModels: this.scoringModels,
        itemStatuses: this.itemStatuses,
        isExisting: !!evaluation.dateCreated
      },
    });
    dialogRef.componentInstance.editComplete.subscribe((result) => {
      if (result.saveChanges && result.evaluation) {
        this.saveEvaluation(result.evaluation);
      }
      dialogRef.close();
    });
  }

  togglePanel(evaluation: Evaluation) {
    this.editEvaluation = this.editEvaluation.id === evaluation.id ? this.editEvaluation = {} : this.editEvaluation = { ...evaluation};
    this.evaluationDataService.setActive(this.editEvaluation.id);
    // if an evaluation has been selected, load the evaluation, so that we have its details
    if (this.editEvaluation.id) {
      this.canManageEvaluation = this.permissionDataService.canManageEvaluation(this.editEvaluation.id);
      this.evaluationDataService.loadById(this.editEvaluation.id);
      this.teamMembershipDataService.loadMemberships(this.editEvaluation.id);
    }
  }

  evaluationFrozen(evaluation: Evaluation) {
    return evaluation.status !== ItemStatus.Pending && evaluation.status !== ItemStatus.Active;
  }

  saveEvaluation(evaluation: Evaluation) {
    if (evaluation.id) {
      this.evaluationDataService.updateEvaluation(evaluation);
    } else {
      this.evaluationDataService.add(evaluation);
    }
  }

  getLowestMoveNumber(evaluation: Evaluation) {
    let lowestMoveNumber = evaluation && evaluation.moves && evaluation.moves.length > 0 ? Number.MAX_SAFE_INTEGER : 0;
    evaluation.moves.forEach(m => {
      if (m.moveNumber < lowestMoveNumber) {
        lowestMoveNumber = m.moveNumber;
      }
    });

    return lowestMoveNumber;
  }

  getHighestMoveNumber(evaluation: Evaluation) {
    let highestMoveNumber = evaluation && evaluation.moves && evaluation.moves.length > 0 ? Number.MIN_SAFE_INTEGER : 0;
    evaluation.moves.forEach(m => {
      if (m.moveNumber > highestMoveNumber) {
        highestMoveNumber = m.moveNumber;
      }
    });

    return highestMoveNumber;
  }

  incrementCurrentMoveNumber(evaluation: Evaluation) {
    let nextHighestMove = {moveNumber: Number.MAX_SAFE_INTEGER} as Move;
    evaluation.moves.forEach(m => {
      if (m.moveNumber > evaluation.currentMoveNumber && m.moveNumber < nextHighestMove.moveNumber) {
        nextHighestMove = m;
      }
    });
    if (+evaluation.currentMoveNumber !== +nextHighestMove.moveNumber) {
      const updateEvaluation = { ...evaluation };
      updateEvaluation.currentMoveNumber = nextHighestMove.moveNumber;
      this.evaluationDataService.changeCurrentMove(updateEvaluation);
    }
  }

  decrementCurrentMoveNumber(evaluation: Evaluation) {
    let nextLowestMove = {moveNumber: Number.MIN_SAFE_INTEGER} as Move;
    evaluation.moves.forEach(m => {
      if (m.moveNumber < evaluation.currentMoveNumber && m.moveNumber > nextLowestMove.moveNumber) {
        nextLowestMove = m;
      }
    });
    if (+evaluation.currentMoveNumber !== +nextLowestMove.moveNumber) {
      const updateEvaluation = { ...evaluation };
      updateEvaluation.currentMoveNumber = nextLowestMove.moveNumber;
      this.evaluationDataService.changeCurrentMove(updateEvaluation);
    }
  }

  deleteEvaluationRequest(evaluation: Evaluation) {
    this.dialogService.confirm(
      'Delete this evaluation?',
      'Are you sure that you want to delete ' + evaluation.description + '?'
    ).subscribe((result) => {
      if (result['confirm']) {
        this.evaluationDataService.delete(evaluation.id);
      }
    });
  }

  applyFilter() {
    this.filteredEvaluationList = this.evaluationList.filter(evaluation =>
      (
        !this.filterString ||
        evaluation.description.toLowerCase().includes(this.filterString)
      ) &&
      this.selectedStatuses.some(status => status === evaluation.status)
    );
    this.sortList(this.sort);
  }

  clearFilter() {
    this.filterControl.setValue('');
  }

  sortList(sort: Sort) {
    this.sort = sort;
    this.filteredEvaluationList.sort((a, b) => this.sortEvaluations(a, b, sort.active, sort.direction));
    this.applyPagination();
  }

  private sortEvaluations(a: Evaluation, b: Evaluation, column: string, direction: string)
  {
    const isAsc = direction !== 'desc';
    switch (column) {
      case 'description':
        return (
          (a.description.toLowerCase() < b.description.toLowerCase() ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      case 'currentMoveNumber':
        return (
          (a.currentMoveNumber < b.currentMoveNumber ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      case 'createdBy':
        return (
          (a.createdBy.toLowerCase() < b.createdBy.toLowerCase() ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      case 'status':
        return (
          (a.status.toLowerCase() < b.status.toLowerCase() ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      case 'dateCreated':
        return (
          (a.dateCreated < b.dateCreated ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      default:
        return 0;
    }
  }

  getUserName(id: string) {
    const user = this.userList.find(u => u.id === id);
    return user ? user.name : '?';
  }

  copyEvaluation(id: string): void {
    this.evaluationDataService.copy(id);
  }

  downloadEvaluation(evaluation: Evaluation) {
    this.isBusy = true;
    this.evaluationDataService.downloadJson(evaluation.id).subscribe(
      (data) => {
        const url = window.URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.download = evaluation.description + '-evaluation.json';
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
    this.evaluationDataService.uploadJson(file, 'events', true);
    this.jsonInput.nativeElement.value = null;
  }

  paginatorEvent(page: PageEvent) {
    this.pageIndex = page.pageIndex;
    this.pageSize = page.pageSize;
    this.applyPagination();
  }

  applyPagination() {
    const startIndex = this.pageIndex * this.pageSize;
    this.displayedEvaluations = this.filteredEvaluationList.slice(startIndex, startIndex + this.pageSize);
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
