// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { RoleStore } from './role.store';
import { RoleQuery } from './role.query';
import { Injectable } from '@angular/core';
import { FormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { Router, ActivatedRoute } from '@angular/router';
import {
  Role,
  RoleService,
  ItemStatus
} from 'src/app/generated/cite.api';
import { map, take, tap } from 'rxjs/operators';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RoleDataService {
  private _requestedRoleId: string;
  private _requestedRoleId$ = this.activatedRoute.queryParamMap.pipe(
    map((params) => params.get('roleId') || '')
  );
  readonly RoleList: Observable<Role[]>;
  readonly filterControl = new FormControl();
  private filterTerm: Observable<string>;
  private sortColumn: Observable<string>;
  private sortIsAscending: Observable<boolean>;
  private _pageEvent: PageEvent = { length: 0, pageIndex: 0, pageSize: 10 };
  readonly pageEvent = new BehaviorSubject<PageEvent>(this._pageEvent);
  private pageSize: Observable<number>;
  private pageIndex: Observable<number>;

  constructor(
    private roleStore: RoleStore,
    private roleQuery: RoleQuery,
    private roleService: RoleService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this.filterTerm = activatedRoute.queryParamMap.pipe(
      map((params) => params.get('rolemask') || '')
    );
    this.filterControl.valueChanges.subscribe((term) => {
      this.router.navigate([], {
        queryParams: { rolemask: term },
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
    this.RoleList = combineLatest([
      this.roleQuery.selectAll(),
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
            ? (items as Role[])
                .sort((a: Role, b: Role) =>
                  this.sortRoles(a, b, sortColumn, sortIsAscending)
                )
                .filter(
                  (role) =>
                    ('' + role.name)
                      .toLowerCase()
                      .includes(filterTerm.toLowerCase()) ||
                    role.id
                      .toLowerCase()
                      .includes(filterTerm.toLowerCase())
                )
            : []
      )
    );
  }

  private sortRoles(
    a: Role,
    b: Role,
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
    this.roleStore.setLoading(true);
    this.roleService
      .getRolesByEvaluation(evaluationId)
      .pipe(
        tap(() => {
          this.roleStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe(
        (roles) => {
          roles.forEach(e => {
            this.setAsDates(e);
          });
          this.roleStore.set(roles);
        },
        (error) => {
          this.roleStore.set([]);
        }
      );
  }

  loadByEvaluationTeam(evaluationId: string, teamId: string) {
    this.roleStore.setLoading(true);
    this.roleService
      .getRolesByEvaluationTeam(evaluationId, teamId)
      .pipe(
        tap(() => {
          this.roleStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe(
        (roles) => {
          roles.forEach(e => {
            this.setAsDates(e);
          });
          this.roleStore.set(roles);
        },
        (error) => {
          this.roleStore.set([]);
        }
      );
  }

  loadById(id: string) {
    this.roleStore.setLoading(true);
    return this.roleService
      .getRole(id)
      .pipe(
        tap(() => {
          this.roleStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((s) => {
        this.roleStore.upsert(s.id, { ...s });
      });
  }

  unload() {
    this.roleStore.setActive('');
    this.roleStore.set([]);
  }

  add(role: Role) {
    this.roleStore.setLoading(true);
    this.roleService
      .createRole(role)
      .pipe(
        tap(() => {
          this.roleStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((s) => {
        this.setAsDates(s);
        this.roleStore.add(s);
      });
  }

  updateRole(role: Role) {
    this.roleStore.setLoading(true);
    this.roleService
      .updateRole(role.id, role)
      .pipe(
        tap(() => {
          this.roleStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((n) => {
        this.updateStore(n);
      });
  }

  addRoleUser(roleId: string, userId: string) {
    this.roleStore.setLoading(true);
    this.roleService
      .addUserToRole(roleId, userId)
      .pipe(
        tap(() => {
          this.roleStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((n) => {
        this.updateStore(n);
      });
  }

  removeRoleUser(roleId: string, userId: string) {
    this.roleStore.setLoading(true);
    this.roleService
      .removeUserFromRole(roleId, userId)
      .pipe(
        tap(() => {
          this.roleStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((n) => {
        this.updateStore(n);
      });
  }

  delete(id: string) {
    this.roleService
      .deleteRole(id)
      .pipe(take(1))
      .subscribe((r) => {
        if (this.roleQuery.getActiveId.toString() === id) {
          this.roleStore.setActive('');
        }
        this.deleteFromStore(id);
      });
  }

  setActive(id: string) {
    this.roleStore.setActive(id);
  }

  setPageEvent(pageEvent: PageEvent) {
    this.roleStore.update({ pageEvent: pageEvent });
  }

  updateStore(role: Role) {
    this.setAsDates(role);
    this.roleStore.upsert(role.id, role);
  }

  deleteFromStore(id: string) {
    this.roleStore.remove(id);
  }

  setAsDates(role: Role) {
    // set to a date object.
    role.dateCreated = new Date(role.dateCreated);
    role.dateModified = new Date(role.dateModified);
  }

}
