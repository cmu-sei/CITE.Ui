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
import { Sort, MatSort, MatSortable } from '@angular/material/sort';
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
  filterControl = new UntypedFormControl();
  filterString = '';
  isAddMode = false;
  currentPageIndex = 0;
  pageSize = 7;
  itemCount = 0;
  private unsubscribe$ = new Subject();
  sort: Sort = {active: 'name', direction: 'asc'};

  constructor(
    private teamQuery: TeamQuery,
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
      this.otherTeamUsers = tUsers.filter(tu => tu.teamId !== this.teamId);
      this.setDataSources();
    });
    // observe the evaluation teams
    this.teamQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(teams => {
      this.teamList = teams ? teams : [];
    });
  }

  ngOnInit() {
    this.filterControl.valueChanges.pipe(takeUntil(this.unsubscribe$)).subscribe(() => {
      this.filterString = this.filterControl.value;
      this.applyFilter();
    });
    this.userDataService.userList.pipe(takeUntil(this.unsubscribe$)).subscribe(users => {
      this.userList = users;
      this.applyFilter();
    });
    this.filterControl.setValue('');
    this.teamUsers = this.teamUserQuery.getAll().filter(tu => tu.teamId === this.teamId);
    this.otherTeamUsers = this.teamUserQuery.getAll().filter(tu => tu.teamId !== this.teamId);
    this.setDataSources();
  }

  clearFilter() {
    this.filterControl.setValue('');
  }

  setDataSources() {
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
  }

  getUserName(id: string) {
    const user = this.userList.find(u => u.id === id);
    return user ? user.name : '?';
  }

  applyFilter() {
    const searchTerm = this.filterControl.value ? this.filterControl.value.toLowerCase() : '';
    const filteredData = this.userList.filter(user =>
      !searchTerm || user.name.toLowerCase().includes(searchTerm)
    );
    this.sortUserData(filteredData);
  }

  sortUserData(data: User[]) {
    data.sort((a, b) => {
      let isAsc = this.sort.direction === 'asc';
      switch (this.sort.active) {
        case 'name':
          return this.compare(a.name, b.name, isAsc);
        case 'id':
          return this.compare(a.id, b.id, isAsc);
        default:
          return 0;
      }
    });
    this.userDataSource.data = data;
  }

  sortTeamUserData(teamUserData: TeamUser[]) {
    teamUserData.sort((a, b) => {
        const aName = this.getUserName(a.userId).toLowerCase(); // Assumption: getUserName resolves the user's name by ID
        const bName = this.getUserName(b.userId).toLowerCase();
        let isAsc = this.sort.direction === 'asc';
        switch (this.sort.active) {
            case 'name':
                return this.compare(aName, bName, isAsc);
            case 'isObserver':
                return this.compare(String(a.isObserver), String(b.isObserver), isAsc);
            case 'canIncrementMove':
                return this.compare(String(a.canIncrementMove), String(b.canIncrementMove), isAsc);
            case 'canModify':
                return this.compare(String(a.canModify), String(b.canModify), isAsc);
            case 'canSubmit':
                return this.compare(String(a.canSubmit), String(b.canSubmit), isAsc);
            default:
                return 0;
        }
    });
    this.teamUserDataSource.data = teamUserData;
}

  compare(a: string, b: string, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  onSortChange(sort: Sort) {
    this.sort = sort;
    this.applyFilter();
  }

  onSortTeamChange(sort: Sort) {
    this.sort = sort;
    this.sortTeamUserData(this.teamUsers);
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

  toggleAddMode(value: boolean) {
    this.isAddMode = value;
    if (value) {
      this.displayedTeamUserColumns = ['name', 'id'];

    } else {
      this.displayedTeamUserColumns = ['name', 'isObserver', 'canIncrementMove', 'canModify', 'canSubmit', 'id'];
    }
  }

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