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

let builder: ReturnType<typeof mockHubConnectionBuilder>;

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
          settings: { GalleryApiUrl: GALLERY_URL },
        } satisfies Pick<ComnSettingsService, 'settings'>,
      },
      UnreadArticlesDataService,
      GallerySignalRService,
    ]),
  });
  return { service: TestBed.inject(GallerySignalRService), authUser$ };
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
   * Interacts with: mockHubConnectionBuilder onBuild (start rejects), captureUnhandledRejections.
   * Data: start() rejects with 'gallery down'; startConnection() called twice.
   */
  it('never retries a failed start', async () => {
    const failure = new Error('gallery down');
    builder = mockHubConnectionBuilder({
      onBuild: (c) => c.start.mockRejectedValue(failure),
    });
    const rejections = captureUnhandledRejections();
    const { service } = setup();
    const started = service.startConnection();
    await expect(started).rejects.toBe(failure);
    await flush();
    expect(service.startConnection()).toBe(started);
    await flush();
    expect(builder.connections).toHaveLength(1);
    expect(builder.connections[0].start).toHaveBeenCalledTimes(1);
    expect(builder.connections[0].invoke).not.toHaveBeenCalled();
    // The unhandled join-chain rejection is covered by '$method lets a
    // rejected hub call go unhandled' below.
    expect(rejections).toEqual([failure]);
  });

  const failure = new Error('gallery hub call failed');

  /**
   * Verifies: when a hub promise the service chains on or drops rejects, the rejection goes unhandled.
   * Interacts with: FakeHubConnection start/stop/invoke (rejecting), rejectInvokes, captureUnhandledRejections.
   * Data: per row, the method under test and the hub call made to reject.
   */
  it.each<{ method: string; act: () => Promise<void> }>([
    {
      method: 'startConnection',
      act: async () => {
        builder = mockHubConnectionBuilder({
          onBuild: (c) => c.start.mockRejectedValue(failure),
        });
        // The caller's own copy of the promise is handled here; the
        // .then(join) chain the service builds on it is not.
        await setup()
          .service.startConnection()
          .catch(() => {});
      },
    },
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
      method: 'reconnect (restart rejects)',
      act: async () => {
        const { service, authUser$ } = setup();
        await service.startConnection();
        await flush();
        builder.connections[0].start.mockImplementation(() =>
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
