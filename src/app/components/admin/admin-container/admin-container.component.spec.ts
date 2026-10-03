// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Component, EventEmitter, Input, Output, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import {
  Evaluation,
  EvaluationService,
  HealthCheckService,
  SystemPermission,
  TeamTypeService,
  UserService,
} from '../../../generated/cite.api';
import { AdminContainerComponent } from './admin-container.component';
import { EvaluationDataService } from '../../../data/evaluation/evaluation-data.service';
import { ScoringModelDataService } from '../../../data/scoring-model/scoring-model-data.service';
import { TeamTypeDataService } from '../../../data/teamtype/team-type-data.service';
import { UserDataService } from '../../../data/user/user-data.service';
import { UserQuery } from '../../../data/user/user.query';
import { SignalRService } from '../../../services/signalr.service';
import { TopbarView } from '../../shared/top-bar/topbar.models';
import { ApiStub, BodyOverload } from '../../../test-utils/api-stub';
import { activatedRouteStub } from '../../../test-utils/activated-route';
import { permissionDataProviders } from '../../../test-utils/mock-permission-data.service';
import { renderComponent } from '../../../test-utils/render-component';

@Component({ selector: 'app-topbar', template: '' })
class TopbarStubComponent {
  @Input() title?: string;
  @Input() topbarView?: TopbarView;
  @Input() sidenav?: unknown;
  @Output() sidenavToggle = new EventEmitter<boolean>();
}

@Component({ selector: 'app-admin-evaluations', template: '' })
class AdminEvaluationsStubComponent {
  @Input() evaluationList!: Evaluation[];
}

@Component({ selector: 'app-admin-scoring-models', template: '' })
class AdminScoringModelsStubComponent {}
@Component({ selector: 'app-admin-submissions', template: '' })
class AdminSubmissionsStubComponent {}
@Component({ selector: 'app-admin-teamtypes', template: '' })
class AdminTeamTypesStubComponent {}
@Component({ selector: 'app-admin-users', template: '' })
class AdminUsersStubComponent {}
@Component({ selector: 'app-admin-roles', template: '' })
class AdminRolesStubComponent {}
@Component({ selector: 'app-admin-groups', template: '' })
class AdminGroupsStubComponent {}

async function renderAdminContainer(
  overrides: {
    system?: SystemPermission[];
    section?: string;
    apiVersion?: () => ReturnType<
      BodyOverload<HealthCheckService['getVersion']>
    >;
  } = {},
) {
  const evaluationApi = {
    getEvaluations: vi.fn(() =>
      of([{ id: 'e-all', description: 'Every evaluation' }]),
    ),
    getMyEvaluations: vi.fn(() =>
      of([{ id: 'e-mine', description: 'My evaluation' }]),
    ),
  } satisfies ApiStub<EvaluationService>;
  const userApi = {
    getUsers: vi.fn(() => of([{ id: 'u1', name: 'Alice' }])),
  } satisfies ApiStub<UserService>;
  const teamTypeApi = {
    getTeamTypes: vi.fn(() => of([])),
  } satisfies ApiStub<TeamTypeService>;
  const healthApi = {
    getVersion: vi.fn(overrides.apiVersion ?? (() => of('1.4.2+a1b2c3'))),
  } satisfies ApiStub<HealthCheckService>;
  const signalR: Pick<SignalRService, 'startConnection' | 'join' | 'leave'> = {
    startConnection: vi.fn(() => Promise.resolve()),
    join: vi.fn(),
    leave: vi.fn(),
  };
  const navigate = vi.fn(() => Promise.resolve(true));
  const { route } = activatedRouteStub(
    overrides.section ? { section: overrides.section } : {},
  );

  const rendered = await renderComponent(AdminContainerComponent, {
    declarations: [AdminContainerComponent],
    imports: [
      MatButtonModule,
      MatIconModule,
      MatListModule,
      MatSidenavModule,
      MatToolbarModule,
      TopbarStubComponent,
      AdminEvaluationsStubComponent,
      AdminScoringModelsStubComponent,
      AdminSubmissionsStubComponent,
      AdminTeamTypesStubComponent,
      AdminUsersStubComponent,
      AdminRolesStubComponent,
      AdminGroupsStubComponent,
    ],
    providers: [
      ...permissionDataProviders({ system: overrides.system ?? [] }),
      // Real data services over stubbed endpoints, so the gates are checked
      // against what actually lands in the Akita stores.
      EvaluationDataService,
      ScoringModelDataService,
      TeamTypeDataService,
      UserDataService,
      { provide: EvaluationService, useValue: evaluationApi },
      { provide: UserService, useValue: userApi },
      { provide: TeamTypeService, useValue: teamTypeApi },
      { provide: HealthCheckService, useValue: healthApi },
      { provide: SignalRService, useValue: signalR },
      { provide: ActivatedRoute, useValue: route },
    ],
  });
  const router = rendered.fixture.debugElement.injector.get(Router);
  vi.spyOn(router, 'navigate').mockImplementation(navigate);
  return { ...rendered, evaluationApi, userApi, signalR, navigate };
}

