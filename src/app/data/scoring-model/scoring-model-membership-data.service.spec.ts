// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import {
  ScoringModelMembership,
  ScoringModelMembershipsService,
} from '../../generated/cite.api';
import { ScoringModelMembershipDataService } from './scoring-model-membership-data.service';
import { ApiStub } from '../../test-utils/api-stub';
import { getDefaultProviders } from '../../test-utils/default-test-providers';

type MembershipApi = ApiStub<ScoringModelMembershipsService>;

function setup() {
  const api = {
    getAllScoringModelMemberships: vi.fn((scoringModelId: string) =>
      of([{ id: 'sm-m1', scoringModelId, userId: 'u1', roleId: 'r1' }]),
    ),
    createScoringModelMembership: vi.fn(
      (scoringModelId: string, m?: ScoringModelMembership) =>
        of({ ...m, scoringModelId, id: 'sm-m2' }),
    ),
    updateScoringModelMembership: vi.fn(
      (id: string, m?: ScoringModelMembership) => of({ ...m, id }),
    ),
    deleteScoringModelMembership: vi.fn(() => of(null)),
  } satisfies MembershipApi;
  TestBed.configureTestingModule({
    providers: getDefaultProviders([
      { provide: ScoringModelMembershipsService, useValue: api },
      ScoringModelMembershipDataService,
    ]),
  });
  return { service: TestBed.inject(ScoringModelMembershipDataService), api };
}

describe('ScoringModelMembershipDataService', () => {
  /**
   * Verifies: loadMemberships() replaces scoringModelMemberships$ with the model's memberships.
   * Interacts with: ScoringModelMembershipsService.getAllScoringModelMemberships stub.
   * Data: scoring model sm1 with one membership.
   */
  it('loadMemberships() publishes the memberships', async () => {
    const { service, api } = setup();
    await firstValueFrom(service.loadMemberships('sm1'));
    expect(api.getAllScoringModelMemberships).toHaveBeenCalledWith('sm1');
    expect(await firstValueFrom(service.scoringModelMemberships$)).toEqual([
      { id: 'sm-m1', scoringModelId: 'sm1', userId: 'u1', roleId: 'r1' },
    ]);
  });

  /**
   * Verifies: createMembership() sends the membership for the model and appends the API's copy.
   * Interacts with: ScoringModelMembershipsService.createScoringModelMembership stub.
   * Data: one loaded membership; a group membership created.
   */
  it('createMembership() appends the created membership', async () => {
    const { service, api } = setup();
    await firstValueFrom(service.loadMemberships('sm1'));
    await firstValueFrom(
      service.createMembership('sm1', { groupId: 'g1', roleId: 'r1' }),
    );
    expect(api.createScoringModelMembership).toHaveBeenCalledWith('sm1', {
      groupId: 'g1',
      roleId: 'r1',
    });
    const list = await firstValueFrom(service.scoringModelMemberships$);
    expect(list.map((m) => m.id)).toEqual(['sm-m1', 'sm-m2']);
  });

  /**
   * Verifies: editMembership() replaces the membership in place with the API's copy.
   * Interacts with: ScoringModelMembershipsService.updateScoringModelMembership stub.
   * Data: one loaded membership; sm-m1 given role r2.
   */
  it('editMembership() updates the membership in place', async () => {
    const { service } = setup();
    await firstValueFrom(service.loadMemberships('sm1'));
    await firstValueFrom(service.editMembership({ id: 'sm-m1', roleId: 'r2' }));
    const list = await firstValueFrom(service.scoringModelMemberships$);
    expect(list.map((m) => [m.id, m.roleId])).toEqual([['sm-m1', 'r2']]);
  });

  /**
   * Verifies: deleteMembership() calls the API and drops the membership.
   * Interacts with: ScoringModelMembershipsService.deleteScoringModelMembership stub.
   * Data: one loaded membership; sm-m1 deleted.
   */
  it('deleteMembership() removes the membership', async () => {
    const { service, api } = setup();
    await firstValueFrom(service.loadMemberships('sm1'));
    await firstValueFrom(service.deleteMembership('sm-m1'));
    expect(api.deleteScoringModelMembership).toHaveBeenCalledWith('sm-m1');
    expect(await firstValueFrom(service.scoringModelMemberships$)).toEqual([]);
  });

  /**
   * Verifies: updateStore() adds a pushed membership.
   * Interacts with: ScoringModelMembershipDataService.updateStore.
   * Data: an empty list; membership x pushed.
   */
  it('updateStore() adds a pushed membership', async () => {
    const { service } = setup();
    service.updateStore({ id: 'x', scoringModelId: 'sm1', userId: 'u1' });
    expect(
      (await firstValueFrom(service.scoringModelMemberships$)).map((m) => m.id),
    ).toEqual(['x']);
  });

  /**
   * Verifies: deleteFromStore() removes a membership by id.
   * Interacts with: ScoringModelMembershipDataService.deleteFromStore.
   * Data: one loaded membership; sm-m1 removed.
   */
  it('deleteFromStore() removes the membership', async () => {
    const { service } = setup();
    await firstValueFrom(service.loadMemberships('sm1'));
    service.deleteFromStore('sm-m1');
    expect(await firstValueFrom(service.scoringModelMemberships$)).toEqual([]);
  });
});
