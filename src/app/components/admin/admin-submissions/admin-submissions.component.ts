// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import {
  Component,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import {
  Evaluation,
  Submission,
  User,
} from 'src/app/generated/cite.api/model/models';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { SubmissionDataService } from 'src/app/data/submission/submission-data.service';
import { SubmissionQuery } from 'src/app/data/submission/submission.query';
import { TeamDataService } from 'src/app/data/team/team-data.service';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatTableDataSource } from '@angular/material/table';
import {
  PopulatedSubmission,
  SubmissionType,
} from 'src/app/data/submission/submission.models';
import { MatDialog } from '@angular/material/dialog';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';

@Component({
    selector: 'app-admin-submissions',
    templateUrl: './admin-submissions.component.html',
    styleUrls: ['./admin-submissions.component.scss'],
    standalone: false
})
export class AdminSubmissionsComponent implements OnInit, OnDestroy {
  sort: Sort = {
    active: 'name',
    direction: 'asc',
  };
  pageIndex: number = 0;
  pageSize: number = 10;
  displayedSubmissions: PopulatedSubmission[] = [];
  filterString = '';
  filteredSubmission: PopulatedSubmission[] = [];
  isLoading = false;
  topbarColor = '#ef3a47';
  populatedSubmissions: PopulatedSubmission[] = [];
  dataSource = new MatTableDataSource<PopulatedSubmission>();
  selectedEvaluation: Evaluation = { id: '', description: '' };
  evaluationList: Evaluation[] = [];
  submissionTypes = [
    SubmissionType.official,
    SubmissionType.team,
    SubmissionType.user,
  ];
  selectedSubmissionTypes = [SubmissionType.official, SubmissionType.team];
  selectedMove = -1;
  moveList: number[] = [];
  userList$: User[] = [];
  displayedColumns: string[] = [
    'name',
    'submissionType',
    'moveNumber',
    'score',
    'status',
  ];
  private unsubscribe$ = new Subject();

  constructor(
    private settingsService: ComnSettingsService,
    private evaluationQuery: EvaluationQuery,
    private submissionDataService: SubmissionDataService,
    private submissionQuery: SubmissionQuery,
    private teamDataService: TeamDataService,
    private dialogService: DialogService,
    public matDialog: MatDialog,
    private permissionDataService: PermissionDataService
  ) {
    this.topbarColor = this.settingsService.settings.AppTopBarHexColor
      ? this.settingsService.settings.AppTopBarHexColor
      : this.topbarColor;

    this.evaluationQuery
      .selectAll()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((evaluations) => {
        const managedEvaluations: Evaluation[] = [];
        evaluations.forEach((evaluation) => {
          if (this.permissionDataService.canManageEvaluation(evaluation.id)) {
            managedEvaluations.push(evaluation);
          }
        });
        this.evaluationList = managedEvaluations;
      });

    this.submissionDataService.unload();
    this.submissionQuery
      .selectAllPopulated()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((submissions) => {
        const moves: number[] = [];
        submissions.forEach((submission) => {
          if (!moves.includes(+submission.moveNumber)) {
            moves.push(+submission.moveNumber);
          }
        });
        this.moveList = moves;
        this.populatedSubmissions = submissions;
        this.criteriaChanged();
        this.applyPagination();
      });
  }

  ngOnInit() {
    this.criteriaChanged();
  }

  selectEvaluation(evaluationId: string) {
    this.submissionDataService.loadByEvaluation(evaluationId);
    this.teamDataService.loadByEvaluationId(evaluationId);
  }

  selectMove(move: number) {
    this.selectedMove = move;
    this.criteriaChanged();
  }

  deleteSubmissionRequest(submission: Submission) {
    this.dialogService
      .confirm(
        'Delete this submission?',
        'Are you sure that you want to delete this submission?'
      )
      .subscribe((result) => {
        if (result['confirm']) {
          this.submissionDataService.delete(submission.id);
        }
      });
  }

  sortChanged(sort: Sort) {
    this.sort = sort;
    this.filteredSubmission.sort((a, b) =>
      this.sortSubmissions(a, b, sort.active, sort.direction)
    );
    this.applyPagination();
  }

  private sortSubmissions(
    a: PopulatedSubmission,
    b: PopulatedSubmission,
    column: string,
    direction: string
  ) {
    const isAsc = direction !== 'desc';
    switch (column) {
      case 'name':
        return (
          (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      case 'submissionType':
        return (
          (a.submissionType.toLowerCase() < b.submissionType.toLowerCase()
            ? -1
            : 1) * (isAsc ? 1 : -1)
        );
      case 'moveNumber':
        return (a.moveNumber < b.moveNumber ? -1 : 1) * (isAsc ? 1 : -1);
      case 'score':
        return (a.score < b.score ? -1 : 1) * (isAsc ? 1 : -1);
      case 'status':
        return (
          (a.status.toLowerCase() < b.status.toLowerCase() ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      default:
        return 0;
    }
  }

  criteriaChanged() {
    this.filteredSubmission = this.populatedSubmissions.filter(
      (submission) =>
        this.selectedSubmissionTypes.includes(submission.submissionType) &&
        (this.selectedMove === -1 ||
          +submission.moveNumber === this.selectedMove)
    );
    this.applyPagination();
  }

  paginatorEvent(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.applyPagination();
  }

  applyPagination() {
    const startIndex = this.pageIndex * this.pageSize;
    this.displayedSubmissions = this.filteredSubmission.slice(
      startIndex,
      startIndex + this.pageSize
    );
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
