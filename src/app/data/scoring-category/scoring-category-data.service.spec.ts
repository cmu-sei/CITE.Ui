// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import {
  ScoringCategory,
  ScoringCategoryService,
} from '../../generated/cite.api';
import { ScoringCategoryDataService } from './scoring-category-data.service';
import { ScoringCategoryQuery } from './scoring-category.query';
import { ScoringCategoryStore } from './scoring-category.store';
import { ApiStub } from '../../test-utils/api-stub';
import { activatedRouteStub } from '../../test-utils/activated-route';
import { getDefaultProviders } from '../../test-utils/default-test-providers';
import { recordEmissions } from '../../test-utils/record-emissions';
import {
  captureUnhandledRxErrors,
  flush,
} from '../../test-utils/unhandled-rx-errors';

type ScoringCategoryApi = ApiStub<ScoringCategoryService>;

function makeCategory(
  overrides: Partial<ScoringCategory> = {},
): ScoringCategory {
  return {
    id: 'sc1',
    scoringModelId: 'sm1',
    description: 'Functional impact',
    displayOrder: 1,
    ...overrides,
  };
}

function setup(
  overrides: { api?: ScoringCategoryApi; queryParams?: Params } = {},
) {
  const api = {
    getScoringCategoriesByScoringModelId: vi.fn(() => of([makeCategory()])),
    getScoringCategory: vi.fn((id: string) => of(makeCategory({ id }))),
    createScoringCategory: vi.fn((c?: ScoringCategory) =>
      of({ ...c, id: 'new' }),
    ),
    updateScoringCategory: vi.fn((_id: string, c?: ScoringCategory) =>
      of({ ...c }),
    ),
    deleteScoringCategory: vi.fn(() => of(null)),
    ...overrides.api,
  } satisfies ScoringCategoryApi;
  const navigate = vi.fn();
  const router: Pick<Router, 'navigate'> = { navigate };
  const { route, setQueryParams } = activatedRouteStub(overrides.queryParams);

  TestBed.configureTestingModule({
    providers: getDefaultProviders([
      { provide: ScoringCategoryService, useValue: api },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: route },
      ScoringCategoryDataService,
    ]),
  });

  return {
    service: TestBed.inject(ScoringCategoryDataService),
    query: TestBed.inject(ScoringCategoryQuery),
    store: TestBed.inject(ScoringCategoryStore),
    api,
    navigate,
    setQueryParams,
  };
}