const evaluationsSection = (
  fixture: ComponentFixture<AdminContainerComponent>,
) =>
  fixture.debugElement.query(By.directive(AdminEvaluationsStubComponent))
    .componentInstance as AdminEvaluationsStubComponent;

const SECTIONS = [
  'Evaluations',
  'Scoring Models',
  'Submissions',
  'Team Types',
  'Users',
  'Roles',
  'Groups',
];

describe('AdminContainerComponent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('sidebar permission gates', () => {
    /**
     * Verifies: per gating system permission, exactly the sections it unlocks appear in the sidebar,
     * and every other section (whose permission is a near miss of the one held) stays hidden.
     * Interacts with: real PermissionDataService seeded with one permission, the sidebar list.
     * Data: per row, a single system permission and the sections it unlocks.
     */
    it.each([
      {
        permission: SystemPermission.ViewEvaluations,
        visible: ['Evaluations', 'Submissions'],
      },
      {
        permission: SystemPermission.CreateEvaluations,
        visible: ['Evaluations', 'Submissions'],
      },
      {
        permission: SystemPermission.ViewScoringModels,
        visible: ['Scoring Models'],
      },
      {
        permission: SystemPermission.CreateScoringModels,
        visible: ['Scoring Models'],
      },
      { permission: SystemPermission.ViewTeamTypes, visible: ['Team Types'] },
      { permission: SystemPermission.ViewUsers, visible: ['Users'] },
      { permission: SystemPermission.ViewRoles, visible: ['Roles'] },
      { permission: SystemPermission.ViewGroups, visible: ['Groups'] },
    ])('$permission shows only $visible', async ({ permission, visible }) => {
      await renderAdminContainer({ system: [permission] });
      for (const section of SECTIONS) {
        if (visible.includes(section)) {
          expect(screen.getByText(section)).toBeInTheDocument();
        } else {
          expect(screen.queryByText(section)).not.toBeInTheDocument();
        }
      }
    });

    /**
     * Verifies: every system permission other than the View/Create ones the sidebar checks unlocks no section.
     * Interacts with: real PermissionDataService, the sidebar list.
     * Data: all Manage*, Edit*, Execute and Observe system permissions (near misses of each section's gate).
     * Why: the container checks only View and Create permissions; this pins that Manage does not imply View.
     */
    it('offers no section for Manage, Edit, Execute or Observe permissions', async () => {
      await renderAdminContainer({
        system: [
          SystemPermission.ManageEvaluations,
          SystemPermission.EditEvaluations,
          SystemPermission.ExecuteEvaluations,
          SystemPermission.ObserveEvaluations,
          SystemPermission.ManageScoringModels,
          SystemPermission.EditScoringModels,
          SystemPermission.ManageUsers,
          SystemPermission.ManageRoles,
          SystemPermission.ManageGroups,
          SystemPermission.ManageTeamTypes,
        ],
      });
      for (const section of SECTIONS) {
        expect(screen.queryByText(section)).not.toBeInTheDocument();
      }
    });
  });

  describe('data loading by permission', () => {
    /**
     * Verifies: ViewEvaluations loads every evaluation into the store and hands them to the evaluations section.
     * Interacts with: EvaluationService.getEvaluations stub, real EvaluationDataService/Store, AdminEvaluations stub input.
     * Data: system [ViewEvaluations]; default section (Evaluations).
     */
    it('loads all evaluations with ViewEvaluations', async () => {
      const { evaluationApi, fixture } = await renderAdminContainer({
        system: [SystemPermission.ViewEvaluations],
      });
      await fixture.whenStable();
      expect(evaluationApi.getEvaluations).toHaveBeenCalled();
      expect(evaluationApi.getMyEvaluations).not.toHaveBeenCalled();
      expect(
        evaluationsSection(fixture).evaluationList.map((e) => e.id),
      ).toEqual(['e-all']);
    });

    /**
     * Verifies: without ViewEvaluations only the caller's own evaluations are loaded and handed to the evaluations section.
     * Interacts with: EvaluationService.getMyEvaluations stub, real EvaluationDataService/Store, AdminEvaluations stub input.
     * Data: system [CreateEvaluations]; default section (Evaluations).
     */
    it('loads only my evaluations without ViewEvaluations', async () => {
      const { evaluationApi, fixture } = await renderAdminContainer({
        system: [SystemPermission.CreateEvaluations],
      });
      await fixture.whenStable();
      expect(evaluationApi.getEvaluations).not.toHaveBeenCalled();
      expect(
        evaluationsSection(fixture).evaluationList.map((e) => e.id),
      ).toEqual(['e-mine']);
    });

    /**
     * Verifies: with ViewUsers the user list is fetched into the user store.
     * Interacts with: UserService.getUsers stub, real UserDataService/UserQuery.
     * Data: system [ViewUsers]; the API returns Alice.
     */
    it('loads users with ViewUsers', async () => {
      await renderAdminContainer({ system: [SystemPermission.ViewUsers] });
      expect(
        TestBed.inject(UserQuery)
          .getAll()
          .map((u) => u.name),
      ).toEqual(['Alice']);
    });

    /**
     * Verifies: without ViewUsers the user list is not fetched and the user store stays empty.
     * Interacts with: UserService.getUsers stub, real UserDataService/UserQuery.
     * Data: system [ManageUsers] (the other user permission, not View).
     */
    it('does not load users without ViewUsers', async () => {
      const { userApi } = await renderAdminContainer({
        system: [SystemPermission.ManageUsers],
      });
      expect(userApi.getUsers).not.toHaveBeenCalled();
      expect(TestBed.inject(UserQuery).getAll()).toEqual([]);
    });
  });

  describe('sections', () => {
    // Each section's content has its own @if in the template
    // (admin-container.component.html:111-145), separate from the sidebar
    // entry, and ?section= in the URL opens it directly. One row per section
    // and grant: every permission the content gate accepts, and a near miss
    // (the same resource's Edit/Manage/Execute permissions, which the gate
    // does not accept).
    const sectionGates: Array<{
      section: string;
      stub: Type<unknown>;
      grant: SystemPermission[];
      shown: boolean;
    }> = [
      {
        section: 'Scoring Models',
        stub: AdminScoringModelsStubComponent,
        grant: [SystemPermission.ViewScoringModels],
        shown: true,
      },
      {
        section: 'Scoring Models',
        stub: AdminScoringModelsStubComponent,
        grant: [SystemPermission.CreateScoringModels],
        shown: true,
      },
      {
        section: 'Scoring Models',
        stub: AdminScoringModelsStubComponent,
        grant: [
          SystemPermission.EditScoringModels,
          SystemPermission.ManageScoringModels,
        ],
        shown: false,
      },
      {
        section: 'Evaluations',
        stub: AdminEvaluationsStubComponent,
        grant: [SystemPermission.ViewEvaluations],
        shown: true,
      },
      {
        section: 'Evaluations',
        stub: AdminEvaluationsStubComponent,
        grant: [SystemPermission.CreateEvaluations],
        shown: true,
      },
      {
        section: 'Evaluations',
        stub: AdminEvaluationsStubComponent,
        grant: [
          SystemPermission.EditEvaluations,
          SystemPermission.ManageEvaluations,
          SystemPermission.ExecuteEvaluations,
        ],
        shown: false,
      },
      {
        section: 'Submissions',
        stub: AdminSubmissionsStubComponent,
        grant: [SystemPermission.ViewEvaluations],
        shown: true,
      },
      {
        section: 'Submissions',
        stub: AdminSubmissionsStubComponent,
        grant: [SystemPermission.CreateEvaluations],
        shown: true,
      },
      {
        section: 'Submissions',
        stub: AdminSubmissionsStubComponent,
        grant: [
          SystemPermission.EditEvaluations,
          SystemPermission.ManageEvaluations,
          SystemPermission.ExecuteEvaluations,
        ],
        shown: false,
      },
      {
        section: 'Team Types',
        stub: AdminTeamTypesStubComponent,
        grant: [SystemPermission.ViewTeamTypes],
        shown: true,
      },
      {
        section: 'Team Types',
        stub: AdminTeamTypesStubComponent,
        grant: [SystemPermission.ManageTeamTypes],
        shown: false,
      },
      {
        section: 'Users',
        stub: AdminUsersStubComponent,
        grant: [SystemPermission.ViewUsers],
        shown: true,
      },
      {
        section: 'Users',
        stub: AdminUsersStubComponent,
        grant: [SystemPermission.ManageUsers, SystemPermission.ViewRoles],
        shown: false,
      },
      {
        section: 'Roles',
        stub: AdminRolesStubComponent,
        grant: [SystemPermission.ViewRoles],
        shown: true,
      },
      {
        section: 'Roles',
        stub: AdminRolesStubComponent,
        grant: [SystemPermission.ManageRoles],
        shown: false,
      },
      {
        section: 'Groups',
        stub: AdminGroupsStubComponent,
        grant: [SystemPermission.ViewGroups],
        shown: true,
      },
      {
        section: 'Groups',
        stub: AdminGroupsStubComponent,
        grant: [SystemPermission.ManageGroups],
        shown: false,
      },
    ];

    /**
     * Verifies: the section named in the URL renders only when its content gate accepts the grant.
     * Interacts with: ActivatedRoute.queryParamMap stub (section=<name>), real PermissionDataService, the section's child stub.
     * Data: per row, the section, the system permissions held, and whether the section stub is rendered.
     */
    it.each(sectionGates)(
      '?section=$section with $grant shown=$shown',
      async ({ section, stub, grant, shown }) => {
        const { fixture } = await renderAdminContainer({
          section,
          system: grant,
        });
        const found = fixture.debugElement.query(By.directive(stub));
        if (shown) {
          expect(found).not.toBeNull();
        } else {
          expect(found).toBeNull();
        }
      },
    );

    /**
     * Verifies: clicking a sidebar section navigates to it, keeping the original evaluation id.
     * Interacts with: user-event click, Router.navigate spy.
     * Data: system [ViewRoles]; no active evaluation.
     */
    it('navigates to a section when it is clicked', async () => {
      const { navigate } = await renderAdminContainer({
        system: [SystemPermission.ViewRoles],
      });
      const user = userEvent.setup();
      await user.click(screen.getByText('Roles'));
      expect(navigate).toHaveBeenCalledWith([], {
        queryParams: { evaluation: undefined, section: 'Roles' },
      });
    });
  });

  /**
   * Verifies: the sidebar shows the API version without its build metadata.
   * Interacts with: HealthCheckService.getVersion stub.
   * Data: version '1.4.2+a1b2c3'.
   */
  it('shows the API version', async () => {
    await renderAdminContainer();
    expect(screen.getByText(/API 1\.4\.2$/)).toBeInTheDocument();
  });

  /**
   * Verifies: the sidebar shows 'API ERROR!' when the version call fails.
   * Interacts with: HealthCheckService.getVersion stub (throws).
   * Data: a failing version call.
   */
  it('shows an API error when the version call fails', async () => {
    await renderAdminContainer({
      apiVersion: () => throwError(() => new Error('down')),
    });
    expect(screen.getByText(/API API ERROR!$/)).toBeInTheDocument();
  });

  /**
   * Verifies: the container joins the admin SignalR area on init and leaves on destroy.
   * Interacts with: SignalRService stub.
   * Data: default render, then fixture.destroy().
   */
  it('joins the admin hub area and leaves on destroy', async () => {
    const { signalR, fixture } = await renderAdminContainer();
    await fixture.whenStable();
    expect(signalR.startConnection).toHaveBeenCalledWith('Admin');
    expect(signalR.join).toHaveBeenCalled();
    fixture.destroy();
    expect(signalR.leave).toHaveBeenCalled();
  });
});
