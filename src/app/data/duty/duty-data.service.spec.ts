// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { Duty, DutyService } from '../../generated/cite.api';
import { DutyDataService } from './duty-data.service';
import { DutyQuery } from './duty.query';
import { DutyStore } from './duty.store';
import { ApiStub } from '../../test-utils/api-stub';
import { activatedRouteStub } from '../../test-utils/activated-route';
import { getDefaultProviders } from '../../test-utils/default-test-providers';
import { recordEmissions } from '../../test-utils/record-emissions';
import {
  captureUnhandledRxErrors,
  flush,
} from '../../test-utils/unhandled-rx-errors';

type DutyApi = ApiStub<DutyService>;

// The API sends ISO strings at runtime; the generated model types them as Date.
const iso = (s: string) => s as unknown as Date;

function makeDuty(overrides: Partial<Duty> = {}): Duty {
  return {
    id: 'd1',
    evaluationId: 'e1',
    teamId: 't1',
    name: 'Scribe',
    users: [],
    dateCreated: iso('2026-01-01T00:00:00Z'),
    dateModified: iso('2026-01-02T00:00:00Z'),
    ...overrides,
  };
}

function setup(overrides: { api?: DutyApi; queryParams?: Params } = {}) {
  const api = {
    getDutiesByEvaluation: vi.fn(() => of([makeDuty({ id: 'by-eval' })])),
    getDutiesByEvaluationTeam: vi.fn(() => of([makeDuty({ id: 'by-team' })])),
    getDuty: vi.fn((id: string) => of(makeDuty({ id }))),
    createDuty: vi.fn((d?: Duty) => of({ ...d, id: 'new' })),
    updateDuty: vi.fn((_id: string, d?: Duty) => of({ ...d })),
    addUserToDuty: vi.fn((dutyId: string, userId: string) =>
      of(makeDuty({ id: dutyId, users: [{ id: userId }] })),
    ),
    removeUserFromDuty: vi.fn((dutyId: string) =>
      of(makeDuty({ id: dutyId, users: [] })),
    ),
    deleteDuty: vi.fn(() => of(null)),
    ...overrides.api,
  } satisfies DutyApi;
  const navigate = vi.fn();
  const router: Pick<Router, 'navigate'> = { navigate };
  const { route, setQueryParams } = activatedRouteStub(overrides.queryParams);

  TestBed.configureTestingModule({
    providers: getDefaultProviders([
      { provide: DutyService, useValue: api },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: route },
      DutyDataService,
    ]),
  });

  return {
    service: TestBed.inject(DutyDataService),
    query: TestBed.inject(DutyQuery),
    store: TestBed.inject(DutyStore),
    api,
    setQueryParams,
  };
}

