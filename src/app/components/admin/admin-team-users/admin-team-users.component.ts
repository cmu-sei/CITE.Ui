// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import {
  Component,
  OnDestroy,
  OnInit,
  Input,
  ViewChild,
} from '@angular/core';
import { LegacyPageEvent as PageEvent, MatLegacyPaginator as MatPaginator } from '@angular/material/legacy-paginator';
import { MatSort, MatSortable } from '@angular/material/sort';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { TeamUser, User } from 'src/app/generated/cite.api';
import { TeamUserDataService } from 'src/app/data/team-user/team-user-data.service';
import { TeamUserQuery } from 'src/app/data/team-user/team-user.query';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
@Component({
  selector: 'app-admin-team-users',
  templateUrl: './admin-team-users.component.html',
  styleUrls: ['./admin-team-users.component.scss'],
})
export class AdminTeamUsersComponent implements OnDestroy, OnInit {
  @Input() teamId: string;
  userList: User[] = [];
  teamUsers: TeamUser[] = [];
  displayedUserColumns: string[] = ['name', 'id'];
  displayedTeamUserColumns: string[] = ['name', 'isObserver', 'id'];
  displayedTeamColumns: string[] = ['name', 'user'];
  userDataSource = new MatTableDataSource<User>(new Array<User>());
  teamUserDataSource = new MatTableDataSource<TeamUser>(new Array<TeamUser>());
  filterControl = this.userDataService.filterControl;
  filterString = '';
  defaultPageSize = 100;
  pageEvent: PageEvent;
  private unsubscribe$ = new Subject();
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  constructor(
    private teamUserDataService: TeamUserDataService,
    private teamUserQuery: TeamUserQuery,
    private userDataService: UserDataService
  ) {
    this.userDataService.userList.pipe(takeUntil(this.unsubscribe$)).subscribe(users => {
      this.userList = users;
      this.setDataSources();
    });
    this.teamUserQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(tUsers => {
      this.teamUsers = tUsers.filter(tu => tu.teamId === this.teamId);
      this.setDataSources();
    });
    this.pageEvent = new PageEvent();
    this.pageEvent.pageIndex = 0;
    this.pageEvent.pageSize = this.defaultPageSize;
  }

  ngOnInit() {
    this.sort.sort(<MatSortable>{ id: 'name', start: 'asc' });
    this.userDataSource.sort = this.sort;
    // this.teamUserDataService.loadByTeam(this.teamId);
    this.filterControl.setValue('');
    this.teamUsers = this.teamUserQuery.getAll().filter(tu => tu.teamId === this.teamId);
    this.setDataSources();
}

  clearFilter() {
    this.filterControl.setValue('');
  }

  setDataSources() {
    // Now that all of the observables are returned, process accordingly.
    // get users from the TeamUsers
    // sort the list and add it as the data source
    this.teamUserDataSource.data = this.teamUsers.sort((a, b) => {
      const aName = this.getUserName(a.userId).toLowerCase();
      const bName = this.getUserName(b.userId).toLowerCase();
      if (aName < bName) {
        return -1;
      } else if (aName > bName) {
        return 1;
      } else {
        return 0;
      }
    });
    const newAllUsers = !this.userList ? new Array<User>() : this.userList.slice(0);
    this.teamUserDataSource.data.forEach((tu) => {
      const index = newAllUsers.findIndex((u) => u.id === tu.userId);
      if (index >= 0) {
        newAllUsers.splice(index, 1);
      }
    });
    this.userDataSource = new MatTableDataSource(newAllUsers);
    this.userDataSource.sort = this.sort;
    this.userDataSource.paginator = this.paginator;
  }

  getUserName(id: string) {
    const user = this.userList.find(u => u.id === id);
    return user ? user.name : '?';
  }

  addUserToTeam(user: User): void {
    const teamUser = {
      teamId: this.teamId,
      userId: user.id
    } as TeamUser;
    this.teamUserDataService.add(teamUser);
  }

  /**
   * Removes a user from the current team
   * @param user The user to remove from team
   */
  removeUserFromTeam(teamUser: TeamUser): void {
    this.teamUserDataService.delete(teamUser.id);
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

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
