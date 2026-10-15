// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, of, throwError } from 'rxjs';
import { GalleryService } from '../../generated/cite.api';
import { EvaluationStore } from '../evaluation/evaluation.store';
import { UnreadArticlesDataService } from './unread-articles-data.service';
import { UnreadArticlesQuery } from './unread-articles.query';
import { ApiStub } from '../../test-utils/api-stub';
import { getDefaultProviders } from '../../test-utils/default-test-providers';
import {
  captureUnhandledRxErrors,
  flush,
} from '../../test-utils/unhandled-rx-errors';

type GalleryApi = ApiStub<GalleryService>;

function setup(overrides: { api?: GalleryApi } = {}) {
  const api = {
    getEvaluationUnreadArticleCount: vi.fn(() =>
      of({ exhibitId: 'x1', userId: 'u1', count: '3' }),
    ),
    ...overrides.api,
  } satisfies GalleryApi;
  TestBed.configureTestingModule({
    providers: getDefaultProviders([
      { provide: GalleryService, useValue: api },
      UnreadArticlesDataService,
    ]),
  });
  return {
    service: TestBed.inject(UnreadArticlesDataService),
    query: TestBed.inject(UnreadArticlesQuery),
    evaluationStore: TestBed.inject(EvaluationStore),
    api,
  };
}

describe('UnreadArticlesDataService', () => {
  /**
   * Verifies: loadById() stores the Gallery count keyed by the CITE evaluation id and activates it.
   * Interacts with: GalleryService.getEvaluationUnreadArticleCount stub, real UnreadArticlesStore/Query.
   * Data: evaluation e1 whose exhibit x1 has 3 unread articles.
   */
  it('loadById() stores the count under the evaluation id', async () => {
    const { service, query, api } = setup();
    service.loadById('e1');
    expect(api.getEvaluationUnreadArticleCount).toHaveBeenCalledWith('e1');
    expect(query.getActiveId()).toBe('e1');
    expect(await firstValueFrom(query.selectById('e1'))).toEqual({
      id: 'e1',
      exhibitId: 'x1',
      userId: 'u1',
      count: '3',
    });
  });

  /**
   * Verifies: when the Gallery count request fails, loading stays true, nothing is stored and the error escapes unhandled.
   * Interacts with: GalleryService.getEvaluationUnreadArticleCount (throws), UnreadArticlesQuery, rxjs unhandled-error hook.
   * Data: evaluation e1; a 502 response (Gallery unreachable).
   */
  it('leaves loading set when the count request fails', async () => {
    const errors = captureUnhandledRxErrors();
    const failure = new HttpErrorResponse({ status: 502 });
    const { service, query } = setup({
      api: {
        getEvaluationUnreadArticleCount: vi.fn(() => throwError(() => failure)),
      },
    });
    service.loadById('e1');
    await flush();
    expect(query.getValue().loading).toBe(true);
    expect(query.getAll()).toEqual([]);
    // The escaped error reaches ErrorService, the app's ErrorHandler
    // (app.module.ts).
    expect(errors).toEqual([failure]);
  });

  /**
   * Verifies: a pushed count (UnreadCountUpdated) is copied to every evaluation that uses that exhibit.
   * Interacts with: real EvaluationStore/EvaluationQuery, UnreadArticlesDataService.updateStore, UnreadArticlesQuery.
   * Data: evaluations e1 and e2 on exhibit x1, e3 on x2; a count of 5 for x1.
   */
  it('updateStore() fans the count out to evaluations on the same exhibit', () => {
    const { service, query, evaluationStore } = setup();
    evaluationStore.set([
      { id: 'e1', galleryExhibitId: 'x1' },
      { id: 'e2', galleryExhibitId: 'x1' },
      { id: 'e3', galleryExhibitId: 'x2' },
    ]);
    service.updateStore({ exhibitId: 'x1', userId: 'u1', count: '5' });
    expect(query.getAll()).toEqual([
      { id: 'e1', exhibitId: 'x1', userId: 'u1', count: '5' },
      { id: 'e2', exhibitId: 'x1', userId: 'u1', count: '5' },
    ]);
  });

  /**
   * Verifies: deleteFromStore() removes the count for an evaluation.
   * Interacts with: UnreadArticlesDataService.deleteFromStore, UnreadArticlesQuery.
   * Data: the count loaded for e1.
   */
  it('deleteFromStore() removes the count', () => {
    const { service, query } = setup();
    service.loadById('e1');
    service.deleteFromStore('e1');
    expect(query.getAll()).toEqual([]);
  });
});
