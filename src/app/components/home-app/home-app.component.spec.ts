// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Component, NgZone, input, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { By } from '@angular/platform-browser';
import { screen, waitFor } from '@testing-library/angular';
import { of } from 'rxjs';
import { ComnAuthService, ComnSettingsService } from '@cmusei/crucible-common';
import { User } from 'oidc-client-ts';
import {
  Evaluation,
  EvaluationPermission,
  EvaluationService,
  ItemStatus,
  MoveService,
  ScoringModelService,
  SystemPermission,
  TeamPermission,
  TeamRolesService,
  TeamService,
  UserService,
} from '../../generated/cite.api';
import { GallerySignalRService } from '../../services/gallery-signalr.service';
import { SignalRService } from '../../services/signalr.service';
import { activatedRouteStub } from '../../test-utils/activated-route';
import { ApiStub } from '../../test-utils/api-stub';
import {
  PermissionGrants,
  permissionDataProviders,
} from '../../test-utils/mock-permission-data.service';
import { renderComponent } from '../../test-utils/render-component';
import {
  captureUnhandledRejections,
  captureUnhandledRxErrors,
  flush,
} from '../../test-utils/unhandled-rx-errors';
import { HomeAppComponent } from './home-app.component';
import { TopbarComponent } from 'src/app/components/shared/top-bar/topbar.component';
import { EvaluationInfoComponent } from 'src/app/components/evaluation-info/evaluation-info.component';
import { DashboardComponent } from 'src/app/components/dashboard/dashboard.component';

@Component({ selector: 'app-topbar', template: '' })
class TopbarStubComponent {
  readonly title = input<string>(undefined);
  readonly topbarView = input<unknown>(undefined);
  readonly imageFilePath = input<string>(undefined);
  readonly urlNavigate = output<string>();
}
@Component({ selector: 'app-evaluation-info', template: '' })
class EvaluationInfoStubComponent {
  readonly showAdminButton = input.required<boolean>();
  readonly showMoveArrows = input.required<boolean>();
  readonly teamList = input.required<unknown>();
  readonly myTeamId = input.required<string>();
  readonly evaluationList = input.required<unknown>();
  readonly moveList = input.required<unknown>();
  readonly scoresheetOnRight = input.required<boolean>();
  readonly noChanges = input.required<boolean>();
  readonly selectedSection = input.required<unknown>();
  readonly nextDisplayedMove = output<unknown>();
  readonly previousDisplayedMove = output<unknown>();
  readonly nextEvaluationMove = output<unknown>();
  readonly changeTeam = output<string>();
  readonly changeSection = output<unknown>();
}
@Component({ selector: 'app-dashboard', template: '' })
class DashboardStubComponent {
  readonly unreadArticles = input.required<unknown>();
  readonly myTeamId = input.required<string>();
  readonly noChanges = input.required<boolean>();
}

const EVALUATION: Evaluation = {
  id: 'e1',
  description: 'Ransomware exercise',
  status: ItemStatus.Active,
  currentMoveNumber: 0,
  scoringModelId: 'sm1',
  dateCreated: new Date('2026-01-02T10:00:00Z'),
};

// The test DOM never loads images, so tests fire load or error themselves.
class FakeImage {
  static last: FakeImage | undefined;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
  constructor() {
    FakeImage.last = this;
  }
}

