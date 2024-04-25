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
import { Sort, MatSortable } from '@angular/material/sort';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { TeamQuery } from 'src/app/data/team/team.query';
import { Team, TeamUser, User } from 'src/app/generated/cite.api';
import { TeamUserDataService } from 'src/app/data/team-user/team-user-data.service';
import { TeamUserQuery } from 'src/app/data/team-user/team-user.query';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UntypedFormControl } from '@angular/forms';

@Component({
  selector: 'app-admin-team-users',
  templateUrl: './admin-team-users.component.html',
  styleUrls: ['./admin-team-users.component.scss'],
})
export class AdminTeamUsersComponent implements OnDestroy, OnInit {
  @Input() teamId: string;
  userList: User[] = [];
  teamUsers: TeamUser[] = [];
  otherTeamUsers: TeamUser[] = [];
  teamList: Team[] = [];
  displayedUserColumns: string[] = ['name', 'id'];
  displayedTeamUserColumns: string[] = ['name', 'isObserver', 'canIncrementMove', 'canModify', 'canSubmit', 'id'];
  displayedTeamColumns: string[] = ['name', 'user'];
  userDataSource = new MatTableDataSource<User>(new Array<User>());
  teamUserDataSource = new MatTableDataSource<TeamUser>(new Array<TeamUser>());
  //filterControl = this.userDataService.filterControl;
  filterControl = new UntypedFormControl();
  filterString = '';
  filteredUserList: User[] = [];
  displayedUserList: User[] = [];
  isAddMode = false;
  pageIndex = 0;
  pageSize = 7;
  itemCount = 0;
  private unsubscribe$ = new Subject();
  sort: Sort = {active: 'name', direction: 'asc'};
  // @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  // @ViewChild(MatSort, { static: true }) sort: MatSort;

  constructor(
    private teamQuery: TeamQuery,
    private teamUserDataService: TeamUserDataService,
    private teamUserQuery: TeamUserQuery,
    private userDataService: UserDataService
  ) {
    this.userDataService.userList.pipe(takeUntil(this.unsubscribe$)).subscribe(users => {
      this.userList = users;
      //this.setDataSources();
    });
    this.teamUserQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(tUsers => {
      this.teamUsers = tUsers.filter(tu => tu.teamId === this.teamId);
      this.otherTeamUsers = tUsers.filter(tu => tu.teamId !== this.teamId);
      //this.setDataSources();
    });
    // observe the evaluation teams
    this.teamQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(teams => {
      this.teamList = teams ? teams : [];
    });

    this.filterControl.valueChanges
      .pipe(
        takeUntil(this.unsubscribe$)
      )
      .subscribe((term) => {
        this.filterString = term.trim().toLowerCase();
        this.applyFilter();
      })
  }

  ngOnInit() {
    this.loadInitialData();
    // this.sort.sort(<MatSortable>{ id: 'name', start: 'asc' });
    // this.userDataSource.sort = this.sort;
    // this.filterControl.setValue('');
    // this.teamUsers = this.teamUserQuery.getAll().filter(tu => tu.teamId === this.teamId);
    // this.otherTeamUsers = this.teamUserQuery.getAll().filter(tu => tu.teamId !== this.teamId);
    // this.setDataSources();
  }

  loadInitialData() {
    this.teamUserQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(users => {
      this.teamList = Array.from(users);
      this.applyFilter();
    });
  }

  // setDataSources() {
  //   // Now that all of the observables are returned, process accordingly.
  //   // get users from the TeamUsers
  //   // sort the list and add it as the data source
  //   this.teamUserDataSource.data = this.teamUsers.sort((a, b) => {
  //     const aName = this.getUserName(a.userId).toLowerCase();
  //     const bName = this.getUserName(b.userId).toLowerCase();
  //     if (aName < bName) {
  //       return -1;
  //     } else if (aName > bName) {
  //       return 1;
  //     } else {
  //       return 0;
  //     }
  //   });
  //   const newAllUsers = !this.userList ? new Array<User>() : this.userList.slice(0);
  //   this.teamUserDataSource.data.forEach((tu) => {
  //     const index = newAllUsers.findIndex((u) => u.id === tu.userId);
  //     if (index >= 0) {
  //       newAllUsers.splice(index, 1);
  //     }
  //   });
  //   this.userDataSource = new MatTableDataSource(newAllUsers);
  //   this.userDataSource.sort = this.sort;
  //   this.itemCount = this.userDataSource.data.length;
  // }

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

  setIncrementerValue(teamUserId: string, value: boolean) {
    this.teamUserDataService.setIncrementerValue(teamUserId, value);
  }

  setModifierValue(teamUserId: string, value: boolean) {
    this.teamUserDataService.setModifierValue(teamUserId, value);
  }

  setSubmitterValue(teamUserId: string, value: boolean) {
    this.teamUserDataService.setSubmitterValue(teamUserId, value);
  }

  paginatorEvent(page: PageEvent) {
    this.pageIndex = page.pageIndex;
    this.pageSize = page.pageSize;
    this.applyPagination();
  }

  applyFilter() {
    this.filteredUserList = this.userList.filter(user =>
      !this.filterString ||
      user.name.toLowerCase().includes(this.filterString)
    );

    this.sortChanged(this.sort);
  }

  clearFilter() {
    this.filterString = '';
    this.filterControl.setValue('');
    this.loadInitialData();
  }

  sortChanged(sort: Sort) {
    this.sort = sort;
    this.filteredUserList.sort((a, b) => this.sortUsers(a, b, sort.active, sort.direction));
    this.applyPagination();
  }

  applyPagination() {
    const startIndex = this.pageIndex * this.pageSize;
    this.displayedUserList = this.filteredUserList.slice(startIndex, startIndex + this.pageSize);
  }

  private sortUsers(a: User, b: User, column: string, direction: string)
  {
    const isAsc = direction !== 'desc';
    switch (column) {
      case 'name':
        return (
          (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      default: 
        return 0; 
    }
  }

  toggleAddMode(value: boolean) {
    this.isAddMode = value;
    if (value) {
      this.displayedTeamUserColumns = ['name', 'id'];

    } else {
      this.displayedTeamUserColumns = ['name', 'isObserver', 'canIncrementMove', 'canModify', 'canSubmit', 'id'];
    }
  }

  // handlePageEvent(pageEvent: PageEvent) {
  //   this.currentPageIndex = pageEvent.pageIndex;
  // }

  onAnotherTeam(userId: string): boolean {
    return this.otherTeamUsers.some(tu => tu.userId === userId);
  }

  getUserTeamName(userId: string): string {
    let teamName = '';
    const teamUser = this.otherTeamUsers.find(tu => tu.userId === userId);
    if (teamUser && teamUser.teamId) {
      const team = this.teamList.find(t => t.id === teamUser.teamId);
      if (team) {
        teamName = team.shortName;
      }
    }
    return teamName;
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
