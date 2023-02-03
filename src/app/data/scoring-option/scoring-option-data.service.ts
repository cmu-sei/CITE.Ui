// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { ScoringOptionStore } from './scoring-option.store';
import { ScoringOptionQuery } from './scoring-option.query';
import { Injectable } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { LegacyPageEvent as PageEvent } from '@angular/material/legacy-paginator';
import { Router, ActivatedRoute } from '@angular/router';
import {
  ScoringOption,
  ScoringOptionService
} from 'src/app/generated/cite.api';
import { map, take, tap } from 'rxjs/operators';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ScoringOptionDataService {
  // private _requestedScoringOptionId: string;
  // private _requestedScoringOptionId$ = this.activatedRoute.queryParamMap.pipe(
  //   map((params) => params.get('scoringOptionId') || '')
  // );
  readonly scoringOptionList: Observable<ScoringOption[]>;
  readonly selected: Observable<ScoringOption>;
  readonly filterControl = new UntypedFormControl();
  private filterTerm: Observable<string>;
  private sortColumn: Observable<string>;
  private sortIsAscending: Observable<boolean>;
  private _pageEvent: PageEvent = { length: 0, pageIndex: 0, pageSize: 10 };
  readonly pageEvent = new BehaviorSubject<PageEvent>(this._pageEvent);
  private pageSize: Observable<number>;
  private pageIndex: Observable<number>;

  constructor(
    private scoringOptionStore: ScoringOptionStore,
    private scoringOptionQuery: ScoringOptionQuery,
    private scoringOptionService: ScoringOptionService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this.filterTerm = activatedRoute.queryParamMap.pipe(
      map((params) => params.get('scoringOptionmask') || '')
    );
    this.filterControl.valueChanges.subscribe((term) => {
      this.router.navigate([], {
        queryParams: { scoringOptionmask: term },
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
    this.scoringOptionList = combineLatest([
      this.scoringOptionQuery.selectAll(),
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
            ? (items as ScoringOption[])
              .sort((a: ScoringOption, b: ScoringOption) =>
                this.sortScoringOptions(a, b, sortColumn, sortIsAscending)
              )
              .filter(
                (scoringOption) =>
                  ('' + scoringOption.description)
                    .toLowerCase()
                    .includes(filterTerm.toLowerCase()) ||
                    scoringOption.id
                      .toLowerCase()
                      .includes(filterTerm.toLowerCase())
              )
            : []
      )
    );
  }

  private sortScoringOptions(
    a: ScoringOption,
    b: ScoringOption,
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

  loadByScoringCategory(scoringCategoryId: string) {
    this.scoringOptionStore.setLoading(true);
    this.scoringOptionService
      .getScoringOptionsByScoringCategoryId(scoringCategoryId)
      .pipe(
        tap(() => {
          this.scoringOptionStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe(
        (scoringOptions) => {
          this.scoringOptionStore.set(scoringOptions);
        },
        (error) => {
          this.scoringOptionStore.set([]);
        }
      );
  }

  loadById(id: string) {
    this.scoringOptionStore.setLoading(true);
    return this.scoringOptionService
      .getScoringOption(id)
      .pipe(
        tap(() => {
          this.scoringOptionStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((s) => {
        this.scoringOptionStore.upsert(s.id, { ...s });
        this.setActive(id);
      });
  }

  unload() {
    this.scoringOptionStore.set([]);
    this.setActive('');
  }

  add(scoringOption: ScoringOption) {
    this.scoringOptionStore.setLoading(true);
    this.scoringOptionService
      .createScoringOption(scoringOption)
      .pipe(
        tap(() => {
          this.scoringOptionStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((s) => {
        this.scoringOptionStore.add(s);
        this.setActive(s.id);
      });
  }

  updateScoringOption(scoringOption: ScoringOption) {
    this.scoringOptionStore.setLoading(true);
    this.scoringOptionService
      .updateScoringOption(scoringOption.id, scoringOption)
      .pipe(
        tap(() => {
          this.scoringOptionStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((n) => {
        this.updateStore(n);
      });
  }

  delete(id: string) {
    this.scoringOptionService
      .deleteScoringOption(id)
      .pipe(take(1))
      .subscribe((r) => {
        this.deleteFromStore(id);
        this.setActive('');
      });
  }

  setActive(id: string) {
    this.scoringOptionStore.setActive(id);
    // this.router.navigate([], {
    //   queryParams: { scoringOptionId: id },
    //   queryParamsHandling: 'merge',
    // });
  }

  setPageEvent(pageEvent: PageEvent) {
    this.scoringOptionStore.update({ pageEvent: pageEvent });
  }

  updateStore(scoringOption: ScoringOption) {
    this.scoringOptionStore.upsert(scoringOption.id, scoringOption);
  }

  deleteFromStore(id: string) {
    this.scoringOptionStore.remove(id);
  }
}
