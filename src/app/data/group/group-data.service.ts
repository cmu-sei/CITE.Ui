// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { GroupStore } from './group.store';
import { GroupQuery } from './group.query';
import { Injectable } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { Router, ActivatedRoute } from '@angular/router';
import {
  Group,
  GroupService
} from 'src/app/generated/cite.api';
import { map, take, tap } from 'rxjs/operators';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GroupDataService {
  readonly groupList: Observable<Group[]>;
  readonly filterControl = new UntypedFormControl();
  private filterTerm: Observable<string>;
  private sortColumn: Observable<string>;
  private sortIsAscending: Observable<boolean>;
  private _pageEvent: PageEvent = { length: 0, pageIndex: 0, pageSize: 10 };
  readonly pageEvent = new BehaviorSubject<PageEvent>(this._pageEvent);
  private pageSize: Observable<number>;
  private pageIndex: Observable<number>;

  constructor(
    private groupStore: GroupStore,
    private groupQuery: GroupQuery,
    private groupService: GroupService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this.filterTerm = activatedRoute.queryParamMap.pipe(
      map((params) => params.get('groupmask') || '')
    );
    this.filterControl.valueChanges.subscribe((term) => {
      this.router.navigate([], {
        queryParams: { groupmask: term },
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
    this.groupList = combineLatest([
      this.groupQuery.selectAll(),
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
            ? (items as Group[])
                .sort((a: Group, b: Group) =>
                  this.sortGroups(a, b, sortColumn, sortIsAscending)
                )
                .filter(
                  (group) =>
                    ('' + group.name)
                      .toLowerCase()
                      .includes(filterTerm.toLowerCase()) ||
                    group.id
                      .toLowerCase()
                      .includes(filterTerm.toLowerCase())
                )
            : []
      )
    );
  }

  private sortGroups(
    a: Group,
    b: Group,
    column: string,
    isAsc: boolean
  ) {
    switch (column) {
      case 'name':
        return (
          (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1) *
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

  load() {
    this.groupStore.setLoading(true);
    this.groupService
      .getGroups()
      .pipe(
        tap(() => {
          this.groupStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe(
        (groups) => {
          this.groupStore.set(groups);
        },
        (error) => {
          this.groupStore.set([]);
        }
      );
  }

  loadById(id: string) {
    this.groupStore.setLoading(true);
    return this.groupService
      .getGroup(id)
      .pipe(
        tap(() => {
          this.groupStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((s) => {
        this.groupStore.upsert(s.id, { ...s });
        this.setActive(id);
      });
  }

  loadMine() {
    this.groupStore.setLoading(true);
    this.groupService
      .getMyGroups()
      .pipe(
        tap(() => {
          this.groupStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe(
        (groups) => {
          this.groupStore.set(groups);
        },
        (error) => {
          this.groupStore.set([]);
        }
      );
  }

  add(group: Group) {
    this.groupStore.setLoading(true);
    this.groupService
      .createGroup(group)
      .pipe(
        tap(() => {
          this.groupStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((s) => {
        this.groupStore.add(s);
        this.setActive(s.id);
      });
  }

  updateGroup(group: Group) {
    this.groupStore.setLoading(true);
    this.groupService
      .updateGroup(group.id, group)
      .pipe(
        tap(() => {
          this.groupStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((n) => {
        this.updateStore(n);
      });
  }

  delete(id: string) {
    this.groupService
      .deleteGroup(id)
      .pipe(take(1))
      .subscribe((r) => {
        this.deleteFromStore(id);
        this.setActive('');
      });
  }

  setActive(id: string) {
    this.groupStore.setActive(id);
  }

  setPageEvent(pageEvent: PageEvent) {
    this.groupStore.update({ pageEvent: pageEvent });
  }

  updateStore(group: Group) {
    this.groupStore.upsert(group.id, group);
  }

  deleteFromStore(id: string) {
    this.groupStore.remove(id);
  }
}
