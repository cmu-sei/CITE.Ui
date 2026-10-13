// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { ComnAuthService, ComnSettingsService } from '@cmusei/crucible-common';
import { GallerySignalRService } from './gallery-signalr.service';
import { EvaluationStore } from '../data/evaluation/evaluation.store';
import { UnreadArticlesDataService } from '../data/unread-articles/unread-articles-data.service';
import { UnreadArticlesQuery } from '../data/unread-articles/unread-articles.query';
import { SystemMessageService } from './system-message/system-message.service';
import { getDefaultProviders } from '../test-utils/default-test-providers';
import {
  mockHubConnectionBuilder,
  rejectInvokes,
} from '../test-utils/fake-hub-connection';
import {
  captureUnhandledRejections,
  flush,
} from '../test-utils/unhandled-rx-errors';

const GALLERY_URL = 'https://gallery.test';
const UNAVAILABLE: [string, string] = [
  'Gallery Unavailable',
  'CITE could not connect to Gallery. The unread Gallery item count will not update until the connection is restored. Refresh the page to try again.',
];

let builder: ReturnType<typeof mockHubConnectionBuilder>;

interface RecoverContext {
  hub: ReturnType<typeof mockHubConnectionBuilder>['connections'][number];
  authUser$: Subject<unknown>;
}

// SystemMessageService is the edge to the bottom sheet (its own spec renders
// it); the hub-failure tests read what the service asks it to show.
function setup(overrides: { token?: () => string } = {}) {
  const token = overrides.token ?? (() => 'tok');
  const authUser$ = new Subject<unknown>();
  const auth: Pick<ComnAuthService, 'user$' | 'getAuthorizationToken'> = {
    user$: authUser$ as unknown as ComnAuthService['user$'],
    getAuthorizationToken: () => token(),
  };
  const displayMessage = vi.fn();
  const messages: Pick<SystemMessageService, 'displayMessage'> = {
    displayMessage,
  };
  TestBed.configureTestingModule({
    providers: getDefaultProviders([
      { provide: ComnAuthService, useValue: auth },
      { provide: SystemMessageService, useValue: messages },
      {
        provide: ComnSettingsService,
        useValue: {
          settings: { GalleryApiUrl: GALLERY_URL },
        } satisfies Pick<ComnSettingsService, 'settings'>,
      },
      UnreadArticlesDataService,
      GallerySignalRService,
    ]),
  });
  return {
    service: TestBed.inject(GallerySignalRService),
    authUser$,
    displayMessage,
  };
}

// The console.warn lines the service writes for a hub it cannot reach.
function recordWarnings() {
  const warnings: unknown[][] = [];
  vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    warnings.push(args);
  });
  return warnings;
}

