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
  EvaluationMembership,
  Group,
  User,
} from 'src/app/generated/cite.api';

@Component({
  selector: 'app-admin-evaluation-membership-list',
  templateUrl: './admin-evaluation-membership-list.component.html',
  styleUrls: ['./admin-evaluation-membership-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class AdminEvaluationMembershipListComponent implements OnInit, OnChanges {
  @Input()
  users: User[];

  @Input()
  groups: Group[];

  @Input()
  canEdit: boolean;

  @Output()
  createMembership = new EventEmitter<EvaluationMembership>();

  viewColumns = ['name', 'type'];
  editColumns = ['actions'];
  displayedColumns = this.viewColumns;

  dataSource = new MatTableDataSource<EvaluationMemberModel>();

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
    const evaluationMembership = {} as EvaluationMembership;

    if (type === 'User') {
      evaluationMembership.userId = id;
    } else if (type === 'Group') {
      evaluationMembership.groupId = id;
    }

    this.createMembership.emit(evaluationMembership);
  }

  buildModel(): EvaluationMemberModel[] {
    const evaluationMemberModels = [] as EvaluationMemberModel[];

    this.users.forEach((x) => {
      evaluationMemberModels.push({
        user: x,
        group: null,
        id: x.id,
        name: x.name,
        type: 'User',
      });
    });

    this.groups.forEach((x) => {
      evaluationMemberModels.push({
        user: null,
        group: x,
        id: x.id,
        name: x.name,
        type: 'Group',
      });
    });

    return evaluationMemberModels;
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

export interface EvaluationMemberModel {
  user: User;
  group: Group;
  id: string;
  name: string;
  type: string;
}
