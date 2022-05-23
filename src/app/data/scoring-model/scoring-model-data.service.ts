// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { ScoringModelStore } from './scoring-model.store';
import { ScoringModelQuery } from './scoring-model.query';
import { Injectable } from '@angular/core';
import { FormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { Router, ActivatedRoute } from '@angular/router';
import {
  ScoringModel,
  ScoringModelService
} from 'src/app/generated/cite.api';
import { map, take, tap } from 'rxjs/operators';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ScoringModelDataService {
  // private _requestedScoringModelId: string;
  // private _requestedScoringModelId$ = this.activatedRoute.queryParamMap.pipe(
  //   map((params) => params.get('scoringModelId') || '')
  // );
  readonly scoringModelList: Observable<ScoringModel[]>;
  readonly selected: Observable<ScoringModel>;
  readonly filterControl = new FormControl();
  private filterTerm: Observable<string>;
  private sortColumn: Observable<string>;
  private sortIsAscending: Observable<boolean>;
  private _pageEvent: PageEvent = { length: 0, pageIndex: 0, pageSize: 10 };
  readonly pageEvent = new BehaviorSubject<PageEvent>(this._pageEvent);
  private pageSize: Observable<number>;
  private pageIndex: Observable<number>;

  constructor(
    private scoringModelStore: ScoringModelStore,
    private scoringModelQuery: ScoringModelQuery,
    private scoringModelService: ScoringModelService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this.filterTerm = activatedRoute.queryParamMap.pipe(
      map((params) => params.get('filter') || '')
    );
    this.filterControl.valueChanges.subscribe((term) => {
      this.router.navigate([], {
        queryParams: { scoringModelmask: term },
        queryParamsHandling: 'merge',
      });
    });
    this.sortColumn = activatedRoute.queryParamMap.pipe(
      map((params) => params.get('sorton') || 'description')
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
    this.scoringModelList = combineLatest([
      this.scoringModelQuery.selectAll(),
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
            ? (items as ScoringModel[])
                .sort((a: ScoringModel, b: ScoringModel) =>
                  this.sortScoringModels(a, b, sortColumn, sortIsAscending)
                )
                .filter(
                  (scoringModel) =>
                    ('' + scoringModel.description)
                      .toLowerCase()
                      .includes(filterTerm.toLowerCase()) ||
                    scoringModel.id
                      .toLowerCase()
                      .includes(filterTerm.toLowerCase()) ||
                    scoringModel.status
                      .toLowerCase()
                      .includes(filterTerm.toLowerCase())
                )
            : []
      )
    );
    // this.selected = combineLatest([
    //   this.scoringModelList,
    //   this._requestedScoringModelId$,
    // ]).pipe(
    //   map(([scoringModelList, requestedScoringModelId]) => {
    //     let selectedScoringModel: ScoringModel = null;
    //     if (
    //       scoringModelList &&
    //       scoringModelList.length > 0 &&
    //       requestedScoringModelId
    //     ) {
    //       selectedScoringModel = scoringModelList.find(
    //         (scoringModel) =>
    //           scoringModel.id === requestedScoringModelId
    //       );
    //       if (
    //         selectedScoringModel &&
    //         selectedScoringModel.id !== this._requestedScoringModelId
    //       ) {
    //         this.scoringModelStore.setActive(requestedScoringModelId);
    //         this._requestedScoringModelId = requestedScoringModelId;
    //       }
    //     } else {
    //       this._requestedScoringModelId = '';
    //       this.scoringModelStore.setActive('');
    //       this.scoringModelStore.update({ scoringModelList: [] });
    //     }
    //     return selectedScoringModel;
    //   })
    // );
  }

  private sortScoringModels(
    a: ScoringModel,
    b: ScoringModel,
    column: string,
    isAsc: boolean
  ) {
    switch (column) {
      case 'description':
        return (
          (a.description.toLowerCase() < b.description.toLowerCase() ? -1 : 1) *
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
    this.scoringModelStore.setLoading(true);
    this.scoringModelService
      .getScoringModels()
      .pipe(
        tap(() => {
          this.scoringModelStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe(
        (scoringModels) => {
          this.scoringModelStore.set(scoringModels);
        },
        (error) => {
          this.scoringModelStore.set([]);
        }
      );
  }

  loadById(id: string) {
    this.scoringModelStore.setLoading(true);
    return this.scoringModelService
      .getScoringModel(id)
      .pipe(
        tap(() => {
          this.scoringModelStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((s) => {
        this.scoringModelStore.upsert(s.id, { ...s });
        this.setActive(id);
      });
  }

  unload() {
    this.scoringModelStore.set([]);
    this.setActive('');
  }

  add(scoringModel: ScoringModel) {
    this.scoringModelStore.setLoading(true);
    this.scoringModelService
      .createScoringModel(scoringModel)
      .pipe(
        tap(() => {
          this.scoringModelStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((s) => {
        this.scoringModelStore.add(s);
        this.setActive(s.id);
      });
  }

  updateScoringModel(scoringModel: ScoringModel) {
    this.scoringModelStore.setLoading(true);
    this.scoringModelService
      .updateScoringModel(scoringModel.id, scoringModel)
      .pipe(
        tap(() => {
          this.scoringModelStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((n) => {
        this.updateStore(n);
      });
  }

  delete(id: string) {
    this.scoringModelService
      .deleteScoringModel(id)
      .pipe(take(1))
      .subscribe((r) => {
        this.deleteFromStore(id);
        this.setActive('');
      });
  }

  setActive(id: string) {
    this.scoringModelStore.setActive(id);
    // this.router.navigate([], {
    //   queryParams: { scoringModelId: id },
    //   queryParamsHandling: 'merge',
    // });
  }

  setPageEvent(pageEvent: PageEvent) {
    this.scoringModelStore.update({ pageEvent: pageEvent });
  }

  updateStore(scoringModel: ScoringModel) {
    this.scoringModelStore.upsert(scoringModel.id, scoringModel);
  }

  deleteFromStore(id: string) {
    this.scoringModelStore.remove(id);
  }
}
