// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import {
  EvaluationMembership,
  EvaluationMembershipsService,
} from '../../generated/cite.api';
import { EvaluationMembershipDataService } from './evaluation-membership-data.service';
import { ApiStub } from '../../test-utils/api-stub';
import { getDefaultProviders } from '../../test-utils/default-test-providers';

type MembershipApi = ApiStub<EvaluationMembershipsService>;

function setup() {
  const api = {
    getAllEvaluationMemberships: vi.fn((evaluationId: string) =>
      of([
        { id: 'em1', evaluationId, userId: 'u1', roleId: 'member' },
        { id: 'em2', evaluationId, groupId: 'g1', roleId: 'member' },
      ]),
    ),
    createEvaluationMembership: vi.fn(
      (evaluationId: string, m?: EvaluationMembership) =>
        of({ ...m, evaluationId, id: 'em-new' }),
    ),
    updateEvaluationMembership: vi.fn((id: string, m?: EvaluationMembership) =>
      of({ ...m, id }),
    ),
    deleteEvaluationMembership: vi.fn(() => of(null)),
  } satisfies MembershipApi;
  TestBed.configureTestingModule({
    providers: getDefaultProviders([
      { provide: EvaluationMembershipsService, useValue: api },
      EvaluationMembershipDataService,
    ]),
  });
  return { service: TestBed.inject(EvaluationMembershipDataService), api };
}

describe('EvaluationMembershipDataService', () => {
  /**
   * Verifies: loadMemberships() publishes the evaluation's user and group memberships.
   * Interacts with: EvaluationMembershipsService.getAllEvaluationMemberships stub, evaluationMemberships$.
   * Data: evaluation e1 with a user and a group membership.
   */
  it('loadMemberships() publishes the memberships', async () => {
    const { service, api } = setup();
    await firstValueFrom(service.loadMemberships('e1'));
    expect(api.getAllEvaluationMemberships).toHaveBeenCalledWith('e1');
    expect(
      (await firstValueFrom(service.evaluationMemberships$)).map((m) => m.id),
    ).toEqual(['em1', 'em2']);
  });

  /**
   * Verifies: createMembership() sends the membership for the evaluation and appends the API's copy.
   * Interacts with: EvaluationMembershipsService.createEvaluationMembership stub, evaluationMemberships$.
   * Data: two loaded memberships; a user membership for u3 created.
   */
  it('createMembership() appends the created membership', async () => {
    const { service, api } = setup();
    await firstValueFrom(service.loadMemberships('e1'));
    await firstValueFrom(
      service.createMembership('e1', { userId: 'u3', roleId: 'member' }),
    );
    expect(api.createEvaluationMembership).toHaveBeenCalledWith('e1', {
      userId: 'u3',
      roleId: 'member',
    });
    const list = await firstValueFrom(service.evaluationMemberships$);
    expect(list.map((m) => m.id)).toEqual(['em1', 'em2', 'em-new']);
  });

  /**
   * Verifies: editMembership() replaces the membership in place with the API's copy.
   * Interacts with: EvaluationMembershipsService.updateEvaluationMembership stub, evaluationMemberships$.
   * Data: two loaded memberships; em1 promoted to owner.
   */
  it('editMembership() updates the membership in place', async () => {
    const { service, api } = setup();
    await firstValueFrom(service.loadMemberships('e1'));
    await firstValueFrom(
      service.editMembership({ id: 'em1', roleId: 'owner' }),
    );
    expect(api.updateEvaluationMembership).toHaveBeenCalledWith('em1', {
      id: 'em1',
      roleId: 'owner',
    });
    const list = await firstValueFrom(service.evaluationMemberships$);
    expect(list.map((m) => [m.id, m.roleId])).toEqual([
      ['em1', 'owner'],
      ['em2', 'member'],
    ]);
  });

  /**
   * Verifies: deleteMembership() calls the API and drops the membership.
   * Interacts with: EvaluationMembershipsService.deleteEvaluationMembership stub, evaluationMemberships$.
   * Data: two loaded memberships; em2 deleted.
   */
  it('deleteMembership() removes the membership', async () => {
    const { service, api } = setup();
    await firstValueFrom(service.loadMemberships('e1'));
    await firstValueFrom(service.deleteMembership('em2'));
    expect(api.deleteEvaluationMembership).toHaveBeenCalledWith('em2');
    const list = await firstValueFrom(service.evaluationMemberships$);
    expect(list.map((m) => m.id)).toEqual(['em1']);
  });

  /**
   * Verifies: updateStore() adds a pushed membership.
   * Interacts with: EvaluationMembershipDataService.updateStore, evaluationMemberships$.
   * Data: empty list; membership x pushed.
   */
  it('updateStore() adds a pushed membership', async () => {
    const { service } = setup();
    service.updateStore({ id: 'x', evaluationId: 'e1', userId: 'u1' });
    expect(
      (await firstValueFrom(service.evaluationMemberships$)).map((m) => m.id),
    ).toEqual(['x']);
  });

  /**
   * Verifies: deleteFromStore() removes a membership by id.
   * Interacts with: EvaluationMembershipDataService.deleteFromStore, evaluationMemberships$.
   * Data: two loaded memberships; em1 removed.
   */
  it('deleteFromStore() removes the membership', async () => {
    const { service } = setup();
    await firstValueFrom(service.loadMemberships('e1'));
    service.deleteFromStore('em1');
    expect(
      (await firstValueFrom(service.evaluationMemberships$)).map((m) => m.id),
    ).toEqual(['em2']);
  });
});
