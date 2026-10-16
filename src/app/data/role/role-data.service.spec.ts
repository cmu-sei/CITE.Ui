// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import {
  SystemPermission,
  SystemRole,
  SystemRolesService,
} from '../../generated/cite.api';
import { RoleDataService } from './role-data.service';
import { ApiStub } from '../../test-utils/api-stub';
import { getDefaultProviders } from '../../test-utils/default-test-providers';

type SystemRolesApi = ApiStub<SystemRolesService>;

function setup() {
  const api = {
    getAllSystemRoles: vi.fn(() =>
      of([
        {
          id: 'admin',
          name: 'Administrator',
          allPermissions: true,
          immutable: true,
        },
        {
          id: 'observer',
          name: 'Observer',
          permissions: [SystemPermission.ViewEvaluations],
        },
      ]),
    ),
    createSystemRole: vi.fn((role?: SystemRole) => of({ ...role, id: 'new' })),
    updateSystemRole: vi.fn((id: string, role?: SystemRole) =>
      of({ ...role, id }),
    ),
    deleteSystemRole: vi.fn(() => of(null)),
  } satisfies SystemRolesApi;
  TestBed.configureTestingModule({
    providers: getDefaultProviders([
      { provide: SystemRolesService, useValue: api },
      RoleDataService,
    ]),
  });
  return { service: TestBed.inject(RoleDataService), api };
}

describe('RoleDataService', () => {
  /**
   * Verifies: getRoles() fetches the system roles and publishes them on roles$.
   * Interacts with: SystemRolesService.getAllSystemRoles stub, roles$.
   * Data: two roles; roles$ starts empty.
   */
  it('getRoles() publishes the system roles', async () => {
    const { service } = setup();
    expect(await firstValueFrom(service.roles$)).toEqual([]);
    await firstValueFrom(service.getRoles());
    expect((await firstValueFrom(service.roles$)).map((r) => r.id)).toEqual([
      'admin',
      'observer',
    ]);
  });

  /**
   * Verifies: createRole() appends the created role.
   * Interacts with: SystemRolesService.createSystemRole stub, roles$.
   * Data: two loaded roles; 'Editor' created.
   */
  it('createRole() appends the created role', async () => {
    const { service, api } = setup();
    await firstValueFrom(service.getRoles());
    await firstValueFrom(service.createRole({ name: 'Editor' }));
    expect(api.createSystemRole).toHaveBeenCalledWith({ name: 'Editor' });
    expect((await firstValueFrom(service.roles$)).map((r) => r.id)).toEqual([
      'admin',
      'observer',
      'new',
    ]);
  });

  /**
   * Verifies: editRole() merges the API's version into the existing role.
   * Interacts with: SystemRolesService.updateSystemRole stub, roles$.
   * Data: two loaded roles; observer gains EditEvaluations.
   */
  it('editRole() updates the role in place', async () => {
    const { service, api } = setup();
    await firstValueFrom(service.getRoles());
    const edited: SystemRole = {
      id: 'observer',
      name: 'Observer',
      permissions: [
        SystemPermission.ViewEvaluations,
        SystemPermission.EditEvaluations,
      ],
    };
    await firstValueFrom(service.editRole(edited));
    expect(api.updateSystemRole).toHaveBeenCalledWith('observer', edited);
    const roles = await firstValueFrom(service.roles$);
    expect(roles.map((r) => r.id)).toEqual(['admin', 'observer']);
    expect(roles[1].permissions).toEqual([
      SystemPermission.ViewEvaluations,
      SystemPermission.EditEvaluations,
    ]);
  });

  /**
   * Verifies: deleteRole() calls the API and drops the role from roles$.
   * Interacts with: SystemRolesService.deleteSystemRole stub, roles$.
   * Data: two loaded roles; 'observer' deleted.
   */
  it('deleteRole() removes the role', async () => {
    const { service, api } = setup();
    await firstValueFrom(service.getRoles());
    await firstValueFrom(service.deleteRole('observer'));
    expect(api.deleteSystemRole).toHaveBeenCalledWith('observer');
    expect((await firstValueFrom(service.roles$)).map((r) => r.id)).toEqual([
      'admin',
    ]);
  });
});
