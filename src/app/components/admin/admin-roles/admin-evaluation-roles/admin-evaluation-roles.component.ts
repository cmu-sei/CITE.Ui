/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { Component, inject, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import {
  EvaluationPermission,
  EvaluationRole,
} from 'src/app/generated/cite.api';
import { EvaluationRolesModel } from './admin-evaluation-roles.models';
import { map } from 'rxjs/operators';
import { EvaluationRoleDataService } from 'src/app/data/evaluation/evaluation-role-data.service';

@Component({
  selector: 'app-admin-evaluation-roles',
  templateUrl: './admin-evaluation-roles.component.html',
  styleUrls: ['./admin-evaluation-roles.component.scss'],
})
export class AdminEvaluationRolesComponent implements OnInit {
  private evaluationRoleService = inject(EvaluationRoleDataService);

  public allPermission = 'All';

  public permissionMap = EvaluationRolesModel.EvaluationPermissions;

  public dataSource = new MatTableDataSource<string>([
    ...[this.allPermission],
    ...Object.values(EvaluationPermission),
  ]);

  public roles$ = this.evaluationRoleService.evaluationRoles$.pipe(
    map((roles) =>
      roles.sort((a, b) => {
        return a.name.localeCompare(b.name);
      })
    )
  );

  public displayedColumns$ = this.roles$.pipe(
    map((x) => {
      const columnNames = x.map((y) => y.name);
      return ['permissions', ...columnNames];
    })
  );

  ngOnInit(): void {
    this.evaluationRoleService.loadRoles().subscribe();
  }

  trackById(index: number, item: any) {
    return item.id;
  }

  hasPermission(permission: string, role: EvaluationRole) {
    if (permission === this.allPermission) {
      return role.allPermissions;
    }

    return role.permissions.some((x) => x === permission);
  }
}
