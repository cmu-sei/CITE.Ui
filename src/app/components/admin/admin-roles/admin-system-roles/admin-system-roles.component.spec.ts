// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { CrucibleDialogService } from '@cmusei/crucible-common';
import {
  SystemPermission,
  SystemRole,
  SystemRolesService,
} from '../../../../generated/cite.api';
import { ApiStub } from '../../../../test-utils/api-stub';
import { dialogRefStub } from '../../../../test-utils/dialog-refs';
import { matDialogStub } from '../../../../test-utils/mat-dialog';
import { permissionDataProviders } from '../../../../test-utils/mock-permission-data.service';
import { renderComponent } from '../../../../test-utils/render-component';
import { AdminSystemRolesComponent } from './admin-system-roles.component';

const ROLES: SystemRole[] = [
  {
    id: 'r-admin',
    name: 'Administrator',
    immutable: true,
    allPermissions: true,
    permissions: [],
  },
  {
    id: 'r-dev',
    name: 'Content Developer',
    immutable: false,
    allPermissions: false,
    permissions: [SystemPermission.ViewEvaluations],
  },
];

async function renderSystemRoles(system: SystemPermission[]) {
  const rolesApi = {
    getAllSystemRoles: vi.fn(() => of(structuredClone(ROLES))),
    createSystemRole: vi.fn((role?: SystemRole) =>
      of({ ...role, id: 'r-new', permissions: [] }),
    ),
    updateSystemRole: vi.fn((id: string, role?: SystemRole) =>
      of({ ...role, id }),
    ),
    deleteSystemRole: vi.fn(() => of(null)),
  } satisfies ApiStub<SystemRolesService>;
  const confirm = vi.fn(() => dialogRefStub<unknown, boolean>(true).dialogRef);
  const dialogService: Pick<CrucibleDialogService, 'confirm'> = { confirm };
  const nameDialog = matDialogStub({ nameValue: 'Observer' });

  const rendered = await renderComponent(AdminSystemRolesComponent, {
    declarations: [AdminSystemRolesComponent],
    imports: [
      MatButtonModule,
      MatCheckboxModule,
      MatIconModule,
      MatTableModule,
      MatTooltipModule,
    ],
    providers: [
      ...permissionDataProviders({ system }),
      { provide: SystemRolesService, useValue: rolesApi },
      { provide: CrucibleDialogService, useValue: dialogService },
      { provide: MatDialog, useValue: nameDialog.dialog },
    ],
  });
  // Role queries are slow over this 19-row table in jsdom (the global
  // stylesheets make computed-style lookups slow): the header row is found by
  // its text, and Rename and Delete, named only by their title, by that title.
  const header = () =>
    screen
      .getByText('Permissions', { exact: false, selector: 'th' })
      .closest('tr') as HTMLElement;
  // Each permission row: the permission cell, then one checkbox cell per role
  // (Administrator, then Content Developer; immutable roles sort first).
  const permissionRow = (permission: string) =>
    screen
      .getByText(permission, { exact: true, selector: 'td' })
      .closest('tr') as HTMLElement;
  return {
    ...rendered,
    rolesApi,
    confirm,
    nameDialog,
    header,
    permissionRow,
    user: userEvent.setup(),
  };
}

describe('AdminSystemRolesComponent', () => {
  /**
   * Verifies: the roles become columns, immutable first, with the permissions each role holds ticked.
   * Interacts with: real RoleDataService over a stubbed SystemRolesService.
   * Data: Administrator (immutable, all permissions) and Content Developer (ViewEvaluations).
   */
  it('shows each role as a column with its permissions', async () => {
    const { header, permissionRow } = await renderSystemRoles([
      SystemPermission.ManageRoles,
    ]);

    expect(
      within(header())
        .getAllByRole('columnheader')
        .map((h) => h.querySelector('p')?.textContent),
    ).toEqual([undefined, 'Administrator', 'Content Developer']);
    const [developerView] = within(
      permissionRow(SystemPermission.ViewEvaluations),
    ).getAllByRole('checkbox');
    expect(developerView).toBeChecked();
  });

  /**
   * Verifies: with ManageRoles, Add is enabled, the mutable role can be renamed and deleted, and its checkboxes toggle permissions.
   * Interacts with: real PermissionDataService.hasPermission, SystemRolesService.updateSystemRole stub.
   * Data: system [ManageRoles]; ViewUsers ticked for Content Developer.
   */
  it('enables role editing with ManageRoles', async () => {
    const { header, permissionRow, rolesApi, user } = await renderSystemRoles([
      SystemPermission.ManageRoles,
    ]);

    expect(
      within(header()).getByRole('button', { description: 'Add New Role' }),
    ).toBeEnabled();
    expect(within(header()).getAllByTitle('Rename Role')).toHaveLength(1);
    expect(within(header()).getAllByTitle('Delete Role')).toHaveLength(1);

    const [developerViewUsers] = within(
      permissionRow(SystemPermission.ViewUsers),
    ).getAllByRole('checkbox');
    expect(developerViewUsers).toBeEnabled();
    await user.click(developerViewUsers);
    expect(rolesApi.updateSystemRole).toHaveBeenCalledWith(
      'r-dev',
      expect.objectContaining({
        permissions: [
          SystemPermission.ViewEvaluations,
          SystemPermission.ViewUsers,
        ],
      }),
    );
  });

  /**
   * Verifies: ViewRoles (a near miss) disables Add, hides Rename and Delete, and disables every checkbox.
   * Interacts with: real PermissionDataService.hasPermission.
   * Data: system [ViewRoles].
   */
  it('is read-only with ViewRoles only', async () => {
    const { header, permissionRow } = await renderSystemRoles([
      SystemPermission.ViewRoles,
    ]);

    expect(
      within(header()).getByRole('button', { description: 'Add New Role' }),
    ).toBeDisabled();
    expect(
      within(header()).queryByTitle('Rename Role'),
    ).not.toBeInTheDocument();
    expect(
      within(header()).queryByTitle('Delete Role'),
    ).not.toBeInTheDocument();
    for (const checkbox of within(
      permissionRow(SystemPermission.ViewUsers),
    ).getAllByRole('checkbox')) {
      expect(checkbox).toBeDisabled();
    }
  });

  /**
   * Verifies: Add creates a role with the name entered in the dialog.
   * Interacts with: matDialogStub (afterClosed answers a name), SystemRolesService.createSystemRole stub.
   * Data: system [ManageRoles]; the dialog returns 'Observer'.
   */
  it('creates a role named in the dialog', async () => {
    const { header, nameDialog, rolesApi, user } = await renderSystemRoles([
      SystemPermission.ManageRoles,
    ]);
    await user.click(
      within(header()).getByRole('button', { description: 'Add New Role' }),
    );

    expect(nameDialog.componentInstance['title']).toBe('Create New Role?');
    expect(rolesApi.createSystemRole).toHaveBeenCalledWith({
      name: 'Observer',
    });
  });

  /**
   * Verifies: a confirmed Delete removes the role through the API.
   * Interacts with: CrucibleDialogService.confirm stub (answers true), SystemRolesService.deleteSystemRole stub.
   * Data: system [ManageRoles]; Content Developer deleted.
   */
  it('deletes a role after confirmation', async () => {
    const { confirm, header, rolesApi, user } = await renderSystemRoles([
      SystemPermission.ManageRoles,
    ]);
    await user.click(within(header()).getByTitle('Delete Role'));

    expect(confirm).toHaveBeenCalledOnce();
    expect(rolesApi.deleteSystemRole).toHaveBeenCalledWith('r-dev');
  });
});
