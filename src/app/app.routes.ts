// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Routes } from '@angular/router';
import { ComnAuthGuardService } from '@cmusei/crucible-common';

export const ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/home-app/home-app.component').then(m => m.HomeAppComponent),
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'admin',
    loadComponent: () => import('./components/admin/admin-container/admin-container.component').then(m => m.AdminContainerComponent),
    canActivate: [ComnAuthGuardService],
  },
];