describe('ScoringCategoryDataService', () => {
  /**
   * Verifies: loadByScoringModel() replaces the store with the model's categories.
   * Interacts with: ScoringCategoryService.getScoringCategoriesByScoringModelId stub, real store/query.
   * Data: a stale category in the store; the API returns sc1 for sm1.
   */
  it('loadByScoringModel() fills the query with the model categories', () => {
    const { service, query, store, api } = setup();
    store.set([makeCategory({ id: 'stale' })]);
    service.loadByScoringModel('sm1');
    expect(api.getScoringCategoriesByScoringModelId).toHaveBeenCalledWith(
      'sm1',
    );
    expect(query.getAll().map((c) => c.id)).toEqual(['sc1']);
  });

  /**
   * Verifies: loading is reported while the request is in flight, and a failure empties the store.
   * Interacts with: ScoringCategoryService.getScoringCategoriesByScoringModelId (Subject), ScoringCategoryQuery.
   * Data: store seeded with one category; the request errors with 500.
   */
  it('loadByScoringModel() reports loading and empties on failure', () => {
    const response = new Subject<ScoringCategory[]>();
    const { service, query, store } = setup({
      api: {
        getScoringCategoriesByScoringModelId: vi.fn(() =>
          response.asObservable(),
        ),
      },
    });
    store.set([makeCategory()]);
    const loading = recordEmissions(query.selectLoading());
    service.loadByScoringModel('sm1');
    expect(loading).toEqual([false, true]);
    response.error(new HttpErrorResponse({ status: 500 }));
    expect(query.getAll()).toEqual([]);
    expect(loading).toEqual([false, true, false]);
  });

  /**
   * Verifies: loadById() upserts the category and makes it active.
   * Interacts with: ScoringCategoryService.getScoringCategory stub, ScoringCategoryQuery.
   * Data: store holds sc1; sc2 is loaded.
   */
  it('loadById() upserts and activates the category', () => {
    const { service, query, store } = setup();
    store.set([makeCategory()]);
    service.loadById('sc2');
    expect(query.getAll().map((c) => c.id)).toEqual(['sc1', 'sc2']);
    expect(query.getActiveId()).toBe('sc2');
  });

  /**
   * Verifies: add() stores the created category and makes it active.
   * Interacts with: ScoringCategoryService.createScoringCategory stub, ScoringCategoryQuery.
   * Data: store holds sc1; the API assigns id 'new'.
   */
  it('add() stores and activates the created category', () => {
    const { service, query, store } = setup();
    store.set([makeCategory()]);
    service.add(makeCategory({ id: undefined, description: 'Added' }));
    expect(query.getAll().map((c) => c.id)).toEqual(['sc1', 'new']);
    expect(query.getActiveId()).toBe('new');
  });

  /**
   * Verifies: unload() empties the store and leaves no active category.
   * Interacts with: ScoringCategoryQuery.
   * Data: sc1 stored and active.
   */
  it('unload() clears the categories and the active one', () => {
    const { service, query, store } = setup();
    store.set([makeCategory()]);
    service.setActive('sc1');
    service.unload();
    expect(query.getAll()).toEqual([]);
    expect(query.getActive()).toBeUndefined();
  });

  /**
   * Verifies: updateScoringCategory() stores the API's response.
   * Interacts with: ScoringCategoryService.updateScoringCategory stub, ScoringCategoryQuery.
   * Data: sc1 gets displayOrder 5.
   */
  it('updateScoringCategory() stores the updated category', () => {
    const { service, query, store } = setup();
    store.set([makeCategory()]);
    service.updateScoringCategory(makeCategory({ displayOrder: 5 }));
    expect(query.getEntity('sc1')?.displayOrder).toBe(5);
  });

  /**
   * Verifies: delete() calls the API and removes the category.
   * Interacts with: ScoringCategoryService.deleteScoringCategory stub, ScoringCategoryQuery.
   * Data: store holds sc1; sc1 deleted.
   */
  it('delete() removes the category', () => {
    const { service, query, store, api } = setup();
    store.set([makeCategory()]);
    service.delete('sc1');
    expect(api.deleteScoringCategory).toHaveBeenCalledWith('sc1');
    expect(query.getAll()).toEqual([]);
  });

  describe('failed requests without an error callback', () => {
    const failure = new HttpErrorResponse({ status: 500 });
    const failing = () => vi.fn(() => throwError(() => failure));

    /**
     * Verifies: when loadById, add or updateScoringCategory fails, loading stays true, the store keeps sc1 unchanged, and the error escapes.
     * Interacts with: the failing ScoringCategoryService endpoint for each method, ScoringCategoryQuery, captureUnhandledRxErrors.
     * Data: per row, store holds sc1 and that endpoint answers 500.
     */
    it.each<{
      method: string;
      api: () => ScoringCategoryApi;
      run: (service: ScoringCategoryDataService) => void;
    }>([
      {
        method: 'loadById',
        api: () => ({ getScoringCategory: failing() }),
        run: (service) => service.loadById('sc2'),
      },
      {
        method: 'add',
        api: () => ({ createScoringCategory: failing() }),
        run: (service) => service.add(makeCategory({ id: undefined })),
      },
      {
        method: 'updateScoringCategory',
        api: () => ({ updateScoringCategory: failing() }),
        run: (service) =>
          service.updateScoringCategory(makeCategory({ displayOrder: 5 })),
      },
    ])('$method leaves loading stuck when it fails', async ({ api, run }) => {
      const errors = captureUnhandledRxErrors();
      const { service, query, store } = setup({ api: api() });
      store.set([makeCategory()]);
      run(service);
      await flush();
      expect(query.getValue().loading).toBe(true);
      expect(query.getAll()).toEqual([makeCategory()]);
      // The escaped error reaches ErrorService, the app's ErrorHandler
      // (app.module.ts), which shows it.
      expect(errors).toEqual([failure]);
    });
  });

  /**
   * Verifies: updateStore() upserts a pushed category.
   * Interacts with: ScoringCategoryDataService.updateStore, ScoringCategoryQuery.
   * Data: empty store; sc7 pushed.
   */
  it('updateStore() adds a pushed category', () => {
    const { service, query, store } = setup();
    store.set([]);
    service.updateStore(makeCategory({ id: 'sc7' }));
    expect(query.getEntity('sc7')).toBeDefined();
  });

  /**
   * Verifies: deleteFromStore() removes the category.
   * Interacts with: ScoringCategoryDataService.deleteFromStore, ScoringCategoryQuery.
   * Data: store holds sc1.
   */
  it('deleteFromStore() removes the category', () => {
    const { service, query, store } = setup();
    store.set([makeCategory()]);
    service.deleteFromStore('sc1');
    expect(query.getAll()).toEqual([]);
  });

  const categories = () => [
    makeCategory({ id: 'c3', displayOrder: 3, description: 'Recoverability' }),
    makeCategory({
      id: 'c1',
      displayOrder: 1,
      description: 'Functional impact',
    }),
    makeCategory({
      id: 'c2',
      displayOrder: 2,
      description: 'Information impact',
    }),
  ];

  /**
   * Verifies: sorton=displayOrder orders categories numerically.
   * Interacts with: ActivatedRoute.queryParamMap stub, ScoringCategoryDataService.scoringCategoryList.
   * Data: categories with display orders 3, 1, 2.
   */
  it('scoringCategoryList sorts by display order', async () => {
    const { service, store } = setup({
      queryParams: { sorton: 'displayOrder' },
    });
    store.set(categories());
    const list = await firstValueFrom(service.scoringCategoryList);
    expect(list.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
  });

  /**
   * Verifies: the scoringCategorymask query param filters categories by description.
   * Interacts with: ActivatedRoute.queryParamMap stub, ScoringCategoryDataService.scoringCategoryList.
   * Data: three categories; mask 'impact'.
   */
  it('scoringCategoryList filters by the mask', () => {
    const { service, store, setQueryParams } = setup({
      queryParams: { sorton: 'displayOrder' },
    });
    store.set(categories());
    const lists = recordEmissions(service.scoringCategoryList);
    setQueryParams({ sorton: 'displayOrder', scoringCategorymask: 'impact' });
    expect(lists[lists.length - 1].map((c) => c.id)).toEqual(['c1', 'c2']);
  });
});
