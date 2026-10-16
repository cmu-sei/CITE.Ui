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
import { firstValueFrom, of, throwError } from 'rxjs';
import {
  ItemStatus,
  ScoringModel,
  ScoringModelService,
} from '../../generated/cite.api';
import { ScoringModelDataService } from './scoring-model-data.service';
import { ScoringModelQuery } from './scoring-model.query';
import { ScoringModelStore } from './scoring-model.store';
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
type ScoringModelApi = ApiStub<ScoringModelService>;

function makeModel(overrides: Partial<ScoringModel> = {}): ScoringModel {
  return {
    id: 'sm1',
    description: 'NCISS',
    status: ItemStatus.Active,
    ...overrides,
  };
}

function setup(
  overrides: { api?: ScoringModelApi; queryParams?: Params } = {},
) {
  const api = {
    getScoringModels: vi.fn(() => of([makeModel()])),
    getScoringModel: vi.fn((id: string) => of(makeModel({ id }))),
    createScoringModel: vi.fn((m?: ScoringModel) => of({ ...m, id: 'new' })),
    copyScoringModel: vi.fn((id: string) =>
      of(makeModel({ id: `${id}-copy` })),
    ),
    updateScoringModel: vi.fn((_id: string, m?: ScoringModel) => of({ ...m })),
    deleteScoringModel: vi.fn(() => of(null)),
    uploadJsonFiles: vi.fn(() => of()),
    ...overrides.api,
  } satisfies ScoringModelApi;
  const navigate = vi.fn();
  const router: Pick<Router, 'navigate'> = { navigate };
  const { route, setQueryParams } = activatedRouteStub(overrides.queryParams);

  TestBed.configureTestingModule({
    providers: getDefaultProviders([
      { provide: ScoringModelService, useValue: api },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: route },
      ScoringModelDataService,
    ]),
  });

  return {
    service: TestBed.inject(ScoringModelDataService),
    query: TestBed.inject(ScoringModelQuery),
    store: TestBed.inject(ScoringModelStore),
    api,
    navigate,
    setQueryParams,
  };
}

