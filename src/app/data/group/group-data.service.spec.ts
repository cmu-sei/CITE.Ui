// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { Group, GroupService } from '../../generated/cite.api';
import { GroupDataService } from './group-data.service';
import { ApiStub } from '../../test-utils/api-stub';
import { getDefaultProviders } from '../../test-utils/default-test-providers';

type GroupApi = ApiStub<GroupService>;

function setup() {
  const api = {
    getAllGroups: vi.fn(() =>
      of([
        { id: 'g1', name: 'Analysts' },
        { id: 'g2', name: 'Officials' },
      ]),
    ),
    createGroup: vi.fn((g?: Group) => of({ ...g, id: 'g-new' })),
    updateGroup: vi.fn((id: string, g?: Group) => of({ ...g, id })),
    deleteGroup: vi.fn(() => of(null)),
  } satisfies GroupApi;
  TestBed.configureTestingModule({
    providers: getDefaultProviders([
      { provide: GroupService, useValue: api },
      GroupDataService,
    ]),
  });
  return { service: TestBed.inject(GroupDataService), api };
}

describe('GroupDataService', () => {
  /**
   * Verifies: load() fetches the groups and publishes them on groups$.
   * Interacts with: GroupService.getAllGroups stub, groups$.
   * Data: two groups; groups$ starts empty.
   */
  it('load() publishes the groups', async () => {
    const { service } = setup();
    expect(await firstValueFrom(service.groups$)).toEqual([]);
    await firstValueFrom(service.load());
    expect((await firstValueFrom(service.groups$)).map((g) => g.name)).toEqual([
      'Analysts',
      'Officials',
    ]);
  });

  /**
   * Verifies: create() appends the API's new group.
   * Interacts with: GroupService.createGroup stub, groups$.
   * Data: two loaded groups; 'Observers' created.
   */
  it('create() appends the created group', async () => {
    const { service, api } = setup();
    await firstValueFrom(service.load());
    await firstValueFrom(service.create({ name: 'Observers' }));
    expect(api.createGroup).toHaveBeenCalledWith({ name: 'Observers' });
    expect((await firstValueFrom(service.groups$)).map((g) => g.id)).toEqual([
      'g1',
      'g2',
      'g-new',
    ]);
  });

  /**
   * Verifies: edit() replaces the group in place with the API's copy.
   * Interacts with: GroupService.updateGroup stub, groups$.
   * Data: two loaded groups; g1 renamed.
   */
  it('edit() replaces the group in place', async () => {
    const { service } = setup();
    await firstValueFrom(service.load());
    await firstValueFrom(service.edit({ id: 'g1', name: 'Senior Analysts' }));
    expect(await firstValueFrom(service.groups$)).toEqual([
      { id: 'g1', name: 'Senior Analysts' },
      { id: 'g2', name: 'Officials' },
    ]);
  });

  /**
   * Verifies: delete() calls the API and removes the group.
   * Interacts with: GroupService.deleteGroup stub, groups$.
   * Data: two loaded groups; g2 deleted.
   */
  it('delete() removes the group', async () => {
    const { service, api } = setup();
    await firstValueFrom(service.load());
    await firstValueFrom(service.delete('g2'));
    expect(api.deleteGroup).toHaveBeenCalledWith('g2');
    expect((await firstValueFrom(service.groups$)).map((g) => g.id)).toEqual([
      'g1',
    ]);
  });

  /**
   * Verifies: editing a group that is not in the list leaves the list unchanged.
   * Interacts with: GroupService.updateGroup stub, groups$.
   * Data: two loaded groups; an edit for unknown group g9.
   */
  it('edit() ignores a group it does not hold', async () => {
    const { service } = setup();
    await firstValueFrom(service.load());
    await firstValueFrom(service.edit({ id: 'g9', name: 'Ghost' }));
    expect((await firstValueFrom(service.groups$)).map((g) => g.id)).toEqual([
      'g1',
      'g2',
    ]);
  });
});