async function renderHome(
  grants: PermissionGrants,
  {
    evaluation,
    galleryApiUrl = '',
    background,
    hubStart = () => Promise.resolve(),
    galleryHubStart = () => Promise.resolve(),
    logout = () => Promise.resolve(),
  }: {
    evaluation?: string;
    galleryApiUrl?: string;
    background?: string;
    hubStart?: () => Promise<void>;
    galleryHubStart?: () => Promise<void>;
    logout?: ComnAuthService['logout'];
  } = {},
) {
  const evaluationApi = {
    getMyEvaluations: vi.fn(() => of([structuredClone(EVALUATION)])),
  } satisfies ApiStub<EvaluationService>;
  const userApi = {
    getEvaluationUsers: vi.fn(() => of([{ id: 'u1', name: 'Alice' }])),
  } satisfies ApiStub<UserService>;
  const teamRolesApi = {
    getAllTeamRoles: vi.fn(() => of([])),
  } satisfies ApiStub<TeamRolesService>;
  const scoringModelApi = {
    getScoringModel: vi.fn(() =>
      of({ id: 'sm1', rightSideDisplay: 'None' as const }),
    ),
  } satisfies ApiStub<ScoringModelService>;
  const moveApi = {
    getByEvaluation: vi.fn(() =>
      of([{ id: 'm0', evaluationId: 'e1', moveNumber: 0 }]),
    ),
  } satisfies ApiStub<MoveService>;
  const teamApi = {
    getMyEvaluationTeams: vi.fn(() => of([])),
  } satisfies ApiStub<TeamService>;
  const signalR: Pick<SignalRService, 'startConnection' | 'join' | 'leave'> = {
    startConnection: vi.fn(hubStart),
    join: vi.fn(),
    leave: vi.fn(),
  };
  // The page starts the Gallery hub only when GalleryApiUrl is set (empty in
  // the default settings).
  const gallerySignalR: Pick<
    GallerySignalRService,
    'startConnection' | 'join' | 'leave'
  > = {
    startConnection: vi.fn(galleryHubStart),
    join: vi.fn(),
    leave: vi.fn(),
  };
  const settings: Pick<ComnSettingsService, 'settings'> = {
    settings: {
      ApiUrl: '',
      GalleryApiUrl: galleryApiUrl,
      GalleryUiUrl: '',
      AppTitle: 'CITE',
      AppTopBarText: 'CITE',
      AppTopBarHexColor: '#C41230',
      AppTopBarHexTextColor: '#FFFFFF',
      XApiEnabled: false,
      AppLandingBackgroundImage: background,
    },
  };
  const auth: Pick<ComnAuthService, 'user$' | 'logout'> = {
    logout,
    user$: of(
      new User({
        access_token: 'test-token',
        token_type: 'Bearer',
        profile: {
          sub: 'u1',
          name: 'Alice',
          iss: 'https://keycloak.test',
          aud: 'cite-ui',
          exp: 0,
          iat: 0,
        },
      }),
    ),
  };
  const { route } = activatedRouteStub(evaluation ? { evaluation } : {});

  const rendered = await renderComponent(HomeAppComponent, {
    imports: [
      MatButtonModule,
      MatCardModule,
      MatFormFieldModule,
      MatIconModule,
      MatInputModule,
      MatPaginatorModule,
      MatProgressSpinnerModule,
      MatSortModule,
      MatTableModule,
    ],
    childStubs: [
      { replace: TopbarComponent, with: TopbarStubComponent },
      { replace: EvaluationInfoComponent, with: EvaluationInfoStubComponent },
      { replace: DashboardComponent, with: DashboardStubComponent },
    ],
    providers: [
      ...permissionDataProviders(grants),
      { provide: EvaluationService, useValue: evaluationApi },
      { provide: UserService, useValue: userApi },
      { provide: TeamRolesService, useValue: teamRolesApi },
      { provide: ScoringModelService, useValue: scoringModelApi },
      { provide: MoveService, useValue: moveApi },
      { provide: TeamService, useValue: teamApi },
      { provide: SignalRService, useValue: signalR },
      { provide: GallerySignalRService, useValue: gallerySignalR },
      { provide: ComnSettingsService, useValue: settings },
      { provide: ComnAuthService, useValue: auth },
      { provide: ActivatedRoute, useValue: route },
    ],
  });
  rendered.fixture.detectChanges();
  await rendered.fixture.whenStable();
  const evaluationInfo = () =>
    rendered.fixture.debugElement.query(
      By.directive(EvaluationInfoStubComponent),
    )?.componentInstance as EvaluationInfoStubComponent | undefined;
  return {
    ...rendered,
    evaluationApi,
    signalR,
    gallerySignalR,
    evaluationInfo,
  };
}

const adminButton = () =>
  screen.queryByRole('button', { name: 'Show Administration Page' });

// Every system permission PermissionDataService.canViewAdministration() accepts.
const ADMIN_PERMISSIONS: SystemPermission[] = [
  SystemPermission.ViewEvaluations,
  SystemPermission.EditEvaluations,
  SystemPermission.ManageEvaluations,
  SystemPermission.CreateEvaluations,
  SystemPermission.ExecuteEvaluations,
  SystemPermission.ViewScoringModels,
  SystemPermission.EditScoringModels,
  SystemPermission.ManageScoringModels,
  SystemPermission.CreateScoringModels,
  SystemPermission.ViewUsers,
  SystemPermission.ManageUsers,
  SystemPermission.ViewRoles,
  SystemPermission.ManageRoles,
  SystemPermission.ViewGroups,
  SystemPermission.ManageGroups,
  SystemPermission.ViewTeamTypes,
  SystemPermission.ManageTeamTypes,
];

