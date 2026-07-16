// Copyright 2024 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  Component,
  EventEmitter,
  OnInit,
  ViewChild,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { User } from 'src/app/generated/cite.api';
import { RoleDataService } from 'src/app/data/role/role-data.service';
import { MatSelectChange } from '@angular/material/select';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { CrucibleDialogService } from '@cmusei/crucible-common';

export interface Action {
  Value: string;
  Text: string;
}

@Component({
  selector: 'app-admin-user-list',
  templateUrl: './admin-user-list.component.html',
  styleUrls: ['./admin-user-list.component.scss'],
  standalone: false
})
export class AdminUserListComponent implements OnInit, OnChanges {
  displayedColumns: string[] = ['id', 'name', 'role'];
  filterString = '';
  savedFilterString = '';
  userDataSource = new MatTableDataSource<User>(new Array<User>());
  newUser: User = {};

  addingNewUser: boolean;
  roles$ = this.roleDataService.roles$;

  @Input() users: User[];
  @Input() isLoading: boolean;
  @Input() canEdit: boolean;
  @Output() create: EventEmitter<User> = new EventEmitter<User>();
  @Output() delete: EventEmitter<string> = new EventEmitter<string>();
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  constructor(
    private confirmService: CrucibleDialogService,
    private roleDataService: RoleDataService,
    private userDataService: UserDataService
  ) { }

  ngOnInit() {
    if (this.paginator) {
      this.userDataSource.paginator = this.paginator;
    }
    this.userDataSource.sort = this.sort;
    this.roleDataService.getRoles().subscribe();
    this.filterAndSort(this.filterString);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!!changes.users && !!changes.users.currentValue) {
      this.userDataSource.data = changes.users.currentValue;
      this.filterAndSort(this.filterString);
    }
  }

  applyFilter(filterValue: string) {
    this.filterString = filterValue.toLowerCase();
    this.filterAndSort(this.filterString);
  }

  filterAndSort(filterValue: string) {
    this.userDataSource.filter = filterValue;
  }

  addNewUser(addUser: boolean) {
    if (addUser) {
      const user = {
        id: this.newUser.id,
        name: this.newUser.name,
      };
      this.savedFilterString = this.filterString;
      this.create.emit(user);
    }
    this.newUser = {};
    this.addingNewUser = false;
  }

  deleteUser(user: User) {
    this.confirmService
      .confirm({
        title: 'Delete ' + user.name + '?',
        message: user.id,
        confirmText: 'Delete',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.delete.emit(user.id);
        }
      });
  }

  trackById(index: number, item: any) {
    return item.id;
  }

  updateRole(user: User, event: MatSelectChange) {
    this.userDataService.update({
      ...user,
      roleId: event.value === '' ? null : event.value,
    });
  }
}
