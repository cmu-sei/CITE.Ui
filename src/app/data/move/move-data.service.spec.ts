// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import { Move, MoveService } from '../../generated/cite.api';
import { MoveDataService } from './move-data.service';
import { MoveQuery } from './move.query';
import { MoveStore } from './move.store';
import { ApiStub } from '../../test-utils/api-stub';
import { activatedRouteStub } from '../../test-utils/activated-route';
import { getDefaultProviders } from '../../test-utils/default-test-providers';
import { recordEmissions } from '../../test-utils/record-emissions';
import {
  captureUnhandledRxErrors,
  flush,
} from '../../test-utils/unhandled-rx-errors';

type MoveApi = ApiStub<MoveService>;

// The API sends ISO strings at runtime; the generated model types them as Date.
const iso = (s: string) => s as unknown as Date;

function makeMove(overrides: Partial<Move> = {}): Move {
  return {
    id: 'm1',
    evaluationId: 'e1',
    moveNumber: 1,
    description: 'Move one',
    dateCreated: iso('2026-01-01T00:00:00Z'),
    dateModified: iso('2026-01-02T00:00:00Z'),
    situationTime: iso('2026-01-03T00:00:00Z'),
    ...overrides,
  };
}

function setup(overrides: { api?: MoveApi; queryParams?: Params } = {}) {
  const api = {
    getByEvaluation: vi.fn(() => of([makeMove()])),
    getMove: vi.fn((id: string) => of(makeMove({ id }))),
    createMove: vi.fn((move?: Move) => of({ ...move, id: 'new' })),
    updateMove: vi.fn((_id: string, move?: Move) => of({ ...move })),
    deleteMove: vi.fn(() => of(null)),
    ...overrides.api,
  } satisfies MoveApi;
  const navigate = vi.fn();
  const router: Pick<Router, 'navigate'> = { navigate };
  const { route, setQueryParams } = activatedRouteStub(overrides.queryParams);

  TestBed.configureTestingModule({
    providers: getDefaultProviders([
      { provide: MoveService, useValue: api },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: route },
      MoveDataService,
    ]),
  });

  return {
    service: TestBed.inject(MoveDataService),
    query: TestBed.inject(MoveQuery),
    store: TestBed.inject(MoveStore),
    api,
    navigate,
    setQueryParams,
  };
}

