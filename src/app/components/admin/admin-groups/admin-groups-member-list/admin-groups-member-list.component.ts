/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import {
  AfterViewInit,
  Component,
  EventEmitter,
  OnChanges,
  OnInit,
  Output,
  ViewChild,
  input
} from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow } from '@angular/material/table';
import { GroupMembership, User } from 'src/app/generated/cite.api';
import { MatToolbar, MatToolbarRow } from '@angular/material/toolbar';
import { MatFormField, MatInput, MatSuffix } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
    selector: 'app-admin-groups-member-list',
    templateUrl: './admin-groups-member-list.component.html',
    styleUrls: ['./admin-groups-member-list.component.scss'],
    imports: [MatToolbar, MatToolbarRow, MatFormField, MatInput, FormsModule, MatIconButton, MatSuffix, MatIcon, MatPaginator, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, MatTooltip, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow]
})
export class AdminGroupsMemberListComponent
  implements OnInit, OnChanges, AfterViewInit
{
  readonly memberships = input<GroupMembership[]>(undefined);

  readonly users = input<User[]>(undefined);

  readonly canEdit = input<boolean>(undefined);

  @Output()
  deleteMembership = new EventEmitter<string>();

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  viewColumns = ['name'];
  editColumns = ['actions'];
  displayedColumns = this.viewColumns;
  dataSource = new MatTableDataSource<GroupMembershipModel>();

  filterString = '';

  constructor() {}

  ngOnInit(): void {}

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnChanges() {
    this.buildModel();
    this.displayedColumns = this.viewColumns.concat(
      this.canEdit() ? this.editColumns : []
    );
  }

  buildModel() {
    this.dataSource.data = this.memberships()
      .map((x) => {
        const user = this.users().find((u) => u.id == x.userId);

        return {
          membership: x,
          user: user,
          name: user?.name,
        } as GroupMembershipModel;
      })
      .filter((x) => x);
  }

  delete(id: string) {
    this.deleteMembership.emit(id);
  }

  trackById(index: number, item: any) {
    return item.id;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  clearFilter() {
    this.filterString = '';
    this.dataSource.filter = this.filterString;
  }
}

export interface GroupMembershipModel {
  membership: GroupMembership;
  user: User;
  name: string;
}
