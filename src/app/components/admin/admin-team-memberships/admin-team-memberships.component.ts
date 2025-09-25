// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import {
  Component,
  OnDestroy,
  OnInit,
  Input,
} from '@angular/core';
import { Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { TeamQuery } from 'src/app/data/team/team.query';
import { Team, TeamMembership, TeamRole, User } from 'src/app/generated/cite.api';
import { TeamMembershipDataService } from 'src/app/data/team/team-membership-data.service';
import { UserQuery } from 'src/app/data/user/user.query';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UntypedFormControl } from '@angular/forms';

@Component({
    selector: 'app-admin-team-memberships',
    templateUrl: './admin-team-memberships.component.html',
    styleUrls: ['./admin-team-memberships.component.scss'],
    standalone: false
})
export class AdminTeamMembershipsComponent implements OnDestroy, OnInit {
  @Input() teamId: string;
  @Input() noChanges: boolean;
  userList: User[] = [];
  teamMemberships: TeamMembership[] = [];
  otherTeamMemberships: TeamMembership[] = [];
  teamList: Team[] = [];
  displayedUserColumns: string[] = ['name', 'id'];
  displayedTeamMembershipColumns: string[] = ['name', 'canView', 'canModify', 'canSubmit', 'canManageTeam', 'id'];
  displayedTeamColumns: string[] = ['name', 'user'];
  userDataSource = new MatTableDataSource<User>(new Array<User>());
  teamMembershipDataSource = new MatTableDataSource<TeamMembership>(new Array<TeamMembership>());
  filterControl = new UntypedFormControl();
  filterString = '';
  isAddMode = false;
  currentPageIndex = 0;
  pageSize = 7;
  itemCount = 0;
  private unsubscribe$ = new Subject();
  sort: Sort = {active: 'name', direction: 'asc'};

  constructor(
    private teamMembershipDataService: TeamMembershipDataService,
    private teamQuery: TeamQuery,
    private userQuery: UserQuery
  ) {
    this.userQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(users => {
      this.userList = users;
      this.setDataSources();
    });
    this.teamMembershipDataService.teamMemberships$.pipe(takeUntil(this.unsubscribe$)).subscribe(tUsers => {
      this.teamMemberships = tUsers.filter(tu => tu.teamId === this.teamId);
      this.otherTeamMemberships = tUsers.filter(tu => tu.teamId !== this.teamId);
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
    this.userQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(users => {
      this.userList = users;
      this.applyFilter();
    });
    this.filterControl.setValue('');
    this.teamMemberships = this.teamMembershipDataService.teamMemberships.filter(tu => tu.teamId === this.teamId);
    this.otherTeamMemberships = this.teamMembershipDataService.teamMemberships.filter(tu => tu.teamId !== this.teamId);
    this.setDataSources();
  }

  clearFilter() {
    this.filterControl.setValue('');
  }

  setDataSources() {
    this.teamMembershipDataSource.data = this.teamMemberships.sort((a, b) => {
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
    this.teamMembershipDataSource.data.forEach((tu) => {
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

  sortTeamMembershipData(teamMembershipData: TeamMembership[]) {
    teamMembershipData.sort((a, b) => {
        const aName = this.getUserName(a.userId).toLowerCase(); // Assumption: getUserName resolves the user's name by ID
        const bName = this.getUserName(b.userId).toLowerCase();
        let isAsc = this.sort.direction === 'asc';
        switch (this.sort.active) {
            case 'name':
                return this.compare(aName, bName, isAsc);
            case 'role':
                return this.compare(String(a.role.name), String(b.role.name), isAsc);
            default:
                return 0;
        }
    });
    this.teamMembershipDataSource.data = teamMembershipData;
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
    this.sortTeamMembershipData(this.teamMemberships);
  }

  addUserToTeam(user: User): void {
    const teamMembership = {
      teamId: this.teamId,
      userId: user.id
    } as TeamMembership;
    this.teamMembershipDataService.createMembership(this.teamId, teamMembership);
  }

  /**
   * Removes a user from the current team
   * @param user The user to remove from team
   */
  removeUserFromTeam(teamMembership: TeamMembership): void {
    this.teamMembershipDataService.deleteMembership(teamMembership.id);
  }

  updateRole(teamMembership: TeamMembership, teamRole: TeamRole) {
    teamMembership.roleId = teamRole.id;
    this.teamMembershipDataService.editMembership(teamMembership);
  }

  toggleAddMode(value: boolean) {
    this.isAddMode = value;
    if (value) {
      this.displayedTeamMembershipColumns = ['name', 'id'];

    } else {
      this.displayedTeamMembershipColumns = ['name', 'canView', 'canModify', 'canSubmit', 'canManage', 'id'];
    }
  }

  onAnotherTeam(userId: string): boolean {
    return this.otherTeamMemberships.some(tu => tu.userId === userId);
  }

  getUserTeamName(userId: string): string {
    let teamName = '';
    const teamMembership = this.otherTeamMemberships.find(tu => tu.userId === userId);
    if (teamMembership && teamMembership.teamId) {
      const team = this.teamList.find(t => t.id === teamMembership.teamId);
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
