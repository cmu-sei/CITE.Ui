// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { EvaluationStore } from './evaluation.store';
import { EvaluationQuery } from './evaluation.query';
import { Injectable } from '@angular/core';
import { FormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { Router, ActivatedRoute } from '@angular/router';
import {
  Evaluation,
  EvaluationService,
  ItemStatus
} from 'src/app/generated/cite.api';
import { map, take, tap } from 'rxjs/operators';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EvaluationDataService {
  private _requestedEvaluationId: string;
  private _requestedEvaluationId$ = this.activatedRoute.queryParamMap.pipe(
    map((params) => params.get('evaluationId') || '')
  );
  readonly EvaluationList: Observable<Evaluation[]>;
  readonly filterControl = new FormControl();
  private filterTerm: Observable<string>;
  private sortColumn: Observable<string>;
  private sortIsAscending: Observable<boolean>;
  private _pageEvent: PageEvent = { length: 0, pageIndex: 0, pageSize: 10 };
  readonly pageEvent = new BehaviorSubject<PageEvent>(this._pageEvent);
  private pageSize: Observable<number>;
  private pageIndex: Observable<number>;

  constructor(
    private evaluationStore: EvaluationStore,
    private evaluationQuery: EvaluationQuery,
    private evaluationService: EvaluationService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this.filterTerm = activatedRoute.queryParamMap.pipe(
      map((params) => params.get('evalterm') || '')
    );
    this.filterControl.valueChanges.subscribe((term) => {
      this.router.navigate([], {
        queryParams: { evalterm: term },
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
    this.EvaluationList = combineLatest([
      this.evaluationQuery.selectAll(),
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
            ? (items as Evaluation[])
                .sort((a: Evaluation, b: Evaluation) =>
                  this.sortEvaluations(a, b, sortColumn, sortIsAscending)
                )
                .filter(
                  (evaluation) =>
                    ('' + evaluation.description)
                      .toLowerCase()
                      .includes(filterTerm.toLowerCase()) ||
                    ('' + evaluation.status)
                      .toLowerCase()
                      .includes(filterTerm.toLowerCase()) ||
                    evaluation.id
                      .toLowerCase()
                      .includes(filterTerm.toLowerCase())
                )
            : []
      )
    );
  }

  private sortEvaluations(
    a: Evaluation,
    b: Evaluation,
    column: string,
    isAsc: boolean
  ) {
    switch (column) {
      case 'description':
        return (
          (a.description.toLowerCase() < b.description.toLowerCase() ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      case 'currentMoveNumber':
        return (
          (+a.currentMoveNumber < +b.currentMoveNumber ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      case 'status':
        return (
          (a.status.toLowerCase() < b.status.toLowerCase() ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      default:
        return 0;
    }
  }

  load() {
    this.evaluationStore.setLoading(true);
    this.evaluationService
      .getEvaluations()
      .pipe(
        tap(() => {
          this.evaluationStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe(
        (evaluations) => {
          evaluations.forEach(e => {
            this.setAsDates(e);
          });
          this.evaluationStore.set(evaluations);
        },
        (error) => {
          this.evaluationStore.set([]);
        }
      );
  }

  loadMine() {
    this.evaluationStore.setLoading(true);
    this.evaluationService
      .getMyEvaluations()
      .pipe(
        tap(() => {
          this.evaluationStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe(
        (evaluations) => {
          evaluations.forEach(e => {
            this.setAsDates(e);
          })
          this.evaluationStore.set(evaluations);
        },
        (error) => {
          this.evaluationStore.set([]);
        }
      );
  }

  loadById(id: string) {
    this.evaluationStore.setLoading(true);
    return this.evaluationService
      .getEvaluation(id)
      .pipe(
        tap(() => {
          this.evaluationStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((s) => {
        this.setAsDates(s);
        this.evaluationStore.upsert(s.id, { ...s });
      });
  }

  unload() {
    this.evaluationStore.setActive('');
    this.evaluationStore.set([]);
  }

  add(evaluation: Evaluation) {
    this.evaluationStore.setLoading(true);
    this.evaluationService
      .createEvaluation(evaluation)
      .pipe(
        tap(() => {
          this.evaluationStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((s) => {
        this.setAsDates(s);
        this.evaluationStore.add(s);
      });
  }

  updateEvaluation(evaluation: Evaluation) {
    this.evaluationStore.setLoading(true);
    this.evaluationService
      .updateEvaluation(evaluation.id, evaluation)
      .pipe(
        tap(() => {
          this.evaluationStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((n) => {
        this.updateStore(n);
      });
  }

  delete(id: string) {
    this.evaluationService
      .deleteEvaluation(id)
      .pipe(take(1))
      .subscribe((r) => {
        if (this.evaluationQuery.getActiveId.toString() === id) {
          this.evaluationStore.setActive('');
        }
        this.deleteFromStore(id);
      });
  }

  setActive(id: string) {
    this.evaluationStore.setActive(id);
  }

  setPageEvent(pageEvent: PageEvent) {
    this.evaluationStore.update({ pageEvent: pageEvent });
  }

  updateStore(evaluation: Evaluation) {
    this.setAsDates(evaluation);
    this.evaluationStore.upsert(evaluation.id, evaluation);
  }

  deleteFromStore(id: string) {
    this.evaluationStore.remove(id);
  }

  setAsDates(evaluation: Evaluation) {
    // set to a date object.
    evaluation.dateCreated = new Date(evaluation.dateCreated);
    evaluation.dateModified = new Date(evaluation.dateModified);
  }

}
