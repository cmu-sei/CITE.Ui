// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { ComnAuthService, ComnSettingsService } from '@cmusei/crucible-common';
import { ApplicationArea, SignalRService } from './signalr.service';
import { ActionDataService } from '../data/action/action-data.service';
import { ActionQuery } from '../data/action/action.query';
import { DutyDataService } from '../data/duty/duty-data.service';
import { EvaluationDataService } from '../data/evaluation/evaluation-data.service';
import { EvaluationQuery } from '../data/evaluation/evaluation.query';
import { MoveDataService } from '../data/move/move-data.service';
import { MoveQuery } from '../data/move/move.query';
import { ScoringModelDataService } from '../data/scoring-model/scoring-model-data.service';
import { ScoringModelQuery } from '../data/scoring-model/scoring-model.query';
import { SubmissionDataService } from '../data/submission/submission-data.service';
import { SubmissionQuery } from '../data/submission/submission.query';
import { TeamDataService } from '../data/team/team-data.service';
import { TeamMembershipDataService } from '../data/team/team-membership-data.service';
import { TeamQuery } from '../data/team/team.query';
import { UserDataService } from '../data/user/user-data.service';
import { UserQuery } from '../data/user/user.query';
import { getDefaultProviders } from '../test-utils/default-test-providers';
import {
  mockHubConnectionBuilder,
  rejectInvokes,
} from '../test-utils/fake-hub-connection';
import {
  captureUnhandledRejections,
  flush,
} from '../test-utils/unhandled-rx-errors';

const API_URL = 'https://cite.test';

let builder: ReturnType<typeof mockHubConnectionBuilder>;

// Real data services and Akita stores sit behind the hub, so each handler is
// checked by what the queries show afterwards. Their generated API services
// stay as unstubbed placeholders: hub events must not trigger HTTP calls.
function setup(overrides: { token?: () => string } = {}) {
  const token = overrides.token ?? (() => 'tok');
  const authUser$ = new Subject<unknown>();
  const auth: Pick<ComnAuthService, 'user$' | 'getAuthorizationToken'> = {
    user$: authUser$ as unknown as ComnAuthService['user$'],
    getAuthorizationToken: () => token(),
  };
  TestBed.configureTestingModule({
    providers: getDefaultProviders([
      { provide: ComnAuthService, useValue: auth },
      {
        provide: ComnSettingsService,
        useValue: {
          settings: { ApiUrl: API_URL },
        } satisfies Pick<ComnSettingsService, 'settings'>,
      },
      ActionDataService,
      DutyDataService,
      EvaluationDataService,
      MoveDataService,
      ScoringModelDataService,
      SubmissionDataService,
      TeamDataService,
      TeamMembershipDataService,
      UserDataService,
      SignalRService,
    ]),
  });
  return { service: TestBed.inject(SignalRService), authUser$ };
}

async function connect(area: ApplicationArea = ApplicationArea.home) {
  const ctx = setup();
  await ctx.service.startConnection(area);
  const [hub] = builder.connections;
  return { ...ctx, hub };
}

