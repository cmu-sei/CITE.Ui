// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { TeamType, TeamTypeService } from '../../generated/cite.api';
import { TeamTypeDataService } from './team-type-data.service';
import { TeamTypeQuery } from './team-type.query';
import { TeamTypeStore } from './team-type.store';
import { ApiStub } from '../../test-utils/api-stub';
import { activatedRouteStub } from '../../test-utils/activated-route';
import { getDefaultProviders } from '../../test-utils/default-test-providers';
import { recordEmissions } from '../../test-utils/record-emissions';
import {
  captureUnhandledRxErrors,
  flush,
} from '../../test-utils/unhandled-rx-errors';

type TeamTypeApi = ApiStub<TeamTypeService>;

function setup(overrides: { api?: TeamTypeApi; queryParams?: Params } = {}) {
  const api = {
    getTeamTypes: vi.fn(() =>
      of([
        { id: 'tt1', name: 'Sector' },
        { id: 'tt2', name: 'agency' },
      ]),
    ),
    getTeamType: vi.fn((id: string) => of({ id, name: `Type ${id}` })),
    createTeamType: vi.fn((t?: TeamType) => of({ ...t, id: 'new' })),
    updateTeamType: vi.fn((_id: string, t?: TeamType) => of({ ...t })),
    deleteTeamType: vi.fn(() => of(null)),
    ...overrides.api,
  } satisfies TeamTypeApi;
  const navigate = vi.fn();
  const router: Pick<Router, 'navigate'> = { navigate };
  const { route, setQueryParams } = activatedRouteStub(overrides.queryParams);

  TestBed.configureTestingModule({
    providers: getDefaultProviders([
      { provide: TeamTypeService, useValue: api },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: route },
      TeamTypeDataService,
    ]),
  });

  return {
    service: TestBed.inject(TeamTypeDataService),
    query: TestBed.inject(TeamTypeQuery),
    store: TestBed.inject(TeamTypeStore),
    api,
    navigate,
    setQueryParams,
  };
}

