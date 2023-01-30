// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, EventEmitter, Input, OnInit, Output, OnDestroy } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { LegacyPageEvent as PageEvent } from '@angular/material/legacy-paginator';
import { Sort } from '@angular/material/sort';
import { Evaluation, ItemStatus, Team, User} from 'src/app/generated/cite.api/model/models';
import { EvaluationDataService } from 'src/app/data/evaluation/evaluation-data.service';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { ScoringModelDataService } from 'src/app/data/scoring-model/scoring-model-data.service';
import { ScoringModelQuery } from 'src/app/data/scoring-model/scoring-model.query';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { AdminEvaluationEditDialogComponent } from '../admin-evaluation-edit-dialog/admin-evaluation-edit-dialog.component';

@Component({
  selector: 'app-admin-evaluations',
  templateUrl: './admin-evaluations.component.html',
  styleUrls: ['./admin-evaluations.component.scss'],
})
export class AdminEvaluationsComponent implements OnInit, OnDestroy {
  @Input() evaluationList: Evaluation[];
  @Input() teamList: Team[];
  @Input() pageSize: number;
  @Input() pageIndex: number;
  @Output() sortChange = new EventEmitter<Sort>();
  @Output() pageChange = new EventEmitter<PageEvent>();
  filterControl: UntypedFormControl = this.evaluationDataService.filterControl;
  filterString = '';
  newEvaluation: Evaluation = { id: '', description: '' };
  isLoading = false;
  topbarColor = '#ef3a47';
  addingNewEvaluation = false;
  newEvaluationDescription = '';
  editEvaluation: Evaluation = {};
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
    private evaluationDataService: EvaluationDataService,
    private evaluationQuery: EvaluationQuery,
    private scoringModelDataService: ScoringModelDataService,
    private scoringModelQuery: ScoringModelQuery,
    private dialog: MatDialog,
    public dialogService: DialogService
  ) {
    this.topbarColor = this.settingsService.settings.AppTopBarHexColor
      ? this.settingsService.settings.AppTopBarHexColor
      : this.topbarColor;
    this.scoringModelQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(scoringModels => {
      this.scoringModels = scoringModels;
      const scoringModel = scoringModels.find(sm => sm.status === ItemStatus.Active);
      this.selectedScoringModelId = !scoringModel ? '' : scoringModel.id;
    });
    this.evaluationDataService.load();
    this.scoringModelDataService.load();
  }

  ngOnInit() {
    this.filterControl.setValue(this.filterString);
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
      evaluation = {... evaluation};
    }
    const dialogRef = this.dialog.open(AdminEvaluationEditDialogComponent, {
      width: '800px',
      data: {
        evaluation: evaluation,
        scoringModels: this.scoringModels,
        itemStatuses: this.itemStatuses
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
  }

  saveEvaluation(evaluation: Evaluation) {
    if (evaluation.id) {
      this.evaluationDataService.updateEvaluation(evaluation);
    } else {
      this.evaluationDataService.add(evaluation);
    }
  }

  incrementCurrentMoveNumber(evaluation: Evaluation) {
    const updateEvaluation = { ...evaluation };
    updateEvaluation.currentMoveNumber ++;
    this.evaluationDataService.changeCurrentMove(updateEvaluation);
  }

  decrementCurrentMoveNumber(evaluation: Evaluation) {
    if (evaluation.currentMoveNumber > 0) {
      const updateEvaluation = { ...evaluation };
      updateEvaluation.currentMoveNumber --;
      this.evaluationDataService.changeCurrentMove(updateEvaluation);
    }
  }

  deleteEvaluationRequest(evaluation: Evaluation) {
    this.dialogService.confirm(
      'Delete this evaluation?',
      'Are you sure that you want to delete ' + evaluation.description + '?'
    ).subscribe((result) => {
      if (result["confirm"]) {
        this.evaluationDataService.delete(evaluation.id);
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

  paginateEvaluations(evaluations: Evaluation[], pageIndex: number, pageSize: number) {
    if (!evaluations) {
      return [];
    }
    const startIndex = pageIndex * pageSize;
    const copy = evaluations.slice();
    return copy.splice(startIndex, pageSize);
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
