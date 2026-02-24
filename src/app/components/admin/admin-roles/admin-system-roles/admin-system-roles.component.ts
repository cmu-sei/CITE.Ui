/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import {
  SystemPermission,
  SystemRole,
} from 'src/app/generated/cite.api';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { RoleDataService } from 'src/app/data/role/role-data.service';
import { ConfirmDialogService } from 'src/app/components/shared/confirm-dialog/service/confirm-dialog.service';
import { SystemRolesModel } from './admin-system-roles.models';
import { map, take } from 'rxjs/operators';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NameDialogComponent } from 'src/app/components/shared/name-dialog/name-dialog.component';
import { SignalRService } from 'src/app/services/signalr.service';

const NAME_VALUE = 'nameValue';

@Component({
  selector: 'app-admin-system-roles',
  templateUrl: './admin-system-roles.component.html',
  styleUrls: ['./admin-system-roles.component.scss'],
  standalone: false
})
export class AdminSystemRolesComponent implements OnInit, OnDestroy {
  private roleService = inject(RoleDataService);
  private dialog = inject(MatDialog);
  private confirmService = inject(ConfirmDialogService);
  private permissionDataService = inject(PermissionDataService);
  private signalRService = inject(SignalRService);
  private changeDetectorRef = inject(ChangeDetectorRef);
  private unsubscribe$ = new Subject();

  public canEdit = false;

  public allPermission = 'All';

  public permissionMap = SystemRolesModel.SystemPermissions;

  public dataSource = new MatTableDataSource<string>([
    ...[this.allPermission],
    ...Object.values(SystemPermission),
  ]);

  public roles$ = this.roleService.roles$.pipe(
    map((roles) =>
      roles.sort((a, b) => {
        // Sort by 'immutable' property first (false comes after true)
        if (a.immutable !== b.immutable) {
          return a.immutable ? -1 : 1; // Put `true` before `false`
        }
        // If 'immutable' values are the same, sort by 'name' (case-insensitive)
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
    this.roleService.getRoles().subscribe();
    this.permissionDataService.load().pipe(takeUntil(this.unsubscribe$)).subscribe(() => {
      this.canEdit = this.permissionDataService.hasPermission(SystemPermission.ManageRoles);
      this.changeDetectorRef.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

  trackById(index: number, item: any) {
    return item.id;
  }

  hasPermission(permission: string, role: SystemRole) {
    if (permission === this.allPermission) {
      return role.allPermissions;
    }

    return role.permissions.some((x) => x === permission);
  }

  setPermission(
    permission: string,
    role: SystemRole,
    event: MatCheckboxChange
  ) {
    if (permission === this.allPermission) {
      role.allPermissions = event.checked;
    } else {
      if (event.checked && !this.hasPermission(permission, role)) {
        role.permissions.push(permission as SystemPermission);
      } else if (!event.checked) {
        role.permissions = role.permissions.filter(
          (x) => x !== (permission as SystemPermission)
        );
      }
    }

    this.roleService.editRole(role).subscribe();
  }

  addRole() {
    this.nameDialog('Create New Role?', '', { nameValue: '' })
      .pipe(take(1))
      .subscribe((result) => {
        if (!result[this.confirmService.WAS_CANCELLED]) {
          this.roleService.createRole({ name: result[NAME_VALUE] }).subscribe();
        }
      });
  }

  renameRole(role: SystemRole) {
    this.nameDialog('Rename Role?', '', { nameValue: role.name })
      .pipe(take(1))
      .subscribe((result) => {
        if (!result[this.confirmService.WAS_CANCELLED]) {
          role.name = result[NAME_VALUE];
          this.roleService.editRole(role).subscribe();
        }
      });
  }

  deleteRole(role: SystemRole) {
    this.confirmService
      .confirmDialog(
        'Delete Role?',
        `Are you sure you want to delete ${role.name}?`,
        {
          buttonTrueText: 'Delete',
          buttonFalseText: 'Cancel',
        }
      )
      .subscribe((result) => {
        if (!result[this.confirmService.WAS_CANCELLED]) {
          this.roleService.deleteRole(role.id).subscribe();
        }
      });
  }

  nameDialog(title: string, message: string, data?: any): Observable<boolean> {
    const dialogRef = this.dialog.open(NameDialogComponent, {
      maxWidth: '90vw',
      width: 'auto',
      data: data || {},
    });
    dialogRef.componentInstance.title = title;
    dialogRef.componentInstance.message = message;

    return dialogRef.afterClosed();
  }
}
