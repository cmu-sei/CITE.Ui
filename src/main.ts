// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { enableProdMode, provideZoneChangeDetection } from '@angular/core';
import { platformBrowser } from '@angular/platform-browser';
import { enableAkitaProdMode, persistState } from '@datorama/akita';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
  enableAkitaProdMode();
}

export const storage = persistState({
  key: 'akita-cite-ui',
  include: ['auth.ui'],
});

platformBrowser()
  .bootstrapModule(AppModule, { applicationProviders: [provideZoneChangeDetection()], })
  .catch((err) => console.error(err));
