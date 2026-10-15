// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { Action, ActionService } from '../../generated/cite.api';
import { ActionDataService } from './action-data.service';
import { ActionQuery } from './action.query';
import { ActionStore } from './action.store';
import { ApiStub } from '../../test-utils/api-stub';
import { activatedRouteStub } from '../../test-utils/activated-route';
import { getDefaultProviders } from '../../test-utils/default-test-providers';
import { recordEmissions } from '../../test-utils/record-emissions';
import {
  captureUnhandledRxErrors,
  flush,
} from '../../test-utils/unhandled-rx-errors';

type ActionApi = ApiStub<ActionService>;

// The API sends ISO strings at runtime; the generated model types them as Date.
const iso = (s: string) => s as unknown as Date;

function makeAction(overrides: Partial<Action> = {}): Action {
  return {
    id: 'a1',
    evaluationId: 'e1',
    teamId: 't1',
    moveNumber: 1,
    actionNumber: 1,
    description: 'Isolate the host',
    isChecked: false,
    dateCreated: iso('2026-01-01T00:00:00Z'),
    dateModified: iso('2026-01-02T00:00:00Z'),
    ...overrides,
  };
}

function setup(overrides: { api?: ActionApi; queryParams?: Params } = {}) {
  const api = {
    getActionsByEvaluation: vi.fn(() => of([makeAction({ id: 'by-eval' })])),
    getActionsByEvaluationTeam: vi.fn(() =>
      of([makeAction({ id: 'by-team' })]),
    ),
    getActionsByEvaluationMove: vi.fn(() =>
      of([makeAction({ id: 'by-move' })]),
    ),
    getActionsByEvaluationMoveTeam: vi.fn(() =>
      of([makeAction({ id: 'by-move-team' })]),
    ),
    getAction: vi.fn((id: string) => of(makeAction({ id }))),
    createAction: vi.fn((a?: Action) => of({ ...a, id: 'new' })),
    updateAction: vi.fn((_id: string, a?: Action) => of({ ...a })),
    checkAction: vi.fn((id: string) => of(makeAction({ id, isChecked: true }))),
    uncheckAction: vi.fn((id: string) =>
      of(makeAction({ id, isChecked: false })),
    ),
    deleteAction: vi.fn(() => of(null)),
    ...overrides.api,
  } satisfies ActionApi;
  const navigate = vi.fn();
  const router: Pick<Router, 'navigate'> = { navigate };
  const { route, setQueryParams } = activatedRouteStub(overrides.queryParams);

  TestBed.configureTestingModule({
    providers: getDefaultProviders([
      { provide: ActionService, useValue: api },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: route },
      ActionDataService,
    ]),
  });

  return {
    service: TestBed.inject(ActionDataService),
    query: TestBed.inject(ActionQuery),
    store: TestBed.inject(ActionStore),
    api,
    navigate,
    setQueryParams,
  };
}

