// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { TeamRole, TeamRolesService } from '../../generated/cite.api';
import { TeamRoleDataService } from './team-role-data.service';
import { ApiStub } from '../../test-utils/api-stub';
import { getDefaultProviders } from '../../test-utils/default-test-providers';

describe('TeamRoleDataService', () => {
  /**
   * Verifies: loadRoles() fetches every team role and publishes them on teamRoles$.
   * Interacts with: TeamRolesService.getAllTeamRoles stub, teamRoles$.
   * Data: two team roles; teamRoles$ starts empty.
   */
  it('loadRoles() publishes the team roles', async () => {
    const roles: TeamRole[] = [
      { id: 'r1', name: 'Member' },
      { id: 'r2', name: 'Observer' },
    ];
    const api = {
      getAllTeamRoles: vi.fn(() => of(roles)),
    } satisfies ApiStub<TeamRolesService>;
    TestBed.configureTestingModule({
      providers: getDefaultProviders([
        { provide: TeamRolesService, useValue: api },
        TeamRoleDataService,
      ]),
    });
    const service = TestBed.inject(TeamRoleDataService);
    expect(await firstValueFrom(service.teamRoles$)).toEqual([]);
    await firstValueFrom(service.loadRoles());
    expect(await firstValueFrom(service.teamRoles$)).toEqual(roles);
  });
});
