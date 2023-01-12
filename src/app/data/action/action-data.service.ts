// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { ActionStore } from './action.store';
import { ActionQuery } from './action.query';
import { Injectable } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { Router, ActivatedRoute } from '@angular/router';
import {
  Action,
  ActionService,
  ItemStatus
} from 'src/app/generated/cite.api';
import { map, take, tap } from 'rxjs/operators';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ActionDataService {
  private _requestedActionId: string;
  private _requestedActionId$ = this.activatedRoute.queryParamMap.pipe(
    map((params) => params.get('actionId') || '')
  );
  readonly ActionList: Observable<Action[]>;
  readonly filterControl = new UntypedFormControl();
  private filterTerm: Observable<string>;
  private sortColumn: Observable<string>;
  private sortIsAscending: Observable<boolean>;
  private _pageEvent: PageEvent = { length: 0, pageIndex: 0, pageSize: 10 };
  readonly pageEvent = new BehaviorSubject<PageEvent>(this._pageEvent);
  private pageSize: Observable<number>;
  private pageIndex: Observable<number>;

  constructor(
    private actionStore: ActionStore,
    private actionQuery: ActionQuery,
    private actionService: ActionService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this.filterTerm = activatedRoute.queryParamMap.pipe(
      map((params) => params.get('actionmask') || '')
    );
    this.filterControl.valueChanges.subscribe((term) => {
      this.router.navigate([], {
        queryParams: { actionmask: term },
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
    this.ActionList = combineLatest([
      this.actionQuery.selectAll(),
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
            ? (items as Action[])
                .sort((a: Action, b: Action) =>
                  this.sortActions(a, b, sortColumn, sortIsAscending)
                )
                .filter(
                  (action) =>
                    ('' + action.description)
                      .toLowerCase()
                      .includes(filterTerm.toLowerCase()) ||
                    action.id
                      .toLowerCase()
                      .includes(filterTerm.toLowerCase())
                )
            : []
      )
    );
  }

  private sortActions(
    a: Action,
    b: Action,
    column: string,
    isAsc: boolean
  ) {
    switch (column) {
      case 'description':
        return (
          (a.description.toLowerCase() < b.description.toLowerCase() ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      case 'dateCreated':
        return (
          (a.dateCreated.valueOf() < b.dateCreated.valueOf() ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      default:
        return 0;
    }
  }

  loadByEvaluationTeam(evaluationId: string, teamId: string) {
    this.actionStore.setLoading(true);
    this.actionService
      .getActionsByEvaluationTeam(evaluationId, teamId)
      .pipe(
        tap(() => {
          this.actionStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe(
        (actions) => {
          actions.forEach(e => {
            this.setAsDates(e);
          });
          this.actionStore.set(actions);
        },
        (error) => {
          this.actionStore.set([]);
        }
      );
  }

  loadByEvaluationMove(evaluationId: string, moveNumber: number) {
    this.actionStore.setLoading(true);
    this.actionService
      .getActionsByEvaluationMove(evaluationId, moveNumber)
      .pipe(
        tap(() => {
          this.actionStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe(
        (actions) => {
          actions.forEach(e => {
            this.setAsDates(e);
          });
          this.actionStore.set(actions);
        },
        (error) => {
          this.actionStore.set([]);
        }
      );
  }

  loadByEvaluationMoveTeam(evaluationId: string, moveNumber: number, teamId: string) {
    this.actionStore.setLoading(true);
    this.actionService
      .getActionsByEvaluationMoveTeam(evaluationId, moveNumber, teamId)
      .pipe(
        tap(() => {
          this.actionStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe(
        (actions) => {
          actions.forEach(e => {
            this.setAsDates(e);
          });
          this.actionStore.set(actions);
        },
        (error) => {
          this.actionStore.set([]);
        }
      );
  }

  loadById(id: string) {
    this.actionStore.setLoading(true);
    return this.actionService
      .getAction(id)
      .pipe(
        tap(() => {
          this.actionStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((s) => {
        this.actionStore.upsert(s.id, { ...s });
      });
  }

  unload() {
    this.actionStore.setActive('');
    this.actionStore.set([]);
  }

  add(action: Action) {
    this.actionStore.setLoading(true);
    this.actionService
      .createAction(action)
      .pipe(
        tap(() => {
          this.actionStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((s) => {
        this.setAsDates(s);
        this.actionStore.add(s);
      });
  }

  updateAction(action: Action) {
    this.actionStore.setLoading(true);
    this.actionService
      .updateAction(action.id, action)
      .pipe(
        tap(() => {
          this.actionStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((n) => {
        this.updateStore(n);
      });
  }

  checkAction(actionId: string) {
    this.actionStore.setLoading(true);
    this.actionService
      .checkAction(actionId)
      .pipe(
        tap(() => {
          this.actionStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((n) => {
        this.updateStore(n);
      });
  }

  uncheckAction(actionId: string) {
    this.actionStore.setLoading(true);
    this.actionService
      .uncheckAction(actionId)
      .pipe(
        tap(() => {
          this.actionStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((n) => {
        this.updateStore(n);
      });
  }

  delete(id: string) {
    this.actionService
      .deleteAction(id)
      .pipe(take(1))
      .subscribe((r) => {
        if (this.actionQuery.getActiveId.toString() === id) {
          this.actionStore.setActive('');
        }
        this.deleteFromStore(id);
      });
  }

  setActive(id: string) {
    this.actionStore.setActive(id);
  }

  setPageEvent(pageEvent: PageEvent) {
    this.actionStore.update({ pageEvent: pageEvent });
  }

  updateStore(action: Action) {
    this.setAsDates(action);
    this.actionStore.upsert(action.id, action);
  }

  deleteFromStore(id: string) {
    this.actionStore.remove(id);
  }

  setAsDates(action: Action) {
    // set to a date object.
    action.dateCreated = new Date(action.dateCreated);
    action.dateModified = new Date(action.dateModified);
  }

}
