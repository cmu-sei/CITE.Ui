// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { SubmissionStore } from './submission.store';
import { SubmissionQuery } from './submission.query';
import { Injectable } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { Router, ActivatedRoute } from '@angular/router';
import {
  Submission,
  SubmissionService,
  SubmissionOptionService,
  SubmissionComment,
  SubmissionCommentService
} from 'src/app/generated/cite.api';
import { map, take, tap } from 'rxjs/operators';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SubmissionDataService {
  readonly submissionList: Observable<Submission[]>;
  readonly filterControl = new UntypedFormControl();
  private filterTerm: Observable<string>;
  private sortColumn: Observable<string>;
  private sortIsAscending: Observable<boolean>;
  private _pageEvent: PageEvent = { length: 0, pageIndex: 0, pageSize: 10 };
  readonly pageEvent = new BehaviorSubject<PageEvent>(this._pageEvent);
  private pageSize: Observable<number>;
  private pageIndex: Observable<number>;

  constructor(
    private submissionStore: SubmissionStore,
    private submissionQuery: SubmissionQuery,
    private submissionService: SubmissionService,
    private submissionOptionService: SubmissionOptionService,
    private submissionCommentService: SubmissionCommentService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this.filterTerm = activatedRoute.queryParamMap.pipe(
      map((params) => params.get('submissionmask') || '')
    );
    this.filterControl.valueChanges.subscribe((term) => {
      this.router.navigate([], {
        queryParams: { submissionmask: term },
        queryParamsHandling: 'merge',
      });
    });
    this.sortColumn = activatedRoute.queryParamMap.pipe(
      map((params) => params.get('sorton') || 'name')
    );
    this.sortIsAscending = activatedRoute.queryParamMap.pipe(
      map((params) => (params.get('sortdir') || 'asc') === 'asc')
    );
    this.pageSize = activatedRoute.queryParamMap.pipe(
      map((params) => parseInt(params.get('pagesize') || '20', 10))
    );
    this.pageIndex = activatedRoute.queryParamMap.pipe(
      map((params) => parseInt(params.get('pageindex') || '0', 10))
    );
    this.submissionList = combineLatest([
      this.submissionQuery.selectAll(),
      this.filterTerm,
      this.sortColumn,
      this.sortIsAscending,
      this.pageSize,
      this.pageIndex,
    ]).pipe(
      map(
        ([
          items,
          filterTerm,
          sortColumn,
          sortIsAscending,
          pageSize,
          pageIndex,
        ]) =>
          items
            ? (items as Submission[])
              .sort((a: Submission, b: Submission) =>
                this.sortSubmissions(a, b, sortColumn, sortIsAscending)
              )
            : []
      )
    );
  }

  private sortSubmissions(
    a: Submission,
    b: Submission,
    column: string,
    isAsc: boolean
  ) {
    switch (column) {
      case 'dateCreated':
        return (
          (a.dateCreated.valueOf() < b.dateCreated.valueOf() ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      default:
        return 0;
    }
  }

  load(evaluationId?: string, scoringModelId?: string, userId?: string, teamId?: string) {
    this.submissionStore.setLoading(true);
    this.submissionService
      .getSubmissions(evaluationId, scoringModelId, userId, teamId)
      .pipe(
        tap(() => {
          this.submissionStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe(
        (submissions) => {
          this.submissionStore.set(submissions);
        },
        (error) => {
          this.submissionStore.set([]);
        }
      );
  }

  loadMineByEvaluation(evaluationId: string) {
    this.submissionStore.setLoading(true);
    this.submissionService
      .getMineByEvaluation(evaluationId)
      .pipe(
        tap(() => {
          this.submissionStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe(
        (submissions) => {
          this.submissionStore.set(submissions);
        },
        (error) => {
          this.submissionStore.set([]);
        }
      );
  }

  loadByEvaluationTeam(evaluationId: string, teamId: string) {
    this.submissionStore.setLoading(true);
    this.submissionService
      .getByEvaluationTeam(evaluationId, teamId)
      .pipe(
        tap(() => {
          this.submissionStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe(
        (submissions) => {
          this.submissionStore.set(submissions);
        },
        (error) => {
          this.submissionStore.set([]);
        }
      );
  }

  loadById(id: string) {
    this.submissionStore.setLoading(true);
    return this.submissionService
      .getSubmission(id)
      .pipe(
        tap(() => {
          this.submissionStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((s) => {
        this.submissionStore.upsert(s.id, { ...s });
        this.setActive(s.id);
      });
  }

  unload() {
    this.submissionStore.set([]);
    this.setActive('');
  }

  add(submission: Submission) {
    this.submissionStore.setLoading(true);
    this.submissionService
      .createSubmission(submission)
      .pipe(
        tap(() => {
          this.submissionStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((s) => {
        if (s) {
          this.submissionStore.upsert(s.id, s);
          this.setActive(s.id);
        }
      });
  }

  updateSubmission(submission: Submission) {
    this.submissionStore.setLoading(true);
    this.submissionService
      .updateSubmission(submission.id, submission)
      .pipe(
        tap(() => {
          this.submissionStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((n) => {
        this.updateStore(n);
      });
  }

  clearSubmission(id: string) {
    this.submissionStore.setLoading(true);
    this.submissionService
      .clearSubmission(id)
      .pipe(
        tap(() => {
          this.submissionStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((n) => {
        this.updateStore(n);
      });
  }

  presetSubmission(id: string) {
    this.submissionStore.setLoading(true);
    this.submissionService
      .presetSubmission(id)
      .pipe(
        tap(() => {
          this.submissionStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((n) => {
        this.updateStore(n);
      });
  }

  toggleSubmissionOption(submissionOptionId: string, value: boolean) {
    if (value) {
      this.submissionOptionService
        .selectSubmissionOption(submissionOptionId)
        .pipe(take(1))
        .subscribe((r) => {
          this.updateStore(r);
        });
    } else {
      this.submissionOptionService
        .deselectSubmissionOption(submissionOptionId)
        .pipe(take(1))
        .subscribe((r) => {
          this.updateStore(r);
        });
    }
  }

  addSubmissionComment(submissionId: string, submissionOptionId: string, comment: string) {
    const submissionComment = {
      submissionOptionId: submissionOptionId,
      comment: comment
    } as SubmissionComment;
    this.submissionService.addSubmissionComment(submissionId, submissionComment).pipe(take(1)).subscribe(s => {
      this.submissionStore.upsert(s.id, { ...s });
    });
  }

  changeSubmissionComment(submissionId: string, submissionComment: SubmissionComment) {
    this.submissionService.changeSubmissionComment(submissionId, submissionComment.id, submissionComment).pipe(take(1)).subscribe(s => {
      this.submissionStore.upsert(s.id, { ...s });
    });
  }

  removeSubmissionComment(submissionId: string, submissionCommentId: string) {
    this.submissionService
      .removeSubmissionComment(submissionId, submissionCommentId)
      .pipe(take(1))
      .subscribe(s => {
        this.submissionStore.upsert(s.id, { ...s });
      });
  }

  delete(id: string) {
    this.submissionService
      .deleteSubmission(id)
      .pipe(take(1))
      .subscribe((r) => {
        this.deleteFromStore(id);
        this.setActive('');
      });
  }

  setActive(id: string) {
    this.submissionStore.setActive(id);
  }

  setPageEvent(pageEvent: PageEvent) {
    this.submissionStore.update({ pageEvent: pageEvent });
  }

  updateStore(updatedSubmission: Submission) {
    const submission = {...updatedSubmission};
    if (submission.scoreIsAnAverage) {
      const allSubmissions = this.submissionQuery.getAll();
      const matchingSubmission = allSubmissions.find(s =>
        ((!s.userId && !submission.userId) || s.userId === submission.userId) &&        // both IDs are null or equal
        ((!s.teamId && !submission.teamId) || s.teamId === submission.teamId) &&        // both IDs are null or equal
        ((!s.groupId && !submission.groupId) || s.groupId === submission.groupId) &&    // both IDs are null or equal
        s.evaluationId === submission.evaluationId &&
        +s.moveNumber === +submission.moveNumber &&
        s.scoreIsAnAverage);
      if (matchingSubmission) {
        submission.id = matchingSubmission.id;
      } else {
        console.log('submission not found. user=' +
          submission.userId + ', team=' + submission.teamId +
          ', group=' + submission.groupId + ', evaluation=' + submission.evaluationId);
      }
    }
    this.submissionStore.upsert(submission.id, submission);
  }

  deleteFromStore(id: string) {
    this.submissionStore.remove(id);
  }

}