describe('SignalRService', () => {
  beforeEach(() => {
    builder = mockHubConnectionBuilder();
  });

  describe('connecting', () => {
    /**
     * Verifies: startConnection() opens one hub at /hubs/main with the bearer token in the query string.
     * Interacts with: mocked HubConnectionBuilder.withUrl, ComnSettingsService.settings.ApiUrl, ComnAuthService token.
     * Data: ApiUrl https://cite.test, token 'tok'.
     */
    it('builds the main hub URL with the bearer token', async () => {
      await connect();
      expect(builder.withUrl).toHaveBeenCalledWith(
        `${API_URL}/hubs/main?bearer=tok`,
      );
      expect(builder.connections).toHaveLength(1);
      expect(builder.connections[0].start).toHaveBeenCalledTimes(1);
    });

    /**
     * Verifies: once started, the service joins the hub group for its application area.
     * Interacts with: FakeHubConnection.invoke spy.
     * Data: per row, the home area ('') or the admin area ('Admin').
     */
    it.each([
      { area: ApplicationArea.home, method: 'Join' },
      { area: ApplicationArea.admin, method: 'JoinAdmin' },
    ])('invokes $method once started', async ({ area, method }) => {
      const { hub } = await connect(area);
      await flush();
      expect(hub.invoke).toHaveBeenCalledWith(method);
    });

    /**
     * Verifies: a second startConnection() for the same area reuses the connection; a new area builds another.
     * Interacts with: SignalRService.startConnection, mocked builder.
     * Data: home twice, then admin.
     */
    it('reuses the connection for the same area only', async () => {
      const { service } = setup();
      const first = service.startConnection(ApplicationArea.home);
      expect(service.startConnection(ApplicationArea.home)).toBe(first);
      expect(builder.connections).toHaveLength(1);
      await service.startConnection(ApplicationArea.admin);
      expect(builder.connections).toHaveLength(2);
    });

    /**
     * Verifies: switching to another area builds a new connection but neither stops nor leaves the first one.
     * Interacts with: SignalRService.startConnection, mocked builder, FakeHubConnection.stop/invoke.
     * Data: a joined home-area hub, then startConnection(admin).
     */
    it('keeps the first connection open when the area changes', async () => {
      const { service } = setup();
      await service.startConnection(ApplicationArea.home);
      await flush();
      await service.startConnection(ApplicationArea.admin);
      await flush();
      const [home, admin] = builder.connections;
      expect(admin.invoke).toHaveBeenCalledWith('JoinAdmin');
      expect(home.stop).not.toHaveBeenCalled();
      expect(home.invoke).not.toHaveBeenCalledWith('Leave');
      expect(home.state).toBe(signalR.HubConnectionState.Connected);
    });

    /**
     * Verifies: after a failed start() the cached rejected promise is returned for that area and no new connection is built.
     * Interacts with: mockHubConnectionBuilder onBuild (start rejects), captureUnhandledRejections.
     * Data: start() rejects with 'hub down'; startConnection(home) called twice.
     */
    it('never retries a failed start', async () => {
      const failure = new Error('hub down');
      builder = mockHubConnectionBuilder({
        onBuild: (c) => c.start.mockRejectedValue(failure),
      });
      const rejections = captureUnhandledRejections();
      const { service } = setup();
      const started = service.startConnection(ApplicationArea.home);
      await expect(started).rejects.toBe(failure);
      await flush();
      expect(service.startConnection(ApplicationArea.home)).toBe(started);
      await flush();
      expect(builder.connections).toHaveLength(1);
      expect(builder.connections[0].start).toHaveBeenCalledTimes(1);
      expect(builder.connections[0].invoke).not.toHaveBeenCalled();
      // The unhandled join-chain rejection is covered in 'hub promises without
      // a catch' below.
      expect(rejections).toEqual([failure]);
    });

    /**
     * Verifies: after an automatic reconnect the service joins its group again.
     * Interacts with: FakeHubConnection.reconnectedCallbacks and invoke spy.
     * Data: a connected home-area hub; invoke cleared before the reconnect.
     */
    it('rejoins after an automatic reconnect', async () => {
      const { hub } = await connect();
      await flush();
      hub.invoke.mockClear();
      hub.reconnectedCallbacks.forEach((cb) => cb());
      expect(hub.invoke).toHaveBeenCalledWith('Join');
    });

    /**
     * Verifies: a new OIDC user (token refresh) restarts the hub with a URL carrying the new token, then rejoins.
     * Interacts with: ComnAuthService.user$ (Subject), FakeHubConnection.stop/start/baseUrl/invoke.
     * Data: token changes from 'tok-1' to 'tok-2' before the user$ emission.
     */
    it('reconnects with the new token when the user changes', async () => {
      let token = 'tok-1';
      const { service, authUser$ } = setup({ token: () => token });
      await service.startConnection(ApplicationArea.home);
      const [hub] = builder.connections;
      await flush();
      hub.invoke.mockClear();
      token = 'tok-2';
      authUser$.next({});
      await flush();
      expect(hub.stop).toHaveBeenCalled();
      expect(hub.baseUrl).toBe(`${API_URL}/hubs/main?bearer=tok-2`);
      expect(hub.start).toHaveBeenCalledTimes(2);
      expect(hub.invoke).toHaveBeenCalledWith('Join');
    });

    /**
     * Verifies: a user$ emission before any connection exists does nothing.
     * Interacts with: ComnAuthService.user$, mocked builder.
     * Data: no startConnection() call.
     */
    it('ignores user changes before connecting', () => {
      const { authUser$ } = setup();
      authUser$.next({});
      expect(builder.connections).toHaveLength(0);
    });
  });

  describe('groups', () => {
    /**
     * Verifies: leave() leaves the joined group once; a second leave() sends nothing.
     * Interacts with: FakeHubConnection.invoke spy.
     * Data: a joined home-area hub.
     */
    it('leave() leaves the joined group once', async () => {
      const { service, hub } = await connect();
      await flush();
      service.leave();
      service.leave();
      expect(hub.invoke.mock.calls.filter(([m]) => m === 'Leave')).toHaveLength(
        1,
      );
    });

    /**
     * Verifies: switchTeam() moves the home-area client between team groups.
     * Interacts with: FakeHubConnection.invoke spy.
     * Data: a joined home hub switching t1 to t2.
     */
    it('switchTeam() switches team groups in the home area', async () => {
      const { service, hub } = await connect(ApplicationArea.home);
      await flush();
      service.switchTeam('t1', 't2');
      expect(hub.invoke).toHaveBeenCalledWith('switchTeam', ['t1', 't2']);
    });

    /**
     * Verifies: switchTeam() sends nothing in the admin area, which joins no team groups.
     * Interacts with: FakeHubConnection.invoke spy.
     * Data: a joined admin hub switching t1 to t2.
     */
    it('switchTeam() does nothing in the admin area', async () => {
      const { service, hub } = await connect(ApplicationArea.admin);
      await flush();
      hub.invoke.mockClear();
      service.switchTeam('t1', 't2');
      expect(hub.invoke).not.toHaveBeenCalled();
    });

    /**
     * Verifies: after a reconnect, the client rejoins its last team group 100ms after joining.
     * Interacts with: FakeHubConnection.reconnectedCallbacks/invoke, fake timers for the 100ms delay.
     * Data: a joined home hub that switched to t2; invoke cleared before reconnect.
     * Why: join() schedules the team switch with setTimeout, so this is real timer logic.
     */
    it('rejoins the last team group after reconnecting', async () => {
      const { service, hub } = await connect();
      await flush();
      service.switchTeam('t1', 't2');
      hub.invoke.mockClear();
      vi.useFakeTimers();
      try {
        hub.reconnectedCallbacks.forEach((cb) => cb());
        vi.advanceTimersByTime(100);
      } finally {
        vi.useRealTimers();
      }
      expect(hub.invoke).toHaveBeenCalledWith('Join');
      expect(hub.invoke).toHaveBeenCalledWith('switchTeam', ['t2', 't2']);
    });
  });

  describe('hub promises without a catch', () => {
    const failure = new Error('hub call failed');

    /**
     * Verifies: when a hub promise the service chains on or drops rejects, the rejection goes unhandled.
     * Interacts with: FakeHubConnection start/stop/invoke (rejecting), rejectInvokes, captureUnhandledRejections.
     * Data: per row, the method under test and the hub call made to reject with 'hub call failed'.
     */
    it.each<{ method: string; act: () => Promise<void> }>([
      {
        method: 'startConnection',
        act: async () => {
          builder = mockHubConnectionBuilder({
            onBuild: (c) => c.start.mockRejectedValue(failure),
          });
          const { service } = setup();
          // The caller's own copy of the promise is handled here; the
          // .then(join) chain the service builds on it is not.
          await service.startConnection(ApplicationArea.home).catch(() => {});
        },
      },
      {
        method: 'reconnect (stop rejects)',
        act: async () => {
          const { hub, authUser$ } = await connect();
          await flush();
          hub.stop.mockImplementation(() => Promise.reject(failure));
          authUser$.next({});
        },
      },
      {
        method: 'reconnect (restart rejects)',
        act: async () => {
          const { hub, authUser$ } = await connect();
          await flush();
          hub.start.mockImplementation(() => Promise.reject(failure));
          authUser$.next({});
        },
      },
      {
        method: 'join',
        act: async () => {
          builder = mockHubConnectionBuilder({
            onBuild: (c) => {
              rejectInvokes(c, failure);
            },
          });
          await setup().service.startConnection(ApplicationArea.home);
        },
      },
      {
        method: 'leave',
        act: async () => {
          const { service, hub } = await connect();
          await flush();
          rejectInvokes(hub, failure);
          service.leave();
        },
      },
      {
        method: 'switchTeam',
        act: async () => {
          const { service, hub } = await connect();
          await flush();
          rejectInvokes(hub, failure);
          service.switchTeam('t1', 't2');
        },
      },
    ])('$method lets a rejected hub call go unhandled', async ({ act }) => {
      const rejections = captureUnhandledRejections();
      await act();
      await flush();
      expect(rejections).toEqual([failure]);
    });
  });

  describe('entity events', () => {
    // One row per entity the hub pushes: the event prefix, a pushed entity,
    // and how to read the entity ids back from the real store. cite.api sends
    // <Entity>Created as (viewModel, null) and <Entity>Deleted as the bare id
    // (Infrastructure/EventHandlers/*Handler.cs). TeamMembership is covered
    // separately because its Deleted payload differs. The Duty handlers are
    // not covered: cite.api's MainHubMethods has no Duty events, so nothing
    // sends them.
    const entities: Array<{
      name: string;
      entity: { id: string } & Record<string, unknown>;
      ids: () => Promise<string[]>;
    }> = [
      {
        name: 'Action',
        entity: { id: 'a1', description: 'Isolate' },
        ids: async () =>
          TestBed.inject(ActionQuery)
            .getAll()
            .map((x) => x.id!),
      },
      {
        name: 'Evaluation',
        entity: { id: 'e1', description: 'Exercise' },
        ids: async () =>
          TestBed.inject(EvaluationQuery)
            .getAll()
            .map((x) => x.id!),
      },
      {
        name: 'Move',
        entity: { id: 'm1', moveNumber: 1 },
        ids: async () =>
          TestBed.inject(MoveQuery)
            .getAll()
            .map((x) => x.id!),
      },
      {
        name: 'ScoringModel',
        entity: { id: 'sm1', description: 'NCISS' },
        ids: async () =>
          TestBed.inject(ScoringModelQuery)
            .getAll()
            .map((x) => x.id!),
      },
      {
        name: 'Submission',
        entity: { id: 's1', teamId: 't1', moveNumber: 1 },
        ids: async () =>
          TestBed.inject(SubmissionQuery)
            .getAll()
            .map((x) => x.id!),
      },
      {
        name: 'Team',
        entity: { id: 't1', name: 'Red' },
        ids: async () =>
          TestBed.inject(TeamQuery)
            .getAll()
            .map((x) => x.id!),
      },
      {
        name: 'User',
        entity: { id: 'u1', name: 'Alice' },
        ids: async () =>
          TestBed.inject(UserQuery)
            .getAll()
            .map((x) => x.id!),
      },
    ];

    /**
     * Verifies: per entity, <Entity>Created adds the pushed entity to its store.
     * Interacts with: FakeHubConnection.trigger, the real data service and store/query for that entity.
     * Data: per row, one pushed view model with the API's null modifiedProperties.
     */
    it.each(entities)(
      '$name: Created adds the entity',
      async ({ name, entity, ids }) => {
        const { hub } = await connect();
        hub.trigger(`${name}Created`, { ...entity }, null);
        expect(await ids()).toEqual([entity.id]);
      },
    );

    /**
     * Verifies: per entity, <Entity>Deleted with the bare id the API sends removes the entity.
     * Interacts with: FakeHubConnection.trigger, the real data service and store/query for that entity.
     * Data: per row, one entity created through the hub, then deleted by id.
     */
    it.each(entities)(
      '$name: Deleted removes the entity',
      async ({ name, entity, ids }) => {
        const { hub } = await connect();
        hub.trigger(`${name}Created`, { ...entity }, null);
        hub.trigger(`${name}Deleted`, entity.id);
        expect(await ids()).toEqual([]);
      },
    );

    /**
     * Verifies: <Entity>Updated changes a stored entity in place for the entities that upsert.
     * Interacts with: FakeHubConnection.trigger, real stores/queries.
     * Data: per row, an entity created through the hub and then updated with the API's modifiedProperties.
     */
    it.each([
      {
        name: 'Evaluation',
        created: { id: 'e1', currentMoveNumber: 1 },
        updated: { id: 'e1', currentMoveNumber: 2 },
        modified: ['currentMoveNumber'],
        read: () =>
          TestBed.inject(EvaluationQuery).getEntity('e1')?.currentMoveNumber,
        expected: 2,
      },
      {
        name: 'Team',
        created: { id: 't1', name: 'Red' },
        updated: { id: 't1', name: 'Crimson' },
        modified: ['name'],
        read: () => TestBed.inject(TeamQuery).getEntity('t1')?.name,
        expected: 'Crimson',
      },
      {
        name: 'Move',
        created: { id: 'm1', description: 'old' },
        updated: { id: 'm1', description: 'new' },
        modified: ['description'],
        read: () => TestBed.inject(MoveQuery).getEntity('m1')?.description,
        expected: 'new',
      },
      {
        name: 'Action',
        created: { id: 'a1', description: 'Isolate', isChecked: false },
        updated: { id: 'a1', description: 'Isolate', isChecked: true },
        modified: ['isChecked'],
        read: () => TestBed.inject(ActionQuery).getEntity('a1')?.isChecked,
        expected: true,
      },
      {
        name: 'ScoringModel',
        created: { id: 'sm1', description: 'NCISS' },
        updated: { id: 'sm1', description: 'NCISS v2' },
        modified: ['description'],
        read: () =>
          TestBed.inject(ScoringModelQuery).getEntity('sm1')?.description,
        expected: 'NCISS v2',
      },
      {
        name: 'Submission',
        created: { id: 's1', teamId: 't1', moveNumber: 1, score: 0 },
        updated: { id: 's1', teamId: 't1', moveNumber: 1, score: 5 },
        modified: ['score'],
        read: () => TestBed.inject(SubmissionQuery).getEntity('s1')?.score,
        expected: 5,
      },
      {
        name: 'TeamMembership',
        created: { id: 'tm1', teamId: 't1', userId: 'u1', roleId: 'r1' },
        updated: { id: 'tm1', teamId: 't1', userId: 'u1', roleId: 'r2' },
        modified: ['roleId'],
        read: async () =>
          (
            await firstValueFrom(
              TestBed.inject(TeamMembershipDataService).teamMemberships$,
            )
          ).find((m) => m.id === 'tm1')?.roleId,
        expected: 'r2',
      },
    ])(
      '$name: Updated changes the stored entity',
      async ({ name, created, updated, modified, read, expected }) => {
        const { hub } = await connect();
        hub.trigger(`${name}Created`, created, null);
        hub.trigger(`${name}Updated`, updated, modified);
        expect(await read()).toBe(expected);
      },
    );

    /**
     * Verifies: EvaluationUpdated converts the pushed ISO date strings to Date objects.
     * Interacts with: FakeHubConnection.trigger, EvaluationDataService.updateStore, real EvaluationQuery.
     * Data: evaluation e1 pushed with an ISO dateCreated.
     */
    it('EvaluationUpdated stores Date objects', async () => {
      const { hub } = await connect();
      hub.trigger(
        'EvaluationUpdated',
        { id: 'e1', dateCreated: '2026-01-01T00:00:00Z' },
        ['dateCreated'],
      );
      expect(
        TestBed.inject(EvaluationQuery).getEntity('e1')?.dateCreated,
      ).toEqual(new Date('2026-01-01T00:00:00Z'));
    });

    /**
     * Verifies: TeamMembershipCreated adds the pushed membership.
     * Interacts with: FakeHubConnection.trigger, real TeamMembershipDataService.teamMemberships$.
     * Data: membership tm1 pushed as (viewModel, null).
     */
    it('TeamMembershipCreated adds the membership', async () => {
      const { hub } = await connect();
      hub.trigger(
        'TeamMembershipCreated',
        { id: 'tm1', teamId: 't1', userId: 'u1', roleId: 'r1' },
        null,
      );
      const memberships = await firstValueFrom(
        TestBed.inject(TeamMembershipDataService).teamMemberships$,
      );
      expect(memberships.map((m) => m.id)).toEqual(['tm1']);
    });

    /**
     * Verifies: TeamMembershipDeleted with the payload cite.api sends (the whole entity) removes nothing.
     * Interacts with: FakeHubConnection.trigger, real TeamMembershipDataService.teamMemberships$.
     * Data: membership tm1 created through the hub, then deleted with the entity object as payload.
     */
    it('TeamMembershipDeleted with the API payload leaves the membership', async () => {
      const { hub } = await connect();
      const membership = {
        id: 'tm1',
        teamId: 't1',
        userId: 'u1',
        roleId: 'r1',
      };
      hub.trigger('TeamMembershipCreated', { ...membership }, null);
      hub.trigger('TeamMembershipDeleted', { ...membership });
      const memberships = await firstValueFrom(
        TestBed.inject(TeamMembershipDataService).teamMemberships$,
      );
      expect(memberships.map((m) => m.id)).toEqual(['tm1']);
    });

    /**
     * Verifies: UserUpdated for a known user leaves it unchanged.
     * Interacts with: FakeHubConnection.trigger, real UserDataService/UserQuery.
     * Data: user u1 created as Alice, then pushed as Alicia with modifiedProperties ['name'].
     */
    it('UserUpdated does not change a known user', async () => {
      const { hub } = await connect();
      hub.trigger('UserCreated', { id: 'u1', name: 'Alice' }, null);
      hub.trigger('UserUpdated', { id: 'u1', name: 'Alicia' }, ['name']);
      // UserUpdated goes through UserDataService.updateStore(), whose add()
      // skips ids already in the store.
      expect(TestBed.inject(UserQuery).getEntity('u1')?.name).toBe('Alice');
    });
  });

  describe('retry policy', () => {
    /**
     * Verifies: the reconnect delay doubles per attempt (2^(n+1) s) plus 0-5 s of jitter.
     * Interacts with: the RetryPolicy passed to withAutomaticReconnect, Math.random spy.
     * Data: per row, the previous retry count, the Math.random value, and the expected delay.
     */
    it.each([
      { attempt: 0, random: 0, delay: 2000 },
      { attempt: 3, random: 0, delay: 16000 },
      { attempt: 0, random: 0.999, delay: 7000 },
    ])(
      'waits $delay ms after attempt $attempt with random $random',
      async ({ attempt, random, delay }) => {
        await connect();
        const policy = builder.retryPolicy()!;
        vi.spyOn(Math, 'random').mockReturnValue(random);
        expect(
          policy.nextRetryDelayInMilliseconds({
            previousRetryCount: attempt,
            elapsedMilliseconds: 1000,
            retryReason: new Error('lost'),
          }),
        ).toBe(delay);
      },
    );
  });
});
