// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { Injectable, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ComnAuthQuery, ComnAuthService } from '@cmusei/crucible-common';
import { User as AuthUser } from 'oidc-client';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { filter, map, take, takeUntil } from 'rxjs/operators';
import { GroupTeamService, TeamService } from 'src/app/generated/cite.api/api/api';
import { Team } from 'src/app/generated/cite.api/model/models';

@Injectable({
  providedIn: 'root',
})
export class GroupTeamDataService implements OnDestroy {
  private _groupTeams: Team[] = [];
  readonly groupTeams = new BehaviorSubject<Team[]>(this._groupTeams);
  readonly filterControl = new FormControl();
  private filterTerm: Observable<string>;
  private sortColumn: Observable<string>;
  private sortIsAscending: Observable<boolean>;
  private pageSize: Observable<number>;
  private pageIndex: Observable<number>;
  unsubscribe$: Subject<null> = new Subject<null>();

  constructor(
    private teamService: TeamService,
    private groupTeamService: GroupTeamService,
    private authQuery: ComnAuthQuery,
    private authService: ComnAuthService,
    private router: Router,
    activatedRoute: ActivatedRoute
  ) {}

  private updateGroupTeams(teams: Team[]) {
    this._groupTeams = Object.assign([], teams);
    this.groupTeams.next(this._groupTeams);
  }

  getGroupTeamsFromApi(groupId: string) {
    return this.teamService
      .getGroupTeams(groupId)
      .pipe(take(1))
      .subscribe(
        (teams) => {
          this.updateGroupTeams(teams);
        },
        (error) => {
          this.updateGroupTeams([]);
        }
      );
  }

  addTeamToGroup(groupId: string, team: Team) {
    this.groupTeamService.createGroupTeam({groupId: groupId, teamId: team.id}).subscribe(
      (tu) => {
        this._groupTeams.unshift(team);
        this.updateGroupTeams(this._groupTeams);
      }
    );
  }

  removeGroupTeam(groupId: string, teamId: string) {
    this.groupTeamService.deleteGroupTeamByIds(teamId, groupId).subscribe(
      (response) => {
        this._groupTeams = this._groupTeams.filter((u) => u.id !== teamId);
        this.updateGroupTeams(this._groupTeams);
      }
    );
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
