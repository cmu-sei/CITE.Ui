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
  ScoringModelMembership,
  Group,
  User,
} from 'src/app/generated/cite.api';

@Component({
  selector: 'app-admin-scoring-model-membership-list',
  templateUrl: './admin-scoring-model-membership-list.component.html',
  styleUrls: ['./admin-scoring-model-membership-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AdminScoringModelMembershipListComponent
  implements OnInit, OnChanges
{
  @Input()
  users: User[];

  @Input()
  groups: Group[];

  @Input()
  canEdit: boolean;

  @Output()
  createMembership = new EventEmitter<ScoringModelMembership>();

  viewColumns = ['name', 'type'];
  editColumns = ['actions'];
  displayedColumns = this.viewColumns;

  dataSource = new MatTableDataSource<ScoringModelMemberModel>();

  filterString = '';

  constructor(public snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  ngOnChanges() {
    this.dataSource.data = this.buildModel();

    this.displayedColumns = this.viewColumns.concat(
      this.canEdit ? this.editColumns : []
    );
  }

  add(id: string, type: string) {
    const scoringModelMembership = {} as ScoringModelMembership;

    if (type === 'User') {
      scoringModelMembership.userId = id;
    } else if (type === 'Group') {
      scoringModelMembership.groupId = id;
    }

    this.createMembership.emit(scoringModelMembership);
  }

  buildModel(): ScoringModelMemberModel[] {
    const scoringModelMemberModels = [] as ScoringModelMemberModel[];

    this.users.forEach((x) => {
      scoringModelMemberModels.push({
        user: x,
        group: null,
        id: x.id,
        name: x.name,
        type: 'User',
      });
    });

    this.groups.forEach((x) => {
      scoringModelMemberModels.push({
        user: null,
        group: x,
        id: x.id,
        name: x.name,
        type: 'Group',
      });
    });

    return scoringModelMemberModels;
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

export interface ScoringModelMemberModel {
  user: User;
  group: Group;
  id: string;
  name: string;
  type: string;
}