describe('HomeAppComponent', () => {
  beforeEach(() => localStorage.clear());

  /**
   * Verifies: the signed-in user's evaluations are listed and the hub connection is joined.
   * Interacts with: real EvaluationDataService/EvaluationQuery over EvaluationService.getMyEvaluations, SignalRService stub.
   * Data: one evaluation; no evaluation in the route.
   */
  it('lists my evaluations', async () => {
    const { evaluationApi, signalR } = await renderHome({});

    expect(evaluationApi.getMyEvaluations).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('link', { name: 'Ransomware exercise' }),
    ).toBeInTheDocument();
    expect(signalR.startConnection).toHaveBeenCalledOnce();
    expect(signalR.join).toHaveBeenCalledOnce();
  });

  /**
   * Verifies: a rejected sign-out escapes unchanged when the home page's logout method is invoked.
   * Interacts with: ComnAuthService.logout stub, Angular zone, captureUnhandledRxErrors.
   * Data: Alice's evaluation list renders; the sign-out promise rejects with a missing endpoint error.
   */
  it('lets a rejected logout from the home page escape', async () => {
    const errors = captureUnhandledRxErrors();
    const failure = new Error('No end session endpoint');
    const logoutCalled = vi.fn();
    const { fixture } = await renderHome(
      {},
      {
        logout: () => {
          logoutCalled();
          return Promise.reject(failure);
        },
      },
    );

    TestBed.inject(NgZone).run(() => fixture.componentInstance.logout());
    await waitFor(() => expect(errors).toEqual([failure]));
    await flush();

    expect(logoutCalled).toHaveBeenCalledExactlyOnceWith();
    expect(errors).toEqual([failure]);
    expect(
      screen.getByRole('link', { name: 'Ransomware exercise' }),
    ).toBeInTheDocument();
  });

  describe('landing background', () => {
    beforeEach(() => vi.stubGlobal('Image', FakeImage));
    afterEach(() => {
      vi.unstubAllGlobals();
      FakeImage.last = undefined;
    });

    /**
     * Verifies: the evaluation list shows the background image named in settings once it loads.
     * Interacts with: ComnSettingsService.settings (stub), a stubbed Image, HomeAppComponent template.
     * Data: AppLandingBackgroundImage set to a relative asset URL; the image load event fires; no evaluation in the route.
     */
    it('shows the landing background once the image loads', async () => {
      const { fixture, container } = await renderHome(
        {},
        { background: '/assets/local/landing-background.jpg' },
      );

      expect(FakeImage.last?.src).toBe('/assets/local/landing-background.jpg');
      FakeImage.last!.onload!();
      fixture.detectChanges();

      const page = container.querySelector('.app-events-container') as HTMLElement;
      expect(page.style.getPropertyValue('--landing-background')).toBe(
        'url("/assets/local/landing-background.jpg")',
      );
      expect(page.classList.contains('has-background')).toBe(true);
    });

    /**
     * Verifies: an image that fails to load leaves the normal page background, as if unset.
     * Interacts with: ComnSettingsService.settings (stub), a stubbed Image, HomeAppComponent template.
     * Data: AppLandingBackgroundImage set to a missing image; the image error event fires.
     */
    it('keeps the normal background when the image fails to load', async () => {
      const { fixture, container } = await renderHome(
        {},
        { background: '/assets/local/missing.jpg' },
      );

      FakeImage.last!.onerror?.();
      fixture.detectChanges();

      const page = container.querySelector('.app-events-container') as HTMLElement;
      expect(page.style.getPropertyValue('--landing-background')).toBe('');
      expect(page.classList.contains('has-background')).toBe(false);
    });

    /**
     * Verifies: without the setting, no image is requested and the normal page background is kept.
     * Interacts with: ComnSettingsService.settings (stub), a stubbed Image, HomeAppComponent template.
     * Data: AppLandingBackgroundImage unset.
     */
    it('keeps the normal background without the setting', async () => {
      const { container } = await renderHome({});

      expect(FakeImage.last).toBeUndefined();
      const page = container.querySelector('.app-events-container') as HTMLElement;
      expect(page.classList.contains('has-background')).toBe(false);
    });

    /**
     * Verifies: an open evaluation hides the landing background even once the image loads.
     * Interacts with: the route's evaluation parameter, a stubbed Image, HomeAppComponent template.
     * Data: ?evaluation=e1; AppLandingBackgroundImage set to a relative asset URL; the image load event fires.
     */
    it('hides the landing background inside an evaluation', async () => {
      const { fixture, container } = await renderHome(
        {},
        { evaluation: 'e1', background: '/assets/local/landing-background.jpg' },
      );

      FakeImage.last!.onload!();
      fixture.detectChanges();

      const page = container.querySelector('.app-events-container') as HTMLElement;
      expect(page.style.getPropertyValue('--landing-background')).toBe('');
      expect(page.classList.contains('has-background')).toBe(false);
    });
  });

  describe('hubs', () => {
    /**
     * Verifies: the Gallery hub is started and joined only when GalleryApiUrl is set.
     * Interacts with: GallerySignalRService stub, ComnSettingsService.settings.GalleryApiUrl.
     * Data: per row, GalleryApiUrl empty or https://gallery.test, and whether the page starts and joins the hub.
     */
    it.each([
      { url: '', started: 0 },
      { url: 'https://gallery.test', started: 1 },
    ])(
      "starts the Gallery hub $started time(s) with GalleryApiUrl '$url'",
      async ({ url, started }) => {
        const { gallerySignalR } = await renderHome({}, { galleryApiUrl: url });

        expect(gallerySignalR.startConnection).toHaveBeenCalledTimes(started);
        expect(gallerySignalR.join).toHaveBeenCalledTimes(started);
      },
    );

    /**
     * Verifies: when both hubs fail to start the page joins neither, logs nothing and leaves no unhandled rejection; the list still renders.
     * Interacts with: SignalRService and GallerySignalRService stubs (startConnection rejects), console.log spy, captureUnhandledRejections.
     * Data: GalleryApiUrl https://gallery.test; both starts reject.
     */
    it('leaves a failed hub start to the hub services', async () => {
      const rejections = captureUnhandledRejections();
      const log = vi.spyOn(console, 'log');
      const { signalR, gallerySignalR, fixture } = await renderHome(
        {},
        {
          galleryApiUrl: 'https://gallery.test',
          hubStart: () => Promise.reject(new Error('hub down')),
          galleryHubStart: () => Promise.reject(new Error('gallery down')),
        },
      );
      await fixture.whenStable();

      expect(signalR.startConnection).toHaveBeenCalledOnce();
      expect(gallerySignalR.startConnection).toHaveBeenCalledOnce();
      expect(signalR.join).not.toHaveBeenCalled();
      expect(gallerySignalR.join).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
      expect(rejections).toEqual([]);
      expect(
        screen.getByRole('link', { name: 'Ransomware exercise' }),
      ).toBeInTheDocument();
    });
  });

  describe('canViewAdministration gate', () => {
    /**
     * Verifies: a system permission on the administration list shows the Administration button.
     * Interacts with: real PermissionDataService.canViewAdministration.
     * Data: system [ViewTeamTypes].
     */
    it('shows Administration with an admin system permission', async () => {
      await renderHome({ system: [SystemPermission.ViewTeamTypes] });

      expect(adminButton()).toBeInTheDocument();
    });

    /**
     * Verifies: each system permission the administration gate accepts, held alone, shows the Administration button.
     * Interacts with: real PermissionDataService.canViewAdministration, the evaluation list page.
     * Data: per row, system [<that permission>]; no evaluation in the route.
     */
    it.each(ADMIN_PERMISSIONS)(
      'shows Administration with only system %s',
      async (permission) => {
        await renderHome({ system: [permission] });

        expect(adminButton()).toBeInTheDocument();
      },
    );

    /**
     * Verifies: ObserveEvaluations and resource-level Manage claims (near misses) hide the Administration button.
     * Interacts with: real PermissionDataService.canViewAdministration.
     * Data: system [ObserveEvaluations], ManageEvaluation on e1, ManageTeam on t1.
     */
    it('hides Administration without an admin system permission', async () => {
      await renderHome({
        system: [SystemPermission.ObserveEvaluations],
        evaluation: [
          {
            evaluationId: 'e1',
            permissions: [EvaluationPermission.ManageEvaluation],
          },
        ],
        team: [{ teamId: 't1', permissions: [TeamPermission.ManageTeam] }],
      });

      expect(
        screen.getByRole('link', { name: 'Ransomware exercise' }),
      ).toBeInTheDocument();
      expect(adminButton()).not.toBeInTheDocument();
    });

    /**
     * Verifies: with an evaluation selected, the admin permission reaches the evaluation header as showAdminButton.
     * Interacts with: the route's evaluation parameter, the evaluation-info child stub.
     * Data: ?evaluation=e1; system [EditScoringModels], then [ObserveEvaluations].
     */
    it.each([
      [[SystemPermission.EditScoringModels], true],
      [[SystemPermission.ObserveEvaluations], false],
    ])(
      'passes showAdminButton for system %s as %s',
      async (system, expected) => {
        const { evaluationInfo } = await renderHome(
          { system },
          { evaluation: 'e1' },
        );

        expect(evaluationInfo()?.showAdminButton()).toBe(expected);
      },
    );
  });
});