describe('GallerySignalRService', () => {
  beforeEach(() => {
    builder = mockHubConnectionBuilder();
  });

  /**
   * Verifies: startConnection() opens the Gallery /hubs/cite hub with the bearer token and joins it.
   * Interacts with: mocked HubConnectionBuilder, ComnSettingsService.settings.GalleryApiUrl, FakeHubConnection.invoke.
   * Data: GalleryApiUrl https://gallery.test, token 'tok'.
   */
  it('connects to the Gallery CITE hub and joins', async () => {
    const { service } = setup();
    await service.startConnection();
    await flush();
    expect(builder.withUrl).toHaveBeenCalledWith(
      `${GALLERY_URL}/hubs/cite?bearer=tok`,
    );
    expect(builder.connections[0].invoke).toHaveBeenCalledWith('Join');
  });

  /**
   * Verifies: repeated startConnection() calls share one connection.
   * Interacts with: GallerySignalRService.startConnection, mocked builder.
   * Data: two calls.
   */
  it('reuses the existing connection', () => {
    const { service } = setup();
    const first = service.startConnection();
    expect(service.startConnection()).toBe(first);
    expect(builder.connections).toHaveLength(1);
  });

  /**
   * Verifies: after a failed start() the cached rejected promise is returned and no new connection is built.
   * Interacts with: mockHubConnectionBuilder onBuild (start rejects), captureUnhandledRejections, SystemMessageService stub.
   * Data: start() rejects with 'gallery down'; startConnection() called twice.
   */
  it('never retries a failed start', async () => {
    const failure = new Error('gallery down');
    builder = mockHubConnectionBuilder({
      onBuild: (c) => c.start.mockRejectedValue(failure),
    });
    const rejections = captureUnhandledRejections();
    const warnings = recordWarnings();
    const { service, displayMessage } = setup();
    const started = service.startConnection();
    await expect(started).rejects.toBe(failure);
    await flush();
    expect(service.startConnection()).toBe(started);
    await flush();
    expect(builder.connections).toHaveLength(1);
    expect(builder.connections[0].start).toHaveBeenCalledTimes(1);
    expect(builder.connections[0].invoke).not.toHaveBeenCalled();
    // The one failure is reported once, and nothing goes unhandled.
    expect(displayMessage.mock.calls).toEqual([UNAVAILABLE]);
    expect(warnings).toEqual([['Gallery hub unreachable: gallery down']]);
    expect(rejections).toEqual([]);
  });

  const failure = new Error('gallery hub call failed');

  /**
   * Verifies: when a hub promise the service drops, or chains on with no catch, rejects, the rejection goes unhandled.
   * Interacts with: FakeHubConnection stop/invoke (rejecting), rejectInvokes, captureUnhandledRejections.
   * Data: per row, the method under test and the hub call made to reject.
   */
  it.each<{ method: string; act: () => Promise<void> }>([
    {
      method: 'reconnect (stop rejects)',
      act: async () => {
        const { service, authUser$ } = setup();
        await service.startConnection();
        await flush();
        builder.connections[0].stop.mockImplementation(() =>
          Promise.reject(failure),
        );
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
        await setup().service.startConnection();
      },
    },
    {
      method: 'leave',
      act: async () => {
        const { service } = setup();
        await service.startConnection();
        await flush();
        rejectInvokes(builder.connections[0], failure);
        service.leave();
      },
    },
  ])('$method lets a rejected hub call go unhandled', async ({ act }) => {
    const rejections = captureUnhandledRejections();
    await act();
    await flush();
    expect(rejections).toEqual([failure]);
  });

  describe('hub failures', () => {
    /**
     * Verifies: a Gallery hub that cannot start is reported to the user once, with one console line naming the reason, and nothing goes unhandled.
     * Interacts with: mockHubConnectionBuilder onBuild (start rejects), SystemMessageService stub, console.warn spy, captureUnhandledRejections.
     * Data: per row, the start() rejection (an Error, or a reason that is not an Error) and the reason the console line shows.
     */
    it.each<{ kind: string; reason: unknown; shown: string }>([
      {
        kind: 'an Error',
        reason: new Error('gallery down'),
        shown: 'gallery down',
      },
      {
        kind: 'a plain reason',
        reason: 'negotiation failed',
        shown: 'negotiation failed',
      },
    ])(
      'tells the user Gallery is unavailable when the hub start fails with $kind',
      async ({ reason, shown }) => {
        builder = mockHubConnectionBuilder({
          onBuild: (c) =>
            c.start.mockImplementation(() => Promise.reject(reason)),
        });
        const rejections = captureUnhandledRejections();
        const warnings = recordWarnings();
        const { service, displayMessage } = setup();
        await service.startConnection().catch(() => {});
        await flush();
        expect(displayMessage.mock.calls).toEqual([UNAVAILABLE]);
        expect(warnings).toEqual([[`Gallery hub unreachable: ${shown}`]]);
        expect(builder.connections[0].invoke).not.toHaveBeenCalled();
        expect(rejections).toEqual([]);
      },
    );

    /**
     * Verifies: a restart that fails after a user change is reported to the user, does not rejoin, and is not left unhandled.
     * Interacts with: ComnAuthService.user$ (Subject), FakeHubConnection.start (rejects on the restart), SystemMessageService stub, console.warn spy.
     * Data: a connected, joined Gallery hub; the restart rejects with 'gallery down'.
     */
    it('tells the user Gallery is unavailable when a restart fails', async () => {
      const rejections = captureUnhandledRejections();
      const warnings = recordWarnings();
      const { service, authUser$, displayMessage } = setup();
      await service.startConnection();
      const [hub] = builder.connections;
      await flush();
      hub.invoke.mockClear();
      hub.start.mockImplementation(() =>
        Promise.reject(new Error('gallery down')),
      );
      authUser$.next({});
      await flush();
      expect(hub.start).toHaveBeenCalledTimes(2);
      expect(displayMessage.mock.calls).toEqual([UNAVAILABLE]);
      expect(warnings).toEqual([['Gallery hub unreachable: gallery down']]);
      expect(hub.invoke).not.toHaveBeenCalled();
      expect(rejections).toEqual([]);
    });

    /**
     * Verifies: further failed starts during the same outage show no second message and write no second console line.
     * Interacts with: ComnAuthService.user$ (Subject), FakeHubConnection.start (always rejects), SystemMessageService stub, console.warn spy.
     * Data: the first start and two restarts after user changes all reject with 'gallery down'.
     */
    it('reports one outage once across failed restarts', async () => {
      builder = mockHubConnectionBuilder({
        onBuild: (c) =>
          c.start.mockImplementation(() =>
            Promise.reject(new Error('gallery down')),
          ),
      });
      const rejections = captureUnhandledRejections();
      const warnings = recordWarnings();
      const { service, authUser$, displayMessage } = setup();
      await service.startConnection().catch(() => {});
      await flush();
      authUser$.next({});
      await flush();
      authUser$.next({});
      await flush();
      expect(builder.connections[0].start).toHaveBeenCalledTimes(3);
      expect(displayMessage.mock.calls).toEqual([UNAVAILABLE]);
      expect(warnings).toEqual([['Gallery hub unreachable: gallery down']]);
      expect(rejections).toEqual([]);
    });

    /**
     * Verifies: a successful connection after an outage re-arms the report, so the next outage is reported again.
     * Interacts with: FakeHubConnection.start (rejects, then resolves, then rejects), reconnect() (automatic reconnect) or user$ (restart), SystemMessageService stub, console.warn spy.
     * Data: per row, how the hub comes back: an automatic reconnect, or a restart after a user change; then a restart that fails.
     */
    it.each<{ how: string; recover: (ctx: RecoverContext) => Promise<void> }>([
      {
        how: 'an automatic reconnect',
        recover: async ({ hub }) => {
          hub.reconnect();
        },
      },
      {
        how: 'a restart after a user change',
        recover: async ({ hub, authUser$ }) => {
          hub.start.mockImplementation(() => {
            hub.state = signalR.HubConnectionState.Connected;
            return Promise.resolve();
          });
          authUser$.next({});
          await flush();
        },
      },
    ])('reports the next outage again after $how', async ({ recover }) => {
      builder = mockHubConnectionBuilder({
        onBuild: (c) =>
          c.start.mockImplementation(() =>
            Promise.reject(new Error('gallery down')),
          ),
      });
      const rejections = captureUnhandledRejections();
      const warnings = recordWarnings();
      const { service, authUser$, displayMessage } = setup();
      await service.startConnection().catch(() => {});
      await flush();
      const [hub] = builder.connections;
      await recover({ hub, authUser$ });
      expect(hub.invoke).toHaveBeenCalledWith('Join');
      hub.start.mockImplementation(() =>
        Promise.reject(new Error('gallery down again')),
      );
      authUser$.next({});
      await flush();
      expect(displayMessage.mock.calls).toEqual([UNAVAILABLE, UNAVAILABLE]);
      expect(warnings).toEqual([
        ['Gallery hub unreachable: gallery down'],
        ['Gallery hub unreachable: gallery down again'],
      ]);
      expect(rejections).toEqual([]);
    });
  });

  /**
   * Verifies: UnreadCountUpdated stores the count for every evaluation shown with that exhibit.
   * Interacts with: FakeHubConnection.trigger, real UnreadArticlesDataService/Store/Query, real EvaluationStore.
   * Data: evaluations e1 (exhibit x1) and e2 (exhibit x2); a count of 4 pushed for x1.
   */
  it('routes UnreadCountUpdated into the unread-articles store', async () => {
    const { service } = setup();
    TestBed.inject(EvaluationStore).set([
      { id: 'e1', galleryExhibitId: 'x1' },
      { id: 'e2', galleryExhibitId: 'x2' },
    ]);
    await service.startConnection();
    // gallery.api UserArticleHandler.cs:92 sends (UnreadArticles, null), with
    // the count as a string.
    builder.connections[0].trigger(
      'UnreadCountUpdated',
      { exhibitId: 'x1', userId: 'u1', count: '4' },
      null,
    );
    expect(TestBed.inject(UnreadArticlesQuery).getAll()).toEqual([
      { id: 'e1', exhibitId: 'x1', userId: 'u1', count: '4' },
    ]);
  });

  /**
   * Verifies: a user change restarts the hub with the new token and rejoins.
   * Interacts with: ComnAuthService.user$ (Subject), FakeHubConnection.stop/start/baseUrl/invoke.
   * Data: token 'tok-1' then 'tok-2'.
   */
  it('reconnects with the new token when the user changes', async () => {
    let token = 'tok-1';
    const { service, authUser$ } = setup({ token: () => token });
    await service.startConnection();
    const [hub] = builder.connections;
    await flush();
    hub.invoke.mockClear();
    token = 'tok-2';
    authUser$.next({});
    await flush();
    expect(hub.baseUrl).toBe(`${GALLERY_URL}/hubs/cite?bearer=tok-2`);
    expect(hub.invoke).toHaveBeenCalledWith('Join');
  });

  /**
   * Verifies: leave() leaves the joined hub once; a second leave() sends nothing.
   * Interacts with: FakeHubConnection.invoke spy.
   * Data: a joined hub; leave() called twice.
   */
  it('leave() leaves the hub once', async () => {
    const { service } = setup();
    await service.startConnection();
    const [hub] = builder.connections;
    await flush();
    service.leave();
    service.leave();
    expect(hub.invoke.mock.calls.filter(([m]) => m === 'Leave')).toHaveLength(
      1,
    );
  });

  /**
   * Verifies: the reconnect delay doubles per attempt but is capped at 60 s (no jitter here).
   * Interacts with: the RetryPolicy passed to withAutomaticReconnect, Math.random spy.
   * Data: per row, the previous retry count and the expected delay with Math.random 0.
   */
  it.each([
    { attempt: 1, delay: 4000 },
    { attempt: 10, delay: 60000 },
  ])('waits $delay ms after attempt $attempt', async ({ attempt, delay }) => {
    const { service } = setup();
    await service.startConnection();
    const policy = builder.retryPolicy()!;
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const context: signalR.RetryContext = {
      previousRetryCount: attempt,
      elapsedMilliseconds: 0,
      retryReason: new Error('lost'),
    };
    expect(policy.nextRetryDelayInMilliseconds(context)).toBe(delay);
  });
});
