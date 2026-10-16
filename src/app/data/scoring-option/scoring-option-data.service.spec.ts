// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { ScoringOption, ScoringOptionService } from '../../generated/cite.api';
import { ScoringOptionDataService } from './scoring-option-data.service';
import { ScoringOptionQuery } from './scoring-option.query';
import { ScoringOptionStore } from './scoring-option.store';
import { ApiStub } from '../../test-utils/api-stub';
import { activatedRouteStub } from '../../test-utils/activated-route';
import { getDefaultProviders } from '../../test-utils/default-test-providers';
import { recordEmissions } from '../../test-utils/record-emissions';
import {
  captureUnhandledRxErrors,
  flush,
} from '../../test-utils/unhandled-rx-errors';

type ScoringOptionApi = ApiStub<ScoringOptionService>;

function makeOption(overrides: Partial<ScoringOption> = {}): ScoringOption {
  return {
    id: 'so1',
    scoringCategoryId: 'sc1',
    description: 'No impact',
    displayOrder: 1,
    value: 0,
    ...overrides,
  };
}

function setup(
  overrides: { api?: ScoringOptionApi; queryParams?: Params } = {},
) {
  const api = {
    getScoringOptionsByScoringCategoryId: vi.fn(() => of([makeOption()])),
    getScoringOption: vi.fn((id: string) => of(makeOption({ id }))),
    createScoringOption: vi.fn((o?: ScoringOption) => of({ ...o, id: 'new' })),
    updateScoringOption: vi.fn((_id: string, o?: ScoringOption) =>
      of({ ...o }),
    ),
    deleteScoringOption: vi.fn(() => of(null)),
    ...overrides.api,
  } satisfies ScoringOptionApi;
  const navigate = vi.fn();
  const router: Pick<Router, 'navigate'> = { navigate };
  const { route, setQueryParams } = activatedRouteStub(overrides.queryParams);

  TestBed.configureTestingModule({
    providers: getDefaultProviders([
      { provide: ScoringOptionService, useValue: api },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: route },
      ScoringOptionDataService,
    ]),
  });

  return {
    service: TestBed.inject(ScoringOptionDataService),
    query: TestBed.inject(ScoringOptionQuery),
    store: TestBed.inject(ScoringOptionStore),
    api,
    navigate,
    setQueryParams,
  };
}

