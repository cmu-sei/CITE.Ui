// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import {
  ApplicationConfig,
  provideZoneChangeDetection,
  ErrorHandler,
  importProvidersFrom,
} from '@angular/core';
import { environment } from '../environments/environment';
import { SystemMessageService } from './services/system-message/system-message.service';
import { UserDataService } from './data/user/user-data.service';
import { UIDataService } from './data/ui/ui-data.service';
import { BASE_PATH } from './generated/cite.api';
import {
  ComnSettingsService,
  provideCrucibleTheme,
  ComnAuthModule,
  ComnSettingsModule,
} from '@cmusei/crucible-common';
import { ErrorService } from './services/error/error.service';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { AkitaNgDevtools } from '@datorama/akita-ngdevtools';
import { AkitaNgRouterStoreModule } from '@datorama/akita-ng-router-store';
import { provideRouter } from '@angular/router';
import { ROUTES } from './app.routes';
import { A11yModule } from '@angular/cdk/a11y';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

export function getBasePath(settingsSvc: ComnSettingsService) {
  return settingsSvc.settings.ApiUrl;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection(),
    importProvidersFrom(
      environment.production ? [] : AkitaNgDevtools.forRoot(),
      AkitaNgRouterStoreModule,
      A11yModule,
      ComnAuthModule.forRoot(),
      ComnSettingsModule.forRoot(),
    ),
    SystemMessageService,
    UserDataService,
    UIDataService,
    {
      provide: BASE_PATH,
      useFactory: getBasePath,
      deps: [ComnSettingsService],
    },
    {
      provide: ErrorHandler,
      useClass: ErrorService,
    },
    provideRouter(ROUTES),
    provideNativeDateAdapter(),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptorsFromDi()),
    provideCrucibleTheme({
      brand: { color: '#E81717', text: '#FFFFFF' },
      faviconFillClass: 'cls-2',
    }),
  ],
};
