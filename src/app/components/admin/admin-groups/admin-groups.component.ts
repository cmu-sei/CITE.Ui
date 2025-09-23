// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Group, SystemPermission } from 'src/app/generated/cite.api';
import { GroupDataService } from 'src/app/data/group/group-data.service';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { ConfirmDialogComponent } from 'src/app/components/shared/confirm-dialog/components/confirm-dialog.component';
import { NameDialogComponent } from 'src/app/components/shared/name-dialog/name-dialog.component';
import { UserDataService } from 'src/app/data/user/user-data.service';

const WAS_CANCELLED = 'wasCancelled';
const NAME_VALUE = 'nameValue';

@Component({
  selector: 'app-admin-groups',
  templateUrl: './admin-groups.component.html',
  styleUrls: ['./admin-groups.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AdminGroupsComponent implements OnInit, AfterViewInit {
  @ViewChild(MatSort) sort: MatSort;

  filterString = '';
  displayedColumns: string[] = ['name'];
  dataSource: MatTableDataSource<Group> = new MatTableDataSource();

  constructor(
    private groupDataService: GroupDataService,
    private userDataService: UserDataService,
    private dialog: MatDialog,
    private permissionDataService: PermissionDataService
  ) {}

  dataSource$ = this.groupDataService.groups$.pipe(
    map((x) => {
      this.dataSource.data = x;
      return this.dataSource;
    })
  );

  canEdit = this.permissionDataService.hasPermission(
    SystemPermission.ManageGroups
  );

  ngOnInit() {
    forkJoin([
      this.groupDataService.load(),
      this.userDataService.load(),
    ]).subscribe();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  applyFilter(filterValue: string) {
    this.filterString = filterValue;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  clearFilter() {
    this.applyFilter('');
  }

  createGroup() {
    this.nameDialog('Create New Group?', '', { nameValue: '' }).subscribe(
      (result) => {
        if (!result[WAS_CANCELLED]) {
          this.groupDataService
            .create({ name: result[NAME_VALUE] })
            .subscribe();
        }
      }
    );
  }

  updateGroup(group: Group) {
    this.nameDialog('Rename ' + group.name, '', {
      nameValue: group.name,
    }).subscribe((result) => {
      if (!result[WAS_CANCELLED]) {
        this.groupDataService
          .edit({ id: group.id, name: result[NAME_VALUE] })
          .subscribe();
      }
    });
  }

  deleteGroup(group: Group) {
    this.confirmDialog('Delete Group?', 'Delete Group ' + group.name + '?', {
      buttonTrueText: 'Delete',
    }).subscribe((result) => {
      if (!result[WAS_CANCELLED]) {
        this.groupDataService.delete(group.id).subscribe();
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

  nameDialog(title: string, message: string, data?: any): Observable<boolean> {
    const dialogRef = this.dialog.open(NameDialogComponent, {
      data: data || {},
    });
    dialogRef.componentInstance.title = title;
    dialogRef.componentInstance.message = message;

    return dialogRef.afterClosed();
  }
}
