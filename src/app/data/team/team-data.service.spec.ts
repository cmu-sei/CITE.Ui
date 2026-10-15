// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import { Team, TeamService } from '../../generated/cite.api';
import { TeamDataService } from './team-data.service';
import { TeamQuery } from './team.query';
import { TeamStore } from './team.store';
import { ApiStub, BodyOverload } from '../../test-utils/api-stub';
import { activatedRouteStub } from '../../test-utils/activated-route';
import { getDefaultProviders } from '../../test-utils/default-test-providers';
import { recordEmissions } from '../../test-utils/record-emissions';
import {
  captureUnhandledRxErrors,
  flush,
} from '../../test-utils/unhandled-rx-errors';

type TeamApi = ApiStub<TeamService>;

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 't1',
    name: 'Red Team',
    shortName: 'RED',
    evaluationId: 'e1',
    teamTypeId: 'tt1',
    teamType: { id: 'tt1', name: 'Agency' },
    ...overrides,
  };
}

function setup(overrides: { api?: TeamApi; queryParams?: Params } = {}) {
  const api = {
    getTeam: vi.fn((id: string) => of(makeTeam({ id }))),
    getMyEvaluationTeams: vi.fn(() => of([makeTeam({ id: 'mine' })])),
    getEvaluationTeams: vi.fn(() => of([makeTeam()])),
    createTeam: vi.fn((team?: Team) => of({ ...team, id: 'new' })),
    updateTeam: vi.fn((_id: string, team?: Team) => of({ ...team })),
    deleteTeam: vi.fn(() => of(null)),
    ...overrides.api,
  } satisfies TeamApi;
  const navigate = vi.fn();
  const router: Pick<Router, 'navigate'> = { navigate };
  const { route, setQueryParams } = activatedRouteStub(overrides.queryParams);

  TestBed.configureTestingModule({
    providers: getDefaultProviders([
      { provide: TeamService, useValue: api },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: route },
      TeamDataService,
    ]),
  });

  return {
    service: TestBed.inject(TeamDataService),
    query: TestBed.inject(TeamQuery),
    store: TestBed.inject(TeamStore),
    api,
    navigate,
    setQueryParams,
  };
}