describe('ScoringOptionDataService', () => {
  /**
   * Verifies: loadByScoringCategory() replaces the store with the category's options.
   * Interacts with: ScoringOptionService.getScoringOptionsByScoringCategoryId stub, real store/query.
   * Data: a stale option in the store; the API returns so1 for sc1.
   */
  it('loadByScoringCategory() fills the query with the category options', async () => {
    const { service, query, store, api } = setup();
    store.set([makeOption({ id: 'stale' })]);
    service.loadByScoringCategory('sc1');
    expect(api.getScoringOptionsByScoringCategoryId).toHaveBeenCalledWith(
      'sc1',
    );
    expect(query.getAll().map((o) => o.id)).toEqual(['so1']);
    expect(await firstValueFrom(query.selectLoading())).toBe(false);
  });

  /**
   * Verifies: a failed loadByScoringCategory() empties the store.
   * Interacts with: ScoringOptionService.getScoringOptionsByScoringCategoryId (throws), ScoringOptionQuery.
   * Data: one option in the store; a 500 response.
   */
  it('loadByScoringCategory() empties the store on failure', () => {
    const { service, query, store } = setup({
      api: {
        getScoringOptionsByScoringCategoryId: vi.fn(() =>
          throwError(() => new HttpErrorResponse({ status: 500 })),
        ),
      },
    });
    store.set([makeOption()]);
    service.loadByScoringCategory('sc1');
    expect(query.getAll()).toEqual([]);
  });

  /**
   * Verifies: add() stores the created option and makes it active.
   * Interacts with: ScoringOptionService.createScoringOption stub, ScoringOptionQuery.
   * Data: store holds so1; the API assigns id 'new'.
   */
  it('add() stores and activates the created option', () => {
    const { service, query, store } = setup();
    store.set([makeOption()]);
    service.add(makeOption({ id: undefined, value: 5 }));
    expect(query.getEntity('new')?.value).toBe(5);
    expect(query.getActiveId()).toBe('new');
  });

  /**
   * Verifies: updateScoringOption() stores the API's response.
   * Interacts with: ScoringOptionService.updateScoringOption stub, ScoringOptionQuery.
   * Data: so1 revalued to 3.
   */
  it('updateScoringOption() stores the updated option', () => {
    const { service, query, store } = setup();
    store.set([makeOption()]);
    service.updateScoringOption(makeOption({ value: 3 }));
    expect(query.getEntity('so1')?.value).toBe(3);
  });

  /**
   * Verifies: delete() removes the option and clears the active option.
   * Interacts with: ScoringOptionService.deleteScoringOption stub, ScoringOptionQuery.
   * Data: so1 and so2 stored, so2 active; so2 deleted.
   */
  it('delete() removes the option and clears the active one', () => {
    const { service, query, store, api } = setup();
    store.set([makeOption(), makeOption({ id: 'so2' })]);
    service.setActive('so2');
    service.delete('so2');
    expect(api.deleteScoringOption).toHaveBeenCalledWith('so2');
    expect(query.getAll().map((o) => o.id)).toEqual(['so1']);
    expect(query.getActiveId()).toBe('');
  });

  /**
   * Verifies: loadById() upserts the option and makes it active.
   * Interacts with: ScoringOptionService.getScoringOption stub, ScoringOptionQuery.
   * Data: empty store; so2 loaded by id.
   */
  it('loadById() upserts and activates the option', () => {
    const { service, query, store } = setup();
    store.set([]);
    service.loadById('so2');
    expect(query.getAll().map((o) => o.id)).toEqual(['so2']);
    expect(query.getActiveId()).toBe('so2');
  });

  describe('failed requests without an error callback', () => {
    const failure = new HttpErrorResponse({ status: 500 });
    const failing = () => vi.fn(() => throwError(() => failure));

    /**
     * Verifies: when loadById, add or updateScoringOption fails, loading stays true, the store keeps so1 unchanged, and the error escapes.
     * Interacts with: the failing ScoringOptionService endpoint for each method, ScoringOptionQuery, captureUnhandledRxErrors.
     * Data: per row, store holds so1 and that endpoint answers 500.
     */
    it.each<{
      method: string;
      api: () => ScoringOptionApi;
      run: (service: ScoringOptionDataService) => void;
    }>([
      {
        method: 'loadById',
        api: () => ({ getScoringOption: failing() }),
        run: (service) => service.loadById('so2'),
      },
      {
        method: 'add',
        api: () => ({ createScoringOption: failing() }),
        run: (service) => service.add(makeOption({ id: undefined })),
      },
      {
        method: 'updateScoringOption',
        api: () => ({ updateScoringOption: failing() }),
        run: (service) => service.updateScoringOption(makeOption({ value: 3 })),
      },
    ])('$method leaves loading stuck when it fails', async ({ api, run }) => {
      const errors = captureUnhandledRxErrors();
      const { service, query, store } = setup({ api: api() });
      store.set([makeOption()]);
      run(service);
      await flush();
      expect(query.getValue().loading).toBe(true);
      expect(query.getAll()).toEqual([makeOption()]);
      // The escaped error reaches ErrorService, the app's ErrorHandler
      // (app.module.ts), which shows it.
      expect(errors).toEqual([failure]);
    });
  });

  /**
   * Verifies: updateStore() upserts a pushed option.
   * Interacts with: ScoringOptionDataService.updateStore, ScoringOptionQuery.
   * Data: store holds so2 at value 0; so2 revalued to 9 by a push.
   */
  it('updateStore() applies a pushed option', () => {
    const { service, query, store } = setup();
    store.set([makeOption({ id: 'so2' })]);
    service.updateStore(makeOption({ id: 'so2', value: 9 }));
    expect(query.getEntity('so2')?.value).toBe(9);
  });

  /**
   * Verifies: deleteFromStore() removes the option.
   * Interacts with: ScoringOptionDataService.deleteFromStore, ScoringOptionQuery.
   * Data: store holds so2.
   */
  it('deleteFromStore() removes the option', () => {
    const { service, query, store } = setup();
    store.set([makeOption({ id: 'so2' })]);
    service.deleteFromStore('so2');
    expect(query.getAll()).toEqual([]);
  });

  const options = () => [
    makeOption({ id: 'o2', displayOrder: 2, description: 'Minimal' }),
    makeOption({ id: 'o3', displayOrder: 3, description: 'Significant' }),
    makeOption({ id: 'o1', displayOrder: 1, description: 'None' }),
  ];

  /**
   * Verifies: scoringOptionList sorts by display order in the requested direction.
   * Interacts with: ActivatedRoute.queryParamMap stub, ScoringOptionDataService.scoringOptionList.
   * Data: three options with display orders 2, 3, 1; sortdir=desc.
   */
  it('scoringOptionList sorts by display order', async () => {
    const { service, store } = setup({
      queryParams: { sorton: 'displayOrder', sortdir: 'desc' },
    });
    store.set(options());
    const list = await firstValueFrom(service.scoringOptionList);
    expect(list.map((o) => o.id)).toEqual(['o3', 'o2', 'o1']);
  });

  /**
   * Verifies: the scoringOptionmask query param filters options by description.
   * Interacts with: ActivatedRoute.queryParamMap stub, ScoringOptionDataService.scoringOptionList.
   * Data: three options; mask 'min'.
   */
  it('scoringOptionList filters by the mask', () => {
    const { service, store, setQueryParams } = setup();
    store.set(options());
    const lists = recordEmissions(service.scoringOptionList);
    setQueryParams({ scoringOptionmask: 'min' });
    expect(lists[lists.length - 1].map((o) => o.id)).toEqual(['o2']);
  });
});
