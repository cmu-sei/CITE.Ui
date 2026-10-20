/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { AfterViewInit, ChangeDetectionStrategy, Component, EventEmitter, OnChanges, OnInit, Output, ViewChild, inject, input } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow } from '@angular/material/table';
import {
  TeamMembership,
  User,
} from 'src/app/generated/cite.api';
import { MatToolbar, MatToolbarRow } from '@angular/material/toolbar';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatInput, MatSuffix } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

import { MatIconButton } from '@angular/material/button';
import { ClipboardModule } from 'ngx-clipboard';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
    selector: 'app-admin-team-membership-list',
    templateUrl: './admin-team-membership-list.component.html',
    styleUrls: ['./admin-team-membership-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatToolbar, MatToolbarRow, MatIcon, MatFormField, MatInput, FormsModule, MatIconButton, MatSuffix, MatPaginator, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, ClipboardModule, MatTooltip, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow]
})
export class AdminTeamMembershipListComponent implements OnInit, OnChanges, AfterViewInit {
  snackBar = inject(MatSnackBar);

  readonly users = input<User[]>(undefined);

  readonly canEdit = input<boolean>(undefined);

  @Output()
  createMembership = new EventEmitter<TeamMembership>();

  viewColumns = ['name', 'type'];
  editColumns = ['actions'];
  displayedColumns = this.viewColumns;

  dataSource = new MatTableDataSource<TeamMemberModel>();

  filterString = '';

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnChanges() {
    this.dataSource.data = this.buildModel();

    this.displayedColumns = this.viewColumns.concat(
      this.canEdit() ? this.editColumns : []
    );
  }

  add(id: string, type: string) {
    const teamMembership = {} as TeamMembership;

    if (type === 'User') {
      teamMembership.userId = id;
    }

    this.createMembership.emit(teamMembership);
  }

  buildModel(): TeamMemberModel[] {
    const teamMemberModels = [] as TeamMemberModel[];

    this.users().forEach((x) => {
      teamMemberModels.push({
        user: x,
        id: x.id,
        name: x.name,
        type: 'User',
      });
    });

    return teamMemberModels;
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

export interface TeamMemberModel {
  user: User;
  id: string;
  name: string;
  type: string;
}