describe('ScoringModelDataService', () => {
  /**
   * Verifies: load() replaces the store with every scoring model and clears loading.
   * Interacts with: ScoringModelService.getScoringModels stub, real ScoringModelStore/Query.
   * Data: a stale model in the store; the API returns sm1.
   */
  it('load() fills the query with all scoring models', async () => {
    const { service, query, store } = setup();
    store.set([makeModel({ id: 'stale' })]);
    service.load();
    expect(query.getAll().map((m) => m.id)).toEqual(['sm1']);
    expect(await firstValueFrom(query.selectLoading())).toBe(false);
  });

  /**
   * Verifies: a failed load() empties the store.
   * Interacts with: ScoringModelService.getScoringModels (throws), ScoringModelQuery.
   * Data: a stale model in the store; a 500 response.
   */
  it('load() empties the store on failure', () => {
    const { service, query, store } = setup({
      api: {
        getScoringModels: vi.fn(() =>
          throwError(() => new HttpErrorResponse({ status: 500 })),
        ),
      },
    });
    store.set([makeModel({ id: 'stale' })]);
    service.load();
    expect(query.getAll()).toEqual([]);
  });

  /**
   * Verifies: loadById() upserts the model and makes it active.
   * Interacts with: ScoringModelService.getScoringModel stub, ScoringModelQuery.selectActive.
   * Data: store holds sm1; sm2 is loaded.
   */
  it('loadById() upserts and activates the model', async () => {
    const { service, query, store } = setup();
    store.set([makeModel()]);
    service.loadById('sm2');
    expect(query.getAll().map((m) => m.id)).toEqual(['sm1', 'sm2']);
    expect(await firstValueFrom(query.selectActiveId())).toBe('sm2');
  });

  /**
   * Verifies: add() stores the created model and makes it active.
   * Interacts with: ScoringModelService.createScoringModel stub, ScoringModelQuery.
   * Data: store holds sm1; the API assigns id 'new'.
   */
  it('add() stores and activates the new model', () => {
    const { service, query, store } = setup();
    store.set([makeModel()]);
    service.add(makeModel({ id: undefined, description: 'Custom' }));
    expect(query.getAll().map((m) => m.id)).toEqual(['sm1', 'new']);
    expect(query.getActiveId()).toBe('new');
  });

  /**
   * Verifies: copy() adds the API's copy without changing the active model.
   * Interacts with: ScoringModelService.copyScoringModel stub, ScoringModelQuery.
   * Data: sm1 stored and active; the API returns 'sm1-copy'.
   */
  it('copy() adds the copy and keeps the active model', () => {
    const { service, query, store, api } = setup();
    store.set([makeModel()]);
    service.setActive('sm1');
    service.copy('sm1');
    expect(api.copyScoringModel).toHaveBeenCalledWith('sm1');
    expect(query.getAll().map((m) => m.id)).toEqual(['sm1', 'sm1-copy']);
    expect(query.getActiveId()).toBe('sm1');
  });

  /**
   * Verifies: a failed copy() clears loading and adds nothing.
   * Interacts with: ScoringModelService.copyScoringModel (throws), ScoringModelQuery.
   * Data: store holds sm1; a 403 response.
   */
  it('copy() clears loading when the API rejects it', () => {
    const { service, query, store } = setup({
      api: {
        copyScoringModel: vi.fn(() =>
          throwError(() => new HttpErrorResponse({ status: 403 })),
        ),
      },
    });
    store.set([makeModel()]);
    service.copy('sm1');
    expect(query.getValue().loading).toBe(false);
    expect(query.getAll()).toHaveLength(1);
  });

  /**
   * Verifies: updateScoringModel() stores the API's response.
   * Interacts with: ScoringModelService.updateScoringModel stub, ScoringModelQuery.
   * Data: sm1 renamed.
   */
  it('updateScoringModel() stores the updated model', () => {
    const { service, query, store } = setup();
    store.set([makeModel()]);
    service.updateScoringModel(makeModel({ description: 'Renamed' }));
    expect(query.getEntity('sm1')?.description).toBe('Renamed');
  });

  /**
   * Verifies: delete() removes the model and clears the active one.
   * Interacts with: ScoringModelService.deleteScoringModel stub, ScoringModelQuery.
   * Data: sm1 active; sm1 deleted.
   */
  it('delete() removes the model and clears the active one', () => {
    const { service, query, store, api } = setup();
    store.set([makeModel()]);
    service.setActive('sm1');
    service.delete('sm1');
    expect(api.deleteScoringModel).toHaveBeenCalledWith('sm1');
    expect(query.getAll()).toEqual([]);
    expect(query.getActiveId()).toBe('');
  });

  describe('failed requests without an error callback', () => {
    const failure = new HttpErrorResponse({ status: 500 });
    const failing = () => vi.fn(() => throwError(() => failure));

    /**
     * Verifies: when loadById, add or updateScoringModel fails, loading stays true, the store keeps sm1 unchanged, and the error escapes.
     * Interacts with: the failing ScoringModelService endpoint for each method, ScoringModelQuery, captureUnhandledRxErrors.
     * Data: per row, store holds sm1 and that endpoint answers 500.
     */
    it.each<{
      method: string;
      api: () => ScoringModelApi;
      run: (service: ScoringModelDataService) => void;
    }>([
      {
        method: 'loadById',
        api: () => ({ getScoringModel: failing() }),
        run: (service) => service.loadById('sm2'),
      },
      {
        method: 'add',
        api: () => ({ createScoringModel: failing() }),
        run: (service) => service.add(makeModel({ id: undefined })),
      },
      {
        method: 'updateScoringModel',
        api: () => ({ updateScoringModel: failing() }),
        run: (service) =>
          service.updateScoringModel(makeModel({ description: 'Renamed' })),
      },
    ])('$method leaves loading stuck when it fails', async ({ api, run }) => {
      const errors = captureUnhandledRxErrors();
      const { service, query, store } = setup({ api: api() });
      store.set([makeModel()]);
      run(service);
      await flush();
      expect(query.getValue().loading).toBe(true);
      expect(query.getAll()).toEqual([makeModel()]);
      // The escaped error reaches ErrorService, the app's ErrorHandler
      // (app.module.ts), which shows it.
      expect(errors).toEqual([failure]);
    });
  });

  /**
   * Verifies: uploadJson() publishes progress and stores the uploaded model on a 200 response.
   * Interacts with: ScoringModelService.uploadJsonFiles (HttpEvents), uploadProgress, ScoringModelQuery.
   * Data: progress 30 of 60 bytes, then a 200 response carrying sm9.
   */
  it('uploadJson() reports progress and stores the uploaded model', () => {
    const progressEvent: HttpProgressEvent = {
      type: HttpEventType.UploadProgress,
      loaded: 30,
      total: 60,
    };
    const { service, query, store } = setup({
      api: {
        uploadJsonFiles: vi.fn(() =>
          of(
            progressEvent,
            new HttpResponse({ status: 200, body: makeModel({ id: 'sm9' }) }),
          ),
        ),
      },
    });
    store.set([]);
    const progress = recordEmissions(service.uploadProgress);
    service.uploadJson(new File(['{}'], 'model.json'), 'events', true);
    expect(progress).toEqual([50, 0]);
    expect(query.getEntity('sm9')).toBeDefined();
  });

  /**
   * Verifies: updateStore() (ScoringModelCreated/Updated) upserts pushed models.
   * Interacts with: ScoringModelDataService.updateStore, ScoringModelQuery.
   * Data: store holds sm1; sm1 updated and sm2 added by pushes.
   */
  it('updateStore() upserts pushed models', () => {
    const { service, query, store } = setup();
    store.set([makeModel()]);
    service.updateStore(makeModel({ useSubmit: true }));
    service.updateStore(makeModel({ id: 'sm2' }));
    expect(query.getEntity('sm1')?.useSubmit).toBe(true);
    expect(query.getAll().map((m) => m.id)).toEqual(['sm1', 'sm2']);
  });

  /**
   * Verifies: deleteFromStore() (ScoringModelDeleted) removes the model.
   * Interacts with: ScoringModelDataService.deleteFromStore, ScoringModelQuery.
   * Data: store holds sm1 and sm2; sm1 removed.
   */
  it('deleteFromStore() removes the model', () => {
    const { service, query, store } = setup();
    store.set([makeModel(), makeModel({ id: 'sm2' })]);
    service.deleteFromStore('sm1');
    expect(query.getAll().map((m) => m.id)).toEqual(['sm2']);
  });

  const models = () => [
    makeModel({ id: 'b', description: 'beta', status: ItemStatus.Active }),
    makeModel({ id: 'a', description: 'Alpha', status: ItemStatus.Pending }),
    makeModel({ id: 'c', description: 'gamma', status: ItemStatus.Archived }),
  ];

  /**
   * Verifies: scoringModelList sorts by description, case-insensitively, by default.
   * Interacts with: ActivatedRoute.queryParamMap stub, ScoringModelDataService.scoringModelList.
   * Data: three models with mixed-case descriptions.
   */
  it('scoringModelList sorts by description', async () => {
    const { service, store } = setup();
    store.set(models());
    const list = await firstValueFrom(service.scoringModelList);
    expect(list.map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });

  /**
   * Verifies: the modelterm query param also matches the model status.
   * Interacts with: ActivatedRoute.queryParamMap stub, ScoringModelDataService.scoringModelList.
   * Data: three models with different statuses; term 'archived'.
   */
  it('scoringModelList filters by status through modelterm', () => {
    const { service, store, setQueryParams } = setup();
    store.set(models());
    const lists = recordEmissions(service.scoringModelList);
    setQueryParams({ modelterm: 'archived' });
    expect(lists[lists.length - 1].map((m) => m.id)).toEqual(['c']);
  });
});
