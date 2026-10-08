// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { CrucibleDialogService } from '@cmusei/crucible-common';
import {
  Group,
  GroupService,
  SystemPermission,
  UserService,
} from '../../../generated/cite.api';
import { ApiStub } from '../../../test-utils/api-stub';
import { dialogRefStub } from '../../../test-utils/dialog-refs';
import { matDialogStub } from '../../../test-utils/mat-dialog';
import { permissionDataProviders } from '../../../test-utils/mock-permission-data.service';
import { renderComponent } from '../../../test-utils/render-component';
import { AdminGroupsComponent } from './admin-groups.component';

@Component({ selector: 'app-admin-groups-detail', template: '' })
class GroupsDetailStubComponent {
  @Input() groupId!: string;
  @Input() canEdit!: boolean;
}

async function renderGroups(system: SystemPermission[]) {
  const groupApi = {
    getAllGroups: vi.fn(() =>
      of([
        { id: 'g1', name: 'Analysts' },
        { id: 'g2', name: 'Responders' },
      ]),
    ),
    createGroup: vi.fn((group?: Group) => of({ ...group, id: 'g-new' })),
    updateGroup: vi.fn((id: string, group?: Group) => of({ ...group, id })),
    deleteGroup: vi.fn(() => of(null)),
  } satisfies ApiStub<GroupService>;
  const userApi = {
    getUsers: vi.fn(() => of([{ id: 'u1', name: 'Alice' }])),
  } satisfies ApiStub<UserService>;
  const confirm = vi.fn(() => dialogRefStub<unknown, boolean>(true).dialogRef);
  const dialogService: Pick<CrucibleDialogService, 'confirm'> = { confirm };
  const nameDialog = matDialogStub({ nameValue: 'Coordinators' });

  const rendered = await renderComponent(AdminGroupsComponent, {
    declarations: [AdminGroupsComponent],
    imports: [
      MatButtonModule,
      MatFormFieldModule,
      MatIconModule,
      MatInputModule,
      MatSortModule,
      MatTableModule,
      MatTooltipModule,
      GroupsDetailStubComponent,
    ],
    providers: [
      ...permissionDataProviders({ system }),
      { provide: GroupService, useValue: groupApi },
      { provide: UserService, useValue: userApi },
      { provide: CrucibleDialogService, useValue: dialogService },
      { provide: MatDialog, useValue: nameDialog.dialog },
    ],
  });
  const user = userEvent.setup();
  const table = () => within(screen.getByRole('table'));
  const row = (name: string) =>
    table().getByRole('cell', { name }).closest('tr') as HTMLElement;
  const detail = () =>
    rendered.fixture.debugElement.query(By.directive(GroupsDetailStubComponent))
      ?.componentInstance as GroupsDetailStubComponent | undefined;
  return {
    ...rendered,
    groupApi,
    confirm,
    nameDialog,
    user,
    table,
    row,
    detail,
  };
}

describe('AdminGroupsComponent', () => {
  /**
   * Verifies: with ManageGroups Add, Delete and Rename are enabled and an expanded group's detail gets canEdit true.
   * Interacts with: real PermissionDataService.hasPermission, the rendered buttons, the detail child stub.
   * Data: system [ManageGroups]; Analysts expanded.
   */
  it('enables group editing with ManageGroups', async () => {
    const { detail, row, table, user } = await renderGroups([
      SystemPermission.ManageGroups,
    ]);

    expect(
      table().getByRole('button', { description: 'Add New Group' }),
    ).toBeEnabled();
    expect(
      within(row('Analysts')).getByRole('button', {
        description: 'Delete Analysts',
      }),
    ).toBeEnabled();
    expect(
      within(row('Analysts')).getByRole('button', { description: 'Rename' }),
    ).toBeEnabled();

    await user.click(
      within(row('Analysts')).getByRole('cell', { name: 'Analysts' }),
    );
    expect(detail()?.groupId).toBe('g1');
    expect(detail()?.canEdit).toBe(true);
  });

  /**
   * Verifies: ViewGroups (a near miss) leaves Add, Delete and Rename disabled and the detail read-only.
   * Interacts with: real PermissionDataService.hasPermission, the rendered buttons, the detail child stub.
   * Data: system [ViewGroups]; Analysts expanded.
   */
  it('disables group editing with ViewGroups only', async () => {
    const { detail, row, table, user } = await renderGroups([
      SystemPermission.ViewGroups,
    ]);

    expect(
      table().getByRole('button', { description: 'Add New Group' }),
    ).toBeDisabled();
    expect(
      within(row('Analysts')).getByRole('button', {
        description: 'Delete Analysts',
      }),
    ).toBeDisabled();
    expect(
      within(row('Analysts')).getByRole('button', { description: 'Rename' }),
    ).toBeDisabled();

    await user.click(
      within(row('Analysts')).getByRole('cell', { name: 'Analysts' }),
    );
    expect(detail()?.canEdit).toBe(false);
  });

  /**
   * Verifies: Add opens the name dialog and creates a group with the entered name.
   * Interacts with: matDialogStub (afterClosed answers a name), GroupService.createGroup stub.
   * Data: system [ManageGroups]; the dialog returns 'Coordinators'.
   */
  it('creates a group named in the dialog', async () => {
    const { groupApi, nameDialog, table, user } = await renderGroups([
      SystemPermission.ManageGroups,
    ]);
    await user.click(
      table().getByRole('button', { description: 'Add New Group' }),
    );

    expect(nameDialog.componentInstance['title']).toBe('Create New Group?');
    expect(groupApi.createGroup).toHaveBeenCalledWith({ name: 'Coordinators' });
  });

  /**
   * Verifies: a confirmed Delete removes the group through the API.
   * Interacts with: CrucibleDialogService.confirm stub (answers true), GroupService.deleteGroup stub.
   * Data: system [ManageGroups]; Responders deleted.
   */
  it('deletes a group after confirmation', async () => {
    const { confirm, groupApi, row, user } = await renderGroups([
      SystemPermission.ManageGroups,
    ]);
    await user.click(
      within(row('Responders')).getByRole('button', {
        description: 'Delete Responders',
      }),
    );

    expect(confirm).toHaveBeenCalledOnce();
    expect(groupApi.deleteGroup).toHaveBeenCalledWith('g2');
  });
});
