// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  HttpErrorResponse,
  HttpEventType,
  HttpProgressEvent,
  HttpResponse,
} from '@angular/common/http';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import {
  Evaluation,
  EvaluationService,
  ItemStatus,
} from '../../generated/cite.api';
import { EvaluationDataService } from './evaluation-data.service';
import { EvaluationQuery } from './evaluation.query';
import { EvaluationStore } from './evaluation.store';
import { ApiStub } from '../../test-utils/api-stub';
import { activatedRouteStub } from '../../test-utils/activated-route';
import { getDefaultProviders } from '../../test-utils/default-test-providers';
import { recordEmissions } from '../../test-utils/record-emissions';
import {
  captureUnhandledRxErrors,
  flush,
} from '../../test-utils/unhandled-rx-errors';

// uploadJson() calls uploadJsonFiles with observe: 'events'; ApiStub accepts
// that overload (EventsOverload).
type EvaluationApi = ApiStub<EvaluationService>;

// The API sends ISO strings at runtime; the generated model types them as Date.
const iso = (s: string) => s as unknown as Date;

function makeEvaluation(overrides: Partial<Evaluation> = {}): Evaluation {
  return {
    id: 'e1',
    description: 'Exercise one',
    status: ItemStatus.Active,
    currentMoveNumber: 1,
    dateCreated: iso('2026-01-01T00:00:00Z'),
    dateModified: iso('2026-01-02T00:00:00Z'),
    situationTime: iso('2026-01-03T00:00:00Z'),
    ...overrides,
  };
}

function setup(overrides: { api?: EvaluationApi; queryParams?: Params } = {}) {
  const api = {
    getEvaluations: vi.fn(() => of([makeEvaluation()])),
    getMyEvaluations: vi.fn(() => of([makeEvaluation({ id: 'mine' })])),
    getEvaluation: vi.fn((id: string) => of(makeEvaluation({ id }))),
    createEvaluation: vi.fn((e?: Evaluation) => of({ ...e, id: 'new' })),
    copyEvaluation: vi.fn((id: string) =>
      of(makeEvaluation({ id: `${id}-copy` })),
    ),
    updateEvaluation: vi.fn((_id: string, e?: Evaluation) => of({ ...e })),
    setEvaluationCurrentMove: vi.fn((id: string, move: number) =>
      of(makeEvaluation({ id, currentMoveNumber: move })),
    ),
    deleteEvaluation: vi.fn(() => of(null)),
    uploadJsonFiles: vi.fn(() => of()),
    ...overrides.api,
  } satisfies EvaluationApi;
  const navigate = vi.fn();
  const router: Pick<Router, 'navigate'> = { navigate };
  const { route, setQueryParams } = activatedRouteStub(overrides.queryParams);

  TestBed.configureTestingModule({
    providers: getDefaultProviders([
      { provide: EvaluationService, useValue: api },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: route },
      EvaluationDataService,
    ]),
  });

  return {
    service: TestBed.inject(EvaluationDataService),
    query: TestBed.inject(EvaluationQuery),
    store: TestBed.inject(EvaluationStore),
    api,
    navigate,
    setQueryParams,
  };
}

