// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { MatLegacyPaginator as MatPaginator, LegacyPageEvent as PageEvent } from '@angular/material/legacy-paginator';
import { Sort } from '@angular/material/sort';
import { Evaluation, Submission, User } from 'src/app/generated/cite.api/model/models';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { SubmissionDataService } from 'src/app/data/submission/submission-data.service';
import { SubmissionQuery } from 'src/app/data/submission/submission.query';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { PopulatedSubmission, SubmissionType } from 'src/app/data/submission/submission.models';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DialogService } from 'src/app/services/dialog/dialog.service';

@Component({
  selector: 'app-admin-submissions',
  templateUrl: './admin-submissions.component.html',
  styleUrls: ['./admin-submissions.component.scss'],
})
export class AdminSubmissionsComponent implements OnInit, OnDestroy, AfterViewInit {
  sort: Sort = {
    active: 'name',
    direction: 'asc'
  };
  pageIndex: number = 0;
  pageSize: number = 10;
  displayedSubmissions: PopulatedSubmission[] = [];
  filterControl: UntypedFormControl = this.submissionDataService.filterControl;
  filterString = '';
  isLoading = false;
  topbarColor = '#ef3a47';
  populatedSubmissions: PopulatedSubmission[] = [];
  dataSource = new MatTableDataSource<PopulatedSubmission>();
  selectedEvaluation: Evaluation = { id: '', description: '' };
  evaluationList: Evaluation[] = [];
  submissionTypes = [ SubmissionType.official, SubmissionType.team, SubmissionType.user ];
  selectedSubmissionTypes = [ SubmissionType.official, SubmissionType.team ];
  selectedMove = -1;
  moveList: number[] = [];
  userList$: User[] = [];
  @ViewChild(MatPaginator) paginator: MatPaginator;
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
    private dialogService: DialogService,
    public matDialog: MatDialog
  ) {
    this.topbarColor = this.settingsService.settings.AppTopBarHexColor
      ? this.settingsService.settings.AppTopBarHexColor
      : this.topbarColor;

    this.evaluationQuery
      .selectAll()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(evaluations => {
        this.evaluationList = evaluations;
      });

    this.submissionDataService.unload();
    this.submissionQuery
      .selectAllPopulated()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((submissions) => {
        const moves: number[] = [];
        submissions.forEach(submission => {
          if (!moves.includes(+submission.moveNumber)) {
            moves.push(+submission.moveNumber);
          }
        });
        this.moveList = moves;
        this.populatedSubmissions = submissions;
        this.criteriaChanged();
      });
  }

  ngOnInit() {
    this.filterControl.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        takeUntil(this.unsubscribe$)
      )
      .subscribe((filter) => this.applyFilter(filter));
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.criteriaChanged();
  }

  selectEvaluation(evaluationId: string) {
    this.submissionDataService.load(evaluationId, '', '', '');
  }

  selectMove(move: number) {
    this.selectedMove = move;
    this.criteriaChanged();
  }

  deleteSubmissionRequest(submission: Submission) {
    this.dialogService.confirm(
      'Delete this submission?',
      'Are you sure that you want to delete this submission?'
    ).subscribe((result) => {
      if (result['confirm']) {
        this.submissionDataService.delete(submission.id);
      }
    });
  }

  applyFilter(filterValue: string) {
    this.filterControl.setValue(filterValue);
  }

  sortChanged(sort: Sort) {
    this.sort = sort;
    this.sortSubmissions();
  }

  sortSubmissions() {
    if (this.sort.active && this.sort.direction !== '') {
      this.dataSource.data = this.dataSource.data.sort((a, b) => {
        const isAsc = this.sort.direction === 'asc';
        switch (this.sort.active) {
          case 'name':
            return this.compare(a.name, b.name, isAsc);
          case 'submissionType':
            return this.compare(a.submissionType, b.submissionType, isAsc);
          case 'moveNumber':
            return this.compare(a.moveNumber, b.moveNumber, isAsc);
          case 'score':
            return this.compare(a.score, b.score, isAsc);
          case 'status':
            return this.compare(a.status, b.status, isAsc);
          default:
            return 0;
        }
      });
    }
  }

  compare(a: number | string, b: number | string, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  criteriaChanged() {
    this.dataSource.data = this.populatedSubmissions.filter(submission =>
      this.selectedSubmissionTypes.includes(submission.submissionType) &&
      (this.selectedMove === -1 || +submission.moveNumber === this.selectedMove)
    );
  }  

  paginatorEvent(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.paginateSubmissions();
  }
  
  paginateSubmissions() {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.displayedSubmissions = this.dataSource.data.slice(startIndex, endIndex);
  }
  

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
