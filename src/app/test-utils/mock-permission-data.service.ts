// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

// Provides the app's REAL PermissionDataService over stubbed "my permissions"
// endpoints, so the gate logic under test is the production code, not a
// re-implementation that can drift from it.

import { inject, Provider } from '@angular/core';
import { vi } from 'vitest';
import { of } from 'rxjs';
import {
  EvaluationPermissionClaim,
  EvaluationPermissionsService,
  ScoringModelPermissionClaim,
  ScoringModelPermissionsService,
  SystemPermission,
  SystemPermissionsService,
  TeamPermissionClaim,
  TeamPermissionsService,
} from '../generated/cite.api';
import { PermissionDataService } from '../data/permission/permission-data.service';
import { ApiStub } from './api-stub';

export interface PermissionGrants {
  system?: SystemPermission[];
  evaluation?: EvaluationPermissionClaim[];
  scoringModel?: ScoringModelPermissionClaim[];
  team?: TeamPermissionClaim[];
}

export function permissionApiStubs(grants: PermissionGrants = {}) {
  return {
    systemPermissions: {
      getMySystemPermissions: vi.fn(() => of(grants.system ?? [])),
    } satisfies ApiStub<SystemPermissionsService>,
    evaluationPermissions: {
      getMyEvaluationPermissions: vi.fn(() => of(grants.evaluation ?? [])),
    } satisfies ApiStub<EvaluationPermissionsService>,
    scoringModelPermissions: {
      getMyScoringModelPermissions: vi.fn(() => of(grants.scoringModel ?? [])),
    } satisfies ApiStub<ScoringModelPermissionsService>,
    teamPermissions: {
      getMyTeamPermissions: vi.fn(() => of(grants.team ?? [])),
    } satisfies ApiStub<TeamPermissionsService>,
  };
}

export function permissionDataProviders(
  grants: PermissionGrants = {},
): Provider[] {
  const stubs = permissionApiStubs(grants);
  return [
    { provide: SystemPermissionsService, useValue: stubs.systemPermissions },
    {
      provide: EvaluationPermissionsService,
      useValue: stubs.evaluationPermissions,
    },
    {
      provide: ScoringModelPermissionsService,
      useValue: stubs.scoringModelPermissions,
    },
    { provide: TeamPermissionsService, useValue: stubs.teamPermissions },
    {
      provide: PermissionDataService,
      // inject() resolves the stubs above (or a test's own override) with the
      // real types, so the partial stubs need no casts.
      useFactory: () => {
        const service = new PermissionDataService(
          inject(SystemPermissionsService),
          inject(EvaluationPermissionsService),
          inject(ScoringModelPermissionsService),
          inject(TeamPermissionsService),
        );
        // Every claim set is loaded up front, so gates answer correctly
        // whether or not the code under test calls load*() itself. The stubs
        // return of(...), so each load completes synchronously.
        service.load().subscribe();
        service.loadEvaluationPermissions().subscribe();
        service.loadScoringModelPermissions().subscribe();
        service.loadTeamPermissions().subscribe();
        return service;
      },
    },
  ];
}
