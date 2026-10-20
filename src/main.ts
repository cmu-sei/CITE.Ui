// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { enableProdMode, provideZoneChangeDetection, ErrorHandler, importProvidersFrom } from '@angular/core';
import { platformBrowser, bootstrapApplication } from '@angular/platform-browser';
import { enableAkitaProdMode, persistState } from '@datorama/akita';

import { environment } from './environments/environment';
import { SystemMessageService } from './app/services/system-message/system-message.service';
import { UserDataService } from './app/data/user/user-data.service';
import { UIDataService } from './app/data/ui/ui-data.service';
import { BASE_PATH } from './app/generated/cite.api';
import { ComnSettingsService, provideCrucibleTheme, ComnAuthModule, ComnSettingsModule } from '@cmusei/crucible-common';
import { ErrorService } from './app/services/error/error.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AkitaNgDevtools } from '@datorama/akita-ngdevtools';
import { AkitaNgRouterStoreModule } from '@datorama/akita-ng-router-store';
import { provideRouter } from '@angular/router';
import { ROUTES } from './app/app.routes';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { A11yModule } from '@angular/cdk/a11y';
import { MatNativeDateModule } from '@angular/material/core';
import { AppComponent } from './app/app.component';

if (environment.production) {
  enableProdMode();
  enableAkitaProdMode();
}

export function getBasePath(settingsSvc: ComnSettingsService) {
  return settingsSvc.settings.ApiUrl;
}

export const storage = persistState({
  key: 'akita-cite-ui',
  include: ['auth.ui'],
});

bootstrapApplication(AppComponent, {
    providers: [
        provideZoneChangeDetection(),
        importProvidersFrom(environment.production ? [] : AkitaNgDevtools.forRoot(), AkitaNgRouterStoreModule, BrowserAnimationsModule, A11yModule, MatNativeDateModule, ComnAuthModule.forRoot(), ComnSettingsModule.forRoot()),
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
        provideHttpClient(withInterceptorsFromDi()),
        provideCrucibleTheme({
            brand: { color: '#E81717', text: '#FFFFFF' },
            faviconFillClass: 'cls-2',
        }),
    ]
})
  .catch((err) => console.error(err));
