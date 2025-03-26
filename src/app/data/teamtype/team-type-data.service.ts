// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { TeamTypeStore } from './team-type.store';
import { TeamTypeQuery } from './team-type.query';
import { Injectable } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { Router, ActivatedRoute } from '@angular/router';
import {
  TeamType,
  TeamTypeService
} from 'src/app/generated/cite.api';
import { map, take, tap } from 'rxjs/operators';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TeamTypeDataService {
  // private _requestedTeamTypeId: string;
  // private _requestedTeamTypeId$ = this.activatedRoute.queryParamMap.pipe(
  //   map((params) => params.get('teamTypeId') || '')
  // );
  readonly teamTypeList: Observable<TeamType[]>;
  readonly selected: Observable<TeamType>;
  readonly filterControl = new UntypedFormControl();
  private filterTerm: Observable<string>;
  private sortColumn: Observable<string>;
  private sortIsAscending: Observable<boolean>;
  private _pageEvent: PageEvent = { length: 0, pageIndex: 0, pageSize: 10 };
  readonly pageEvent = new BehaviorSubject<PageEvent>(this._pageEvent);
  private pageSize: Observable<number>;
  private pageIndex: Observable<number>;

  constructor(
    private teamTypeStore: TeamTypeStore,
    private teamTypeQuery: TeamTypeQuery,
    private teamTypeService: TeamTypeService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this.filterTerm = activatedRoute.queryParamMap.pipe(
      map((params) => params.get('modelterm') || '')
    );
    this.filterControl.valueChanges.subscribe((term) => {
      this.router.navigate([], {
        queryParams: { modelterm: term },
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
    this.teamTypeList = combineLatest([
      this.teamTypeQuery.selectAll(),
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
            ? (items as TeamType[])
              .sort((a: TeamType, b: TeamType) =>
                this.sortTeamTypes(a, b, sortColumn, sortIsAscending)
              )
              .filter(
                (teamType) =>
                  ('' + teamType.name)
                    .toLowerCase()
                    .includes(filterTerm.toLowerCase())
              )
            : []
      )
    );
  }

  private sortTeamTypes(
    a: TeamType,
    b: TeamType,
    column: string,
    isAsc: boolean
  ) {
    return (
      (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1) *
      (isAsc ? 1 : -1)
    );
  }

  load() {
    this.teamTypeStore.setLoading(true);
    this.teamTypeService
      .getTeamTypes()
      .pipe(
        tap(() => {
          this.teamTypeStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe(
        (teamTypes) => {
          this.teamTypeStore.set(teamTypes);
        },
        (error) => {
          this.teamTypeStore.set([]);
        }
      );
  }

  loadById(id: string) {
    this.teamTypeStore.setLoading(true);
    return this.teamTypeService
      .getTeamType(id)
      .pipe(
        tap(() => {
          this.teamTypeStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((s) => {
        this.teamTypeStore.upsert(s.id, { ...s });
        this.setActive(id);
      });
  }

  unload() {
    this.teamTypeStore.set([]);
    this.setActive('');
  }

  add(teamType: TeamType) {
    this.teamTypeStore.setLoading(true);
    this.teamTypeService
      .createTeamType(teamType)
      .pipe(
        tap(() => {
          this.teamTypeStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((s) => {
        this.teamTypeStore.add(s);
        this.setActive(s.id);
      });
  }

  updateTeamType(teamType: TeamType) {
    this.teamTypeStore.setLoading(true);
    this.teamTypeService
      .updateTeamType(teamType.id, teamType)
      .pipe(
        tap(() => {
          this.teamTypeStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((n) => {
        this.updateStore(n);
      });
  }

  delete(id: string) {
    this.teamTypeService
      .deleteTeamType(id)
      .pipe(take(1))
      .subscribe((r) => {
        this.deleteFromStore(id);
        this.setActive('');
      });
  }

  setActive(id: string) {
    this.teamTypeStore.setActive(id);
    // this.router.navigate([], {
    //   queryParams: { teamTypeId: id },
    //   queryParamsHandling: 'merge',
    // });
  }

  setPageEvent(pageEvent: PageEvent) {
    this.teamTypeStore.update({ pageEvent: pageEvent });
  }

  updateStore(teamType: TeamType) {
    this.teamTypeStore.upsert(teamType.id, teamType);
  }

  deleteFromStore(id: string) {
    this.teamTypeStore.remove(id);
  }
}
