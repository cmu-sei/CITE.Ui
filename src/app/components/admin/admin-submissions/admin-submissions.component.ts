// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  OnDestroy,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { Evaluation, Submission, User } from 'src/app/generated/cite.api/model/models';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { SubmissionDataService } from 'src/app/data/submission/submission-data.service';
import { SubmissionQuery } from 'src/app/data/submission/submission.query';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { MatTableDataSource } from '@angular/material/table';
import { PopulatedSubmission, SubmissionType } from 'src/app/data/submission/submission.models';
import { MatDialog } from '@angular/material/dialog';
import { DialogService } from "src/app/services/dialog/dialog.service";

@Component({
  selector: 'app-admin-submissions',
  templateUrl: './admin-submissions.component.html',
  styleUrls: ['./admin-submissions.component.scss'],
})
export class AdminSubmissionsComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  @Input() pageSize: number;
  @Input() pageIndex: number;
  @Output() sortChange = new EventEmitter<Sort>();
  @Output() pageChange = new EventEmitter<PageEvent>();
  filterControl: FormControl = this.submissionDataService.filterControl;
  filterString = '';
  isLoading = false;
  topbarColor = '#ef3a47';
  populatedSubmissions: PopulatedSubmission[] = [];
  dataSource = new MatTableDataSource<PopulatedSubmission>();
  selectedEvaluation: Evaluation = { id: '', description: '' };
  evaluationList: Evaluation[] = [];
  submissionTypes = [ SubmissionType.official, SubmissionType.team, SubmissionType.user ];
  selectedSubmissionTypes = [ SubmissionType.official, SubmissionType.team ];
  selectedMove: number = -1;
  moveList: number[] = [];
  userList$: User[] = [];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
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
        var moves: number[] = [];
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
      .subscribe((filter) => this.onFilterChanged(filter));
  }

  ngAfterViewInit() {
    this.applyFilter(this.filterString);

    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
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
      if (result["confirm"]) {
        this.submissionDataService.delete(submission.id);
      }
    });
  }

  onFilterChanged(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  applyFilter(filterValue: string) {
    this.filterControl.setValue(filterValue);
  }

  sortChanged(sort: Sort) {
    this.sortChange.emit(sort);
  }

  criteriaChanged() {
    var includedSubmissions: PopulatedSubmission[] = [];
    this.populatedSubmissions.forEach(submission => {
      if ( this.selectedSubmissionTypes.includes(submission.submissionType) &&
           (this.selectedMove === -1 || this.selectedMove == submission.moveNumber)) {
        includedSubmissions.push(submission);
      }
    });
    this.dataSource.data = includedSubmissions;
  }

  paginatorEvent(page: PageEvent) {
    this.pageChange.emit(page);
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
