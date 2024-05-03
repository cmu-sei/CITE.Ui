// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, EventEmitter, Input, OnInit, Output, OnDestroy } from '@angular/core';
import { LegacyPageEvent as PageEvent } from '@angular/material/legacy-paginator';
import { Sort } from '@angular/material/sort';
import {
  Permission,
  User,
  UserPermission,
} from 'src/app/generated/cite.api/model/models';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { UntypedFormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss'],
})
export class AdminUsersComponent implements OnInit, OnDestroy{
  @Input() userList: User[];
  @Input() permissionList: Permission[];
  pageSize: number = 10;
  pageIndex: number = 0;
  filteredUserList: User [] = [];
  @Output() removeUserPermission = new EventEmitter<UserPermission>();
  @Output() addUserPermission = new EventEmitter<UserPermission>();
  @Output() addUser = new EventEmitter<User>();
  @Output() deleteUser = new EventEmitter<User>();
  filterControl = new UntypedFormControl();
  filterString = '';
  addingNewUser = false;
  newUser: User = { id: '', name: '' };
  displayedUsers: User [] = [];
  isLoading = false;
  topbarColor = '#ef3a47';
  sort: Sort = { active: 'name', direction: 'asc'};
  private unsubscribe$ = new Subject();

  constructor(
    public dialogService: DialogService,
    private userDataService: UserDataService,
    private settingsService: ComnSettingsService
  ) {
    this.topbarColor = this.settingsService.settings.AppTopBarHexColor
      ? this.settingsService.settings.AppTopBarHexColor
      : this.topbarColor;
  }

  ngOnInit() {
    this.userDataService.userList.pipe(takeUntil(this.unsubscribe$)).subscribe(users => {
      this.userList = users;
      this.applyFilter(this.filterString);
    });

    this.filterControl.valueChanges.pipe(
      takeUntil(this.unsubscribe$)
    ).subscribe(value => {
      this.applyFilter(value);
    });
  }

  hasPermission(permissionId: string, user: User) {
    return user.permissions.some((p) => p.id === permissionId);
  }

  toggleUserPermission(user: User, permissionId: string) {
    const userPermission: UserPermission = {
      userId: user.id,
      permissionId: permissionId,
    };
    if (this.hasPermission(permissionId, user)) {
      this.removeUserPermission.emit(userPermission);
    } else {
      this.addUserPermission.emit(userPermission);
    }
  }

  addUserRequest(isAdd: boolean) {
    if (isAdd) {
      this.addUser.emit(this.newUser);
    }
    this.newUser.id = '';
    this.newUser.name = '';
    this.addingNewUser = false;
  }

  deleteUserRequest(user: User) {
    this.dialogService
      .confirm(
        'Delete User',
        'Are you sure that you want to delete ' + user.name + '?'
      )
      .subscribe((result) => {
        if (result['confirm']) {
          this.deleteUser.emit(user);
        }
      });
  }

  applyFilter(filterValue: string) {
    this.filterString = filterValue.trim().toLowerCase();
    this.filteredUserList = this.userList.filter(user =>
      user.name.toLowerCase().includes(this.filterString)
    );
    this.pageIndex = 0;
  }

  clearFilter() {
    this.filterControl.setValue('');
  }

  sortChanged(sort: Sort) {
    this.sort = sort;
    this.applyFilter(this.filterString);
  }

  sortUsers(a: User, b: User): number {
    const dir = this.sort.direction === 'desc' ? -1 : 1;
    if (!this.sort.direction || this.sort.active === 'name') {
      this.sort = { active: 'name', direction: 'asc' };
      return a.name.toLowerCase() < b.name.toLowerCase() ? -dir : dir;
    } else {
      const aValue = this.hasPermission(this.sort.active, a).toString();
      const bValue = this.hasPermission(this.sort.active, b).toString();
      if (aValue === bValue) {
        return a.name.toLowerCase() < b.name.toLowerCase() ? -dir : dir;
      } else {
        return aValue < bValue ? dir : -dir;
      }
    }
  }

  handleInput(event: KeyboardEvent): void{
    event.stopPropagation();
  } 

  paginatorEvent(page: PageEvent) {
    this.pageIndex = page.pageIndex;
    this.pageSize = page.pageSize;
  }

  paginateUsers(pageIndex: number, pageSize: number): User[] {
    const startIndex = pageIndex * pageSize;
    return this.filteredUserList.slice(startIndex, startIndex + pageSize);
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
