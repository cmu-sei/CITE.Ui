// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { GroupMembership, GroupService } from '../../generated/cite.api';
import { GroupMembershipDataService } from './group-membership.service';
import { ApiStub } from '../../test-utils/api-stub';
import { getDefaultProviders } from '../../test-utils/default-test-providers';

type GroupMembershipApi = ApiStub<GroupService>;

function setup() {
  const memberships: Record<string, GroupMembership[]> = {
    g1: [{ id: 'gm1', groupId: 'g1', userId: 'u1' }],
    g2: [{ id: 'gm2', groupId: 'g2', userId: 'u2' }],
  };
  const api = {
    getGroupMemberships: vi.fn((groupId: string) =>
      of(memberships[groupId] ?? []),
    ),
    createGroupMembership: vi.fn((groupId: string, m?: GroupMembership) =>
      of({ ...m, groupId, id: 'gm-new' }),
    ),
    deleteGroupMembership: vi.fn(() => of(null)),
  } satisfies GroupMembershipApi;
  TestBed.configureTestingModule({
    providers: getDefaultProviders([
      { provide: GroupService, useValue: api },
      GroupMembershipDataService,
    ]),
  });
  return { service: TestBed.inject(GroupMembershipDataService), api };
}

describe('GroupMembershipDataService', () => {
  /**
   * Verifies: loading two groups' memberships keeps both in groupMemberships$.
   * Interacts with: GroupService.getGroupMemberships stub, groupMemberships$.
   * Data: groups g1 and g2 with one membership each.
   */
  it('accumulates memberships loaded for several groups', async () => {
    const { service } = setup();
    await firstValueFrom(service.loadMemberships('g1'));
    await firstValueFrom(service.loadMemberships('g2'));
    expect(
      (await firstValueFrom(service.groupMemberships$)).map((m) => m.id),
    ).toEqual(['gm1', 'gm2']);
  });

  /**
   * Verifies: selectMemberships() scopes the memberships to one group.
   * Interacts with: GroupService.getGroupMemberships stub, selectMemberships.
   * Data: groups g1 and g2 loaded; g2 selected.
   */
  it('selectMemberships() returns one group', async () => {
    const { service } = setup();
    await firstValueFrom(service.loadMemberships('g1'));
    await firstValueFrom(service.loadMemberships('g2'));
    expect(
      (await firstValueFrom(service.selectMemberships('g2'))).map((m) => m.id),
    ).toEqual(['gm2']);
  });

  /**
   * Verifies: reloading a group replaces its memberships in place instead of duplicating them.
   * Interacts with: GroupService.getGroupMemberships stub, groupMemberships$.
   * Data: g1 loaded twice.
   */
  it('does not duplicate memberships on reload', async () => {
    const { service } = setup();
    await firstValueFrom(service.loadMemberships('g1'));
    await firstValueFrom(service.loadMemberships('g1'));
    expect(await firstValueFrom(service.groupMemberships$)).toHaveLength(1);
  });

  /**
   * Verifies: createMembership() sends the membership for the group and adds the API's copy.
   * Interacts with: GroupService.createGroupMembership stub, selectMemberships.
   * Data: g1 loaded; u5 added to g1.
   */
  it('createMembership() adds the created membership', async () => {
    const { service, api } = setup();
    await firstValueFrom(service.loadMemberships('g1'));
    await firstValueFrom(service.createMembership('g1', { userId: 'u5' }));
    expect(api.createGroupMembership).toHaveBeenCalledWith('g1', {
      userId: 'u5',
    });
    expect(
      (await firstValueFrom(service.selectMemberships('g1'))).map((m) => m.id),
    ).toEqual(['gm1', 'gm-new']);
  });

  /**
   * Verifies: deleteMembership() calls the API and removes the membership.
   * Interacts with: GroupService.deleteGroupMembership stub, selectMemberships.
   * Data: g1 loaded; gm1 deleted.
   */
  it('deleteMembership() removes the membership', async () => {
    const { service, api } = setup();
    await firstValueFrom(service.loadMemberships('g1'));
    await firstValueFrom(service.deleteMembership('gm1'));
    expect(api.deleteGroupMembership).toHaveBeenCalledWith('gm1');
    expect(await firstValueFrom(service.selectMemberships('g1'))).toEqual([]);
  });

  /**
   * Verifies: updateStore() adds a pushed membership.
   * Interacts with: GroupMembershipDataService.updateStore, selectMemberships.
   * Data: empty list; membership x pushed for g1.
   */
  it('updateStore() adds a pushed membership', async () => {
    const { service } = setup();
    service.updateStore({ id: 'x', groupId: 'g1', userId: 'u1' });
    expect(
      (await firstValueFrom(service.selectMemberships('g1'))).map((m) => m.id),
    ).toEqual(['x']);
  });

  /**
   * Verifies: deleteFromStore() removes a membership by id.
   * Interacts with: GroupMembershipDataService.deleteFromStore, groupMemberships$.
   * Data: g1 loaded; gm1 removed.
   */
  it('deleteFromStore() removes the membership', async () => {
    const { service } = setup();
    await firstValueFrom(service.loadMemberships('g1'));
    service.deleteFromStore('gm1');
    expect(await firstValueFrom(service.groupMemberships$)).toEqual([]);
  });
});