describe('ActionDataService', () => {
  /**
   * Verifies: each load variant calls its endpoint with the right scope and replaces the store.
   * Interacts with: ActionService getActionsBy* stubs, real ActionStore/ActionQuery.
   * Data: evaluation e1, move 2, team t1; per row, one variant and the id its endpoint returns.
   */
  it.each<{
    method: string;
    run: (service: ActionDataService) => void;
    endpoint: (api: ReturnType<typeof setup>['api']) => unknown;
    args: unknown[];
    id: string;
  }>([
    {
      method: 'loadByEvaluation',
      run: (service) => service.loadByEvaluation('e1'),
      endpoint: (api) => api.getActionsByEvaluation,
      args: ['e1'],
      id: 'by-eval',
    },
    {
      method: 'loadByEvaluationTeam',
      run: (service) => service.loadByEvaluationTeam('e1', 't1'),
      endpoint: (api) => api.getActionsByEvaluationTeam,
      args: ['e1', 't1'],
      id: 'by-team',
    },
    {
      method: 'loadByEvaluationMove',
      run: (service) => service.loadByEvaluationMove('e1', 2),
      endpoint: (api) => api.getActionsByEvaluationMove,
      args: ['e1', 2],
      id: 'by-move',
    },
    {
      method: 'loadByEvaluationMoveTeam',
      run: (service) => service.loadByEvaluationMoveTeam('e1', 2, 't1'),
      endpoint: (api) => api.getActionsByEvaluationMoveTeam,
      args: ['e1', 2, 't1'],
      id: 'by-move-team',
    },
  ])(
    '$method loads its scope into the store',
    ({ run, endpoint, args, id }) => {
      const { service, query, store, api } = setup();
      store.set([makeAction({ id: 'stale' })]);
      run(service);
      expect(endpoint(api)).toHaveBeenCalledWith(...args);
      expect(query.getAll().map((a) => a.id)).toEqual([id]);
    },
  );

  /**
   * Verifies: loaded actions get Date objects for their created/modified dates.
   * Interacts with: ActionService.getActionsByEvaluation stub, ActionDataService.setAsDates.
   * Data: one action with ISO string dates.
   */
  it('converts the API date strings to Date objects', () => {
    const { service, query } = setup();
    service.loadByEvaluation('e1');
    expect(query.getEntity('by-eval')?.dateCreated).toEqual(
      new Date('2026-01-01T00:00:00Z'),
    );
  });

  /**
   * Verifies: a failed load empties the store and clears loading.
   * Interacts with: ActionService.getActionsByEvaluationMoveTeam (throws), ActionQuery.
   * Data: one stale action; a 500 response.
   */
  it('empties the store when a load fails', async () => {
    const { service, query, store } = setup({
      api: {
        getActionsByEvaluationMoveTeam: vi.fn(() =>
          throwError(() => new HttpErrorResponse({ status: 500 })),
        ),
      },
    });
    store.set([makeAction({ id: 'stale' })]);
    service.loadByEvaluationMoveTeam('e1', 1, 't1');
    expect(await firstValueFrom(query.selectAll())).toEqual([]);
    expect(await firstValueFrom(query.selectLoading())).toBe(false);
  });

  /**
   * Verifies: checking or unchecking an action calls its endpoint and stores the API's isChecked state.
   * Interacts with: ActionService.checkAction/uncheckAction stubs, ActionQuery.
   * Data: per row, action a1 starting in the opposite state.
   */
  it.each([
    { method: 'checkAction', from: false, to: true },
    { method: 'uncheckAction', from: true, to: false },
  ] as const)('$method stores isChecked $to', ({ method, from, to }) => {
    const { service, query, store, api } = setup();
    store.set([makeAction({ isChecked: from })]);
    service[method]('a1');
    expect(api[method]).toHaveBeenCalledWith('a1');
    expect(query.getEntity('a1')?.isChecked).toBe(to);
  });

  /**
   * Verifies: add() stores the created action with Date fields.
   * Interacts with: ActionService.createAction stub, ActionQuery.
   * Data: empty store; the API assigns id 'new'.
   */
  it('add() stores the created action', () => {
    const { service, query, store } = setup();
    store.set([]);
    service.add(makeAction({ id: undefined }));
    expect(query.getEntity('new')?.dateModified).toBeInstanceOf(Date);
  });

  /**
   * Verifies: updateAction() replaces the stored action with the API's response.
   * Interacts with: ActionService.updateAction stub, ActionQuery.
   * Data: store holds a1; a1 is renamed.
   */
  it('updateAction() stores the updated action', () => {
    const { service, query, store, api } = setup();
    store.set([makeAction()]);
    service.updateAction(makeAction({ description: 'Renamed' }));
    expect(api.updateAction).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({ description: 'Renamed' }),
    );
    expect(query.getEntity('a1')?.description).toBe('Renamed');
  });

  /**
   * Verifies: loadById() upserts the action next to those already loaded.
   * Interacts with: ActionService.getAction stub, ActionQuery.
   * Data: store holds a1; a2 is loaded.
   */
  it('loadById() upserts the action', () => {
    const { service, query, store, api } = setup();
    store.set([makeAction()]);
    service.loadById('a2');
    expect(api.getAction).toHaveBeenCalledWith('a2');
    expect(query.getAll().map((a) => a.id)).toEqual(['a1', 'a2']);
  });

  /**
   * Verifies: delete() removes the action; deleting the active one leaves no active action.
   * Interacts with: ActionService.deleteAction stub, ActionQuery.getActiveId.
   * Data: a1 active and a2; a1 deleted.
   */
  it('delete() removes the action and the active id', () => {
    const { service, query, store, api } = setup();
    store.set([makeAction(), makeAction({ id: 'a2' })]);
    service.setActive('a1');
    const active = recordEmissions(query.selectActiveId());
    service.delete('a1');
    expect(api.deleteAction).toHaveBeenCalledWith('a1');
    expect(query.getAll().map((a) => a.id)).toEqual(['a2']);
    expect(active).toEqual(['a1', null]);
  });

  describe('failed requests without an error callback', () => {
    const failure = new HttpErrorResponse({ status: 500 });
    const failing = () => vi.fn(() => throwError(() => failure));

    /**
     * Verifies: when loadById, add, updateAction, checkAction or uncheckAction fails, loading stays true, the store keeps a1 unchanged, and the error escapes.
     * Interacts with: the failing ActionService endpoint for each method, ActionQuery, captureUnhandledRxErrors.
     * Data: per row, store holds unchecked a1 and that endpoint answers 500.
     */
    it.each<{
      method: string;
      api: () => ActionApi;
      run: (service: ActionDataService) => void;
    }>([
      {
        method: 'loadById',
        api: () => ({ getAction: failing() }),
        run: (service) => service.loadById('a1'),
      },
      {
        method: 'add',
        api: () => ({ createAction: failing() }),
        run: (service) => service.add(makeAction({ id: undefined })),
      },
      {
        method: 'updateAction',
        api: () => ({ updateAction: failing() }),
        run: (service) =>
          service.updateAction(makeAction({ description: 'Renamed' })),
      },
      {
        method: 'checkAction',
        api: () => ({ checkAction: failing() }),
        run: (service) => service.checkAction('a1'),
      },
      {
        method: 'uncheckAction',
        api: () => ({ uncheckAction: failing() }),
        run: (service) => service.uncheckAction('a1'),
      },
    ])('$method leaves loading stuck when it fails', async ({ api, run }) => {
      const errors = captureUnhandledRxErrors();
      const { service, query, store } = setup({ api: api() });
      store.set([makeAction()]);
      run(service);
      await flush();
      expect(query.getValue().loading).toBe(true);
      expect(query.getAll()).toEqual([makeAction()]);
      // The escaped error reaches ErrorService, the app's ErrorHandler
      // (app.module.ts), which shows it.
      expect(errors).toEqual([failure]);
    });

    /**
     * Verifies: a failed delete() leaves the action in the store and lets the error escape to the app's ErrorHandler.
     * Interacts with: ActionService.deleteAction (throws), ActionQuery, captureUnhandledRxErrors.
     * Data: store holds a1; the delete answers 500.
     */
    it('delete() keeps the action when the request fails', async () => {
      const errors = captureUnhandledRxErrors();
      const { service, query, store } = setup({
        api: { deleteAction: failing() },
      });
      store.set([makeAction()]);
      service.delete('a1');
      await flush();
      // delete() sets no loading flag; ErrorService (app.module.ts) shows the error.
      expect(query.getAll()).toEqual([makeAction()]);
      expect(query.getValue().loading).toBe(false);
      expect(errors).toEqual([failure]);
    });
  });

  /**
   * Verifies: updateStore() (ActionCreated/ActionUpdated) upserts the pushed action with Date fields.
   * Interacts with: ActionDataService.updateStore, ActionQuery.
   * Data: empty store; a pushed action with ISO string dates.
   */
  it('updateStore() upserts a pushed action', () => {
    const { service, query, store } = setup();
    store.set([]);
    service.updateStore(makeAction({ id: 'pushed' }));
    expect(query.getEntity('pushed')?.dateCreated).toBeInstanceOf(Date);
  });

  /**
   * Verifies: deleteFromStore() (ActionDeleted) removes the action.
   * Interacts with: ActionDataService.deleteFromStore, ActionQuery.
   * Data: store holds a1.
   */
  it('deleteFromStore() removes the action', () => {
    const { service, query, store } = setup();
    store.set([makeAction()]);
    service.deleteFromStore('a1');
    expect(query.getAll()).toEqual([]);
  });

  /**
   * Verifies: unload() clears the store and leaves no active action.
   * Interacts with: ActionQuery.
   * Data: a1 stored and active.
   */
  it('unload() clears the store and the active action', () => {
    const { service, query, store } = setup();
    store.set([makeAction()]);
    service.setActive('a1');
    service.unload();
    expect(query.getAll()).toEqual([]);
    expect(query.getActiveId()).toBeNull();
  });

  /**
   * Verifies: ActionList filters by description or id from the actionmask query param.
   * Interacts with: ActivatedRoute.queryParamMap stub, ActionDataService.ActionList.
   * Data: two actions with different descriptions.
   */
  it('ActionList filters by the actionmask query param', () => {
    const { service, store, setQueryParams } = setup();
    store.set([
      makeAction({ id: 'a1', description: 'Isolate the host' }),
      makeAction({ id: 'a2', description: 'Notify the CISO' }),
    ]);
    const lists = recordEmissions(service.ActionList);
    setQueryParams({ actionmask: 'ciso' });
    expect(lists[lists.length - 1].map((a) => a.id)).toEqual(['a2']);
  });
});
