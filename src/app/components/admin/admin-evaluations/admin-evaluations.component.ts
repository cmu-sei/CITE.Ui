// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, EventEmitter, Input, OnInit, Output, OnDestroy } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { LegacyPageEvent as PageEvent } from '@angular/material/legacy-paginator';
import { Sort } from '@angular/material/sort';
import { Evaluation, ItemStatus, Move } from 'src/app/generated/cite.api/model/models';
import { EvaluationDataService } from 'src/app/data/evaluation/evaluation-data.service';
import { ScoringModelDataService } from 'src/app/data/scoring-model/scoring-model-data.service';
import { ScoringModelQuery } from 'src/app/data/scoring-model/scoring-model.query';
import { TeamUserDataService } from 'src/app/data/team-user/team-user-data.service';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { AdminEvaluationEditDialogComponent } from '../admin-evaluation-edit-dialog/admin-evaluation-edit-dialog.component';
import { RightSideDisplay } from 'src/app/generated/cite.api/model/rightSideDisplay';

@Component({
  selector: 'app-admin-evaluations',
  templateUrl: './admin-evaluations.component.html',
  styleUrls: ['./admin-evaluations.component.scss'],
})
export class AdminEvaluationsComponent implements OnInit, OnDestroy {
  @Input() evaluationList: Evaluation[];
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
  rightSideDisplays = [
    RightSideDisplay.ScoreSummary,
    RightSideDisplay.HtmlBlock,
    RightSideDisplay.EmbeddedUrl,
    RightSideDisplay.Scoresheet,
    RightSideDisplay.None
  ];
  private unsubscribe$ = new Subject();

  constructor(
    private settingsService: ComnSettingsService,
    private evaluationDataService: EvaluationDataService,
    private scoringModelDataService: ScoringModelDataService,
    private scoringModelQuery: ScoringModelQuery,
    private teamUserDataService: TeamUserDataService,
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
      evaluation = { ...evaluation };
    }
    const dialogRef = this.dialog.open(AdminEvaluationEditDialogComponent, {
      width: '800px',
      data: {
        evaluation: evaluation,
        scoringModels: this.scoringModels,
        itemStatuses: this.itemStatuses,
        rightSideDisplays: this.rightSideDisplays
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
      this.evaluationDataService.loadById(this.editEvaluation.id);
      this.teamUserDataService.loadByEvaluation(this.editEvaluation.id);
    }
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
