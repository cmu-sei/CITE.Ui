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
import { MatDialog } from '@angular/material/dialog';
import { MatSort, Sort } from '@angular/material/sort';
import {
  MatPaginator,
  PageEvent,
} from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ConfirmDialogComponent } from 'src/app/components/shared/confirm-dialog/components/confirm-dialog.component';
import { User } from 'src/app/generated/cite.api';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  fromMatSort,
  sortRows,
  fromMatPaginator,
  paginateRows,
} from 'src/app/datasource-utils';
import { RoleDataService } from 'src/app/data/role/role-data.service';
import { MatSelectChange } from '@angular/material/select';
import { UserDataService } from 'src/app/data/user/user-data.service';

const WAS_CANCELLED = 'wasCancelled';

export interface Action {
  Value: string;
  Text: string;
}

@Component({
  selector: 'app-admin-user-list',
  templateUrl: './admin-user-list.component.html',
  styleUrls: ['./admin-user-list.component.scss'],
})
export class AdminUserListComponent implements OnInit, OnChanges {
  displayedColumns: string[] = ['id', 'name'];
  filterString = '';
  savedFilterString = '';
  userDataSource = new MatTableDataSource<User>(new Array<User>());
  newUser: User = {};

  // MatPaginator Output
  pageEvent: PageEvent;
  addingNewUser: boolean;
  displayedRows$: Observable<User[]>;
  totalRows$: Observable<number>;
  sortEvents$: Observable<Sort>;
  pageEvents$: Observable<PageEvent>;
  roles$ = this.roleDataService.roles$;
  topbarColor = '#BB0000';

  @Input() users: User[];
  @Input() isLoading: boolean;
  @Input() canEdit: boolean;
  @Output() create: EventEmitter<User> = new EventEmitter<User>();
  @Output() delete: EventEmitter<string> = new EventEmitter<string>();
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  constructor(
    private dialog: MatDialog,
    private roleDataService: RoleDataService,
    private userDataService: UserDataService
  ) {}

  /**
   * Initialization
   */
  ngOnInit() {
    this.sortEvents$ = fromMatSort(this.sort);
    this.pageEvents$ = fromMatPaginator(this.paginator);
    this.roleDataService.getRoles().subscribe();
    this.filterAndSort(this.filterString);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!!changes.users && !!changes.users.currentValue) {
      this.userDataSource.data = changes.users.currentValue;
      this.filterAndSort(this.filterString);
    }
  }

  /**
   * Called by UI to add a filter to the userDataSource
   * @param filterValue
   */
  applyFilter(filterValue: string) {
    this.filterString = filterValue.toLowerCase();
    this.filterAndSort(this.filterString);
  }

  /**
   * filters and sorts the displayed rows
   */
  filterAndSort(filterValue: string) {
    this.userDataSource.filter = filterValue;
    const rows$ = of(this.userDataSource.filteredData);
    this.totalRows$ = rows$.pipe(map((rows) => rows.length));
    if (!!this.sortEvents$ && !!this.pageEvents$) {
      this.displayedRows$ = rows$.pipe(
        sortRows(this.sortEvents$),
        paginateRows(this.pageEvents$)
      );
    }
  }

  /**
   * Adds a new user
   */
  addNewUser(addUser: boolean) {
    if (addUser) {
      const user = {
        id: this.newUser.id,
        name: this.newUser.name,
      };
      this.savedFilterString = this.filterString;
      this.create.emit(user);
    } else {
      this.newUser = {};
    }
  }

  deleteUser(user: User) {
    this.confirmDialog('Delete ' + user.name + '?', user.id, {
      buttonTrueText: 'Delete',
    }).subscribe((result) => {
      if (!result[WAS_CANCELLED]) {
        this.delete.emit(user.id);
      }
    });
  }

  confirmDialog(
    title: string,
    message: string,
    data?: any
  ): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: data || {},
    });
    dialogRef.componentInstance.title = title;
    dialogRef.componentInstance.message = message;

    return dialogRef.afterClosed();
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
