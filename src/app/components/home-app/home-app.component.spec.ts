// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Component, NgZone, input, output, signal } from '@angular/core';
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
import { Subject, asyncScheduler, of, throwError } from 'rxjs';
import {
  ComnAuthService,
  ComnSettingsService,
  CrucibleThemeService,
} from '@cmusei/crucible-common';
import { User } from 'oidc-client-ts';
import {
  Evaluation,
  EvaluationPermission,
  EvaluationService,
  ItemStatus,
  Move,
  MoveService,
  ScoringModel,
  ScoringModelService,
  Submission,
  SubmissionService,
  SystemPermission,
  Team,
  TeamMembershipsService,
  TeamPermission,
  TeamRolesService,
  TeamService,
  UserService,
} from '../../generated/cite.api';
import { EvaluationStore } from '../../data/evaluation/evaluation.store';
import { EvaluationDataService } from '../../data/evaluation/evaluation-data.service';
import { MoveDataService } from '../../data/move/move-data.service';
import { SubmissionQuery } from '../../data/submission/submission.query';
import { TeamDataService } from '../../data/team/team-data.service';
import { TeamStore } from '../../data/team/team.store';
import { UIDataService } from '../../data/ui/ui-data.service';
import { GallerySignalRService } from '../../services/gallery-signalr.service';
import {
  MOVE_CHANGE_DEBOUNCE_MS,
  MOVE_CHANGE_JITTER,
} from '../../services/move-change-refresh';
import { SignalRService } from '../../services/signalr.service';
import { XApiService } from '../../services/xapi/xapi.service';
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

// The delay a page waits, after a move change, before it refetches.
const JITTER_MS = 1200;

