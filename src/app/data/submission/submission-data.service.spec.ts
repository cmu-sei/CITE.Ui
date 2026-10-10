// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import {
  Submission,
  SubmissionOptionService,
  SubmissionService,
} from '../../generated/cite.api';
import { SubmissionDataService } from './submission-data.service';
import { SubmissionQuery } from './submission.query';
import { SubmissionStore } from './submission.store';
import { ApiStub, BodyOverload } from '../../test-utils/api-stub';
import { activatedRouteStub } from '../../test-utils/activated-route';
import { getDefaultProviders } from '../../test-utils/default-test-providers';
import {
  captureUnhandledRxErrors,
  flush,
} from '../../test-utils/unhandled-rx-errors';

type SubmissionApi = ApiStub<SubmissionService>;
type SubmissionOptionApi = ApiStub<SubmissionOptionService>;

function makeSubmission(overrides: Partial<Submission> = {}): Submission {
  return {
    id: 's1',
    evaluationId: 'e1',
    teamId: 't1',
    moveNumber: 1,
    score: 0,
    scoreIsAnAverage: false,
    ...overrides,
  };
}

function setup(
  overrides: {
    api?: SubmissionApi;
    optionApi?: SubmissionOptionApi;
    queryParams?: Params;
  } = {},
) {
  const scored = (id: string, score: number) =>
    of(makeSubmission({ id, score }));
  const api = {
    getByEvaluation: vi.fn(() => of([makeSubmission()])),
    getMineByEvaluation: vi.fn(() => of([makeSubmission({ id: 'mine' })])),
    getByEvaluationTeam: vi.fn(() => of([makeSubmission({ id: 'team' })])),
    getSubmission: vi.fn((id: string) => of(makeSubmission({ id }))),
    createSubmission: vi.fn((s?: Submission) => of({ ...s, id: 'new' })),
    updateSubmission: vi.fn((_id: string, s?: Submission) => of({ ...s })),
    clearSubmission: vi.fn((id: string) => scored(id, 0)),
    presetSubmission: vi.fn((id: string) => scored(id, 42)),
    addSubmissionComment: vi.fn((id: string) => scored(id, 1)),
    changeSubmissionComment: vi.fn((id: string) => scored(id, 2)),
    removeSubmissionComment: vi.fn((id: string) => scored(id, 3)),
    deleteSubmission: vi.fn(() => of(null)),
    ...overrides.api,
  } satisfies SubmissionApi;
  const optionApi = {
    selectSubmissionOption: vi.fn(() => of(makeSubmission({ score: 10 }))),
    deselectSubmissionOption: vi.fn(() => of(makeSubmission({ score: 0 }))),
    ...overrides.optionApi,
  } satisfies SubmissionOptionApi;
  const navigate = vi.fn();
  const router: Pick<Router, 'navigate'> = { navigate };
  const { route } = activatedRouteStub(overrides.queryParams);

  TestBed.configureTestingModule({
    providers: getDefaultProviders([
      { provide: SubmissionService, useValue: api },
      { provide: SubmissionOptionService, useValue: optionApi },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: route },
      SubmissionDataService,
    ]),
  });

  return {
    service: TestBed.inject(SubmissionDataService),
    query: TestBed.inject(SubmissionQuery),
    store: TestBed.inject(SubmissionStore),
    api,
    optionApi,
  };
}

