// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import {
  Component,
  OnDestroy,
  OnInit,
  Input,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortable } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { User, Team } from 'src/app/generated/cite.api';
import { TeamUserDataService } from 'src/app/data/user/team-user-data.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
@Component({
  selector: 'app-admin-team-users',
  templateUrl: './admin-team-users.component.html',
  styleUrls: ['./admin-team-users.component.scss'],
})
export class AdminTeamUsersComponent implements OnDestroy, OnInit {
  @Input() teamId: string;
  @Input() userList: User[];
  users: User[];
  teamUsers: User[];

  displayedUserColumns: string[] = ['name', 'id'];
  displayedTeamColumns: string[] = ['name', 'user'];
  userDataSource = new MatTableDataSource<User>(new Array<User>());
  teamUserDataSource = new MatTableDataSource<User>(new Array<User>());
  filterString = '';
  defaultPageSize = 100;
  pageEvent: PageEvent;
  private unsubscribe$ = new Subject();

  @ViewChild('usersInput') usersInput: ElementRef<HTMLInputElement>;
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  constructor(
    private teamUserDataService: TeamUserDataService
  ) {}

  ngOnInit() {
    this.sort.sort(<MatSortable>{ id: 'name', start: 'asc' });
    this.userDataSource.sort = this.sort;
    this.pageEvent = new PageEvent();
    this.pageEvent.pageIndex = 0;
    this.pageEvent.pageSize = this.defaultPageSize;
    this.teamUserDataService.teamUsers.pipe(takeUntil(this.unsubscribe$)).subscribe(tUsers => {
      this.setDataSources(tUsers);
    });
    this.teamUserDataService.getTeamUsersFromApi(this.teamId);
  }

  applyFilter(filterValue: string) {
    this.filterString = filterValue;
    this.pageEvent.pageIndex = 0;
    filterValue = filterValue.toLowerCase(); // MatTableDataSource defaults to lowercase matches
    this.userDataSource.filter = filterValue;
  }

  clearFilter() {
    this.applyFilter('');
  }

  setDataSources(tUsers: User[]) {
    // Now that all of the observables are returned, process accordingly.
    this.teamUserDataSource.data = !tUsers ? new Array<User>() : tUsers.sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      } else if (a.name > b.name) {
          return 1;
      } else {
          return 0;
      }
    });
    const newAllUsers = !this.userList ? new Array<User>() : this.userList.slice(0);
    this.teamUserDataSource.data.forEach((tu) => {
      const index = newAllUsers.findIndex((u) => u.id === tu.id);
      newAllUsers.splice(index, 1);
    });
    this.userDataSource = new MatTableDataSource(newAllUsers);
    this.userDataSource.sort = this.sort;
    this.userDataSource.paginator = this.paginator;
  }


  addUserToTeam(user: User): void {
    const index = this.teamUserDataSource.data.findIndex(
      (tu) => tu.id === user.id
    );
    if (index === -1) {
      this.teamUserDataService.addUserToTeam(this.teamId, user);
    }
  }

  /**
   * Removes a user from the current team
   * @param user The user to remove from team
   */
  removeUserFromTeam(user: User): void {
    const index = this.teamUserDataSource.data.findIndex(
      (tu) => tu.id === user.id
    );
    if (index !== -1) {
      this.teamUserDataService.removeTeamUser(this.teamId, user.id);
    }
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
