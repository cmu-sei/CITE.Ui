// Copyright 2024 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/angular';
import { of, BehaviorSubject } from 'rxjs';
import { DOCUMENT } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { HomeAppComponent } from './home-app.component';
import { renderComponent } from 'src/app/test-utils/render-component';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { EvaluationDataService } from 'src/app/data/evaluation/evaluation-data.service';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { MoveDataService } from 'src/app/data/move/move-data.service';
import { MoveQuery } from 'src/app/data/move/move.query';
import { ScoringModelDataService } from 'src/app/data/scoring-model/scoring-model-data.service';
import { ScoringModelQuery } from 'src/app/data/scoring-model/scoring-model.query';
import { SubmissionDataService } from 'src/app/data/submission/submission-data.service';
import { SubmissionQuery } from 'src/app/data/submission/submission.query';
import { TeamDataService } from 'src/app/data/team/team-data.service';
import { TeamQuery } from 'src/app/data/team/team.query';
import { TeamMembershipDataService } from 'src/app/data/team/team-membership-data.service';
import { TeamRoleDataService } from 'src/app/data/team/team-role-data.service';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { UserQuery, CurrentUserQuery } from 'src/app/data/user/user.query';
import { SignalRService } from 'src/app/services/signalr.service';
import { GallerySignalRService } from 'src/app/services/gallery-signalr.service';
import { UnreadArticlesQuery } from 'src/app/data/unread-articles/unread-articles.query';
import { UIDataService } from 'src/app/data/ui/ui-data.service';
import { SystemPermission } from 'src/app/generated/cite.api';
import {
  ComnAuthService,
  ComnSettingsService,
  ComnAuthQuery,
} from '@cmusei/crucible-common';

const queryStub = {
  selectAll: () => of([]),
  select: () => of(null),
  selectEntity: () => of(null),
  selectLoading: () => of(false),
  selectActive: () => of(null),
  selectActiveId: () => of(null),
  getAll: () => [],
  getEntity: () => null,
  getActive: () => null,
  getActiveId: () => null,
};