describe('TeamDataService', () => {
  describe('loading', () => {
    /**
     * Verifies: loadByEvaluationId() replaces the store with the evaluation's teams.
     * Interacts with: TeamService.getEvaluationTeams stub, real TeamStore/TeamQuery.
     * Data: a stale team in the store; the API returns t1.
     */
    it('loadByEvaluationId() fills the query with the evaluation teams', () => {
      const { service, query, store, api } = setup();
      store.set([makeTeam({ id: 'stale' })]);
      service.loadByEvaluationId('e1');
      expect(api.getEvaluationTeams).toHaveBeenCalledWith('e1');
      expect(query.getAll().map((t) => t.id)).toEqual(['t1']);
    });

    /**
     * Verifies: a 403 from loadByEvaluationId() quietly empties the store and clears loading.
     * Interacts with: TeamService.getEvaluationTeams (throws 403), TeamQuery.
     * Data: a stale team in the store.
     * Why: the service comments that users without team-view permission get a 403 here.
     */
    it('loadByEvaluationId() empties the store on a 403', async () => {
      const { service, query, store } = setup({
        api: {
          getEvaluationTeams: vi.fn(() =>
            throwError(() => new HttpErrorResponse({ status: 403 })),
          ),
        },
      });
      store.set([makeTeam({ id: 'stale' })]);
      service.loadByEvaluationId('e1');
      expect(await firstValueFrom(query.selectAll())).toEqual([]);
      expect(await firstValueFrom(query.selectLoading())).toBe(false);
    });

    /**
     * Verifies: loadMine() loads only the caller's teams in the evaluation.
     * Interacts with: TeamService.getMyEvaluationTeams stub, TeamQuery.
     * Data: evaluation e1; the API returns 'mine'.
     */
    it('loadMine() loads the caller teams', () => {
      const { service, query, api } = setup();
      service.loadMine('e1');
      expect(api.getMyEvaluationTeams).toHaveBeenCalledWith('e1');
      expect(query.getAll().map((t) => t.id)).toEqual(['mine']);
    });

    /**
     * Verifies: a failed loadMine() empties the store.
     * Interacts with: TeamService.getMyEvaluationTeams (throws), TeamQuery.
     * Data: a stale team in the store; a 500 response.
     */
    it('loadMine() empties the store on failure', () => {
      const getMyEvaluationTeams = vi.fn<
        BodyOverload<TeamService['getMyEvaluationTeams']>
      >(() => throwError(() => new HttpErrorResponse({ status: 500 })));
      const { service, query, store } = setup({
        api: { getMyEvaluationTeams },
      });
      store.set([makeTeam({ id: 'stale' })]);
      service.loadMine('e1');
      expect(query.getAll()).toEqual([]);
    });

    /**
     * Verifies: loading is true while loadByEvaluationId() is in flight.
     * Interacts with: TeamService.getEvaluationTeams (Subject held open), TeamQuery.selectLoading.
     * Data: store seeded empty first.
     */
    it('reports loading while the request is in flight', () => {
      const response = new Subject<Team[]>();
      const { service, query, store } = setup({
        api: { getEvaluationTeams: vi.fn(() => response.asObservable()) },
      });
      store.set([]);
      const loading = recordEmissions(query.selectLoading());
      service.loadByEvaluationId('e1');
      response.next([]);
      expect(loading).toEqual([false, true, false]);
    });

    /**
     * Verifies: loadById() upserts the team and makes it active.
     * Interacts with: TeamService.getTeam stub, TeamQuery.selectActiveId.
     * Data: store holds t1; t2 is loaded.
     */
    it('loadById() upserts the team and activates it', async () => {
      const { service, query, store } = setup();
      store.set([makeTeam()]);
      service.loadById('t2');
      expect(query.getAll().map((t) => t.id)).toEqual(['t1', 't2']);
      expect(await firstValueFrom(query.selectActiveId())).toBe('t2');
    });
  });

  describe('mutations', () => {
    /**
     * Verifies: add() stores the created team and makes it active.
     * Interacts with: TeamService.createTeam stub, TeamQuery.
     * Data: a team without an id; the API assigns 'new'.
     */
    it('add() stores and activates the created team', () => {
      const { service, query, store } = setup();
      store.set([]);
      service.add(makeTeam({ id: undefined, name: 'Blue' }));
      expect(query.getEntity('new')?.name).toBe('Blue');
      expect(query.getActiveId()).toBe('new');
    });

    /**
     * Verifies: updateTeam() stores the API's response for the team.
     * Interacts with: TeamService.updateTeam stub, TeamQuery.
     * Data: t1 is renamed.
     */
    it('updateTeam() stores the updated team', () => {
      const { service, query, store, api } = setup();
      store.set([makeTeam()]);
      service.updateTeam(makeTeam({ name: 'Renamed' }));
      expect(api.updateTeam).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({ name: 'Renamed' }),
      );
      expect(query.getEntity('t1')?.name).toBe('Renamed');
    });

    /**
     * Verifies: delete() removes the team and clears the active team.
     * Interacts with: TeamService.deleteTeam stub, TeamQuery.
     * Data: t1 and t2 stored, t1 active; t1 is deleted.
     */
    it('delete() removes the team and clears the active one', () => {
      const { service, query, store, api } = setup();
      store.set([makeTeam({ id: 't1' }), makeTeam({ id: 't2' })]);
      service.setActive('t1');
      service.delete('t1');
      expect(api.deleteTeam).toHaveBeenCalledWith('t1');
      expect(query.getAll().map((t) => t.id)).toEqual(['t2']);
      expect(query.getActiveId()).toBe('');
    });

    /**
     * Verifies: unload() empties the store and leaves the active id as '' with no active entity.
     * Interacts with: TeamQuery.
     * Data: t1 stored and active.
     * Why: unload() calls set([]) before setActive(''), so '' survives (EvaluationDataService
     *      does the reverse and ends at null); Akita's hasActive() treats '' as active.
     */
    it('unload() empties the store', () => {
      const { service, query, store } = setup();
      store.set([makeTeam()]);
      service.setActive('t1');
      service.unload();
      expect(query.getAll()).toEqual([]);
      expect(query.getActiveId()).toBe('');
      expect(query.getActive()).toBeUndefined();
    });

    /**
     * Verifies: updateStore() (TeamCreated/TeamUpdated) upserts pushed teams.
     * Interacts with: TeamDataService.updateStore, TeamQuery.
     * Data: store holds t1; t1 renamed and t2 added by pushes.
     */
    it('updateStore() upserts pushed teams', () => {
      const { service, query, store } = setup();
      store.set([makeTeam()]);
      service.updateStore(makeTeam({ name: 'Pushed' }));
      service.updateStore(makeTeam({ id: 't2' }));
      expect(query.getEntity('t1')?.name).toBe('Pushed');
      expect(query.getAll().map((t) => t.id)).toEqual(['t1', 't2']);
    });

    /**
     * Verifies: deleteFromStore() (TeamDeleted) removes the team.
     * Interacts with: TeamDataService.deleteFromStore, TeamQuery.
     * Data: store holds t1 and t2; t1 removed.
     */
    it('deleteFromStore() removes the team', () => {
      const { service, query, store } = setup();
      store.set([makeTeam(), makeTeam({ id: 't2' })]);
      service.deleteFromStore('t1');
      expect(query.getAll().map((t) => t.id)).toEqual(['t2']);
    });
  });

  describe('failed requests without an error callback', () => {
    const failure = new HttpErrorResponse({ status: 500 });
    const failing = () => vi.fn(() => throwError(() => failure));

    /**
     * Verifies: when loadById, add or updateTeam fails, loading stays true, the store keeps t1 unchanged, and the error escapes.
     * Interacts with: the failing TeamService endpoint for each method, TeamQuery, captureUnhandledRxErrors.
     * Data: per row, store holds t1 and that endpoint answers 500.
     */
    it.each<{
      method: string;
      api: () => TeamApi;
      run: (service: TeamDataService) => void;
    }>([
      {
        method: 'loadById',
        api: () => ({ getTeam: failing() }),
        run: (service) => service.loadById('t2'),
      },
      {
        method: 'add',
        api: () => ({ createTeam: failing() }),
        run: (service) => service.add(makeTeam({ id: undefined })),
      },
      {
        method: 'updateTeam',
        api: () => ({ updateTeam: failing() }),
        run: (service) => service.updateTeam(makeTeam({ name: 'Renamed' })),
      },
    ])('$method leaves loading stuck when it fails', async ({ api, run }) => {
      const errors = captureUnhandledRxErrors();
      const { service, query, store } = setup({ api: api() });
      store.set([makeTeam()]);
      run(service);
      await flush();
      expect(query.getValue().loading).toBe(true);
      expect(query.getAll()).toEqual([makeTeam()]);
      // The escaped error reaches ErrorService, the app's ErrorHandler
      // (app.module.ts), which shows it.
      expect(errors).toEqual([failure]);
    });
  });

  describe('teamList', () => {
    /**
     * Verifies: the filter query param matches name, short name, team type name or id.
     * Interacts with: ActivatedRoute.queryParamMap stub, TeamDataService.teamList.
     * Data: three teams with distinct names, short names and team types; per row, one filter.
     */
    it.each([
      { field: 'short name', filter: 'blu', ids: ['t2'] },
      { field: 'team type', filter: 'agency', ids: ['zz', 't1'] },
      { field: 'id', filter: 'zz', ids: ['zz'] },
    ])('filters by $field', ({ filter, ids }) => {
      const { service, store, setQueryParams } = setup();
      store.set([
        makeTeam({
          id: 't1',
          name: 'Red Team',
          shortName: 'RED',
          teamType: { name: 'Agency' },
        }),
        makeTeam({
          id: 't2',
          name: 'Blue Team',
          shortName: 'BLU',
          teamType: { name: 'Sector' },
        }),
        makeTeam({
          id: 'zz',
          name: 'Green',
          shortName: 'GRN',
          teamType: { name: 'Agency' },
        }),
      ]);
      const lists = recordEmissions(service.teamList);
      setQueryParams({ filter });
      expect(lists[lists.length - 1].map((t) => t.id)).toEqual(ids);
    });

    /**
     * Verifies: sorton=shortName with sortdir=desc orders teams by short name descending.
     * Interacts with: ActivatedRoute.queryParamMap stub, TeamDataService.teamList.
     * Data: short names a, C, b.
     */
    it('sorts by short name in the requested direction', async () => {
      const { service, store } = setup({
        queryParams: { sorton: 'shortName', sortdir: 'desc' },
      });
      store.set([
        makeTeam({ id: 'a', shortName: 'a' }),
        makeTeam({ id: 'c', shortName: 'C' }),
        makeTeam({ id: 'b', shortName: 'b' }),
      ]);
      const list = await firstValueFrom(service.teamList);
      expect(list.map((t) => t.id)).toEqual(['c', 'b', 'a']);
    });

    /**
     * Verifies: a filter that misses name and short name throws when a team has no team type.
     * Interacts with: ActivatedRoute.queryParamMap stub, TeamDataService.teamList.
     * Data: one team without teamType; filter 'nomatch'.
     */
    it('errors the list when a team without a team type is filtered', async () => {
      const { service, store } = setup({ queryParams: { filter: 'nomatch' } });
      store.set([makeTeam({ teamType: undefined })]);
      await expect(firstValueFrom(service.teamList)).rejects.toThrow(TypeError);
    });

    /**
     * Verifies: typing in the filter control writes the term to the filter query param.
     * Interacts with: TeamDataService.filterControl, Router.navigate stub.
     * Data: filter term 'red'.
     */
    it('pushes filter control changes into the URL', () => {
      const { service, navigate } = setup();
      service.filterControl.setValue('red');
      expect(navigate).toHaveBeenCalledWith([], {
        queryParams: { filter: 'red' },
        queryParamsHandling: 'merge',
      });
    });
  });
});
