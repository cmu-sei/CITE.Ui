// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Component, EventEmitter, Input, Output } from '@angular/core';
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
import { screen } from '@testing-library/angular';
import { of } from 'rxjs';
import { ComnAuthService } from '@cmusei/crucible-common';
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
import { HomeAppComponent } from './home-app.component';

@Component({ selector: 'app-topbar', template: '' })
class TopbarStubComponent {
  @Input() title?: string;
  @Input() topbarView?: unknown;
  @Input() imageFilePath?: string;
  @Output() urlNavigate = new EventEmitter<string>();
}
@Component({ selector: 'app-evaluation-info', template: '' })
class EvaluationInfoStubComponent {
  @Input() showAdminButton!: boolean;
  @Input() showMoveArrows!: boolean;
  @Input() teamList!: unknown;
  @Input() myTeamId!: string;
  @Input() evaluationList!: unknown;
  @Input() moveList!: unknown;
  @Input() scoresheetOnRight!: boolean;
  @Input() noChanges!: boolean;
  @Input() selectedSection!: unknown;
  @Output() nextDisplayedMove = new EventEmitter<unknown>();
  @Output() previousDisplayedMove = new EventEmitter<unknown>();
  @Output() nextEvaluationMove = new EventEmitter<unknown>();
  @Output() changeTeam = new EventEmitter<string>();
  @Output() changeSection = new EventEmitter<unknown>();
}
@Component({ selector: 'app-dashboard', template: '' })
class DashboardStubComponent {
  @Input() unreadArticles!: unknown;
  @Input() myTeamId!: string;
  @Input() noChanges!: boolean;
}

const EVALUATION: Evaluation = {
  id: 'e1',
  description: 'Ransomware exercise',
  status: ItemStatus.Active,
  currentMoveNumber: 0,
  scoringModelId: 'sm1',
  dateCreated: new Date('2026-01-02T10:00:00Z'),
};

async function renderHome(
  grants: PermissionGrants,
  { evaluation }: { evaluation?: string } = {},
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
    startConnection: vi.fn(() => Promise.resolve()),
    join: vi.fn(),
    leave: vi.fn(),
  };
  // GalleryApiUrl is empty in the default settings, so the page never starts
  // the Gallery hub; it only leaves it on destroy.
  const gallerySignalR: Pick<GallerySignalRService, 'leave'> = {
    leave: vi.fn(),
  };
  // The component reads only user$ (UserDataService.setCurrentUser).
  const auth: Pick<ComnAuthService, 'user$'> = {
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
    declarations: [HomeAppComponent],
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
      TopbarStubComponent,
      EvaluationInfoStubComponent,
      DashboardStubComponent,
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
  return { ...rendered, evaluationApi, signalR, evaluationInfo };
}

const adminButton = () =>
  screen.queryByRole('button', { name: 'Show Administration Page' });

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

        expect(evaluationInfo()?.showAdminButton).toBe(expected);
      },
    );
  });
});
