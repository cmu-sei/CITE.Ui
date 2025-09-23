/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSelectChange } from '@angular/material/select';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import {
  Group,
  ScoringModelMembership,
  ScoringModelRole,
  User,
} from 'src/app/generated/cite.api';

@Component({
  selector: 'app-admin-scoring-model-member-list',
  templateUrl: './admin-scoring-model-member-list.component.html',
  styleUrls: ['./admin-scoring-model-member-list.component.scss'],
  standalone: false
})
export class AdminScoringModelMemberListComponent implements OnInit, OnChanges {
  @Input()
  memberships: ScoringModelMembership[];

  @Input()
  users: User[];

  @Input()
  groups: Group[];

  @Input()
  roles: ScoringModelRole[];

  @Input()
  canEdit: boolean;

  @Output()
  deleteMembership = new EventEmitter<string>();

  @Output()
  editMembership = new EventEmitter<ScoringModelMembership>();

  viewColumns = ['name', 'type', 'role'];
  editColumns = ['actions'];
  displayedColumns = this.viewColumns;
  dataSource = new MatTableDataSource<ScoringModelMembershipModel>();

  filterString = '';

  constructor() {}

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  ngOnInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'role':
          return item.role.name;
        default:
          return item[property];
      }
    };

    const defaultPredicate = this.dataSource.filterPredicate;
    this.dataSource.filterPredicate = (data, filter) => {
      const defaultMatch = defaultPredicate(data, filter);
      return (
        data.role.name.toLocaleLowerCase().includes(filter) || defaultMatch
      );
    };
  }

  ngOnChanges() {
    this.buildModel();

    this.displayedColumns = this.viewColumns.concat(
      this.canEdit ? this.editColumns : []
    );
  }

  buildModel() {
    this.dataSource.data = this.memberships
      .map((x) => {
        const user = this.users.find((u) => u.id === x.userId);
        const group = this.groups.find((g) => g.id === x.groupId);
        const role = this.roles.find((r) => r.id === x.roleId);

        const membership = {
          membership: x,
          role: role,
        } as ScoringModelMembershipModel;

        if (!!user) {
          membership.user = user;
          membership.name = user.name;
          membership.type = 'User';
        } else if (!!group) {
          membership.group = group;
          membership.name = group.name;
          membership.type = 'Group';
        }

        return membership;
      })
      .filter((x) => x);
  }

  delete(id: string) {
    this.deleteMembership.emit(id);
  }

  updateRole(id: string, event: MatSelectChange) {
    this.editMembership.emit({
      id: id,
      roleId: event.value === '' ? null : event.value,
    });
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

export interface ScoringModelMembershipModel {
  membership: ScoringModelMembership;
  user: User;
  group: Group;
  role: ScoringModelRole;
  name: string;
  type: string;
}
