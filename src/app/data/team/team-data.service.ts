// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { TeamStore } from './team.store';
import { TeamQuery } from './team.query';
import { Injectable } from '@angular/core';
import { FormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { Router, ActivatedRoute } from '@angular/router';
import {
  Team,
  TeamService,
  TeamType,
  TeamTypeService
} from 'src/app/generated/cite.api';
import { map, take, tap } from 'rxjs/operators';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TeamDataService {
  // private _requestedTeamId: string;
  // private _requestedTeamId$ = this.activatedRoute.queryParamMap.pipe(
  //   map((params) => params.get('teamId') || '')
  // );
  readonly teamList: Observable<Team[]>;
  readonly teamTypes = new BehaviorSubject<TeamType[]>([]);
  // readonly selected: Observable<Team>;
  readonly filterControl = new FormControl();
  private filterTerm: Observable<string>;
  private sortColumn: Observable<string>;
  private sortIsAscending: Observable<boolean>;
  private _pageEvent: PageEvent = { length: 0, pageIndex: 0, pageSize: 10 };
  readonly pageEvent = new BehaviorSubject<PageEvent>(this._pageEvent);
  private pageSize: Observable<number>;
  private pageIndex: Observable<number>;

  constructor(
    private teamStore: TeamStore,
    private teamQuery: TeamQuery,
    private teamService: TeamService,
    private teamTypeService: TeamTypeService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this.filterTerm = activatedRoute.queryParamMap.pipe(
      map((params) => params.get('filter') || '')
    );
    this.filterControl.valueChanges.subscribe((term) => {
      this.router.navigate([], {
        queryParams: { filter: term },
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
    this.teamList = combineLatest([
      this.teamQuery.selectAll(),
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
            ? (items as Team[])
                .sort((a: Team, b: Team) =>
                  this.sortTeams(a, b, sortColumn, sortIsAscending)
                )
                .filter(
                  (team) =>
                    ('' + team.name)
                      .toLowerCase()
                      .includes(filterTerm.toLowerCase()) ||
                    ('' + team.shortName)
                      .toLowerCase()
                      .includes(filterTerm.toLowerCase()) ||
                    ('' + team.teamType.name)
                      .toLowerCase()
                      .includes(filterTerm.toLowerCase()) ||
                    team.id
                      .toLowerCase()
                      .includes(filterTerm.toLowerCase())
                )
            : []
      )
    );
    // this.selected = combineLatest([
    //   this.teamList,
    //   this._requestedTeamId$,
    // ]).pipe(
    //   map(([teamList, requestedTeamId]) => {
    //     let selectedTeam: Team = null;
    //     if (teamList && teamList.length > 0) {
    //       if (requestedTeamId) {
    //         selectedTeam = teamList.find((team) => team.id === requestedTeamId);
    //         if (selectedTeam && selectedTeam.id !== this._requestedTeamId) {
    //           this.teamStore.setActive(requestedTeamId);
    //           this._requestedTeamId = requestedTeamId;
    //         }
    //       } else {
    //         selectedTeam = teamList[0];
    //         this.setActive(selectedTeam.id);
    //       }
    //     } else {
    //       this._requestedTeamId = '';
    //       this.teamStore.setActive('');
    //       this.teamStore.update({ teamList: [] });
    //     }
    //     return selectedTeam;
    //   })
    // );
  }

  private sortTeams(
    a: Team,
    b: Team,
    column: string,
    isAsc: boolean
  ) {
    switch (column) {
      case 'name':
        return (
          (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      case 'shortName':
        return (
          (a.shortName.toLowerCase() < b.shortName.toLowerCase() ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      case 'teamTypeId':
        return (
          (a.teamType?.name.toLowerCase() < b.teamType?.name.toLowerCase() ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      default:
        return 0;
    }
  }

  load() {
    this.teamStore.setLoading(true);
    this.teamService
      .getTeams()
      .pipe(
        tap(() => {
          this.teamStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe(
        (teams) => {
          this.teamStore.set(teams);
        },
        (error) => {
          this.teamStore.set([]);
        }
      );
  }

  loadById(id: string) {
    this.teamStore.setLoading(true);
    return this.teamService
      .getTeam(id)
      .pipe(
        tap(() => {
          this.teamStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((s) => {
        this.teamStore.upsert(s.id, { ...s });
        this.setActive(id);
      });
  }

  loadByUserId(userId: string) {
    this.teamStore.setLoading(true);
    this.teamService
      .getTeamsByUser(userId)
      .pipe(
        tap(() => {
          this.teamStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe(
        (teams) => {
          this.teamStore.set(teams);
        },
        (error) => {
          this.teamStore.set([]);
        }
      );
  }

  loadMine() {
    this.teamStore.setLoading(true);
    this.teamService
      .getMyTeams()
      .pipe(
        tap(() => {
          this.teamStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe(
        (teams) => {
          this.teamStore.set(teams);
        },
        (error) => {
          this.teamStore.set([]);
        }
      );
  }

  loadByEvaluationId(evaluationId: string) {
    this.teamStore.setLoading(true);
    this.teamService
      .getEvaluationTeams(evaluationId)
      .pipe(
        tap(() => {
          this.teamStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe(
        (teams) => {
          this.teamStore.set(teams);
        },
        (error) => {
          this.teamStore.set([]);
        }
      );
  }

  loadTeamTypes() {
    this.teamTypeService
      .getTeamTypes()
      .pipe(
        take(1)
      )
      .subscribe(
        (teamTypes) => {
          this.teamTypes.next(teamTypes);
        }
      );
  }

  unload() {
    this.teamStore.set([]);
    this.setActive('');
  }

  add(team: Team) {
    this.teamStore.setLoading(true);
    this.teamService
      .createTeam(team)
      .pipe(
        tap(() => {
          this.teamStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((s) => {
        this.teamStore.add(s);
        this.setActive(s.id);
      });
  }

  updateTeam(team: Team) {
    this.teamStore.setLoading(true);
    this.teamService
      .updateTeam(team.id, team)
      .pipe(
        tap(() => {
          this.teamStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((n) => {
        this.updateStore(n);
      });
  }

  delete(id: string) {
    this.teamService
      .deleteTeam(id)
      .pipe(take(1))
      .subscribe((r) => {
        this.deleteFromStore(id);
        this.setActive('');
      });
  }

  setActive(id: string) {
    this.teamStore.setActive(id);
    // this.router.navigate([], {
    //   queryParams: { teamId: id },
    //   queryParamsHandling: 'merge',
    // });
  }

  setPageEvent(pageEvent: PageEvent) {
    this.teamStore.update({ pageEvent: pageEvent });
  }

  updateStore(team: Team) {
    this.teamStore.upsert(team.id, team);
  }

  deleteFromStore(id: string) {
    this.teamStore.remove(id);
  }
}
