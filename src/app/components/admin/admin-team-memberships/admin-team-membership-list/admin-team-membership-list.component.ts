/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import {
  TeamMembership,
  User,
} from 'src/app/generated/cite.api';

@Component({
  selector: 'app-admin-team-membership-list',
  templateUrl: './admin-team-membership-list.component.html',
  styleUrls: ['./admin-team-membership-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AdminTeamMembershipListComponent implements OnInit, OnChanges {
  @Input()
  users: User[];

  @Input()
  canEdit: boolean;

  @Output()
  createMembership = new EventEmitter<TeamMembership>();

  viewColumns = ['name', 'type'];
  editColumns = ['actions'];
  displayedColumns = this.viewColumns;

  dataSource = new MatTableDataSource<TeamMemberModel>();

  filterString = '';

  constructor(public snackBar: MatSnackBar) {}

  ngOnInit(): void {}

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  ngOnChanges() {
    this.dataSource.data = this.buildModel();

    this.displayedColumns = this.viewColumns.concat(
      this.canEdit ? this.editColumns : []
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

    this.users.forEach((x) => {
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