describe('EvaluationDataService', () => {
  describe('load() and loadMine()', () => {
    /**
     * Verifies: load() fetches every evaluation, converts its dates, and replaces the store contents.
     * Interacts with: EvaluationService.getEvaluations stub, real EvaluationStore/EvaluationQuery.
     * Data: a stale evaluation in the store; the API returns e1 with ISO string dates.
     */
    it('load() replaces the store with all evaluations', () => {
      const { service, query, store, api } = setup();
      store.set([makeEvaluation({ id: 'stale' })]);
      service.load();
      expect(api.getEvaluations).toHaveBeenCalled();
      expect(query.getAll().map((e) => e.id)).toEqual(['e1']);
      expect(query.getEntity('e1')?.situationTime).toEqual(
        new Date('2026-01-03T00:00:00Z'),
      );
    });

    /**
     * Verifies: loadMine() loads only the caller's evaluations.
     * Interacts with: EvaluationService.getMyEvaluations stub, EvaluationQuery.
     * Data: the API returns one evaluation 'mine'.
     */
    it('loadMine() fills the store from the my-evaluations endpoint', () => {
      const { service, query, api } = setup();
      service.loadMine();
      expect(api.getMyEvaluations).toHaveBeenCalled();
      expect(api.getEvaluations).not.toHaveBeenCalled();
      expect(query.getAll().map((e) => e.id)).toEqual(['mine']);
    });

    /**
     * Verifies: loading is reported while load() is in flight and cleared when it completes.
     * Interacts with: EvaluationService.getEvaluations (a Subject held open), EvaluationQuery.selectLoading.
     * Data: store seeded empty first; one evaluation arrives.
     */
    it('reports loading while the request is in flight', () => {
      const response = new Subject<Evaluation[]>();
      const { service, query, store } = setup({
        api: { getEvaluations: vi.fn(() => response.asObservable()) },
      });
      store.set([]);
      const loading = recordEmissions(query.selectLoading());
      service.load();
      response.next([makeEvaluation()]);
      expect(loading).toEqual([false, true, false]);
    });

    /**
     * Verifies: a failed load() or loadMine() empties the store and clears loading.
     * Interacts with: the failing EvaluationService endpoint for each method, EvaluationQuery.
     * Data: per row, a stale evaluation in the store and a 403 from that endpoint.
     */
    it.each<{
      method: string;
      api: () => EvaluationApi;
      run: (service: EvaluationDataService) => void;
    }>([
      {
        method: 'load',
        api: () => ({
          getEvaluations: vi.fn(() =>
            throwError(() => new HttpErrorResponse({ status: 403 })),
          ),
        }),
        run: (service) => service.load(),
      },
      {
        method: 'loadMine',
        api: () => ({
          getMyEvaluations: vi.fn(() =>
            throwError(() => new HttpErrorResponse({ status: 403 })),
          ),
        }),
        run: (service) => service.loadMine(),
      },
    ])('$method empties the store when it fails', ({ api, run }) => {
      const { service, query, store } = setup({ api: api() });
      store.set([makeEvaluation({ id: 'stale' })]);
      run(service);
      expect(query.getAll()).toEqual([]);
      expect(query.getValue().loading).toBe(false);
    });
  });

  describe('single-evaluation calls', () => {
    /**
     * Verifies: loadById() upserts the evaluation next to those already loaded.
     * Interacts with: EvaluationService.getEvaluation stub, EvaluationQuery.
     * Data: store holds e1; e2 is loaded.
     */
    it('loadById() upserts the evaluation', () => {
      const { service, query, store, api } = setup();
      store.set([makeEvaluation()]);
      service.loadById('e2');
      expect(api.getEvaluation).toHaveBeenCalledWith('e2');
      expect(query.getAll().map((e) => e.id)).toEqual(['e1', 'e2']);
    });

    /**
     * Verifies: add() stores the created evaluation with Date fields.
     * Interacts with: EvaluationService.createEvaluation stub, EvaluationQuery.
     * Data: an evaluation without id; the API assigns 'new'.
     */
    it('add() stores the created evaluation', () => {
      const { service, query, store } = setup();
      store.set([]);
      service.add(makeEvaluation({ id: undefined }));
      expect(query.getEntity('new')?.dateCreated).toBeInstanceOf(Date);
    });

    /**
     * Verifies: a failed add() or copy() clears loading and leaves the store unchanged.
     * Interacts with: the failing EvaluationService endpoint for each method, EvaluationQuery.
     * Data: per row, store holds e1 and that endpoint answers 400.
     */
    it.each<{
      method: string;
      api: () => EvaluationApi;
      run: (service: EvaluationDataService) => void;
    }>([
      {
        method: 'add',
        api: () => ({
          createEvaluation: vi.fn(() =>
            throwError(() => new HttpErrorResponse({ status: 400 })),
          ),
        }),
        run: (service) => service.add(makeEvaluation({ id: undefined })),
      },
      {
        method: 'copy',
        api: () => ({
          copyEvaluation: vi.fn(() =>
            throwError(() => new HttpErrorResponse({ status: 400 })),
          ),
        }),
        run: (service) => service.copy('e1'),
      },
    ])('$method clears loading when the API rejects it', ({ api, run }) => {
      const { service, query, store } = setup({ api: api() });
      store.set([makeEvaluation()]);
      run(service);
      expect(query.getValue().loading).toBe(false);
      expect(query.getAll().map((e) => e.id)).toEqual(['e1']);
    });

    /**
     * Verifies: copy() adds the API's copy alongside the original.
     * Interacts with: EvaluationService.copyEvaluation stub, EvaluationQuery.
     * Data: store holds e1; the API returns 'e1-copy'.
     */
    it('copy() adds the copied evaluation', () => {
      const { service, query, store, api } = setup();
      store.set([makeEvaluation()]);
      service.copy('e1');
      expect(api.copyEvaluation).toHaveBeenCalledWith('e1');
      expect(query.getAll().map((e) => e.id)).toEqual(['e1', 'e1-copy']);
    });

    /**
     * Verifies: changeCurrentMove() posts the new move number and stores the returned evaluation.
     * Interacts with: EvaluationService.setEvaluationCurrentMove stub, EvaluationQuery.
     * Data: e1 on move 1 is advanced to move 2.
     */
    it('changeCurrentMove() stores the advanced move number', () => {
      const { service, query, store, api } = setup();
      store.set([makeEvaluation()]);
      service.changeCurrentMove(makeEvaluation({ currentMoveNumber: 2 }));
      expect(api.setEvaluationCurrentMove).toHaveBeenCalledWith('e1', 2);
      expect(query.getEntity('e1')?.currentMoveNumber).toBe(2);
    });

    /**
     * Verifies: updateEvaluation() replaces the stored evaluation with the API's response.
     * Interacts with: EvaluationService.updateEvaluation stub, EvaluationQuery.
     * Data: e1 gets a new description.
     */
    it('updateEvaluation() stores the updated evaluation', () => {
      const { service, query, store, api } = setup();
      store.set([makeEvaluation()]);
      service.updateEvaluation(makeEvaluation({ description: 'Renamed' }));
      expect(api.updateEvaluation).toHaveBeenCalledWith(
        'e1',
        expect.objectContaining({ description: 'Renamed' }),
      );
      expect(query.getEntity('e1')?.description).toBe('Renamed');
    });

    /**
     * Verifies: unload() clears the store and the active id.
     * Interacts with: EvaluationQuery.selectAll/selectActiveId.
     * Data: store holds active e1.
     */
    it('unload() clears entities and the active evaluation', async () => {
      const { service, query, store } = setup();
      store.set([makeEvaluation()]);
      service.setActive('e1');
      service.unload();
      expect(query.getAll()).toEqual([]);
      // setActive('') runs first; set([]) then resolves the missing id to null.
      expect(await firstValueFrom(query.selectActiveId())).toBeNull();
    });
  });

  describe('delete()', () => {
    /**
     * Verifies: delete() removes the evaluation and leaves an unrelated active evaluation alone.
     * Interacts with: EvaluationService.deleteEvaluation stub, EvaluationQuery.
     * Data: e1 and e2 stored, e2 active; e1 is deleted.
     */
    it('removes the evaluation and keeps another active one', () => {
      const { service, query, store, api } = setup();
      store.set([makeEvaluation({ id: 'e1' }), makeEvaluation({ id: 'e2' })]);
      service.setActive('e2');
      service.delete('e1');
      expect(api.deleteEvaluation).toHaveBeenCalledWith('e1');
      expect(query.getAll().map((e) => e.id)).toEqual(['e2']);
      expect(query.getActiveId()).toBe('e2');
    });

    /**
     * Verifies: deleting the active evaluation goes straight from e1 to null, without the service's own setActive('').
     * Interacts with: EvaluationService.deleteEvaluation stub, EvaluationQuery.selectActiveId.
     * Data: e1 stored and active; e1 is deleted.
     */
    it('clears the active id only through Akita when the active evaluation is deleted', () => {
      const { service, query, store } = setup();
      store.set([makeEvaluation()]);
      service.setActive('e1');
      const active = recordEmissions(query.selectActiveId());
      service.delete('e1');
      expect(active).toEqual(['e1', null]);
    });
  });

  describe('failed requests without an error callback', () => {
    const failure = new HttpErrorResponse({ status: 500 });
    const failing = () => vi.fn(() => throwError(() => failure));

    /**
     * Verifies: when changeCurrentMove, loadById or updateEvaluation fails, loading stays true, the store keeps e1 unchanged, and the error escapes.
     * Interacts with: the failing EvaluationService endpoint for each method, EvaluationQuery, captureUnhandledRxErrors.
     * Data: per row, store holds e1 on move 1 and that endpoint answers 500.
     */
    it.each<{
      method: string;
      api: () => EvaluationApi;
      run: (service: EvaluationDataService) => void;
    }>([
      {
        method: 'changeCurrentMove',
        api: () => ({ setEvaluationCurrentMove: failing() }),
        run: (service) =>
          service.changeCurrentMove(makeEvaluation({ currentMoveNumber: 2 })),
      },
      {
        method: 'loadById',
        api: () => ({ getEvaluation: failing() }),
        run: (service) => service.loadById('e1'),
      },
      {
        method: 'updateEvaluation',
        api: () => ({ updateEvaluation: failing() }),
        run: (service) =>
          service.updateEvaluation(makeEvaluation({ description: 'Renamed' })),
      },
    ])('$method leaves loading stuck when it fails', async ({ api, run }) => {
      const errors = captureUnhandledRxErrors();
      const { service, query, store } = setup({ api: api() });
      store.set([makeEvaluation()]);
      run(service);
      await flush();
      expect(query.getValue().loading).toBe(true);
      expect(query.getEntity('e1')).toMatchObject({
        currentMoveNumber: 1,
        description: 'Exercise one',
      });
      // The escaped error reaches ErrorService, the app's ErrorHandler
      // (app.module.ts), which shows it.
      expect(errors).toEqual([failure]);
    });

    /**
     * Verifies: a failed delete() leaves the evaluation in the store and lets the error escape to the app's ErrorHandler.
     * Interacts with: EvaluationService.deleteEvaluation (throws), EvaluationQuery, captureUnhandledRxErrors.
     * Data: store holds e1; the delete answers 500.
     */
    it('delete() keeps the evaluation when the request fails', async () => {
      const errors = captureUnhandledRxErrors();
      const { service, query, store } = setup({
        api: { deleteEvaluation: failing() },
      });
      store.set([makeEvaluation()]);
      service.delete('e1');
      await flush();
      // delete() sets no loading flag; ErrorService (app.module.ts) shows the error.
      expect(query.getAll().map((e) => e.id)).toEqual(['e1']);
      expect(query.getValue().loading).toBe(false);
      expect(errors).toEqual([failure]);
    });
  });

  describe('uploadJson()', () => {
    /**
     * Verifies: upload progress is published as a percentage, then reset to 0 and the uploaded evaluation stored.
     * Interacts with: EvaluationService.uploadJsonFiles (HttpEvents), uploadProgress subject, EvaluationQuery.
     * Data: an UploadProgress event at 50 of 200 bytes, then a 200 HttpResponse carrying e9.
     */
    it('reports progress and stores the uploaded evaluation', () => {
      const uploaded = makeEvaluation({ id: 'e9' });
      const progressEvent: HttpProgressEvent = {
        type: HttpEventType.UploadProgress,
        loaded: 50,
        total: 200,
      };
      const { service, query, store, api } = setup({
        api: {
          uploadJsonFiles: vi.fn(() =>
            of(
              progressEvent,
              new HttpResponse({ status: 200, body: uploaded }),
            ),
          ),
        },
      });
      store.set([]);
      const progress = recordEmissions(service.uploadProgress);
      const file = new File(['{}'], 'evaluation.json');
      service.uploadJson(file, 'events', true);
      expect(api.uploadJsonFiles).toHaveBeenCalledWith(file, 'events', true);
      expect(progress).toEqual([25, 0]);
      expect(query.getEntity('e9')).toEqual(uploaded);
      expect(query.getValue().loading).toBe(false);
    });

    /**
     * Verifies: a failed upload clears loading and resets progress to 0.
     * Interacts with: EvaluationService.uploadJsonFiles (throws), uploadProgress, EvaluationQuery.
     * Data: a 500 response.
     */
    it('resets progress and loading when the upload fails', () => {
      const { service, query, store } = setup({
        api: {
          uploadJsonFiles: vi.fn(() =>
            throwError(() => new HttpErrorResponse({ status: 500 })),
          ),
        },
      });
      store.set([]);
      const progress = recordEmissions(service.uploadProgress);
      service.uploadJson(new File(['{}'], 'bad.json'), 'events', true);
      expect(progress).toEqual([0]);
      expect(query.getValue().loading).toBe(false);
    });
  });

  describe('SignalR entry points', () => {
    /**
     * Verifies: updateStore() (EvaluationUpdated) changes a stored evaluation in place.
     * Interacts with: EvaluationDataService.updateStore, EvaluationQuery.
     * Data: store holds e1 on move 1; a pushed e1 on move 3.
     */
    it('updateStore() updates a stored evaluation', () => {
      const { service, query, store } = setup();
      store.set([makeEvaluation()]);
      service.updateStore(makeEvaluation({ currentMoveNumber: 3 }));
      expect(query.getEntity('e1')?.currentMoveNumber).toBe(3);
    });

    /**
     * Verifies: updateStore() (EvaluationCreated) adds a new evaluation with Date fields.
     * Interacts with: EvaluationDataService.updateStore, EvaluationQuery.
     * Data: store holds e1; a pushed new e2 with ISO string dates.
     */
    it('updateStore() adds a new evaluation with dates', () => {
      const { service, query, store } = setup();
      store.set([makeEvaluation()]);
      service.updateStore(makeEvaluation({ id: 'e2' }));
      expect(query.getEntity('e2')?.dateModified).toBeInstanceOf(Date);
    });

    /**
     * Verifies: deleteFromStore() (EvaluationDeleted) removes the evaluation.
     * Interacts with: EvaluationDataService.deleteFromStore, EvaluationQuery.
     * Data: store holds e1 and e2.
     */
    it('deleteFromStore() removes the evaluation', () => {
      const { service, query, store } = setup();
      store.set([makeEvaluation({ id: 'e1' }), makeEvaluation({ id: 'e2' })]);
      service.deleteFromStore('e1');
      expect(query.getAll().map((e) => e.id)).toEqual(['e2']);
    });
  });

  describe('EvaluationList', () => {
    /**
     * Verifies: the evalterm query param matches description, status or id, case-insensitively.
     * Interacts with: ActivatedRoute.queryParamMap stub, EvaluationDataService.EvaluationList.
     * Data: three evaluations with distinct descriptions and statuses; per row, one term.
     */
    it.each([
      { field: 'description', term: 'team', ids: ['e1', 'e2'] },
      { field: 'status', term: 'PENDING', ids: ['e2'] },
      { field: 'id', term: 'x3', ids: ['x3'] },
    ])('filters by $field', ({ term, ids }) => {
      const { service, store, setQueryParams } = setup();
      store.set([
        makeEvaluation({
          id: 'e1',
          description: 'Red Team',
          status: ItemStatus.Active,
        }),
        makeEvaluation({
          id: 'e2',
          description: 'Blue Team',
          status: ItemStatus.Pending,
        }),
        makeEvaluation({
          id: 'x3',
          description: 'Green',
          status: ItemStatus.Complete,
        }),
      ]);
      const lists = recordEmissions(service.EvaluationList);
      setQueryParams({ evalterm: term });
      expect(lists[lists.length - 1].map((e) => e.id)).toEqual(ids);
    });

    /**
     * Verifies: sorton=currentMoveNumber orders numerically, and sortdir=desc reverses it.
     * Interacts with: ActivatedRoute.queryParamMap stub, EvaluationDataService.EvaluationList.
     * Data: evaluations on moves 10, 2 and 1; per row, the sort direction.
     */
    it.each([
      { sortdir: 'asc', ids: ['one', 'two', 'ten'] },
      { sortdir: 'desc', ids: ['ten', 'two', 'one'] },
    ])('sorts by current move number, $sortdir', async ({ sortdir, ids }) => {
      const { service, store } = setup({
        queryParams: { sorton: 'currentMoveNumber', sortdir },
      });
      store.set([
        makeEvaluation({ id: 'ten', currentMoveNumber: 10 }),
        makeEvaluation({ id: 'two', currentMoveNumber: 2 }),
        makeEvaluation({ id: 'one', currentMoveNumber: 1 }),
      ]);
      const list = await firstValueFrom(service.EvaluationList);
      expect(list.map((e) => e.id)).toEqual(ids);
    });

    /**
     * Verifies: typing in the filter control writes the term to the evalterm query param.
     * Interacts with: EvaluationDataService.filterControl, Router.navigate stub.
     * Data: filter term 'red'.
     */
    it('pushes filter control changes into the URL', () => {
      const { service, navigate } = setup();
      service.filterControl.setValue('red');
      expect(navigate).toHaveBeenCalledWith([], {
        queryParams: { evalterm: 'red' },
        queryParamsHandling: 'merge',
      });
    });
  });
});
