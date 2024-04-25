// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
export class AdminUsersComponent implements OnInit {
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
    this.filterControl.valueChanges
    .pipe(
      takeUntil(this.unsubscribe$)
    )
    .subscribe((term) => {
      this.filterString = term.trim().toLowerCase();
      this.applyFilter();
    });
  }

  ngOnInit() {
    this.applyFilter();
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
  }

  sortChanged(sort: Sort) {
    this.sort = sort;
    this.filteredUserList.sort((a, b) => this.sortUsers(a, b, sort.active, sort.direction));
    this.paginateUsers();
  }

  sortUsers(a: User, b: User, column: string, direction: string) {
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

  paginatorEvent(page: PageEvent) {
    this.pageIndex = page.pageIndex;
    this.pageSize = page.pageSize;
    this.paginateUsers();
  }

  paginateUsers() {
    const startIndex = this.pageIndex * this.pageSize;
    this.displayedUsers = this.filteredUserList.slice(startIndex, startIndex + this.pageSize);
  }

}
