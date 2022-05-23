// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { Injectable, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ComnAuthQuery, ComnAuthService } from '@cmusei/crucible-common';
import { User as AuthUser } from 'oidc-client';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { filter, map, take, takeUntil } from 'rxjs/operators';
import { TeamUserService, UserService } from 'src/app/generated/cite.api/api/api';
import { TeamUser, User } from 'src/app/generated/cite.api/model/models';

@Injectable({
  providedIn: 'root',
})
export class TeamUserDataService implements OnDestroy {
  private _teamUsers: User[] = [];
  private _teamId = '';
  readonly teamUsers = new BehaviorSubject<User[]>(this._teamUsers);
  readonly filterControl = new FormControl();
  private filterTerm: Observable<string>;
  private sortColumn: Observable<string>;
  private sortIsAscending: Observable<boolean>;
  private pageSize: Observable<number>;
  private pageIndex: Observable<number>;
  unsubscribe$: Subject<null> = new Subject<null>();

  constructor(
    private userService: UserService,
    private teamUserService: TeamUserService,
    private authQuery: ComnAuthQuery,
    private authService: ComnAuthService,
    private router: Router,
    activatedRoute: ActivatedRoute
  ) {}

  private updateTeamUsers(users: User[]) {
    this._teamUsers = Object.assign([], users);
    this.teamUsers.next(this._teamUsers);
  }

  getTeamUsersFromApi(teamId: string) {
    this._teamId = teamId;
    return this.userService
      .getTeamUsers(teamId)
      .pipe(take(1))
      .subscribe(
        (users) => {
          this.updateTeamUsers(users);
        },
        (error) => {
          this.updateTeamUsers([]);
        }
      );
  }

  addUserToTeam(teamId: string, user: User) {
    this.teamUserService.createTeamUser({teamId: teamId, userId: user.id}).subscribe(
      (tu) => {
        // condition added, because sometimes signalR returns the item first
        if (!this._teamUsers.some(u => u.id === user.id)) {
          this._teamUsers.unshift(user);
          this.updateTeamUsers(this._teamUsers);
        }
      }
    );
  }

  removeTeamUser(teamId: string, userId: string) {
    this.teamUserService.deleteTeamUserByIds(teamId, userId).subscribe(
      (response) => {
        this._teamUsers = this._teamUsers.filter((u) => u.id !== userId);
        this.updateTeamUsers(this._teamUsers);
      }
    );
  }

  updateStore(teamUser: TeamUser) {
    if (teamUser.teamId === this._teamId) {
      const updatedTeamUsers = this._teamUsers.filter(u => u.id !== teamUser.userId);
      updatedTeamUsers.unshift(teamUser.user);
      this.updateTeamUsers(updatedTeamUsers);
    }
  }

  deleteFromStore(teamUser: TeamUser) {
    if (teamUser.teamId === this._teamId) {
      const updatedTeamUsers = this._teamUsers.filter(u => u.id !== teamUser.userId);
      this.updateTeamUsers(updatedTeamUsers);
    }
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
