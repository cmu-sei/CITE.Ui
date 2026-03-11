// Copyright 2024 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { of } from 'rxjs';
import { AdminUsersComponent } from './admin-users.component';
import { renderComponent } from 'src/app/test-utils/render-component';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { UserQuery } from 'src/app/data/user/user.query';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { SystemPermission } from 'src/app/generated/cite.api';

async function renderAdminUsers(overrides: {
  users?: any[];
  permissions?: SystemPermission[];
} = {}) {
  const { users = [], permissions = [] } = overrides;

  const mockPermissionDataService = {
    load: () => of([]),
    permissions: permissions,
    hasPermission: (p: SystemPermission) => permissions.includes(p),
  };

  return renderComponent(AdminUsersComponent, {
    declarations: [AdminUsersComponent],
    providers: [
      {
        provide: UserDataService,
        useValue: {
          load: () => of([]),
          create: () => of({}),
          delete: () => of({}),
          setCurrentUser: () => {},
        },
      },
      {
        provide: UserQuery,
        useValue: {
          selectAll: () => of(users),
          selectLoading: () => of(false),
          select: () => of(null),
          selectEntity: () => of(null),
          selectActive: () => of(null),
          selectActiveId: () => of(null),
          getAll: () => users,
          getEntity: () => null,
        },
      },
      { provide: PermissionDataService, useValue: mockPermissionDataService },
    ],
  });
}

describe('AdminUsersComponent', () => {
  it('should create', async () => {
    const { fixture } = await renderAdminUsers();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should set canEdit to true when ManageUsers permission present', async () => {
    const { fixture } = await renderAdminUsers({
      permissions: [SystemPermission.ManageUsers],
    });
    expect(fixture.componentInstance.canEdit).toBe(true);
  });

  it('should set canEdit to false when ManageUsers permission absent', async () => {
    const { fixture } = await renderAdminUsers({ permissions: [] });
    expect(fixture.componentInstance.canEdit).toBe(false);
  });

  it('should initialize users$ observable on init', async () => {
    const { fixture } = await renderAdminUsers({
      users: [{ id: 'u1', name: 'Alice' }],
    });
    fixture.detectChanges();
    let result: any[] = [];
    fixture.componentInstance.users$.subscribe((u) => (result = u));
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Alice');
  });

  it('should initialize isLoading$ observable on init', async () => {
    const { fixture } = await renderAdminUsers();
    fixture.detectChanges();
    let loading = true;
    fixture.componentInstance.isLoading$.subscribe((l) => (loading = l));
    expect(loading).toBe(false);
  });
});
