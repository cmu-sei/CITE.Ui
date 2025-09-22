// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { DutyStore } from './duty.store';
import { DutyQuery } from './duty.query';
import { Injectable } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { Router, ActivatedRoute } from '@angular/router';
import {
  Duty,
  DutyService,
} from 'src/app/generated/cite.api';
import { map, take, tap } from 'rxjs/operators';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DutyDataService {
  private _requestedDutyId: string;
  private _requestedDutyId$ = this.activatedRoute.queryParamMap.pipe(
    map((params) => params.get('dutyId') || '')
  );
  readonly DutyList: Observable<Duty[]>;
  readonly filterControl = new UntypedFormControl();
  private filterTerm: Observable<string>;
  private sortColumn: Observable<string>;
  private sortIsAscending: Observable<boolean>;
  private _pageEvent: PageEvent = { length: 0, pageIndex: 0, pageSize: 10 };
  readonly pageEvent = new BehaviorSubject<PageEvent>(this._pageEvent);
  private pageSize: Observable<number>;
  private pageIndex: Observable<number>;

  constructor(
    private dutyStore: DutyStore,
    private dutyQuery: DutyQuery,
    private dutyService: DutyService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this.filterTerm = activatedRoute.queryParamMap.pipe(
      map((params) => params.get('dutymask') || '')
    );
    this.filterControl.valueChanges.subscribe((term) => {
      this.router.navigate([], {
        queryParams: { dutymask: term },
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
    this.DutyList = combineLatest([
      this.dutyQuery.selectAll(),
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
            ? (items as Duty[])
              .sort((a: Duty, b: Duty) =>
                this.sortDuties(a, b, sortColumn, sortIsAscending)
              )
              .filter(
                (duty) =>
                  ('' + duty.name)
                    .toLowerCase()
                    .includes(filterTerm.toLowerCase()) ||
                    duty.id
                      .toLowerCase()
                      .includes(filterTerm.toLowerCase())
              )
            : []
      )
    );
  }

  private sortDuties(
    a: Duty,
    b: Duty,
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

  loadByEvaluation(evaluationId: string) {
    this.dutyStore.setLoading(true);
    this.dutyService
      .getDutiesByEvaluation(evaluationId)
      .pipe(
        tap(() => {
          this.dutyStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe(
        (duties) => {
          duties.forEach(e => {
            this.setAsDates(e);
          });
          this.dutyStore.set(duties);
        },
        (error) => {
          this.dutyStore.set([]);
        }
      );
  }

  loadByEvaluationTeam(evaluationId: string, teamId: string) {
    this.dutyStore.setLoading(true);
    this.dutyService
      .getDutiesByEvaluationTeam(evaluationId, teamId)
      .pipe(
        tap(() => {
          this.dutyStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe(
        (duties) => {
          duties.forEach(e => {
            this.setAsDates(e);
          });
          this.dutyStore.set(duties);
        },
        (error) => {
          this.dutyStore.set([]);
        }
      );
  }

  loadById(id: string) {
    this.dutyStore.setLoading(true);
    return this.dutyService
      .getDuty(id)
      .pipe(
        tap(() => {
          this.dutyStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((s) => {
        this.dutyStore.upsert(s.id, { ...s });
      });
  }

  unload() {
    this.dutyStore.setActive('');
    this.dutyStore.set([]);
  }

  add(duty: Duty) {
    this.dutyStore.setLoading(true);
    this.dutyService
      .createDuty(duty)
      .pipe(
        tap(() => {
          this.dutyStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((s) => {
        this.setAsDates(s);
        this.dutyStore.add(s);
      });
  }

  updateDuty(duty: Duty) {
    this.dutyStore.setLoading(true);
    this.dutyService
      .updateDuty(duty.id, duty)
      .pipe(
        tap(() => {
          this.dutyStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((n) => {
        this.updateStore(n);
      });
  }

  addDutyUser(dutyId: string, userId: string) {
    this.dutyStore.setLoading(true);
    this.dutyService
      .addUserToDuty(dutyId, userId)
      .pipe(
        tap(() => {
          this.dutyStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((n) => {
        this.updateStore(n);
      });
  }

  removeDutyUser(dutyId: string, userId: string) {
    this.dutyStore.setLoading(true);
    this.dutyService
      .removeUserFromDuty(dutyId, userId)
      .pipe(
        tap(() => {
          this.dutyStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((n) => {
        this.updateStore(n);
      });
  }

  delete(id: string) {
    this.dutyService
      .deleteDuty(id)
      .pipe(take(1))
      .subscribe((r) => {
        if (this.dutyQuery.getActiveId.toString() === id) {
          this.dutyStore.setActive('');
        }
        this.deleteFromStore(id);
      });
  }

  setActive(id: string) {
    this.dutyStore.setActive(id);
  }

  setPageEvent(pageEvent: PageEvent) {
    this.dutyStore.update({ pageEvent: pageEvent });
  }

  updateStore(duty: Duty) {
    this.setAsDates(duty);
    this.dutyStore.upsert(duty.id, duty);
  }

  deleteFromStore(id: string) {
    this.dutyStore.remove(id);
  }

  setAsDates(duty: Duty) {
    // set to a date object.
    duty.dateCreated = new Date(duty.dateCreated);
    duty.dateModified = new Date(duty.dateModified);
  }

}
