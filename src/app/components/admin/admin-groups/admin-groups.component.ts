// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { AfterViewInit, ChangeDetectionStrategy, Component, OnInit, inject, viewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Group, SystemPermission } from 'src/app/generated/cite.api';
import { GroupDataService } from 'src/app/data/group/group-data.service';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { NameDialogComponent } from 'src/app/components/shared/name-dialog/name-dialog.component';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { ComnSettingsService, CrucibleDialogService } from '@cmusei/crucible-common';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatInput, MatSuffix } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { AdminGroupsDetailComponent } from './admin-groups-detail/admin-groups-detail.component';
import { AsyncPipe } from '@angular/common';

const NAME_VALUE = 'nameValue';

@Component({
    selector: 'app-admin-groups',
    templateUrl: './admin-groups.component.html',
    styleUrls: ['./admin-groups.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        trigger('detailExpand', [
            state('collapsed', style({ height: '0px', minHeight: '0' })),
            state('expanded', style({ height: '*' })),
            transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
        ]),
    ],
    imports: [MatIcon, MatFormField, MatInput, FormsModule, MatIconButton, MatSuffix, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatTooltip, MatCellDef, MatCell, MatSortHeader, AdminGroupsDetailComponent, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, AsyncPipe]
})
export class AdminGroupsComponent implements OnInit, AfterViewInit {
  private groupDataService = inject(GroupDataService);
  private userDataService = inject(UserDataService);
  private dialog = inject(MatDialog);
  private confirmService = inject(CrucibleDialogService);
  private permissionDataService = inject(PermissionDataService);
  private settingsService = inject(ComnSettingsService);

  readonly sort = viewChild(MatSort);

  filterString = '';
  displayedColumns: string[] = ['actions', 'name'];
  dataSource: MatTableDataSource<Group> = new MatTableDataSource();
  expandedGroupId: string | null = null;

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
    this.dataSource.sort = this.sort();
  }

  applyFilter(filterValue: string) {
    this.filterString = filterValue;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  clearFilter() {
    this.applyFilter('');
  }

  toggleExpand(groupId: string) {
    this.expandedGroupId = this.expandedGroupId === groupId ? null : groupId;
  }

  createGroup() {
    this.nameDialog('Add Group', '', { nameValue: '' }).subscribe(
      (result) => {
        if (result) {
          this.groupDataService
            .create({ name: result[NAME_VALUE] })
            .subscribe();
        }
      }
    );
  }

  updateGroup(group: Group) {
    this.nameDialog('Rename Group', '', {
      nameValue: group.name,
    }).subscribe((result) => {
      if (result) {
        this.groupDataService
          .edit({ id: group.id, name: result[NAME_VALUE] })
          .subscribe();
      }
    });
  }

  deleteGroup(group: Group) {
    this.confirmService
      .confirm({
        title: 'Delete Group',
        message: 'Are you sure that you want to delete ' + group.name + '?',
        confirmText: 'Delete',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.groupDataService.delete(group.id).subscribe();
        }
      });
  }

  nameDialog(title: string, message: string, data?: any): Observable<any> {
    const dialogRef = this.dialog.open(NameDialogComponent, {
      minWidth: '400px',
      maxWidth: '90vw',
      width: 'auto',
      data: data || {},
    });
    dialogRef.componentInstance.title = title;
    dialogRef.componentInstance.message = message;

    return dialogRef.afterClosed();
  }
}
