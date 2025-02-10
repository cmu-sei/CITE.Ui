// Copyright 2023 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import {
  Component,
  OnDestroy,
  OnInit,
  Input,
  ViewChild,
} from '@angular/core';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortable } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Team, TeamUser, User } from 'src/app/generated/cite.api';
import { TeamQuery } from 'src/app/data/team/team.query';
import { TeamUserDataService } from 'src/app/data/team-user/team-user-data.service';
import { TeamUserQuery } from 'src/app/data/team-user/team-user.query';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
@Component({
  selector: 'app-admin-observers',
  templateUrl: './admin-observers.component.html',
  styleUrls: ['./admin-observers.component.scss'],
})
export class AdminObserversComponent implements OnDestroy, OnInit {
  @Input() evaluationId: string;
  @Input() noChanges: boolean;
  userList: User[] = [];
  teamUsers: TeamUser[] = [];
  displayedObserverColumns: string[] = ['team', 'name', 'id'];
  displayedTeamUserColumns: string[] = ['team', 'name', 'id'];
  observerDataSource = new MatTableDataSource<TeamUser>(new Array<TeamUser>());
  teamUserDataSource = new MatTableDataSource<TeamUser>(new Array<TeamUser>());
  teamList: Team[] = [];
  private unsubscribe$ = new Subject();
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  constructor(
    private teamQuery: TeamQuery,
    private teamUserDataService: TeamUserDataService,
    private teamUserQuery: TeamUserQuery,
    private userDataService: UserDataService
  ) {
    this.userDataService.userList.pipe(takeUntil(this.unsubscribe$)).subscribe(users => {
      this.userList = users;
    });
    this.teamUserQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(tUsers => {
      this.teamUsers = tUsers
        .sort((a, b) => {
          const aTeam = this.getTeamName(a.teamId).toLowerCase();
          const bTeam = this.getTeamName(b.teamId).toLowerCase();
          const aName = this.getUserName(a.userId).toLowerCase();
          const bName = this.getUserName(b.userId).toLowerCase();
          if (aTeam < bTeam) {
            return -1;
          } else if (aTeam > bTeam) {
            return 1;
          } else {
            if (aName < bName) {
              return -1;
            } else if (aName > bName) {
              return 1;
            } else {
              return 0;
            }
          }
        });
      this.setDataSources();
    });
    this.teamQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(teams => {
      this.teamList = teams;
    });
  }

  ngOnInit() {
    this.sort.sort(<MatSortable>{ id: 'name', start: 'asc' });
    this.observerDataSource.sort = this.sort;
  }

  setDataSources() {
    // filter the list for each data source
    this.teamUserDataSource.data = this.teamUsers
      .filter(tu => !tu.isObserver);
    this.observerDataSource.data = this.teamUsers
      .filter(tu => tu.isObserver);
  }

  addObserver(id: string): void {
    this.teamUserDataService.setObserverValue(id, true);
  }

  removeObserver(id: string): void {
    this.teamUserDataService.setObserverValue(id, false);
  }

  setObserverValue(teamUserId: string, value: boolean) {
    this.teamUserDataService.setObserverValue(teamUserId, value);
  }

  compare(a: string, b: string, isAsc: boolean) {
    if (a === null || b === null) {
      return 0;
    } else {
      return (a.toLowerCase() < b.toLowerCase() ? -1 : 1) * (isAsc ? 1 : -1);
    }
  }

  getUserName(id: string) {
    const user = this.userList.find(u => u.id === id);
    return user ? user.name : '?';
  }

  getTeamName(id: string) {
    const team = this.teamList.find(t => t.id === id);
    return team ? team.shortName : '?';
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