describe('SubmissionDataService', () => {
  describe('loading', () => {
    /**
     * Verifies: each load variant calls its endpoint and replaces the store with the result.
     * Interacts with: SubmissionService getByEvaluation/getMineByEvaluation/getByEvaluationTeam stubs, SubmissionQuery.
     * Data: evaluation e1, team t1; per row, one variant and the id its endpoint returns.
     */
    it.each<{
      method: string;
      run: (service: SubmissionDataService) => void;
      endpoint: (api: ReturnType<typeof setup>['api']) => unknown;
      args: string[];
      id: string;
    }>([
      {
        method: 'loadByEvaluation',
        run: (service) => service.loadByEvaluation('e1'),
        endpoint: (api) => api.getByEvaluation,
        args: ['e1'],
        id: 's1',
      },
      {
        method: 'loadMineByEvaluation',
        run: (service) => service.loadMineByEvaluation('e1'),
        endpoint: (api) => api.getMineByEvaluation,
        args: ['e1'],
        id: 'mine',
      },
      {
        method: 'loadByEvaluationTeam',
        run: (service) => service.loadByEvaluationTeam('e1', 't1'),
        endpoint: (api) => api.getByEvaluationTeam,
        args: ['e1', 't1'],
        id: 'team',
      },
    ])(
      '$method loads its scope into the store',
      ({ run, endpoint, args, id }) => {
        const { service, query, store, api } = setup();
        store.set([makeSubmission({ id: 'stale' })]);
        run(service);
        expect(endpoint(api)).toHaveBeenCalledWith(...args);
        expect(query.getAll().map((s) => s.id)).toEqual([id]);
      },
    );

    /**
     * Verifies: a failed load empties the store and clears loading.
     * Interacts with: SubmissionService.getMineByEvaluation (throws), SubmissionQuery.
     * Data: one stale submission; a 403 response.
     */
    it('empties the store when a load fails', async () => {
      const { service, query, store } = setup({
        api: {
          getMineByEvaluation: vi.fn(() =>
            throwError(() => new HttpErrorResponse({ status: 403 })),
          ),
        },
      });
      store.set([makeSubmission({ id: 'stale' })]);
      service.loadMineByEvaluation('e1');
      expect(await firstValueFrom(query.selectAll())).toEqual([]);
      expect(await firstValueFrom(query.selectLoading())).toBe(false);
    });

    /**
     * Verifies: loadById() upserts the submission and makes it the active one.
     * Interacts with: SubmissionService.getSubmission stub, SubmissionQuery.selectActiveId.
     * Data: store holds s1; s2 is loaded.
     */
    it('loadById() upserts and activates the submission', async () => {
      const { service, query, store } = setup();
      store.set([makeSubmission()]);
      service.loadById('s2');
      expect(query.getAll().map((s) => s.id)).toEqual(['s1', 's2']);
      expect(await firstValueFrom(query.selectActiveId())).toBe('s2');
    });
  });

  describe('scoring', () => {
    /**
     * Verifies: add() upserts and activates the created submission.
     * Interacts with: SubmissionService.createSubmission stub, SubmissionQuery.
     * Data: empty store; the API returns 'new'.
     */
    it('add() stores and activates the created submission', () => {
      const { service, query, store } = setup();
      store.set([]);
      service.add(makeSubmission({ id: undefined }));
      expect(query.getAll().map((s) => s.id)).toEqual(['new']);
      expect(query.getActiveId()).toBe('new');
    });

    /**
     * Verifies: add() ignores an empty response from the API.
     * Interacts with: SubmissionService.createSubmission stub, SubmissionQuery.
     * Data: empty store; the API returns null.
     */
    it('add() ignores a null response', () => {
      const createSubmission = vi.fn<
        BodyOverload<SubmissionService['createSubmission']>
      >(() => of(null as unknown as Submission));
      const { service, query, store } = setup({ api: { createSubmission } });
      store.set([]);
      service.add(makeSubmission({ id: undefined }));
      expect(createSubmission).toHaveBeenCalled();
      expect(query.getAll()).toEqual([]);
    });

    /**
     * Verifies: selecting or deselecting an option calls the matching endpoint and stores the rescored submission.
     * Interacts with: SubmissionOptionService select/deselect stubs, SubmissionQuery.
     * Data: per row, s1 at the other score; option so1 selected (score 10) or deselected (score 0).
     */
    it.each([
      { selected: true, endpoint: 'selectSubmissionOption', from: 0, to: 10 },
      {
        selected: false,
        endpoint: 'deselectSubmissionOption',
        from: 10,
        to: 0,
      },
    ] as const)(
      'toggleSubmissionOption(selected=$selected) calls $endpoint',
      ({ selected, endpoint, from, to }) => {
        const { service, query, store, optionApi } = setup();
        store.set([makeSubmission({ score: from })]);
        service.toggleSubmissionOption('so1', selected);
        expect(optionApi[endpoint]).toHaveBeenCalledWith('so1');
        expect(query.getEntity('s1')?.score).toBe(to);
      },
    );

    /**
     * Verifies: clearSubmission() and presetSubmission() store the submission the API returns and clear loading.
     * Interacts with: SubmissionService.clearSubmission/presetSubmission stubs, SubmissionQuery.
     * Data: per row, s1 at score 7; preset returns 42, clear returns 0.
     */
    it.each([
      { method: 'presetSubmission', score: 42 },
      { method: 'clearSubmission', score: 0 },
    ] as const)('$method stores the returned score', ({ method, score }) => {
      const { service, query, store, api } = setup();
      store.set([makeSubmission({ score: 7 })]);
      service[method]('s1');
      expect(api[method]).toHaveBeenCalledWith('s1');
      expect(query.getEntity('s1')?.score).toBe(score);
      expect(query.getValue().loading).toBe(false);
    });

    /**
     * Verifies: updateSubmission() sends the submission and stores the API's copy.
     * Interacts with: SubmissionService.updateSubmission stub, SubmissionQuery.
     * Data: s1 at score 0, updated to 7.
     */
    it('updateSubmission() stores the updated submission', () => {
      const { service, query, store, api } = setup();
      store.set([makeSubmission()]);
      service.updateSubmission(makeSubmission({ score: 7 }));
      expect(api.updateSubmission).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({ score: 7 }),
      );
      expect(query.getEntity('s1')?.score).toBe(7);
    });

    /**
     * Verifies: each comment method sends the right ids and stores the returned submission.
     * Interacts with: SubmissionService add/change/removeSubmissionComment stubs, SubmissionQuery.
     * Data: s1 at score 0; per row, one comment call and the score its stub returns.
     */
    it.each<{
      method: string;
      run: (service: SubmissionDataService) => void;
      endpoint: (api: ReturnType<typeof setup>['api']) => unknown;
      args: unknown[];
      score: number;
    }>([
      {
        method: 'addSubmissionComment',
        run: (service) =>
          service.addSubmissionComment('s1', 'so1', 'Looks right'),
        endpoint: (api) => api.addSubmissionComment,
        args: ['s1', { submissionOptionId: 'so1', comment: 'Looks right' }],
        score: 1,
      },
      {
        method: 'changeSubmissionComment',
        run: (service) =>
          service.changeSubmissionComment('s1', {
            id: 'c1',
            comment: 'Edited',
          }),
        endpoint: (api) => api.changeSubmissionComment,
        args: ['s1', 'c1', { id: 'c1', comment: 'Edited' }],
        score: 2,
      },
      {
        method: 'removeSubmissionComment',
        run: (service) => service.removeSubmissionComment('s1', 'c1'),
        endpoint: (api) => api.removeSubmissionComment,
        args: ['s1', 'c1'],
        score: 3,
      },
    ])(
      '$method stores the returned submission',
      ({ run, endpoint, args, score }) => {
        const { service, query, store, api } = setup();
        store.set([makeSubmission()]);
        run(service);
        expect(endpoint(api)).toHaveBeenCalledWith(...args);
        expect(query.getEntity('s1')?.score).toBe(score);
      },
    );

    /**
     * Verifies: delete() removes the submission and clears the active one.
     * Interacts with: SubmissionService.deleteSubmission stub, SubmissionQuery.
     * Data: s1 active and s2; s1 deleted.
     */
    it('delete() removes the submission and clears the active one', () => {
      const { service, query, store, api } = setup();
      store.set([makeSubmission(), makeSubmission({ id: 's2' })]);
      service.setActive('s1');
      service.delete('s1');
      expect(api.deleteSubmission).toHaveBeenCalledWith('s1');
      expect(query.getAll().map((s) => s.id)).toEqual(['s2']);
      expect(query.getActiveId()).toBe('');
    });

    /**
     * Verifies: unload() empties the store.
     * Interacts with: SubmissionQuery.
     * Data: s1 and s2 stored.
     */
    it('unload() empties the store', () => {
      const { service, query, store } = setup();
      store.set([makeSubmission(), makeSubmission({ id: 's2' })]);
      service.unload();
      expect(query.getAll()).toEqual([]);
    });
  });

  describe('failed requests without an error callback', () => {
    const failure = new HttpErrorResponse({ status: 500 });
    const failing = () => vi.fn(() => throwError(() => failure));

    /**
     * Verifies: when loadById, add, updateSubmission, clearSubmission or presetSubmission fails, loading stays true, the store keeps s1 unchanged, and the error escapes.
     * Interacts with: the failing SubmissionService endpoint for each method, SubmissionQuery, captureUnhandledRxErrors.
     * Data: per row, store holds s1 and that endpoint answers 500.
     */
    it.each<{
      method: string;
      api: () => SubmissionApi;
      run: (service: SubmissionDataService) => void;
    }>([
      {
        method: 'loadById',
        api: () => ({ getSubmission: failing() }),
        run: (service) => service.loadById('s2'),
      },
      {
        method: 'add',
        api: () => ({ createSubmission: failing() }),
        run: (service) => service.add(makeSubmission({ id: undefined })),
      },
      {
        method: 'updateSubmission',
        api: () => ({ updateSubmission: failing() }),
        run: (service) =>
          service.updateSubmission(makeSubmission({ score: 7 })),
      },
      {
        method: 'clearSubmission',
        api: () => ({ clearSubmission: failing() }),
        run: (service) => service.clearSubmission('s1'),
      },
      {
        method: 'presetSubmission',
        api: () => ({ presetSubmission: failing() }),
        run: (service) => service.presetSubmission('s1'),
      },
    ])('$method leaves loading stuck when it fails', async ({ api, run }) => {
      const errors = captureUnhandledRxErrors();
      const { service, query, store } = setup({ api: api() });
      store.set([makeSubmission()]);
      run(service);
      await flush();
      expect(query.getValue().loading).toBe(true);
      expect(query.getAll()).toEqual([makeSubmission()]);
      // The escaped error reaches ErrorService, the app's ErrorHandler
      // (app.module.ts), which shows it.
      expect(errors).toEqual([failure]);
    });
  });

  describe('updateStore() (SubmissionCreated/Updated)', () => {
    /**
     * Verifies: a pushed non-average submission updates the stored one with the same id.
     * Interacts with: SubmissionDataService.updateStore, SubmissionQuery.
     * Data: store holds s1 at score 0; s1 pushed with score 5.
     */
    it('updates a stored submission by id', () => {
      const { service, query, store } = setup();
      store.set([makeSubmission()]);
      service.updateStore(makeSubmission({ score: 5 }));
      expect(query.getEntity('s1')?.score).toBe(5);
    });

    /**
     * Verifies: a pushed non-average submission with a new id is added.
     * Interacts with: SubmissionDataService.updateStore, SubmissionQuery.
     * Data: store holds s1; s2 pushed.
     */
    it('adds a new pushed submission', () => {
      const { service, query, store } = setup();
      store.set([makeSubmission()]);
      service.updateStore(makeSubmission({ id: 's2' }));
      expect(query.getAll().map((s) => s.id)).toEqual(['s1', 's2']);
    });

    /**
     * Verifies: a pushed average replaces the stored average for the same owner, evaluation and move, keeping the stored id.
     * Interacts with: SubmissionDataService.updateStore matching logic, SubmissionQuery.
     * Data: stored team-average 'avg-local' for t1/e1/move 1; pushed average 'avg-server' for the same keys.
     * Why: averages are recomputed server-side with new ids, so the client folds them onto the row it already shows.
     */
    it('folds a pushed average onto the matching stored average', () => {
      const { service, query, store } = setup();
      store.set([
        makeSubmission({ id: 'avg-local', scoreIsAnAverage: true, score: 1 }),
        makeSubmission({ id: 'team-score', score: 9 }),
      ]);
      const pushed = makeSubmission({
        id: 'avg-server',
        scoreIsAnAverage: true,
        score: 4,
      });
      service.updateStore(pushed);
      expect(query.getAll().map((s) => s.id)).toEqual([
        'avg-local',
        'team-score',
      ]);
      expect(query.getEntity('avg-local')?.score).toBe(4);
      expect(query.getEntity('team-score')?.score).toBe(9);
      // The caller's object is copied, not re-keyed.
      expect(pushed.id).toBe('avg-server');
    });

    /**
     * Verifies: a pushed average for a different move does not match, is logged, and is added under its own id.
     * Interacts with: SubmissionDataService.updateStore, console.log spy, SubmissionQuery.
     * Data: stored average for move 1; pushed average for move 2.
     */
    it('adds an unmatched average under its own id', () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const { service, query, store } = setup();
      store.set([makeSubmission({ id: 'avg-m1', scoreIsAnAverage: true })]);
      service.updateStore(
        makeSubmission({ id: 'avg-m2', scoreIsAnAverage: true, moveNumber: 2 }),
      );
      expect(query.getAll().map((s) => s.id)).toEqual(['avg-m1', 'avg-m2']);
      expect(log).toHaveBeenCalledWith(
        expect.stringContaining('submission not found'),
      );
    });

    /**
     * Verifies: deleteFromStore() (SubmissionDeleted) removes the submission.
     * Interacts with: SubmissionDataService.deleteFromStore, SubmissionQuery.
     * Data: store holds s1.
     */
    it('deleteFromStore() removes the submission', () => {
      const { service, query, store } = setup();
      store.set([makeSubmission()]);
      service.deleteFromStore('s1');
      expect(query.getAll()).toEqual([]);
    });
  });

  /**
   * Verifies: submissionList orders by dateCreated when sorton=dateCreated.
   * Interacts with: ActivatedRoute.queryParamMap stub, SubmissionDataService.submissionList.
   * Data: three submissions created on different days.
   */
  it('submissionList sorts by creation date', async () => {
    const { service, store } = setup({
      queryParams: { sorton: 'dateCreated', sortdir: 'desc' },
    });
    store.set([
      makeSubmission({ id: 'mid', dateCreated: new Date('2026-01-02') }),
      makeSubmission({ id: 'old', dateCreated: new Date('2026-01-01') }),
      makeSubmission({ id: 'new', dateCreated: new Date('2026-01-03') }),
    ]);
    const list = await firstValueFrom(service.submissionList);
    expect(list.map((s) => s.id)).toEqual(['new', 'mid', 'old']);
  });
});