describe('MoveDataService', () => {
  describe('loadByEvaluation()', () => {
    /**
     * Verifies: loading an evaluation's moves fetches them by evaluation id and puts them in the query.
     * Interacts with: MoveService.getByEvaluation stub, real MoveStore/MoveQuery.
     * Data: two moves for evaluation e1.
     */
    it('fills the query with the evaluation moves', () => {
      const { service, query, api } = setup({
        api: {
          getByEvaluation: vi.fn(() =>
            of([makeMove({ id: 'm1' }), makeMove({ id: 'm2', moveNumber: 2 })]),
          ),
        },
      });
      service.loadByEvaluation('e1');
      expect(api.getByEvaluation).toHaveBeenCalledWith('e1');
      expect(query.getAll().map((m) => m.id)).toEqual(['m1', 'm2']);
    });

    /**
     * Verifies: ISO date strings from the API become Date objects in the store.
     * Interacts with: MoveService.getByEvaluation stub, MoveDataService.setAsDates, MoveQuery.
     * Data: one move with string dateCreated/dateModified/situationTime.
     */
    it('converts the API date strings to Date objects', () => {
      const { service, query } = setup();
      service.loadByEvaluation('e1');
      const [move] = query.getAll();
      expect(move.dateCreated).toEqual(new Date('2026-01-01T00:00:00Z'));
      expect(move.dateModified).toEqual(new Date('2026-01-02T00:00:00Z'));
      expect(move.situationTime).toEqual(new Date('2026-01-03T00:00:00Z'));
    });

    /**
     * Verifies: loading is true while the request is in flight and false once it returns.
     * Interacts with: MoveService.getByEvaluation (a Subject held open), MoveQuery.selectLoading.
     * Data: store seeded empty first so it starts not-loading; then one move arrives.
     */
    it('reports loading while the request is in flight', () => {
      const response = new Subject<Move[]>();
      const { service, query, store } = setup({
        api: { getByEvaluation: vi.fn(() => response.asObservable()) },
      });
      store.set([]);
      const loading = recordEmissions(query.selectLoading());
      service.loadByEvaluation('e1');
      expect(loading).toEqual([false, true]);
      response.next([makeMove()]);
      expect(loading).toEqual([false, true, false]);
    });

    /**
     * Verifies: a failed load empties the list and clears loading, without recording an error.
     * Interacts with: MoveService.getByEvaluation (throws), MoveQuery.selectAll/selectLoading/selectError.
     * Data: store pre-seeded with a stale move; a 500 response.
     */
    it('empties the list when the request fails', async () => {
      const { service, query, store } = setup({
        api: {
          getByEvaluation: vi.fn(() =>
            throwError(() => new HttpErrorResponse({ status: 500 })),
          ),
        },
      });
      store.set([makeMove({ id: 'stale' })]);
      service.loadByEvaluation('e1');
      expect(await firstValueFrom(query.selectAll())).toEqual([]);
      expect(await firstValueFrom(query.selectLoading())).toBe(false);
      expect(await firstValueFrom(query.selectError())).toBeNull();
    });
  });

  describe('loadById()', () => {
    /**
     * Verifies: loading a single move upserts it next to the moves already in the store.
     * Interacts with: MoveService.getMove stub, MoveQuery.
     * Data: store holds m1; m2 is loaded by id.
     */
    it('upserts the move without dropping the others', () => {
      const { service, query, store, api } = setup();
      store.set([makeMove({ id: 'm1' })]);
      service.loadById('m2');
      expect(api.getMove).toHaveBeenCalledWith('m2');
      expect(query.getAll().map((m) => m.id)).toEqual(['m1', 'm2']);
      expect(query.getEntity('m2')?.dateCreated).toBeInstanceOf(Date);
    });
  });

  describe('failed requests without an error callback', () => {
    const failure = new HttpErrorResponse({ status: 500 });
    const failing = () => vi.fn(() => throwError(() => failure));

    /**
     * Verifies: when loadById, add or updateMove fails, loading stays true, the store keeps m1 unchanged, and the error escapes.
     * Interacts with: the failing MoveService endpoint for each method, MoveQuery, captureUnhandledRxErrors.
     * Data: per row, store holds m1 and that endpoint answers 500.
     */
    it.each<{
      method: string;
      api: () => MoveApi;
      run: (service: MoveDataService) => void;
    }>([
      {
        method: 'loadById',
        api: () => ({ getMove: failing() }),
        run: (service) => service.loadById('m2'),
      },
      {
        method: 'add',
        api: () => ({ createMove: failing() }),
        run: (service) => service.add(makeMove({ id: undefined })),
      },
      {
        method: 'updateMove',
        api: () => ({ updateMove: failing() }),
        run: (service) => service.updateMove(makeMove({ description: 'New' })),
      },
    ])('$method leaves loading stuck when it fails', async ({ api, run }) => {
      const errors = captureUnhandledRxErrors();
      const { service, query, store } = setup({ api: api() });
      store.set([makeMove()]);
      run(service);
      await flush();
      expect(query.getValue().loading).toBe(true);
      expect(query.getAll()).toEqual([makeMove()]);
      // The escaped error reaches ErrorService, the app's ErrorHandler
      // (app.module.ts), which shows it.
      expect(errors).toEqual([failure]);
    });
  });

  describe('mutations', () => {
    /**
     * Verifies: add() posts the move and the created move appears in the query.
     * Interacts with: MoveService.createMove stub, MoveQuery.
     * Data: store empty; a new move for evaluation e1.
     */
    it('add() puts the created move in the store', () => {
      const { service, query, store, api } = setup();
      store.set([]);
      const move = makeMove({ id: undefined, description: 'Fresh' });
      service.add(move);
      expect(api.createMove).toHaveBeenCalledWith(move);
      expect(query.getEntity('new')?.description).toBe('Fresh');
      expect(query.getValue().loading).toBe(false);
    });

    /**
     * Verifies: updateMove() sends the move and replaces the stored copy with the API's response.
     * Interacts with: MoveService.updateMove stub, MoveQuery.
     * Data: store holds m1 'Move one'; update renames it.
     */
    it('updateMove() replaces the stored move with the response', () => {
      const { service, query, store, api } = setup();
      store.set([makeMove()]);
      service.updateMove(makeMove({ description: 'Renamed' }));
      expect(api.updateMove).toHaveBeenCalledWith(
        'm1',
        expect.objectContaining({ description: 'Renamed' }),
      );
      expect(query.getEntity('m1')?.description).toBe('Renamed');
    });

    /**
     * Verifies: delete() calls the API and removes the move from the query.
     * Interacts with: MoveService.deleteMove stub, MoveQuery.
     * Data: store holds m1 and m2; m1 is deleted.
     */
    it('delete() removes the move', () => {
      const { service, query, store, api } = setup();
      store.set([makeMove({ id: 'm1' }), makeMove({ id: 'm2' })]);
      service.delete('m1');
      expect(api.deleteMove).toHaveBeenCalledWith('m1');
      expect(query.getAll().map((m) => m.id)).toEqual(['m2']);
    });

    /**
     * Verifies: unload() empties the store.
     * Interacts with: MoveQuery.selectAll.
     * Data: store holds one move.
     */
    it('unload() empties the store', () => {
      const { service, query, store } = setup();
      store.set([makeMove()]);
      service.unload();
      expect(query.getAll()).toEqual([]);
    });

    /**
     * Verifies: setActive() makes the move the query's active entity.
     * Interacts with: MoveQuery.selectActive.
     * Data: store holds m1 and m2; m2 is activated.
     */
    it('setActive() selects the active move', async () => {
      const { service, query, store } = setup();
      store.set([makeMove({ id: 'm1' }), makeMove({ id: 'm2' })]);
      service.setActive('m2');
      expect(await firstValueFrom(query.selectActiveId())).toBe('m2');
    });
  });

  describe('SignalR entry points', () => {
    /**
     * Verifies: updateStore() (MoveCreated/MoveUpdated) inserts a new move with dates converted.
     * Interacts with: MoveDataService.updateStore, MoveQuery.
     * Data: empty store; a pushed move with ISO string dates.
     */
    it('updateStore() upserts a pushed move and converts its dates', () => {
      const { service, query, store } = setup();
      store.set([]);
      service.updateStore(makeMove({ id: 'pushed' }));
      expect(query.getEntity('pushed')?.situationTime).toEqual(
        new Date('2026-01-03T00:00:00Z'),
      );
    });

    /**
     * Verifies: updateStore() overwrites fields of a move already in the store.
     * Interacts with: MoveDataService.updateStore, MoveQuery.
     * Data: store holds m1; a pushed m1 with a new description.
     */
    it('updateStore() updates an existing move', () => {
      const { service, query, store } = setup();
      store.set([makeMove()]);
      service.updateStore(makeMove({ description: 'Pushed' }));
      expect(query.getAll()).toHaveLength(1);
      expect(query.getEntity('m1')?.description).toBe('Pushed');
    });

    /**
     * Verifies: deleteFromStore() (MoveDeleted) removes the move.
     * Interacts with: MoveDataService.deleteFromStore, MoveQuery.
     * Data: store holds m1.
     */
    it('deleteFromStore() removes the move', () => {
      const { service, query, store } = setup();
      store.set([makeMove()]);
      service.deleteFromStore('m1');
      expect(query.getAll()).toEqual([]);
    });
  });

  describe('MoveList', () => {
    /**
     * Verifies: the movemask query param filters moves by description (case-insensitive) or id.
     * Interacts with: ActivatedRoute.queryParamMap stub, MoveQuery.selectAll, MoveDataService.MoveList.
     * Data: three moves; per row, one mask.
     */
    it.each([
      { field: 'description', mask: 'ALPHA', ids: ['m1'] },
      { field: 'id', mask: 'm3', ids: ['m3'] },
    ])('filters by $field from the movemask query param', ({ mask, ids }) => {
      const { service, store, setQueryParams } = setup();
      store.set([
        makeMove({ id: 'm1', description: 'Alpha strike' }),
        makeMove({ id: 'm2', description: 'Bravo' }),
        makeMove({ id: 'm3', description: 'Charlie' }),
      ]);
      const lists = recordEmissions(service.MoveList);
      setQueryParams({ movemask: mask });
      expect(lists[lists.length - 1].map((m) => m.id)).toEqual(ids);
    });

    /**
     * Verifies: one query param change makes MoveList emit once per route-derived input.
     * Interacts with: ActivatedRoute.queryParamMap stub, MoveDataService.MoveList.
     * Data: one move; a single query param change.
     * Why: pins the combineLatest fan-out so a later switch to one derived stream is a visible change.
     */
    it('re-emits once for each route-derived input on a query param change', () => {
      const { service, store, setQueryParams } = setup();
      store.set([makeMove()]);
      const lists = recordEmissions(service.MoveList);
      setQueryParams({ movemask: 'move' });
      // filter term, sort column, sort direction, page size and page index all
      // derive from the same queryParamMap, so combineLatest fires five times.
      expect(lists).toHaveLength(1 + 5);
    });

    /**
     * Verifies: sorton=description with sortdir=desc orders moves by description descending.
     * Interacts with: ActivatedRoute.queryParamMap stub, MoveDataService.MoveList.
     * Data: three moves with unsorted descriptions.
     */
    it('sorts by description in the requested direction', async () => {
      const { service, store } = setup({
        queryParams: { sorton: 'description', sortdir: 'desc' },
      });
      store.set([
        makeMove({ id: 'b', description: 'bravo' }),
        makeMove({ id: 'a', description: 'Alpha' }),
        makeMove({ id: 'c', description: 'charlie' }),
      ]);
      const list = await firstValueFrom(service.MoveList);
      expect(list.map((m) => m.id)).toEqual(['c', 'b', 'a']);
    });

    /**
     * Verifies: typing in the filter control writes the term to the movemask query param.
     * Interacts with: MoveDataService.filterControl, Router.navigate stub.
     * Data: filter term 'bravo'.
     */
    it('pushes filter control changes into the URL', () => {
      const { service, navigate } = setup();
      service.filterControl.setValue('bravo');
      expect(navigate).toHaveBeenCalledWith([], {
        queryParams: { movemask: 'bravo' },
        queryParamsHandling: 'merge',
      });
    });
  });
});
