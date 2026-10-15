// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { EMPTY, of } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import {
  ComnAuthQuery,
  ComnAuthService,
  ComnSettingsService,
  CrucibleDialogService,
} from '@cmusei/crucible-common';
import { AnyProvider, mergeProviders, unstubbed } from './unstubbed';

// 1. App services that components inject. Stores, queries and data services
//    stay REAL: they are the state under test. UIDataService is real too; it
//    only wraps localStorage, which specs clear in beforeEach.
import { ErrorService } from '../services/error/error.service';
import { GallerySignalRService } from '../services/gallery-signalr.service';
import { SignalRService } from '../services/signalr.service';
import { SystemMessageService } from '../services/system-message/system-message.service';
import { XApiService as AppXApiService } from '../services/xapi/xapi.service';

// 2. Every generated API service under src/app/generated/cite.api.
import {
  ActionService,
  DutyService,
  EvaluationMembershipsService,
  EvaluationPermissionsService,
  EvaluationRolesService,
  EvaluationService,
  GalleryService,
  GroupService,
  HealthCheckService,
  MoveService,
  ScoringCategoryService,
  ScoringModelMembershipsService,
  ScoringModelPermissionsService,
  ScoringModelRolesService,
  ScoringModelService,
  ScoringOptionService,
  SubmissionCategoryService,
  SubmissionCommentService,
  SubmissionOptionService,
  SubmissionService,
  SystemPermissionsService,
  SystemRolesService,
  TeamMembershipsService,
  TeamPermissionsService,
  TeamRolesService,
  TeamService,
  TeamTypeService,
  UserService,
  XApiService,
} from '../generated/cite.api';

// 3. RouterQuery: app.module.ts imports AkitaNgRouterStoreModule.
import { RouterQuery } from '@datorama/akita-ng-router-store';

export function getDefaultProviders(
  overrides?: readonly AnyProvider[],
): AnyProvider[] {
  const defaults: AnyProvider[] = [
    // App services
    { provide: ErrorService, useValue: { handleError: () => {} } },
    unstubbed(GallerySignalRService),
    unstubbed(SignalRService),
    unstubbed(SystemMessageService),
    // The app and the generated client both export an `XApiService`.
    unstubbed(AppXApiService, 'XApiService (app, services/xapi)'),

    // Generated API services: one `unstubbed(...)` per service. A test that
    // needs an endpoint passes `{ provide: XService, useValue: xApi }` built
    // with `satisfies ApiStub<XService>`.
    unstubbed(ActionService),
    unstubbed(DutyService),
    unstubbed(EvaluationMembershipsService),
    unstubbed(EvaluationPermissionsService),
    unstubbed(EvaluationRolesService),
    unstubbed(EvaluationService),
    unstubbed(GalleryService),
    unstubbed(GroupService),
    unstubbed(HealthCheckService),
    unstubbed(MoveService),
    unstubbed(ScoringCategoryService),
    unstubbed(ScoringModelMembershipsService),
    unstubbed(ScoringModelPermissionsService),
    unstubbed(ScoringModelRolesService),
    unstubbed(ScoringModelService),
    unstubbed(ScoringOptionService),
    unstubbed(SubmissionCategoryService),
    unstubbed(SubmissionCommentService),
    unstubbed(SubmissionOptionService),
    unstubbed(SubmissionService),
    unstubbed(SystemPermissionsService),
    unstubbed(SystemRolesService),
    unstubbed(TeamMembershipsService),
    unstubbed(TeamPermissionsService),
    unstubbed(TeamRolesService),
    unstubbed(TeamService),
    unstubbed(TeamTypeService),
    unstubbed(UserService),
    unstubbed(XApiService, 'XApiService (generated cite.api)'),

    // Akita router
    {
      provide: RouterQuery,
      useValue: { selectQueryParams: () => of(null), select: () => of(null) },
    },

    // Common library
    {
      provide: ComnSettingsService,
      useValue: {
        settings: {
          ApiUrl: '',
          GalleryApiUrl: '',
          GalleryUiUrl: '',
          AppTitle: 'CITE',
          AppTopBarText: 'CITE',
          AppTopBarHexColor: '#C41230',
          AppTopBarHexTextColor: '#FFFFFF',
          XApiEnabled: false,
        },
      },
    },
    {
      provide: ComnAuthService,
      useValue: {
        isAuthenticated$: of(true),
        // EMPTY rather than a user: no OIDC user is ever signed in, so
        // subscribers such as UserDataService.setCurrentUser and the SignalR
        // reconnect stay inert unless a test provides its own user$.
        user$: EMPTY,
        getAuthorizationToken: () => 'test-token',
        logout: () => Promise.resolve(),
        setUserTheme: () => {},
      },
    },
    {
      provide: ComnAuthQuery,
      useValue: {
        userTheme$: of('light-theme'),
        isLoggedIn$: of(true),
      },
    },
    unstubbed(CrucibleDialogService),

    // Dialog tokens
    { provide: MAT_DIALOG_DATA, useValue: {} },
    {
      provide: MatDialogRef,
      useValue: {
        close: () => {},
        beforeClosed: () => EMPTY,
        afterClosed: () => EMPTY,
        keydownEvents: () => EMPTY,
      },
    },

    // Router
    {
      provide: ActivatedRoute,
      useValue: {
        params: of({}),
        paramMap: of(convertToParamMap({})),
        queryParams: of({}),
        queryParamMap: of(convertToParamMap({})),
        snapshot: {
          params: {},
          paramMap: convertToParamMap({}),
          queryParams: {},
          queryParamMap: convertToParamMap({}),
        },
      },
    },
  ];

  return mergeProviders(defaults, overrides);
}