// t1 is Alice's team; t2 is another team she can observe.
const TEAMS: Team[] = [
  {
    id: 't1',
    name: 'Blue Team',
    memberships: [{ teamId: 't1', userId: 'u1' }],
  },
  { id: 't2', name: 'Red Team', memberships: [] },
];
const MOVES: Move[] = [
  { id: 'm0', evaluationId: 'e1', moveNumber: 0, description: 'Initial' },
  { id: 'm1', evaluationId: 'e1', moveNumber: 1, description: 'Escalation' },
];
const userSubmission = (teamId: string, moveNumber: number): Submission => ({
  id: `s-${teamId}-u1-${moveNumber}`,
  evaluationId: 'e1',
  teamId,
  userId: 'u1',
  moveNumber,
  scoreIsAnAverage: false,
  submissionCategories: [{ id: `c-${teamId}-${moveNumber}` }],
});

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
    dark = false,
    hubStart = () => Promise.resolve(),
    galleryHubStart = () => Promise.resolve(),
    logout = () => Promise.resolve(),
    teams = [],
    moves = [{ id: 'm0', evaluationId: 'e1', moveNumber: 0 }],
    scoringModel = {},
    submissions = (teamId: string) => [userSubmission(teamId, 0)],
  }: {
    teams?: Team[];
    moves?: Move[];
    scoringModel?: Partial<ScoringModel>;
    submissions?: (teamId: string) => Submission[];
    evaluation?: string;
    galleryApiUrl?: string;
    background?: string;
    dark?: boolean;
    hubStart?: () => Promise<void>;
    galleryHubStart?: () => Promise<void>;
    logout?: ComnAuthService['logout'];
  } = {},
) {
  const evaluationApi = {
    getMyEvaluations: vi.fn(() => of([structuredClone(EVALUATION)])),
    getEvaluation: vi.fn(() => of(structuredClone(EVALUATION))),
  } satisfies ApiStub<EvaluationService>;
  const userApi = {
    getEvaluationUsers: vi.fn(() => of([{ id: 'u1', name: 'Alice' }])),
  } satisfies ApiStub<UserService>;
  const teamRolesApi = {
    getAllTeamRoles: vi.fn(() => of([])),
  } satisfies ApiStub<TeamRolesService>;
  const scoringModelApi = {
    getScoringModel: vi.fn(() =>
      of({ id: 'sm1', rightSideDisplay: 'None' as const, ...scoringModel }),
    ),
  } satisfies ApiStub<ScoringModelService>;
  const moveApi = {
    getByEvaluation: vi.fn(() => of(structuredClone(moves))),
  } satisfies ApiStub<MoveService>;
  const teamApi = {
    getMyEvaluationTeams: vi.fn(() => of(structuredClone(teams))),
  } satisfies ApiStub<TeamService>;
  const membershipApi = {
    getAllTeamMemberships: vi.fn(() => of([])),
  } satisfies ApiStub<TeamMembershipsService>;
  const xApi = {
    observedEvaluationDashboard: vi.fn(() => of(null)),
    viewedEvaluationDashboard: vi.fn(() => of(null)),
  } satisfies ApiStub<XApiService>;
  const submissionApi = {
    getByEvaluationTeam: vi.fn((_evaluationId: string, teamId: string) =>
      of(submissions(teamId)),
    ),
    getSubmission: vi.fn((id: string) =>
      of(
        teams
          .flatMap((t) => submissions(t.id))
          .find((s) => s.id === id) as Submission,
      ),
    ),
  } satisfies ApiStub<SubmissionService>;
  const signalR: Pick<
    SignalRService,
    'startConnection' | 'join' | 'leave' | 'switchTeam' | 'reconnected$'
  > = {
    startConnection: vi.fn(hubStart),
    join: vi.fn(),
    leave: vi.fn(),
    switchTeam: vi.fn(),
    reconnected$: new Subject<void>(),
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
      { provide: SubmissionService, useValue: submissionApi },
      { provide: TeamMembershipsService, useValue: membershipApi },
      { provide: XApiService, useValue: xApi },
      { provide: MOVE_CHANGE_JITTER, useValue: () => JITTER_MS },
      { provide: SignalRService, useValue: signalR },
      { provide: GallerySignalRService, useValue: gallerySignalR },
      { provide: ComnSettingsService, useValue: settings },
      {
        provide: CrucibleThemeService,
        useValue: {
          isDarkMode: signal(dark).asReadonly(),
        } satisfies Pick<CrucibleThemeService, 'isDarkMode'>,
      },
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
    moveApi,
    userApi,
    submissionApi,
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
      expect(page.style.getPropertyValue('--crucible-landing-background')).toBe(
        'url("/assets/local/landing-background.jpg")',
      );
      expect(page.classList.contains('crucible-landing-background')).toBe(true);
    });

    /**
     * Verifies: in dark mode the image gets the near-black tint, so the page stays dark.
     * Interacts with: ComnSettingsService.settings and CrucibleThemeService.isDarkMode (stubs), a stubbed Image.
     * Data: AppLandingBackgroundImage set, dark mode on; the image load event fires.
     */
    it('tints the landing background in dark mode', async () => {
      const { fixture, container } = await renderHome(
        {},
        { background: '/assets/local/landing-background-dark.jpg', dark: true },
      );

      FakeImage.last!.onload!();
      fixture.detectChanges();

      const page = container.querySelector('.app-events-container') as HTMLElement;
      expect(page.style.backgroundImage).toContain('linear-gradient');
      expect(page.style.backgroundImage).toContain('/assets/local/landing-background-dark.jpg');
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
      expect(page.style.getPropertyValue('--crucible-landing-background')).toBe('');
      expect(page.classList.contains('crucible-landing-background')).toBe(false);
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
      expect(page.classList.contains('crucible-landing-background')).toBe(false);
    });

    /**
     * Verifies: an open evaluation hides the landing background even once the image loads.
     * Interacts with: the route's evaluation parameter, a stubbed Image, HomeAppComponent template.
     * Data: ?evaluation=e1; AppLandingBackgroundImage set to a relative asset URL; the image load event fires.
     */
    it('hides the landing background inside an evaluation', async () => {
      const { fixture, container } = await renderHome(
        {},
        { evaluation: 'e1', background: '/assets/local/landing-background-evaluation.jpg' },
      );

      FakeImage.last!.onload!();
      fixture.detectChanges();

      const page = container.querySelector('.app-events-container') as HTMLElement;
      expect(page.style.getPropertyValue('--crucible-landing-background')).toBe('');
      expect(page.classList.contains('crucible-landing-background')).toBe(false);
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

  describe('report views', () => {
    /**
     * Verifies: a report's User or Team choice is saved even when the displayed move has no matching submission, so the next page opens on it.
     * Interacts with: selectReportView(), selectDisplayedSubmission()'s submission lookup, real UIDataService.
     * Data: ?evaluation=e1 with no submissions loaded; the report picks team, then user.
     */
    it('saves the choice without a matching submission', async () => {
      const { fixture } = await renderHome({}, { evaluation: 'e1' });
      const home = fixture.componentInstance;
      const uiData = TestBed.inject(UIDataService);

      home.selectReportView('team');
      expect(uiData.getSubmissionType(home.selectedEvaluationId)).toBe('team');

      home.selectReportView('user');
      expect(uiData.getSubmissionType(home.selectedEvaluationId)).toBe('user');
    });

    /**
     * Verifies: the reports are told they are observing only when the active team is known and is not the user's own.
     * Interacts with: observingAnotherTeam, real TeamStore active team.
     * Data: per row, the user's team and the active team ('' for none).
     */
    it.each([
      { myTeamId: 't1', activeTeamId: 't2', observing: true },
      { myTeamId: 't1', activeTeamId: 't1', observing: false },
      { myTeamId: '', activeTeamId: 't2', observing: false },
      { myTeamId: 't1', activeTeamId: '', observing: false },
    ])(
      'observingAnotherTeam is $observing for my team "$myTeamId" and active team "$activeTeamId"',
      async ({ myTeamId, activeTeamId, observing }) => {
        const { fixture } = await renderHome({});
        const teams = TestBed.inject(TeamStore);
        // the home page reads every team's memberships to find the user's own
        teams.set([
          { id: 't1', memberships: [] },
          { id: 't2', memberships: [] },
        ]);
        teams.setActive(activeTeamId || null);
        fixture.componentInstance.myTeamId = myTeamId;

        expect(fixture.componentInstance.observingAnotherTeam).toBe(observing);
      },
    );
  });

  /**
   * Verifies: the list loads each evaluation's users once, not again on every evaluation update, and loads a new evaluation's users when it arrives.
   * Interacts with: real EvaluationStore, UserService.getEvaluationUsers stub.
   * Data: no evaluation in the route; e1 is listed, edited twice by the hub, then e2 is created.
   */
  it("loads each evaluation's users once", async () => {
    const { userApi } = await renderHome({});
    const evaluations = TestBed.inject(EvaluationStore);
    expect(userApi.getEvaluationUsers).toHaveBeenCalledExactlyOnceWith('e1');

    evaluations.upsert('e1', { ...EVALUATION, currentMoveNumber: 1 });
    evaluations.upsert('e1', { ...EVALUATION, currentMoveNumber: 2 });
    expect(userApi.getEvaluationUsers).toHaveBeenCalledOnce();

    evaluations.upsert('e2', { ...EVALUATION, id: 'e2' });
    expect(userApi.getEvaluationUsers).toHaveBeenCalledTimes(2);
    expect(userApi.getEvaluationUsers).toHaveBeenLastCalledWith('e2');
  });

  describe('move changes', () => {
    afterEach(() => vi.useRealTimers());

    // What the hub sends every page when the current move changes: the
    // evaluation, then each of its moves, within milliseconds.
    const updateEvaluation = (changes: Partial<Evaluation>) =>
      TestBed.inject(EvaluationDataService).updateStore({
        ...structuredClone(EVALUATION),
        ...changes,
      });
    const changeCurrentMove = (moveNumber: number) => {
      updateEvaluation({ currentMoveNumber: moveNumber });
      const moves = TestBed.inject(MoveDataService);
      MOVES.forEach((m) => moves.updateStore(structuredClone(m)));
    };

    const renderTeamPage = async () => {
      const page = await renderHome(
        {},
        {
          evaluation: 'e1',
          teams: TEAMS,
          moves: MOVES,
          scoringModel: { useUserScore: true },
          submissions: (teamId) => [
            userSubmission(teamId, 0),
            userSubmission(teamId, 1),
          ],
        },
      );
      // Date stays real: the stores freeze the dates they hold, and a date
      // made by the fake Date class names the real Date as its constructor,
      // so freezing it breaks every later fake clock. rxjs reads the time
      // from its scheduler, pointed at the fake performance clock instead.
      vi.useFakeTimers({
        toFake: [
          'setTimeout',
          'clearTimeout',
          'setInterval',
          'clearInterval',
          'performance',
        ],
      });
      vi.spyOn(asyncScheduler, 'now').mockImplementation(() =>
        performance.now(),
      );
      return page;
    };

    /**
     * Verifies: the evaluation message and the move messages of one move change refetch the team's submissions once, after the debounce and the jitter, and keep the shown submission.
     * Interacts with: real Evaluation/Move/Submission stores, SubmissionService.getByEvaluationTeam/getSubmission stubs, MOVE_CHANGE_JITTER stub, fake timers.
     * Data: ?evaluation=e1 on move 0; Alice on t1; moves 0 and 1; the hub moves the evaluation to move 1.
     */
    it('refetches the submissions once per move change', async () => {
      const { submissionApi } = await renderTeamPage();
      const submissionQuery = TestBed.inject(SubmissionQuery);
      expect(submissionApi.getByEvaluationTeam).toHaveBeenCalledExactlyOnceWith(
        'e1',
        't1',
      );
      expect(submissionQuery.getActiveId()).toBe('s-t1-u1-0');
      const submissionLoads = submissionApi.getSubmission.mock.calls.length;

      changeCurrentMove(1);
      vi.advanceTimersByTime(MOVE_CHANGE_DEBOUNCE_MS + JITTER_MS - 1);
      expect(submissionApi.getByEvaluationTeam).toHaveBeenCalledOnce();

      vi.advanceTimersByTime(1);
      expect(submissionApi.getByEvaluationTeam).toHaveBeenCalledTimes(2);
      expect(submissionApi.getByEvaluationTeam).toHaveBeenLastCalledWith(
        'e1',
        't1',
      );
      expect(submissionQuery.getActiveId()).toBe('s-t1-u1-0');
      expect(submissionApi.getSubmission).toHaveBeenCalledTimes(
        submissionLoads,
      );

      vi.runAllTimers();
      expect(submissionApi.getByEvaluationTeam).toHaveBeenCalledTimes(2);
    });

    /**
     * Verifies: evaluation, move and team updates that leave the current move alone fetch no submissions and keep the shown submission.
     * Interacts with: real Evaluation/Move/Team stores, SubmissionService stubs, fake timers.
     * Data: ?evaluation=e1 on move 0; Alice on t1; an evaluation edit, the move messages and a team edit.
     */
    it('fetches nothing on updates that keep the move', async () => {
      const { submissionApi } = await renderTeamPage();
      const submissionLoads = submissionApi.getSubmission.mock.calls.length;

      updateEvaluation({ situationDescription: 'Ransom note found' });
      changeCurrentMove(0);
      TestBed.inject(TeamDataService).updateStore({
        ...structuredClone(TEAMS[0]),
        name: 'Blue Team (Ops)',
      });
      vi.runAllTimers();

      expect(submissionApi.getByEvaluationTeam).toHaveBeenCalledOnce();
      expect(submissionApi.getSubmission).toHaveBeenCalledTimes(
        submissionLoads,
      );
      expect(TestBed.inject(SubmissionQuery).getActiveId()).toBe('s-t1-u1-0');
    });

    /**
     * Verifies: switching team loads the new team's submissions at once and drops a move change refetch still waiting.
     * Interacts with: changeTeam(), SubmissionService.getByEvaluationTeam stub, fake timers.
     * Data: ?evaluation=e1; Alice on t1; the move changes, then she observes t2 before the jitter ends.
     */
    it('loads the new team on a team switch', async () => {
      const { fixture, submissionApi } = await renderTeamPage();

      changeCurrentMove(1);
      vi.advanceTimersByTime(MOVE_CHANGE_DEBOUNCE_MS);
      fixture.componentInstance.changeTeam('t2');
      expect(submissionApi.getByEvaluationTeam).toHaveBeenCalledTimes(2);
      expect(submissionApi.getByEvaluationTeam).toHaveBeenLastCalledWith(
        'e1',
        't2',
      );

      vi.runAllTimers();
      expect(submissionApi.getByEvaluationTeam).toHaveBeenCalledTimes(2);
    });

    /**
     * Verifies: a team switch inside the debounce drops the move change refetch too.
     * Interacts with: changeTeam(), SubmissionService.getByEvaluationTeam stub, fake timers.
     * Data: ?evaluation=e1; Alice on t1; the move changes, then she observes t2 before the debounce ends.
     */
    it('drops the refetch on a team switch inside the debounce', async () => {
      const { fixture, submissionApi } = await renderTeamPage();

      changeCurrentMove(1);
      vi.advanceTimersByTime(MOVE_CHANGE_DEBOUNCE_MS - 1);
      fixture.componentInstance.changeTeam('t2');
      vi.runAllTimers();

      expect(submissionApi.getByEvaluationTeam.mock.calls).toEqual([
        ['e1', 't1'],
        ['e1', 't2'],
      ]);
    });

    /**
     * Verifies: after a hub reconnect the page reloads the evaluation and its moves and refetches the submissions, after the debounce and the jitter.
     * Interacts with: SignalRService.reconnected$ (stub Subject), EvaluationService.getEvaluation, MoveService.getByEvaluation and SubmissionService stubs, fake timers.
     * Data: ?evaluation=e1 on move 0; Alice on t1; the hub reconnects and the evaluation is still on move 0.
     */
    it('catches up after a reconnect', async () => {
      const { signalR, evaluationApi, moveApi, submissionApi } =
        await renderTeamPage();
      const moveLoads = moveApi.getByEvaluation.mock.calls.length;

      signalR.reconnected$.next();
      vi.advanceTimersByTime(MOVE_CHANGE_DEBOUNCE_MS + JITTER_MS - 1);
      expect(evaluationApi.getEvaluation).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(evaluationApi.getEvaluation).toHaveBeenCalledExactlyOnceWith('e1');
      expect(moveApi.getByEvaluation).toHaveBeenCalledTimes(moveLoads + 1);
      expect(submissionApi.getByEvaluationTeam).toHaveBeenCalledTimes(2);

      vi.runAllTimers();
      expect(evaluationApi.getEvaluation).toHaveBeenCalledOnce();
      expect(submissionApi.getByEvaluationTeam).toHaveBeenCalledTimes(2);
    });

    /**
     * Verifies: a move change missed while the hub was down is picked up after the reconnect, with one submissions refetch through the move change.
     * Interacts with: SignalRService.reconnected$ (stub Subject), EvaluationService.getEvaluation stub (now on move 1), SubmissionService stubs, fake timers.
     * Data: ?evaluation=e1 on move 0; Alice on t1; the hub reconnects and the evaluation is on move 1.
     */
    it('picks up a missed move change after a reconnect', async () => {
      const { signalR, evaluationApi, submissionApi } = await renderTeamPage();
      evaluationApi.getEvaluation.mockReturnValue(
        of({ ...structuredClone(EVALUATION), currentMoveNumber: 1 }),
      );

      signalR.reconnected$.next();
      vi.advanceTimersByTime(MOVE_CHANGE_DEBOUNCE_MS + JITTER_MS);
      expect(evaluationApi.getEvaluation).toHaveBeenCalledOnce();
      expect(submissionApi.getByEvaluationTeam).toHaveBeenCalledOnce();

      vi.advanceTimersByTime(MOVE_CHANGE_DEBOUNCE_MS + JITTER_MS);
      expect(submissionApi.getByEvaluationTeam).toHaveBeenCalledTimes(2);
      vi.runAllTimers();
      expect(submissionApi.getByEvaluationTeam).toHaveBeenCalledTimes(2);
      expect(evaluationApi.getEvaluation).toHaveBeenCalledOnce();
    });

    /**
     * Verifies: a failed refetch is logged as a warning and leaves the submissions and the shown one as they were.
     * Interacts with: SubmissionService.getByEvaluationTeam stub (fails once), console.warn spy, real Submission store, fake timers.
     * Data: ?evaluation=e1 on move 0; Alice on t1; the move changes and the refetch fails.
     */
    it('keeps the submissions when the refetch fails', async () => {
      const { submissionApi } = await renderTeamPage();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      submissionApi.getByEvaluationTeam.mockReturnValueOnce(
        throwError(() => new Error('Service Unavailable')),
      );

      changeCurrentMove(1);
      vi.runAllTimers();

      expect(warn).toHaveBeenCalledExactlyOnceWith(
        'CITE could not refetch the submissions after a move change: Service Unavailable',
      );
      const submissionQuery = TestBed.inject(SubmissionQuery);
      expect(submissionQuery.getCount()).toBe(2);
      expect(submissionQuery.getActiveId()).toBe('s-t1-u1-0');
    });

    /**
     * Verifies: when the move goes back past the displayed one, the page shows the current move's submission of the same kind at once, from the store, and keeps it after the refetch, failed or not.
     * Interacts with: nextDisplayedMove(), real Submission/Move stores, SubmissionService stubs (the refetch fails per row), fake timers.
     * Data: ?evaluation=e1 on move 1; Alice shows her move 1 submission; the hub moves the evaluation back to move 0.
     */
    it.each([
      { refetch: 'succeeds', fails: false },
      { refetch: 'fails', fails: true },
    ])(
      'follows the move back at once when the refetch $refetch',
      async ({ fails }) => {
        const { fixture, submissionApi } = await renderTeamPage();
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const home = fixture.componentInstance;
        changeCurrentMove(1);
        vi.runAllTimers();
        home.nextDisplayedMove(MOVES[1]);
        const submissionQuery = TestBed.inject(SubmissionQuery);
        expect(submissionQuery.getActiveId()).toBe('s-t1-u1-1');
        const submissionLoads = submissionApi.getSubmission.mock.calls.length;
        if (fails) {
          submissionApi.getByEvaluationTeam.mockReturnValueOnce(
            throwError(() => new Error('Service Unavailable')),
          );
        }

        changeCurrentMove(0);
        expect(home.displayedMoveNumber).toBe(0);
        expect(submissionQuery.getActiveId()).toBe('s-t1-u1-0');
        expect(submissionApi.getSubmission).toHaveBeenCalledTimes(
          submissionLoads,
        );

        vi.runAllTimers();
        expect(submissionQuery.getActiveId()).toBe('s-t1-u1-0');
        expect(submissionApi.getSubmission).toHaveBeenCalledTimes(
          submissionLoads,
        );
      },
    );
  });
});
