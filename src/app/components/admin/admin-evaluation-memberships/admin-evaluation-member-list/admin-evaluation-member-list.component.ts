/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import {
  AfterViewInit,
  Component,
  OnChanges,
  OnInit,
  input,
  output,
  viewChild
} from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSelectChange, MatSelect } from '@angular/material/select';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow } from '@angular/material/table';
import {
  Group,
  EvaluationMembership,
  EvaluationRole,
  User,
} from 'src/app/generated/cite.api';
import { MatToolbar, MatToolbarRow } from '@angular/material/toolbar';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatInput, MatSuffix } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

import { MatIconButton } from '@angular/material/button';
import { MatOption } from '@angular/material/autocomplete';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
    selector: 'app-admin-evaluation-member-list',
    templateUrl: './admin-evaluation-member-list.component.html',
    styleUrls: ['./admin-evaluation-member-list.component.scss'],
    imports: [MatToolbar, MatToolbarRow, MatIcon, MatFormField, MatInput, FormsModule, MatIconButton, MatSuffix, MatPaginator, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, MatSelect, MatOption, MatTooltip, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow]
})
export class AdminEvaluationMemberListComponent
  implements OnInit, OnChanges, AfterViewInit
{
  readonly memberships = input<EvaluationMembership[]>(undefined);

  readonly users = input<User[]>(undefined);

  readonly groups = input<Group[]>(undefined);

  readonly roles = input<EvaluationRole[]>(undefined);

  readonly canEdit = input<boolean>(undefined);

  readonly deleteMembership = output<string>();

  readonly editMembership = output<EvaluationMembership>();

  viewColumns = ['name', 'type', 'role'];
  editColumns = ['actions'];
  displayedColumns = this.viewColumns;
  dataSource = new MatTableDataSource<EvaluationMembershipModel>();

  filterString = '';

  constructor() {}

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator();
    this.dataSource.sort = this.sort();
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

  ngOnInit(): void {}

  ngOnChanges() {
    this.buildModel();

    this.displayedColumns = this.viewColumns.concat(
      this.canEdit() ? this.editColumns : []
    );
  }

  buildModel() {
    this.dataSource.data = this.memberships()
      .map((x) => {
        const user = this.users().find((u) => u.id === x.userId);
        const group = this.groups().find((g) => g.id === x.groupId);
        const role = this.roles().find((r) => r.id === x.roleId);

        const membership = {
          membership: x,
          role: role,
        } as EvaluationMembershipModel;

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

export interface EvaluationMembershipModel {
  membership: EvaluationMembership;
  user: User;
  group: Group;
  role: EvaluationRole;
  name: string;
  type: string;
}
