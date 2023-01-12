// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { MoveStore } from './move.store';
import { MoveQuery } from './move.query';
import { Injectable } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { Router, ActivatedRoute } from '@angular/router';
import {
  Move,
  MoveService,
  ItemStatus
} from 'src/app/generated/cite.api';
import { map, take, tap } from 'rxjs/operators';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MoveDataService {
  private _requestedMoveId: string;
  private _requestedMoveId$ = this.activatedRoute.queryParamMap.pipe(
    map((params) => params.get('moveId') || '')
  );
  readonly MoveList: Observable<Move[]>;
  readonly filterControl = new UntypedFormControl();
  private filterTerm: Observable<string>;
  private sortColumn: Observable<string>;
  private sortIsAscending: Observable<boolean>;
  private _pageEvent: PageEvent = { length: 0, pageIndex: 0, pageSize: 10 };
  readonly pageEvent = new BehaviorSubject<PageEvent>(this._pageEvent);
  private pageSize: Observable<number>;
  private pageIndex: Observable<number>;

  constructor(
    private moveStore: MoveStore,
    private moveQuery: MoveQuery,
    private moveService: MoveService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this.filterTerm = activatedRoute.queryParamMap.pipe(
      map((params) => params.get('movemask') || '')
    );
    this.filterControl.valueChanges.subscribe((term) => {
      this.router.navigate([], {
        queryParams: { movemask: term },
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
    this.MoveList = combineLatest([
      this.moveQuery.selectAll(),
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
            ? (items as Move[])
                .sort((a: Move, b: Move) =>
                  this.sortMoves(a, b, sortColumn, sortIsAscending)
                )
                .filter(
                  (move) =>
                    ('' + move.description)
                      .toLowerCase()
                      .includes(filterTerm.toLowerCase()) ||
                    move.id
                      .toLowerCase()
                      .includes(filterTerm.toLowerCase())
                )
            : []
      )
    );
  }

  private sortMoves(
    a: Move,
    b: Move,
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

  loadByEvaluation(evaluationId: string) {
    this.moveStore.setLoading(true);
    this.moveService
      .getByEvaluation(evaluationId)
      .pipe(
        tap(() => {
          this.moveStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe(
        (moves) => {
          moves.forEach(m => {
            this.setAsDates(m);
          });
          this.moveStore.set(moves);
        },
        (error) => {
          this.moveStore.set([]);
        }
      );
  }

  loadById(id: string) {
    this.moveStore.setLoading(true);
    return this.moveService
      .getMove(id)
      .pipe(
        tap(() => {
          this.moveStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((s) => {
        this.setAsDates(s);
        this.moveStore.upsert(s.id, { ...s });
      });
  }

  unload() {
    this.moveStore.set([]);
  }

  add(move: Move) {
    this.moveStore.setLoading(true);
    this.moveService
      .createMove(move)
      .pipe(
        tap(() => {
          this.moveStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((s) => {
        this.moveStore.add(s);
      });
  }

  updateMove(move: Move) {
    this.moveStore.setLoading(true);
    this.moveService
      .updateMove(move.id, move)
      .pipe(
        tap(() => {
          this.moveStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((n) => {
        this.updateStore(n);
      });
  }

  delete(id: string) {
    this.moveService
      .deleteMove(id)
      .pipe(take(1))
      .subscribe((r) => {
        this.deleteFromStore(id);
      });
  }

  setPageEvent(pageEvent: PageEvent) {
    this.moveStore.update({ pageEvent: pageEvent });
  }

  updateStore(move: Move) {
    this.setAsDates(move);
    this.moveStore.upsert(move.id, move);
  }

  deleteFromStore(id: string) {
    this.moveStore.remove(id);
  }

  setAsDates(move: Move) {
    // set to a date object.
    move.dateCreated = new Date(move.dateCreated);
    move.dateModified = new Date(move.dateModified);
    move.situationTime = new Date(move.situationTime);
  }

}
