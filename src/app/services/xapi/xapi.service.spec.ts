// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, of, throwError } from 'rxjs';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { XApiService as GeneratedXApiService } from '../../generated/cite.api';
import { XApiService } from './xapi.service';
import { ApiStub } from '../../test-utils/api-stub';
import { getDefaultProviders } from '../../test-utils/default-test-providers';

type XApi = ApiStub<GeneratedXApiService>;

function setup(overrides: { enabled?: boolean; api?: XApi } = {}) {
  const api = {
    viewedEvaluationDashboard: vi.fn(() => of({})),
    viewedEvaluationScoresheet: vi.fn(() => of({})),
    observedEvaluationDashboard: vi.fn(() => of({})),
    observedEvaluationScoresheet: vi.fn(() => of({})),
    ...overrides.api,
  } satisfies XApi;
  TestBed.configureTestingModule({
    providers: getDefaultProviders([
      { provide: GeneratedXApiService, useValue: api },
      {
        provide: ComnSettingsService,
        useValue: {
          settings: { XApiEnabled: overrides.enabled },
        } satisfies Pick<ComnSettingsService, 'settings'>,
      },
      XApiService,
    ]),
  });
  return { service: TestBed.inject(XApiService), api };
}

type TrackingCall = {
  method: string;
  run: (
    service: XApiService,
  ) => ReturnType<XApiService['viewedEvaluationDashboard']>;
  endpoint: (api: ReturnType<typeof setup>['api']) => unknown;
  args: string[];
};

const trackingCalls: TrackingCall[] = [
  {
    method: 'viewedEvaluationDashboard',
    run: (s) => s.viewedEvaluationDashboard('e1'),
    endpoint: (api) => api.viewedEvaluationDashboard,
    args: ['e1'],
  },
  {
    method: 'viewedEvaluationScoresheet',
    run: (s) => s.viewedEvaluationScoresheet('e1'),
    endpoint: (api) => api.viewedEvaluationScoresheet,
    args: ['e1'],
  },
  {
    method: 'observedEvaluationDashboard',
    run: (s) => s.observedEvaluationDashboard('e1', 't1'),
    endpoint: (api) => api.observedEvaluationDashboard,
    args: ['e1', 't1'],
  },
  {
    method: 'observedEvaluationScoresheet',
    run: (s) => s.observedEvaluationScoresheet('e1', 't1'),
    endpoint: (api) => api.observedEvaluationScoresheet,
    args: ['e1', 't1'],
  },
];

describe('XApiService', () => {
  /**
   * Verifies: with xAPI disabled (the setting absent) no statement is sent and the call yields null.
   * Interacts with: ComnSettingsService.settings.XApiEnabled, generated XApiService stubs.
   * Data: XApiEnabled undefined; per row, one tracking call for evaluation e1 (team t1).
   */
  it.each(trackingCalls)(
    '$method sends nothing when xAPI is not enabled',
    async ({ run, endpoint }) => {
      const { service, api } = setup();
      expect(await firstValueFrom(run(service))).toBeNull();
      expect(endpoint(api)).not.toHaveBeenCalled();
    },
  );

  /**
   * Verifies: with xAPI enabled each tracking call posts the matching statement.
   * Interacts with: generated XApiService stubs.
   * Data: XApiEnabled true; per row, one tracking call for evaluation e1 (team t1).
   */
  it.each(trackingCalls)(
    '$method posts the statement when xAPI is enabled',
    async ({ run, endpoint, args }) => {
      const { service, api } = setup({ enabled: true });
      await firstValueFrom(run(service));
      expect(endpoint(api)).toHaveBeenCalledWith(...args);
    },
  );

  /**
   * Verifies: a failed statement is logged and swallowed so tracking never breaks the page.
   * Interacts with: generated XApiService.viewedEvaluationScoresheet (throws), console.error spy.
   * Data: XApiEnabled true; a 502 from the LRS proxy.
   */
  it('swallows tracking failures', async () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const failure = new HttpErrorResponse({ status: 502 });
    const { service } = setup({
      enabled: true,
      api: {
        viewedEvaluationScoresheet: vi.fn(() => throwError(() => failure)),
      },
    });
    expect(
      await firstValueFrom(service.viewedEvaluationScoresheet('e1')),
    ).toBeNull();
    expect(error.mock.calls).toEqual([['xAPI tracking error:', failure]]);
  });
});