describe('DutyDataService', () => {
  /**
   * Verifies: loadByEvaluation() replaces the store with the evaluation's duties, with Date fields.
   * Interacts with: DutyService.getDutiesByEvaluation stub, real DutyStore/DutyQuery.
   * Data: a stale duty; evaluation e1.
   */
  it('loadByEvaluation() loads the evaluation duties', () => {
    const { service, query, store, api } = setup();
    store.set([makeDuty({ id: 'stale' })]);
    service.loadByEvaluation('e1');
    expect(api.getDutiesByEvaluation).toHaveBeenCalledWith('e1');
    expect(query.getAll().map((d) => d.id)).toEqual(['by-eval']);
    expect(query.getEntity('by-eval')?.dateCreated).toBeInstanceOf(Date);
  });

  /**
   * Verifies: loadByEvaluationTeam() replaces the store with one team's duties.
   * Interacts with: DutyService.getDutiesByEvaluationTeam stub, DutyQuery.
   * Data: a stale duty; evaluation e1 and team t1.
   */
  it('loadByEvaluationTeam() loads the team duties', () => {
    const { service, query, store, api } = setup();
    store.set([makeDuty({ id: 'stale' })]);
    service.loadByEvaluationTeam('e1', 't1');
    expect(api.getDutiesByEvaluationTeam).toHaveBeenCalledWith('e1', 't1');
    expect(query.getAll().map((d) => d.id)).toEqual(['by-team']);
  });

  /**
   * Verifies: a failed load empties the store and clears loading.
   * Interacts with: DutyService.getDutiesByEvaluation (throws), DutyQuery.
   * Data: one stale duty; a 500 response.
   */
  it('empties the store when a load fails', async () => {
    const { service, query, store } = setup({
      api: {
        getDutiesByEvaluation: vi.fn(() =>
          throwError(() => new HttpErrorResponse({ status: 500 })),
        ),
      },
    });
    store.set([makeDuty()]);
    service.loadByEvaluation('e1');
    expect(await firstValueFrom(query.selectAll())).toEqual([]);
    expect(await firstValueFrom(query.selectLoading())).toBe(false);
  });

  /**
   * Verifies: assigning a user stores the duty the API returns.
   * Interacts with: DutyService.addUserToDuty stub, DutyQuery.
   * Data: duty d1 with no users; user u1 added.
   */
  it('addDutyUser() stores the updated duty', () => {
    const { service, query, store, api } = setup();
    store.set([makeDuty()]);
    service.addDutyUser('d1', 'u1');
    expect(api.addUserToDuty).toHaveBeenCalledWith('d1', 'u1');
    expect(query.getEntity('d1')?.users).toEqual([{ id: 'u1' }]);
  });

  /**
   * Verifies: unassigning a user stores the duty the API returns.
   * Interacts with: DutyService.removeUserFromDuty stub, DutyQuery.
   * Data: duty d1 with user u1; u1 removed.
   */
  it('removeDutyUser() stores the updated duty', () => {
    const { service, query, store, api } = setup();
    store.set([makeDuty({ users: [{ id: 'u1' }] })]);
    service.removeDutyUser('d1', 'u1');
    expect(api.removeUserFromDuty).toHaveBeenCalledWith('d1', 'u1');
    expect(query.getEntity('d1')?.users).toEqual([]);
  });

  /**
   * Verifies: add() stores the created duty with Date fields.
   * Interacts with: DutyService.createDuty stub, DutyQuery.
   * Data: empty store; the API assigns id 'new'.
   */
  it('add() stores the created duty', () => {
    const { service, query, store } = setup();
    store.set([]);
    service.add(makeDuty({ id: undefined }));
    expect(query.getEntity('new')?.dateCreated).toBeInstanceOf(Date);
  });

  /**
   * Verifies: updateDuty() replaces the stored duty with the API's response.
   * Interacts with: DutyService.updateDuty stub, DutyQuery.
   * Data: store holds d1; d1 renamed to Lead.
   */
  it('updateDuty() stores the updated duty', () => {
    const { service, query, store } = setup();
    store.set([makeDuty()]);
    service.updateDuty(makeDuty({ name: 'Lead' }));
    expect(query.getEntity('d1')?.name).toBe('Lead');
  });

  /**
   * Verifies: loadById() upserts the duty next to those already loaded.
   * Interacts with: DutyService.getDuty stub, DutyQuery.
   * Data: store holds d1; d2 is loaded.
   */
  it('loadById() upserts the duty', () => {
    const { service, query, store } = setup();
    store.set([makeDuty()]);
    service.loadById('d2');
    expect(query.getAll().map((d) => d.id)).toEqual(['d1', 'd2']);
  });

  /**
   * Verifies: delete() removes the duty; deleting the active one leaves no active duty.
   * Interacts with: DutyService.deleteDuty stub, DutyQuery.getActiveId.
   * Data: d1 active and d2; d1 deleted.
   */
  it('delete() removes the duty and the active id', () => {
    const { service, query, store, api } = setup();
    store.set([makeDuty(), makeDuty({ id: 'd2' })]);
    service.setActive('d1');
    const active = recordEmissions(query.selectActiveId());
    service.delete('d1');
    expect(api.deleteDuty).toHaveBeenCalledWith('d1');
    expect(query.getAll().map((d) => d.id)).toEqual(['d2']);
    expect(active).toEqual(['d1', null]);
  });

  describe('failed requests without an error callback', () => {
    const failure = new HttpErrorResponse({ status: 500 });
    const failing = () => vi.fn(() => throwError(() => failure));

    /**
     * Verifies: when loadById, add, updateDuty, addDutyUser or removeDutyUser fails, loading stays true, the store keeps d1 unchanged, and the error escapes.
     * Interacts with: the failing DutyService endpoint for each method, DutyQuery, captureUnhandledRxErrors.
     * Data: per row, store holds d1 and that endpoint answers 500.
     */
    it.each<{
      method: string;
      api: () => DutyApi;
      run: (service: DutyDataService) => void;
    }>([
      {
        method: 'loadById',
        api: () => ({ getDuty: failing() }),
        run: (service) => service.loadById('d1'),
      },
      {
        method: 'add',
        api: () => ({ createDuty: failing() }),
        run: (service) => service.add(makeDuty({ id: undefined })),
      },
      {
        method: 'updateDuty',
        api: () => ({ updateDuty: failing() }),
        run: (service) => service.updateDuty(makeDuty({ name: 'Lead' })),
      },
      {
        method: 'addDutyUser',
        api: () => ({ addUserToDuty: failing() }),
        run: (service) => service.addDutyUser('d1', 'u1'),
      },
      {
        method: 'removeDutyUser',
        api: () => ({ removeUserFromDuty: failing() }),
        run: (service) => service.removeDutyUser('d1', 'u1'),
      },
    ])('$method leaves loading stuck when it fails', async ({ api, run }) => {
      const errors = captureUnhandledRxErrors();
      const { service, query, store } = setup({ api: api() });
      store.set([makeDuty()]);
      run(service);
      await flush();
      expect(query.getValue().loading).toBe(true);
      expect(query.getAll()).toEqual([makeDuty()]);
      // The escaped error reaches ErrorService, the app's ErrorHandler
      // (app.module.ts), which shows it.
      expect(errors).toEqual([failure]);
    });
  });

  /**
   * Verifies: updateStore() upserts a pushed duty.
   * Interacts with: DutyDataService.updateStore, DutyQuery.
   * Data: store holds d1; d1 renamed by a push.
   */
  it('updateStore() applies a pushed duty', () => {
    const { service, query, store } = setup();
    store.set([makeDuty()]);
    service.updateStore(makeDuty({ name: 'Pushed' }));
    expect(query.getEntity('d1')?.name).toBe('Pushed');
  });

  /**
   * Verifies: deleteFromStore() removes the duty.
   * Interacts with: DutyDataService.deleteFromStore, DutyQuery.
   * Data: store holds d1.
   */
  it('deleteFromStore() removes the duty', () => {
    const { service, query, store } = setup();
    store.set([makeDuty()]);
    service.deleteFromStore('d1');
    expect(query.getAll()).toEqual([]);
  });

  /**
   * Verifies: DutyList sorts by name, case-insensitively.
   * Interacts with: ActivatedRoute.queryParamMap stub, DutyDataService.DutyList.
   * Data: three duties named Scribe, lead, Liaison.
   */
  it('DutyList sorts by name', async () => {
    const { service, store } = setup();
    store.set([
      makeDuty({ id: 'd1', name: 'Scribe' }),
      makeDuty({ id: 'd2', name: 'lead' }),
      makeDuty({ id: 'd3', name: 'Liaison' }),
    ]);
    const list = await firstValueFrom(service.DutyList);
    expect(list.map((d) => d.id)).toEqual(['d2', 'd3', 'd1']);
  });

  /**
   * Verifies: DutyList filters by duty name or id from the dutymask query param.
   * Interacts with: ActivatedRoute.queryParamMap stub, DutyDataService.DutyList.
   * Data: three duties named Scribe, lead, Liaison; mask 'li'.
   */
  it('DutyList filters by dutymask', () => {
    const { service, store, setQueryParams } = setup();
    store.set([
      makeDuty({ id: 'd1', name: 'Scribe' }),
      makeDuty({ id: 'd2', name: 'lead' }),
      makeDuty({ id: 'd3', name: 'Liaison' }),
    ]);
    const lists = recordEmissions(service.DutyList);
    setQueryParams({ dutymask: 'li' });
    expect(lists[lists.length - 1].map((d) => d.id)).toEqual(['d3']);
  });
});
