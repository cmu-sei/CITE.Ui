// Copyright 2024 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/angular';
import { of, BehaviorSubject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { AdminContainerComponent } from './admin-container.component';
import { renderComponent } from 'src/app/test-utils/render-component';
import { EvaluationDataService } from 'src/app/data/evaluation/evaluation-data.service';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { ScoringModelDataService } from 'src/app/data/scoring-model/scoring-model-data.service';
import { TeamTypeDataService } from 'src/app/data/teamtype/team-type-data.service';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { SignalRService } from 'src/app/services/signalr.service';
import { HealthCheckService } from 'src/app/generated/cite.api';
import { SystemPermission } from 'src/app/generated/cite.api';

async function renderAdmin(
  overrides: {
    permissions?: SystemPermission[];
  } = {},
) {
  const { permissions = [] } = overrides;

  const mockPermissionDataService = {
    load: () => of([]),
    loadScoringModelPermissions: () => of([]),
    loadEvaluationPermissions: () => of([]),
    permissions: permissions,
    hasPermission: (p: SystemPermission) => permissions.includes(p),
  };

  return renderComponent(AdminContainerComponent, {
    declarations: [AdminContainerComponent],
    providers: [
      {
        provide: EvaluationDataService,
        useValue: {
          load: () => {},
          setActive: () => {},
          EvaluationList: new BehaviorSubject([]),
        },
      },
      {
        provide: EvaluationQuery,
        useValue: {
          selectAll: () => of([]),
          select: () => of(null),
          selectEntity: () => of(null),
          selectLoading: () => of(false),
          selectActive: () => of(null),
          selectActiveId: () => of(null),
          getAll: () => [],
          getEntity: () => null,
          getActiveId: () => null,
        },
      },
      {
        provide: ScoringModelDataService,
        useValue: {
          load: () => {},
          scoringModelList: new BehaviorSubject([]),
        },
      },
      {
        provide: TeamTypeDataService,
        useValue: { load: () => {} },
      },
      { provide: PermissionDataService, useValue: mockPermissionDataService },
      {
        provide: SignalRService,
        useValue: {
          startConnection: () => Promise.resolve(),
          join: () => {},
          leave: () => {},
          leaveChannel: () => {},
        },
      },
      {
        provide: HealthCheckService,
        useValue: { getVersion: () => of('1.0.0+abc') },
      },
      {
        provide: ActivatedRoute,
        useValue: {
          params: of({}),
          paramMap: of({ get: () => null, has: () => false }),
          queryParams: of({}),
          queryParamMap: of({
            get: (key: string) => null,
            has: () => false,
          }),
          snapshot: {
            params: {},
            paramMap: { get: () => null, has: () => false },
          },
        },
      },
    ],
  });
}

describe('AdminContainerComponent', () => {
  it('should create the component', async () => {
    const { fixture } = await renderAdmin();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display the Administration header', async () => {
    await renderAdmin();
    expect(screen.getByText('Administration')).toBeInTheDocument();
  });

  it('should display API version from health check', async () => {
    const { fixture } = await renderAdmin();
    fixture.detectChanges();
    expect(fixture.componentInstance.apiVersion).toBe('1.0.0');
  });

  it('should show Users nav item when user has ViewUsers permission', async () => {
    await renderAdmin({
      permissions: [SystemPermission.ViewUsers],
    });
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('should hide Users nav item when user lacks ViewUsers permission', async () => {
    await renderAdmin({ permissions: [] });
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
  });

  it('should show Roles nav item when user has ViewRoles permission', async () => {
    await renderAdmin({
      permissions: [SystemPermission.ViewRoles],
    });
    expect(screen.getByText('Roles')).toBeInTheDocument();
  });

  it('should show Groups nav item when user has ViewGroups permission', async () => {
    await renderAdmin({
      permissions: [SystemPermission.ViewGroups],
    });
    expect(screen.getByText('Groups')).toBeInTheDocument();
  });

  it('should show Evaluations nav item when user has ViewEvaluations permission', async () => {
    await renderAdmin({
      permissions: [SystemPermission.ViewEvaluations],
    });
    expect(screen.getByText('Evaluations')).toBeInTheDocument();
  });

  it('should show Submissions nav when ViewEvaluations permission present', async () => {
    await renderAdmin({
      permissions: [SystemPermission.ViewEvaluations],
    });
    expect(screen.getByText('Submissions')).toBeInTheDocument();
  });

  it('should hide Submissions nav when no ViewEvaluations permission', async () => {
    await renderAdmin({ permissions: [] });
    expect(screen.queryByText('Submissions')).not.toBeInTheDocument();
  });

  it('should show Team Types nav when ViewTeamTypes permission present', async () => {
    await renderAdmin({
      permissions: [SystemPermission.ViewTeamTypes],
    });
    expect(screen.getByText('Team Types')).toBeInTheDocument();
  });

  it('should hide Team Types nav when no ViewTeamTypes permission', async () => {
    await renderAdmin({ permissions: [] });
    expect(screen.queryByText('Team Types')).not.toBeInTheDocument();
  });

  it('should show all nav items when all permissions present', async () => {
    await renderAdmin({
      permissions: [
        SystemPermission.ViewEvaluations,
        SystemPermission.ViewScoringModels,
        SystemPermission.ViewUsers,
        SystemPermission.ViewRoles,
        SystemPermission.ViewGroups,
        SystemPermission.ViewTeamTypes,
      ],
    });
    expect(screen.getByText('Evaluations')).toBeInTheDocument();
    expect(screen.getByText('Scoring Models')).toBeInTheDocument();
    expect(screen.getByText('Submissions')).toBeInTheDocument();
    expect(screen.getByText('Team Types')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Roles')).toBeInTheDocument();
    expect(screen.getByText('Groups')).toBeInTheDocument();
  });

  it('should show no permission-gated nav items when no permissions', async () => {
    await renderAdmin({ permissions: [] });
    expect(screen.queryByText('Evaluations')).not.toBeInTheDocument();
    expect(screen.queryByText('Scoring Models')).not.toBeInTheDocument();
    expect(screen.queryByText('Submissions')).not.toBeInTheDocument();
    expect(screen.queryByText('Team Types')).not.toBeInTheDocument();
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
    expect(screen.queryByText('Roles')).not.toBeInTheDocument();
    expect(screen.queryByText('Groups')).not.toBeInTheDocument();
  });
});
