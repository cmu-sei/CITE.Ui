// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import {
  MatTableDataSource,
  MatTable,
  MatColumnDef,
  MatHeaderCellDef,
  MatHeaderCell,
  MatCellDef,
  MatCell,
  MatHeaderRowDef,
  MatHeaderRow,
  MatRowDef,
  MatRow,
} from '@angular/material/table';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatCheckbox } from '@angular/material/checkbox';
import { AsyncPipe } from '@angular/common';
import { map } from 'rxjs/operators';
import { TeamPermission, TeamRole } from 'src/app/generated/cite.api';
import { TeamRoleDataService } from 'src/app/data/team/team-role-data.service';
import { TeamRolesModel } from './admin-team-roles.models';

// The team roles are seeded by the API and read-only, so this shows which
// permissions each one grants; a member's role is picked on the team's
// memberships.
@Component({
  selector: 'app-admin-team-roles',
  templateUrl: './admin-team-roles.component.html',
  styleUrls: ['./admin-team-roles.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    MatIconButton,
    MatTooltip,
    MatIcon,
    MatCheckbox,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    AsyncPipe,
  ],
})
export class AdminTeamRolesComponent implements OnInit {
  private teamRoleDataService = inject(TeamRoleDataService);

  public permissionMap = TeamRolesModel.TeamPermissions;

  public dataSource = new MatTableDataSource<string>(
    Object.values(TeamPermission),
  );

  public roles$ = this.teamRoleDataService.teamRoles$.pipe(
    map((roles) => [...roles].sort((a, b) => a.name.localeCompare(b.name))),
  );

  public displayedColumns$ = this.roles$.pipe(
    map((roles) => ['permissions', ...roles.map((role) => role.id)]),
  );

  ngOnInit(): void {
    this.teamRoleDataService.loadRoles().subscribe();
  }

  hasPermission(permission: string, role: TeamRole) {
    return (role.permissions ?? []).some((x) => x === permission);
  }
}