async function renderHomeApp(
  overrides: {
    permissions?: SystemPermission[];
    canViewAdmin?: boolean;
  } = {},
) {
  const { permissions = [], canViewAdmin = false } = overrides;

  const mockPermissionDataService = {
    load: () => of(permissions),
    loadEvaluationPermissions: () => of([]),
    loadTeamPermissions: () => of([]),
    permissions: permissions,
    hasPermission: (p: SystemPermission) => permissions.includes(p),
    canViewAdministration: () => canViewAdmin,
  };

  return renderComponent(HomeAppComponent, {
    declarations: [HomeAppComponent],
    imports: [MatTableModule, MatSortModule],
    providers: [
      { provide: DOCUMENT, useValue: document },
      { provide: PermissionDataService, useValue: mockPermissionDataService },
      {
        provide: EvaluationDataService,
        useValue: {
          load: () => {},
          loadMine: () => {},
          setActive: () => {},
          EvaluationList: new BehaviorSubject([]),
        },
      },
      {
        provide: EvaluationQuery,
        useValue: { ...queryStub, selectAll: () => of([]) },
      },
      {
        provide: MoveDataService,
        useValue: { loadByEvaluation: () => {}, setActive: () => {} },
      },
      { provide: MoveQuery, useValue: { ...queryStub } },
      {
        provide: ScoringModelDataService,
        useValue: { loadById: () => {}, unload: () => {} },
      },
      { provide: ScoringModelQuery, useValue: { ...queryStub } },
      {
        provide: SubmissionDataService,
        useValue: {
          loadByEvaluationTeam: () => {},
          setActive: () => {},
          unload: () => {},
          loadById: () => {},
        },
      },
      {
        provide: SubmissionQuery,
        useValue: { ...queryStub, selectLoading: () => of(false) },
      },
      {
        provide: TeamDataService,
        useValue: { loadMine: () => {}, setActive: () => {}, unload: () => {} },
      },
      { provide: TeamQuery, useValue: { ...queryStub } },
      {
        provide: TeamMembershipDataService,
        useValue: { loadMemberships: () => {} },
      },
      { provide: TeamRoleDataService, useValue: { loadRoles: () => of([]) } },
      {
        provide: UserDataService,
        useValue: {
          load: () => of([]),
          loadByEvaluation: () => of([]),
          setCurrentUser: () => {},
        },
      },
      {
        provide: UserQuery,
        useValue: { ...queryStub, selectAll: () => of([]) },
      },
      {
        provide: CurrentUserQuery,
        useValue: {
          select: () =>
            of({
              name: 'Test User',
              id: 'user-1',
              theme: 'light-theme',
              lastRoute: '/',
            }),
          userTheme$: of('light-theme'),
          getLastRoute: () => '/',
        },
      },
      {
        provide: SignalRService,
        useValue: {
          startConnection: () => Promise.resolve(),
          join: () => {},
          leave: () => {},
          switchTeam: () => {},
        },
      },
      {
        provide: GallerySignalRService,
        useValue: {
          startConnection: () => Promise.resolve(),
          join: () => {},
          leave: () => {},
          leaveChannel: () => {},
        },
      },
      { provide: UnreadArticlesQuery, useValue: { ...queryStub } },
      {
        provide: UIDataService,
        useValue: {
          getTheme: () => 'light-theme',
          setTheme: () => {},
          getMoveNumber: () => -1,
          setMoveNumber: () => {},
          getTeam: () => '',
          setTeam: () => {},
          getSection: () => 'dashboard',
          setSection: () => {},
          getSubmissionType: () => 'user',
          setSubmissionType: () => {},
          setEvaluation: () => {},
        },
      },
      {
        provide: ComnSettingsService,
        useValue: {
          settings: {
            ApiUrl: '',
            AppTopBarText: 'CITE',
            AppTopBarHexColor: '#0F1D47',
            AppTopBarHexTextColor: '#FFFFFF',
            AppTitle: 'CITE',
            AppTopBarImage: '',
            GalleryApiUrl: '',
          },
        },
      },
      {
        provide: ComnAuthService,
        useValue: {
          isAuthenticated$: of(true),
          user$: of({}),
          logout: () => {},
          setUserTheme: () => {},
          getAuthorizationToken: () => 'token',
        },
      },
      {
        provide: ComnAuthQuery,
        useValue: {
          userTheme$: of('light-theme'),
          isLoggedIn$: of(true),
        },
      },
      {
        provide: ActivatedRoute,
        useValue: {
          params: of({}),
          paramMap: of({ get: () => null, has: () => false }),
          queryParams: of({}),
          queryParamMap: of({ get: () => null, has: () => false }),
          snapshot: {
            params: {},
            paramMap: { get: () => null, has: () => false },
          },
        },
      },
      {
        provide: Router,
        useValue: {
          navigate: () => Promise.resolve(true),
          events: of(),
        },
      },
    ],
  });
}

describe('HomeAppComponent', () => {
  it('should create', async () => {
    const { fixture } = await renderHomeApp();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should set hideTopbar based on iframe detection', async () => {
    const { fixture } = await renderHomeApp();
    // In browser mode tests run inside an iframe, so inIframe() returns true
    const inIframe = window.self !== window.top;
    expect(fixture.componentInstance.hideTopbar).toBe(inIframe);
  });

  it('should show no-evaluation message when list is empty and loaded', async () => {
    const { fixture } = await renderHomeApp({
      permissions: [SystemPermission.ViewUsers],
    });
    fixture.componentInstance.permissions = [SystemPermission.ViewUsers];
    fixture.componentInstance.evaluationList = [];
    fixture.detectChanges();
    expect(
      screen.getByText(/You are not a team member for an active evaluation/i),
    ).toBeInTheDocument();
  });

  it('should show admin button when canViewAdministration is true', async () => {
    const { fixture } = await renderHomeApp({
      permissions: [SystemPermission.ViewUsers],
      canViewAdmin: true,
    });
    fixture.componentInstance.permissions = [SystemPermission.ViewUsers];
    fixture.componentInstance.canViewAdministration = true;
    fixture.componentInstance.evaluationList = [];
    fixture.detectChanges();
    expect(screen.getByText(/Goto Administration Pages/i)).toBeInTheDocument();
  });

  it('should set topbar text from settings', async () => {
    const { fixture } = await renderHomeApp();
    expect(fixture.componentInstance.topbarText).toBe('CITE');
  });
});