describe('TeamTypeDataService', () => {
  /**
   * Verifies: load() fills the query, which sorts team types by name (QueryConfig sortBy 'name').
   * Interacts with: TeamTypeService.getTeamTypes stub, real TeamTypeStore/TeamTypeQuery.
   * Data: 'Sector' then 'agency' from the API.
   */
  it('load() fills the query, sorted by name', () => {
    const { service, query } = setup();
    service.load();
    expect(query.getAll().map((t) => t.id)).toEqual(['tt2', 'tt1']);
  });

  /**
   * Verifies: a failed load() empties the store and clears loading.
   * Interacts with: TeamTypeService.getTeamTypes (throws), TeamTypeQuery.
   * Data: one stale type; a 500 response.
   */
  it('load() empties the store on failure', async () => {
    const { service, query, store } = setup({
      api: {
        getTeamTypes: vi.fn(() =>
          throwError(() => new HttpErrorResponse({ status: 500 })),
        ),
      },
    });
    store.set([{ id: 'stale', name: 'Stale' }]);
    service.load();
    expect(query.getAll()).toEqual([]);
    expect(await firstValueFrom(query.selectLoading())).toBe(false);
  });

  /**
   * Verifies: loadById() upserts the team type and makes it active.
   * Interacts with: TeamTypeService.getTeamType stub, TeamTypeQuery.
   * Data: empty store; tt3 loaded.
   */
  it('loadById() upserts and activates the team type', () => {
    const { service, query, store } = setup();
    store.set([]);
    service.loadById('tt3');
    expect(query.getAll().map((t) => t.id)).toEqual(['tt3']);
    expect(query.getActiveId()).toBe('tt3');
  });

  /**
   * Verifies: add() stores the created team type and makes it active.
   * Interacts with: TeamTypeService.createTeamType stub, TeamTypeQuery.
   * Data: empty store; the API assigns id 'new'.
   */
  it('add() stores and activates the created team type', () => {
    const { service, query, store } = setup();
    store.set([]);
    service.add({ name: 'Partner' });
    expect(query.getEntity('new')?.name).toBe('Partner');
    expect(query.getActiveId()).toBe('new');
  });

  /**
   * Verifies: updateTeamType() stores the API's response.
   * Interacts with: TeamTypeService.updateTeamType stub, TeamTypeQuery.
   * Data: tt1 renamed.
   */
  it('updateTeamType() stores the updated team type', () => {
    const { service, query, store } = setup();
    store.set([{ id: 'tt1', name: 'Sector' }]);
    service.updateTeamType({ id: 'tt1', name: 'Sector Org' });
    expect(query.getEntity('tt1')?.name).toBe('Sector Org');
  });

  /**
   * Verifies: delete() removes the team type and clears the active one.
   * Interacts with: TeamTypeService.deleteTeamType stub, TeamTypeQuery.
   * Data: tt1 active and tt2; tt1 deleted.
   */
  it('delete() removes the team type and clears the active one', () => {
    const { service, query, store, api } = setup();
    store.set([
      { id: 'tt1', name: 'Sector' },
      { id: 'tt2', name: 'agency' },
    ]);
    service.setActive('tt1');
    service.delete('tt1');
    expect(api.deleteTeamType).toHaveBeenCalledWith('tt1');
    expect(query.getAll().map((t) => t.id)).toEqual(['tt2']);
    expect(query.getActiveId()).toBe('');
  });

  describe('failed requests without an error callback', () => {
    const failure = new HttpErrorResponse({ status: 500 });
    const failing = () => vi.fn(() => throwError(() => failure));

    /**
     * Verifies: when loadById, add or updateTeamType fails, loading stays true, the store keeps tt1 unchanged, and the error escapes.
     * Interacts with: the failing TeamTypeService endpoint for each method, TeamTypeQuery, captureUnhandledRxErrors.
     * Data: per row, store holds tt1 and that endpoint answers 500.
     */
    it.each<{
      method: string;
      api: () => TeamTypeApi;
      run: (service: TeamTypeDataService) => void;
    }>([
      {
        method: 'loadById',
        api: () => ({ getTeamType: failing() }),
        run: (service) => service.loadById('tt3'),
      },
      {
        method: 'add',
        api: () => ({ createTeamType: failing() }),
        run: (service) => service.add({ name: 'Partner' }),
      },
      {
        method: 'updateTeamType',
        api: () => ({ updateTeamType: failing() }),
        run: (service) => service.updateTeamType({ id: 'tt1', name: 'New' }),
      },
    ])('$method leaves loading stuck when it fails', async ({ api, run }) => {
      const errors = captureUnhandledRxErrors();
      const { service, query, store } = setup({ api: api() });
      store.set([{ id: 'tt1', name: 'Sector' }]);
      run(service);
      await flush();
      expect(query.getValue().loading).toBe(true);
      expect(query.getAll()).toEqual([{ id: 'tt1', name: 'Sector' }]);
      // The escaped error reaches ErrorService, the app's ErrorHandler
      // (app.module.ts), which shows it.
      expect(errors).toEqual([failure]);
    });
  });

  const teamTypes = () => [
    { id: 'a', name: 'Agency' },
    { id: 'c', name: 'Contractor' },
    { id: 'b', name: 'Bureau' },
  ];

  /**
   * Verifies: teamTypeList sorts by name whatever column sorton names.
   * Interacts with: ActivatedRoute.queryParamMap stub, TeamTypeDataService.teamTypeList.
   * Data: three types; sortdir=desc and sorton=dateCreated.
   * Why: sortTeamTypes() compares names for every column; this pins that.
   */
  it('teamTypeList sorts by name in any column', async () => {
    const { service, store } = setup({
      queryParams: { sorton: 'dateCreated', sortdir: 'desc' },
    });
    store.set(teamTypes());
    const list = await firstValueFrom(service.teamTypeList);
    expect(list.map((t) => t.id)).toEqual(['c', 'b', 'a']);
  });

  /**
   * Verifies: the modelterm query param filters team types by name.
   * Interacts with: ActivatedRoute.queryParamMap stub, TeamTypeDataService.teamTypeList.
   * Data: three types; term 'bur'.
   */
  it('teamTypeList filters by modelterm', () => {
    const { service, store, setQueryParams } = setup();
    store.set(teamTypes());
    const lists = recordEmissions(service.teamTypeList);
    setQueryParams({ modelterm: 'bur' });
    expect(lists[lists.length - 1].map((t) => t.id)).toEqual(['b']);
  });

  /**
   * Verifies: updateStore() upserts a pushed team type.
   * Interacts with: TeamTypeDataService.updateStore, TeamTypeQuery.
   * Data: empty store; tt9 pushed.
   */
  it('updateStore() adds a pushed team type', () => {
    const { service, query, store } = setup();
    store.set([]);
    service.updateStore({ id: 'tt9', name: 'Pushed' });
    expect(query.getEntity('tt9')?.name).toBe('Pushed');
  });

  /**
   * Verifies: deleteFromStore() removes the team type.
   * Interacts with: TeamTypeDataService.deleteFromStore, TeamTypeQuery.
   * Data: store holds tt9.
   */
  it('deleteFromStore() removes the team type', () => {
    const { service, query, store } = setup();
    store.set([{ id: 'tt9', name: 'Pushed' }]);
    service.deleteFromStore('tt9');
    expect(query.getAll()).toEqual([]);
  });
});
