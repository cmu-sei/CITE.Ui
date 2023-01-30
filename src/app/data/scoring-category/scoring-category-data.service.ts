// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { ScoringCategoryStore } from './scoring-category.store';
import { ScoringCategoryQuery } from './scoring-category.query';
import { Injectable } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { LegacyPageEvent as PageEvent } from '@angular/material/legacy-paginator';
import { Router, ActivatedRoute } from '@angular/router';
import {
  ScoringCategory,
  ScoringCategoryService
} from 'src/app/generated/cite.api';
import { map, take, tap } from 'rxjs/operators';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ScoringCategoryDataService {
  // private _requestedScoringCategoryId: string;
  // private _requestedScoringCategoryId$ = this.activatedRoute.queryParamMap.pipe(
  //   map((params) => params.get('scoringCategoryId') || '')
  // );
  readonly scoringCategoryList: Observable<ScoringCategory[]>;
  readonly selected: Observable<ScoringCategory>;
  readonly filterControl = new UntypedFormControl();
  private filterTerm: Observable<string>;
  private sortColumn: Observable<string>;
  private sortIsAscending: Observable<boolean>;
  private _pageEvent: PageEvent = { length: 0, pageIndex: 0, pageSize: 10 };
  readonly pageEvent = new BehaviorSubject<PageEvent>(this._pageEvent);
  private pageSize: Observable<number>;
  private pageIndex: Observable<number>;

  constructor(
    private scoringCategoryStore: ScoringCategoryStore,
    private scoringCategoryQuery: ScoringCategoryQuery,
    private scoringCategoryService: ScoringCategoryService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this.filterTerm = activatedRoute.queryParamMap.pipe(
      map((params) => params.get('scoringCategorymask') || '')
    );
    this.filterControl.valueChanges.subscribe((term) => {
      this.router.navigate([], {
        queryParams: { scoringCategorymask: term },
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
    this.scoringCategoryList = combineLatest([
      this.scoringCategoryQuery.selectAll(),
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
            ? (items as ScoringCategory[])
                .sort((a: ScoringCategory, b: ScoringCategory) =>
                  this.sortScoringCategories(a, b, sortColumn, sortIsAscending)
                )
                .filter(
                  (scoringCategory) =>
                    ('' + scoringCategory.description)
                      .toLowerCase()
                      .includes(filterTerm.toLowerCase()) ||
                    scoringCategory.id
                      .toLowerCase()
                      .includes(filterTerm.toLowerCase())
                )
            : []
      )
    );
  }

  private sortScoringCategories(
    a: ScoringCategory,
    b: ScoringCategory,
    column: string,
    isAsc: boolean
  ) {
    switch (column) {
      case 'description':
        return (
          (a.description.toLowerCase() < b.description.toLowerCase() ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      case 'displayOrder':
        return (
          (a.displayOrder < b.displayOrder ? -1 : 1) *
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

  loadByScoringModel(scoringModelId: string) {
    this.scoringCategoryStore.setLoading(true);
    this.scoringCategoryService
      .getScoringCategoriesByScoringModelId(scoringModelId)
      .pipe(
        tap(() => {
          this.scoringCategoryStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe(
        (scoringCategories) => {
          this.scoringCategoryStore.set(scoringCategories);
        },
        (error) => {
          this.scoringCategoryStore.set([]);
        }
      );
  }

  loadById(id: string) {
    this.scoringCategoryStore.setLoading(true);
    return this.scoringCategoryService
      .getScoringCategory(id)
      .pipe(
        tap(() => {
          this.scoringCategoryStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((s) => {
        this.scoringCategoryStore.upsert(s.id, { ...s });
        this.setActive(id);
      });
  }

  unload() {
    this.scoringCategoryStore.set([]);
    this.setActive('');
  }

  add(scoringCategory: ScoringCategory) {
    this.scoringCategoryStore.setLoading(true);
    this.scoringCategoryService
      .createScoringCategory(scoringCategory)
      .pipe(
        tap(() => {
          this.scoringCategoryStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((s) => {
        this.scoringCategoryStore.add(s);
        this.setActive(s.id);
      });
  }

  updateScoringCategory(scoringCategory: ScoringCategory) {
    this.scoringCategoryStore.setLoading(true);
    this.scoringCategoryService
      .updateScoringCategory(scoringCategory.id, scoringCategory)
      .pipe(
        tap(() => {
          this.scoringCategoryStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((n) => {
        this.updateStore(n);
      });
  }

  delete(id: string) {
    this.scoringCategoryService
      .deleteScoringCategory(id)
      .pipe(take(1))
      .subscribe((r) => {
        this.deleteFromStore(id);
        this.setActive('');
      });
  }

  setActive(id: string) {
    this.scoringCategoryStore.setActive(id);
    // this.router.navigate([], {
    //   queryParams: { scoringCategoryId: id },
    //   queryParamsHandling: 'merge',
    // });
  }

  setPageEvent(pageEvent: PageEvent) {
    this.scoringCategoryStore.update({ pageEvent: pageEvent });
  }

  updateStore(scoringCategory: ScoringCategory) {
    this.scoringCategoryStore.upsert(scoringCategory.id, scoringCategory);
  }

  deleteFromStore(id: string) {
    this.scoringCategoryStore.remove(id);
  }
}
