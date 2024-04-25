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
import { Observable} from 'rxjs';

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
  filterString: Observable<string>;
  addingNewUser = false;
  newUser: User = { id: '', name: '' };
  isLoading = false;
  topbarColor = '#ef3a47';

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
    // this.filterControl.setValue(this.filterString);
    this.filteredUserList = this.userList.slice();
    this.filterControl.valueChanges.subscribe((filterValue: string) => {
      this.applyFilter(filterValue);
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
    if (!filterValue || filterValue.trim().length === 0) {
      this.filteredUserList = this.userList.slice();
    } else {
      this.filteredUserList = this.userList.filter(user => user.name.toLowerCase().includes(filterValue.toLowerCase()));
    }
  }

  sortChanged(sort: Sort) {
    this.userList.sort((a, b) => {
      const isAsc = sort.direction === 'asc';
      const compareResult = this.compare(a.name.toLowerCase(), b.name.toLowerCase());
      return isAsc ? compareResult : -compareResult;
    });
  }

  paginatorEvent(page: PageEvent) {
    this.pageIndex = page.pageIndex;
    this.pageSize = page.pageSize;
  }

  paginateUsers() {
    const startIndex = this.pageIndex * this.pageSize;
    return this.filteredUserList.slice(startIndex, startIndex + this.pageSize);
  }

  private compare(a: string, b: string) {
    if (a < b) {
      return -1;
    }
    if (a > b) {
      return 1;
    }
    return 0;
  }

}
