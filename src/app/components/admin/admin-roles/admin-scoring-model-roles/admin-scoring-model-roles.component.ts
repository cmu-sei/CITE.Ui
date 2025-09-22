/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { Component, inject, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import {
  ScoringModelPermission,
  ScoringModelRole,
} from 'src/app/generated/cite.api';
import { ScoringModelRolesModel } from './admin-scoring-model-roles.models';
import { map } from 'rxjs/operators';
import { ScoringModelRoleDataService } from 'src/app/data/scoring-model/scoring-model-role-data.service';

@Component({
  selector: 'app-admin-scoring-model-roles',
  templateUrl: './admin-scoring-model-roles.component.html',
  styleUrls: ['./admin-scoring-model-roles.component.scss'],
})
export class AdminScoringModelRolesComponent implements OnInit {
  private scoringModelRoleService = inject(ScoringModelRoleDataService);

  public allPermission = 'All';

  public permissionMap = ScoringModelRolesModel.ScoringModelPermissions;

  public dataSource = new MatTableDataSource<string>([
    ...[this.allPermission],
    ...Object.values(ScoringModelPermission),
  ]);

  public roles$ = this.scoringModelRoleService.scoringModelRoles$.pipe(
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
    this.scoringModelRoleService.loadRoles().subscribe();
  }

  trackById(index: number, item: any) {
    return item.id;
  }

  hasPermission(permission: string, role: ScoringModelRole) {
    if (permission === this.allPermission) {
      return role.allPermissions;
    }

    return role.permissions.some((x) => x === permission);
  }
}
