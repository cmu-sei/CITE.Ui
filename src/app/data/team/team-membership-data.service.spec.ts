// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import {
  TeamMembership,
  TeamMembershipsService,
} from '../../generated/cite.api';
import { TeamMembershipDataService } from './team-membership-data.service';
import { ApiStub } from '../../test-utils/api-stub';
import { getDefaultProviders } from '../../test-utils/default-test-providers';

type TeamMembershipApi = ApiStub<TeamMembershipsService>;

function setup(overrides: TeamMembershipApi = {}) {
  const api = {
    getAllTeamMemberships: vi.fn(() =>
      of([
        { id: 'tm1', teamId: 't1', userId: 'u1' },
        { id: 'tm2', teamId: 't1', userId: 'u2' },
      ]),
    ),
    createTeamMembership: vi.fn((teamId: string, m?: TeamMembership) =>
      of({ ...m, teamId, id: 'tm-new' }),
    ),
    updateTeamMembership: vi.fn((id: string, m?: TeamMembership) =>
      of({ ...m, id }),
    ),
    deleteTeamMembership: vi.fn(() => of(null)),
    ...overrides,
  } satisfies TeamMembershipApi;
  TestBed.configureTestingModule({
    providers: getDefaultProviders([
      { provide: TeamMembershipsService, useValue: api },
      TeamMembershipDataService,
    ]),
  });
  return { service: TestBed.inject(TeamMembershipDataService), api };
}

describe('TeamMembershipDataService', () => {
  /**
   * Verifies: loadMemberships() fetches the team's memberships and publishes them on teamMemberships$.
   * Interacts with: TeamMembershipsService.getAllTeamMemberships stub, teamMemberships$.
   * Data: team t1 with two memberships.
   */
  it('loadMemberships() publishes the team memberships', async () => {
    const { service, api } = setup();
    await firstValueFrom(service.loadMemberships('t1'));
    expect(api.getAllTeamMemberships).toHaveBeenCalledWith('t1');
    expect(
      (await firstValueFrom(service.teamMemberships$)).map((m) => m.id),
    ).toEqual(['tm1', 'tm2']);
  });

  /**
   * Verifies: createMembership() sends the membership for the team and appends the API's copy.
   * Interacts with: TeamMembershipsService.createTeamMembership stub, teamMemberships$.
   * Data: two loaded memberships; u3 added.
   */
  it('createMembership() appends the created membership', async () => {
    const { service, api } = setup();
    await firstValueFrom(service.loadMemberships('t1'));
    await firstValueFrom(service.createMembership('t1', { userId: 'u3' }));
    expect(api.createTeamMembership).toHaveBeenCalledWith('t1', {
      userId: 'u3',
    });
    const memberships = await firstValueFrom(service.teamMemberships$);
    expect(memberships.map((m) => m.id)).toEqual(['tm1', 'tm2', 'tm-new']);
  });

  /**
   * Verifies: editMembership() updates the membership in place with the API's copy.
   * Interacts with: TeamMembershipsService.updateTeamMembership stub, teamMemberships$.
   * Data: two loaded memberships; tm1 re-roled to r-lead.
   */
  it('editMembership() updates the membership in place', async () => {
    const { service } = setup();
    await firstValueFrom(service.loadMemberships('t1'));
    await firstValueFrom(
      service.editMembership({ id: 'tm1', roleId: 'r-lead' }),
    );
    const memberships = await firstValueFrom(service.teamMemberships$);
    expect(memberships.map((m) => [m.id, m.roleId])).toEqual([
      ['tm1', 'r-lead'],
      ['tm2', undefined],
    ]);
  });

  /**
   * Verifies: deleteMembership() calls the API and drops the membership.
   * Interacts with: TeamMembershipsService.deleteTeamMembership stub, teamMemberships$.
   * Data: two loaded memberships; tm2 deleted.
   */
  it('deleteMembership() removes the membership', async () => {
    const { service, api } = setup();
    await firstValueFrom(service.loadMemberships('t1'));
    await firstValueFrom(service.deleteMembership('tm2'));
    expect(api.deleteTeamMembership).toHaveBeenCalledWith('tm2');
    const memberships = await firstValueFrom(service.teamMemberships$);
    expect(memberships.map((m) => m.id)).toEqual(['tm1']);
  });

  /**
   * Verifies: updateStore() (TeamMembershipCreated/Updated) adds a pushed membership, then updates it in place.
   * Interacts with: TeamMembershipDataService.updateStore, teamMemberships$.
   * Data: empty list; tm9 pushed, then pushed again with a role.
   */
  it('updateStore() upserts a pushed membership', async () => {
    const { service } = setup();
    service.updateStore({ id: 'tm9', teamId: 't1', userId: 'u9' });
    service.updateStore({
      id: 'tm9',
      teamId: 't1',
      userId: 'u9',
      roleId: 'r1',
    });
    expect(await firstValueFrom(service.teamMemberships$)).toEqual([
      { id: 'tm9', teamId: 't1', userId: 'u9', roleId: 'r1' },
    ]);
  });

  /**
   * Verifies: deleteFromStore() (TeamMembershipDeleted) removes a membership by id.
   * Interacts with: TeamMembershipDataService.deleteFromStore, teamMemberships$.
   * Data: two loaded memberships; tm1 removed.
   */
  it('deleteFromStore() removes the membership by id', async () => {
    const { service } = setup();
    await firstValueFrom(service.loadMemberships('t1'));
    service.deleteFromStore('tm1');
    const memberships = await firstValueFrom(service.teamMemberships$);
    expect(memberships.map((m) => m.id)).toEqual(['tm2']);
  });
});
