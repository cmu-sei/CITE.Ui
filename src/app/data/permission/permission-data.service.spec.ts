// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import {
  EvaluationPermission,
  EvaluationPermissionsService,
  ScoringModelPermission,
  ScoringModelPermissionsService,
  SystemPermission,
  SystemPermissionsService,
  TeamPermission,
  TeamPermissionsService,
} from '../../generated/cite.api';
import { PermissionDataService } from './permission-data.service';
import { getDefaultProviders } from '../../test-utils/default-test-providers';
import {
  PermissionGrants,
  permissionApiStubs,
  permissionDataProviders,
} from '../../test-utils/mock-permission-data.service';

// The "my permissions" endpoints only, so each test builds the service itself
// and decides whether to load.
function permissionApiProviders(grants: PermissionGrants = {}): Provider[] {
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
  ];
}

// Builds the real service over stubbed "my permissions" endpoints and loads
// every claim set, the way the app shell does on start-up.
async function createService(grants: PermissionGrants = {}) {
  TestBed.configureTestingModule({
    providers: getDefaultProviders([
      ...permissionApiProviders(grants),
      PermissionDataService,
    ]),
  });
  const service = TestBed.inject(PermissionDataService);
  await firstValueFrom(service.load());
  await firstValueFrom(service.loadEvaluationPermissions());
  await firstValueFrom(service.loadScoringModelPermissions());
  await firstValueFrom(service.loadTeamPermissions());
  return service;
}

const ALL_SYSTEM = Object.values(SystemPermission);
const ADMIN_SYSTEM: SystemPermission[] = ALL_SYSTEM.filter(
  (p) => p !== SystemPermission.ObserveEvaluations,
);

describe('PermissionDataService', () => {
  describe('loading', () => {
    /**
     * Verifies: each load*() call stores what its endpoint returns in the matching getter.
     * Interacts with: the four stubbed "my permissions" endpoints, PermissionDataService getters.
     * Data: one system permission and one claim of each kind.
     */
    it('exposes the loaded system and resource claims', async () => {
      const claims: PermissionGrants = {
        system: [SystemPermission.ViewUsers],
        evaluation: [
          {
            evaluationId: 'e1',
            permissions: [EvaluationPermission.ViewEvaluation],
          },
        ],
        scoringModel: [
          {
            scoringModelId: 'sm1',
            permissions: [ScoringModelPermission.ViewScoringModel],
          },
        ],
        team: [{ teamId: 't1', permissions: [TeamPermission.ViewTeam] }],
      };
      const service = await createService(claims);
      expect(service.permissions).toEqual(claims.system);
      expect(service.evaluationPermissions).toEqual(claims.evaluation);
      expect(service.scoringModelPermissions).toEqual(claims.scoringModel);
      expect(service.TeamPermissions).toEqual(claims.team);
    });

    /**
     * Verifies: before load() every gate is closed.
     * Interacts with: PermissionDataService constructed without calling load*().
     * Data: endpoints that would grant ManageEvaluations if they were called.
     */
    it('denies everything until permissions are loaded', () => {
      TestBed.configureTestingModule({
        providers: getDefaultProviders([
          ...permissionApiProviders({
            system: [SystemPermission.ManageEvaluations],
          }),
          PermissionDataService,
        ]),
      });
      const service = TestBed.inject(PermissionDataService);
      expect(service.hasPermission(SystemPermission.ManageEvaluations)).toBe(
        false,
      );
      expect(service.canViewAdministration()).toBe(false);
      expect(service.canManageEvaluation('e1')).toBe(false);
    });

    /**
     * Verifies: the permissionDataProviders() test helper yields a service whose gates already reflect its claims.
     * Interacts with: test-utils permissionDataProviders factory.
     * Data: system ManageScoringModels; team claim SubmitTeamScore on t1.
     * Why: component gate specs rely on this helper, so it is pinned here.
     */
    it('permissionDataProviders() supplies a pre-loaded service', () => {
      TestBed.configureTestingModule({
        providers: getDefaultProviders(
          permissionDataProviders({
            system: [SystemPermission.ManageScoringModels],
            team: [
              { teamId: 't1', permissions: [TeamPermission.SubmitTeamScore] },
            ],
          }),
        ),
      });
      const service = TestBed.inject(PermissionDataService);
      expect(service.canManageScoringModel('any')).toBe(true);
      expect(service.canSubmitTeamScore('t1')).toBe(true);
    });
  });

  describe('hasPermission', () => {
    /**
     * Verifies: hasPermission is true for each SystemPermission when exactly that permission is held.
     * Interacts with: PermissionDataService.load + hasPermission.
     * Data: per row, system permissions [perm].
     */
    it.each(ALL_SYSTEM)('is true for %s when it is granted', async (perm) => {
      expect(
        (await createService({ system: [perm] })).hasPermission(perm),
      ).toBe(true);
    });

    /**
     * Verifies: hasPermission is false for each SystemPermission when only a different one is held.
     * Interacts with: PermissionDataService.load + hasPermission.
     * Data: per row, system permissions [another perm] (a near miss).
     */
    it.each(ALL_SYSTEM)(
      'is false for %s when only another permission is granted',
      async (perm) => {
        const other = ALL_SYSTEM.find((p) => p !== perm)!;
        expect(
          (await createService({ system: [other] })).hasPermission(perm),
        ).toBe(false);
      },
    );
  });

  describe('canViewAdministration', () => {
    /**
     * Verifies: each system permission except ObserveEvaluations, held alone, opens the Administration area.
     * Interacts with: PermissionDataService.canViewAdministration.
     * Data: per row, a single system permission.
     */
    it.each(ADMIN_SYSTEM)('is true with only %s', async (perm) => {
      expect(
        (await createService({ system: [perm] })).canViewAdministration(),
      ).toBe(true);
    });

    /**
     * Verifies: ObserveEvaluations alone keeps Administration hidden.
     * Interacts with: PermissionDataService.canViewAdministration.
     * Data: system [ObserveEvaluations], the one system permission not on the admin list.
     */
    it('is false with only ObserveEvaluations', async () => {
      const service = await createService({
        system: [SystemPermission.ObserveEvaluations],
      });
      expect(service.canViewAdministration()).toBe(false);
    });

    /**
     * Verifies: resource claims, however broad, do not open Administration without a system permission.
     * Interacts with: PermissionDataService.canViewAdministration.
     * Data: every EvaluationPermission on e1 and every TeamPermission on t1; no system permission.
     */
    it('is false with resource claims only', async () => {
      const service = await createService({
        evaluation: [
          {
            evaluationId: 'e1',
            permissions: Object.values(EvaluationPermission),
          },
        ],
        team: [{ teamId: 't1', permissions: Object.values(TeamPermission) }],
      });
      expect(service.canViewAdministration()).toBe(false);
    });
  });

  describe('evaluation gates', () => {
    /**
     * Verifies: canCreateEvaluations is granted by the CreateEvaluations system permission.
     * Interacts with: PermissionDataService.canCreateEvaluations.
     * Data: system [CreateEvaluations].
     */
    it('canCreateEvaluations is true with CreateEvaluations', async () => {
      const service = await createService({
        system: [SystemPermission.CreateEvaluations],
      });
      expect(service.canCreateEvaluations()).toBe(true);
    });

    /**
     * Verifies: evaluation claims never grant canCreateEvaluations.
     * Interacts with: PermissionDataService.canCreateEvaluations.
     * Data: an evaluation claim with every EvaluationPermission; no system permission.
     */
    it('canCreateEvaluations is false with evaluation claims only', async () => {
      const service = await createService({
        evaluation: [
          {
            evaluationId: 'e1',
            permissions: Object.values(EvaluationPermission),
          },
        ],
      });
      expect(service.canCreateEvaluations()).toBe(false);
    });

    /**
     * Verifies: canEditEvaluation('e1') is granted by Edit/Manage at system level or on e1, and denied for near misses.
     * Interacts with: PermissionDataService.canEditEvaluation.
     * Data: per row, one system permission or one evaluation claim.
     */
    it.each<{ label: string; claims: PermissionGrants; expected: boolean }>([
      {
        label: 'system EditEvaluations',
        claims: { system: [SystemPermission.EditEvaluations] },
        expected: true,
      },
      {
        label: 'system ManageEvaluations',
        claims: { system: [SystemPermission.ManageEvaluations] },
        expected: true,
      },
      {
        label: 'EditEvaluation on e1',
        claims: {
          evaluation: [
            {
              evaluationId: 'e1',
              permissions: [EvaluationPermission.EditEvaluation],
            },
          ],
        },
        expected: true,
      },
      {
        label: 'ManageEvaluation on e1',
        claims: {
          evaluation: [
            {
              evaluationId: 'e1',
              permissions: [EvaluationPermission.ManageEvaluation],
            },
          ],
        },
        expected: true,
      },
      {
        label: 'EditEvaluation on another evaluation',
        claims: {
          evaluation: [
            {
              evaluationId: 'e2',
              permissions: [EvaluationPermission.EditEvaluation],
            },
          ],
        },
        expected: false,
      },
      {
        label: 'ViewEvaluation on e1',
        claims: {
          evaluation: [
            {
              evaluationId: 'e1',
              permissions: [EvaluationPermission.ViewEvaluation],
            },
          ],
        },
        expected: false,
      },
      {
        label: 'system ViewEvaluations',
        claims: { system: [SystemPermission.ViewEvaluations] },
        expected: false,
      },
    ])(
      'canEditEvaluation is $expected with $label',
      async ({ claims, expected }) => {
        expect((await createService(claims)).canEditEvaluation('e1')).toBe(
          expected,
        );
      },
    );

    /**
     * Verifies: canManageEvaluation('e1') needs Manage, at system level or on e1; Edit rights do not suffice.
     * Interacts with: PermissionDataService.canManageEvaluation.
     * Data: per row, the claims held.
     */
    it.each<{ label: string; claims: PermissionGrants; expected: boolean }>([
      {
        label: 'system ManageEvaluations',
        claims: { system: [SystemPermission.ManageEvaluations] },
        expected: true,
      },
      {
        label: 'ManageEvaluation on e1',
        claims: {
          evaluation: [
            {
              evaluationId: 'e1',
              permissions: [EvaluationPermission.ManageEvaluation],
            },
          ],
        },
        expected: true,
      },
      {
        label: 'system EditEvaluations and EditEvaluation on e1',
        claims: {
          system: [SystemPermission.EditEvaluations],
          evaluation: [
            {
              evaluationId: 'e1',
              permissions: [EvaluationPermission.EditEvaluation],
            },
          ],
        },
        expected: false,
      },
      {
        label: 'ManageEvaluation on another evaluation',
        claims: {
          evaluation: [
            {
              evaluationId: 'e2',
              permissions: [EvaluationPermission.ManageEvaluation],
            },
          ],
        },
        expected: false,
      },
    ])(
      'canManageEvaluation is $expected with $label',
      async ({ claims, expected }) => {
        expect((await createService(claims)).canManageEvaluation('e1')).toBe(
          expected,
        );
      },
    );

    /**
     * Verifies: canAdvanceMove('e1') is granted by Manage or Execute, at system level or on e1, and denied for near misses.
     * Interacts with: PermissionDataService.canAdvanceMove.
     * Data: per row, one system permission or one evaluation claim.
     */
    it.each<{ label: string; claims: PermissionGrants; expected: boolean }>([
      {
        label: 'system ManageEvaluations',
        claims: { system: [SystemPermission.ManageEvaluations] },
        expected: true,
      },
      {
        label: 'system ExecuteEvaluations',
        claims: { system: [SystemPermission.ExecuteEvaluations] },
        expected: true,
      },
      {
        label: 'ExecuteEvaluation on e1',
        claims: {
          evaluation: [
            {
              evaluationId: 'e1',
              permissions: [EvaluationPermission.ExecuteEvaluation],
            },
          ],
        },
        expected: true,
      },
      {
        label: 'ManageEvaluation on e1',
        claims: {
          evaluation: [
            {
              evaluationId: 'e1',
              permissions: [EvaluationPermission.ManageEvaluation],
            },
          ],
        },
        expected: true,
      },
      {
        label: 'system EditEvaluations',
        claims: { system: [SystemPermission.EditEvaluations] },
        expected: false,
      },
      {
        label: 'ExecuteEvaluation on another evaluation',
        claims: {
          evaluation: [
            {
              evaluationId: 'e2',
              permissions: [EvaluationPermission.ExecuteEvaluation],
            },
          ],
        },
        expected: false,
      },
    ])(
      'canAdvanceMove is $expected with $label',
      async ({ claims, expected }) => {
        expect((await createService(claims)).canAdvanceMove('e1')).toBe(
          expected,
        );
      },
    );
  });

  describe('scoring model gates', () => {
    /**
     * Verifies: canCreateScoringModels is granted by the CreateScoringModels system permission.
     * Interacts with: PermissionDataService.canCreateScoringModels.
     * Data: system [CreateScoringModels].
     */
    it('canCreateScoringModels is true with CreateScoringModels', async () => {
      const service = await createService({
        system: [SystemPermission.CreateScoringModels],
      });
      expect(service.canCreateScoringModels()).toBe(true);
    });

    /**
     * Verifies: scoring model claims never grant canCreateScoringModels.
     * Interacts with: PermissionDataService.canCreateScoringModels.
     * Data: a scoring model claim with every ScoringModelPermission; no system permission.
     */
    it('canCreateScoringModels is false with scoring model claims only', async () => {
      const service = await createService({
        scoringModel: [
          {
            scoringModelId: 'sm1',
            permissions: Object.values(ScoringModelPermission),
          },
        ],
      });
      expect(service.canCreateScoringModels()).toBe(false);
    });

    /**
     * Verifies: canEditScoringModel('sm1') is granted by Edit/Manage at system level or on sm1, and denied for near misses.
     * Interacts with: PermissionDataService.canEditScoringModel.
     * Data: per row, one system permission or one scoring model claim.
     */
    it.each<{ label: string; claims: PermissionGrants; expected: boolean }>([
      {
        label: 'system EditScoringModels',
        claims: { system: [SystemPermission.EditScoringModels] },
        expected: true,
      },
      {
        label: 'system ManageScoringModels',
        claims: { system: [SystemPermission.ManageScoringModels] },
        expected: true,
      },
      {
        label: 'EditScoringModel on sm1',
        claims: {
          scoringModel: [
            {
              scoringModelId: 'sm1',
              permissions: [ScoringModelPermission.EditScoringModel],
            },
          ],
        },
        expected: true,
      },
      {
        label: 'ManageScoringModel on sm1',
        claims: {
          scoringModel: [
            {
              scoringModelId: 'sm1',
              permissions: [ScoringModelPermission.ManageScoringModel],
            },
          ],
        },
        expected: true,
      },
      {
        label: 'EditScoringModel on another model',
        claims: {
          scoringModel: [
            {
              scoringModelId: 'sm2',
              permissions: [ScoringModelPermission.EditScoringModel],
            },
          ],
        },
        expected: false,
      },
      {
        label: 'ViewScoringModel on sm1',
        claims: {
          scoringModel: [
            {
              scoringModelId: 'sm1',
              permissions: [ScoringModelPermission.ViewScoringModel],
            },
          ],
        },
        expected: false,
      },
      {
        label: 'system ViewScoringModels',
        claims: { system: [SystemPermission.ViewScoringModels] },
        expected: false,
      },
    ])(
      'canEditScoringModel is $expected with $label',
      async ({ claims, expected }) => {
        expect((await createService(claims)).canEditScoringModel('sm1')).toBe(
          expected,
        );
      },
    );

    /**
     * Verifies: canManageScoringModel('sm1') needs Manage, at system level or on sm1; Edit does not suffice.
     * Interacts with: PermissionDataService.canManageScoringModel.
     * Data: per row, the claims held.
     */
    it.each<{ label: string; claims: PermissionGrants; expected: boolean }>([
      {
        label: 'ManageScoringModel on sm1',
        claims: {
          scoringModel: [
            {
              scoringModelId: 'sm1',
              permissions: [ScoringModelPermission.ManageScoringModel],
            },
          ],
        },
        expected: true,
      },
      {
        label: 'system EditScoringModels',
        claims: { system: [SystemPermission.EditScoringModels] },
        expected: false,
      },
      {
        label: 'ManageScoringModel on another model',
        claims: {
          scoringModel: [
            {
              scoringModelId: 'sm2',
              permissions: [ScoringModelPermission.ManageScoringModel],
            },
          ],
        },
        expected: false,
      },
    ])(
      'canManageScoringModel is $expected with $label',
      async ({ claims, expected }) => {
        expect((await createService(claims)).canManageScoringModel('sm1')).toBe(
          expected,
        );
      },
    );
  });

  describe('team gates', () => {
    /**
     * Verifies: each team gate is open only for a team whose claim holds the matching TeamPermission;
     * a ViewTeam claim (a near miss) or no claim on that team keeps it closed.
     * Interacts with: canEditTeamScore/canSubmitTeamScore/canManageTeam.
     * Data: per row, a claim on t1 with that permission and a claim on t2 with ViewTeam only.
     */
    it.each<{
      gate: string;
      permission: TeamPermission;
      check: (s: PermissionDataService, id: string) => boolean;
    }>([
      {
        gate: 'canEditTeamScore',
        permission: TeamPermission.EditTeamScore,
        check: (s, id) => s.canEditTeamScore(id),
      },
      {
        gate: 'canSubmitTeamScore',
        permission: TeamPermission.SubmitTeamScore,
        check: (s, id) => s.canSubmitTeamScore(id),
      },
      {
        gate: 'canManageTeam',
        permission: TeamPermission.ManageTeam,
        check: (s, id) => s.canManageTeam(id),
      },
    ])(
      '$gate follows the $permission claim for that team',
      async ({ permission, check }) => {
        const service = await createService({
          team: [
            { teamId: 't1', permissions: [permission] },
            { teamId: 't2', permissions: [TeamPermission.ViewTeam] },
          ],
        });
        expect(check(service, 't1')).toBe(true);
        expect(check(service, 't2')).toBe(false);
        expect(check(service, 't3')).toBe(false);
      },
    );

    /**
     * Verifies: no system permission opens a team gate; team access comes only from team claims.
     * Interacts with: canEditTeamScore/canSubmitTeamScore/canManageTeam.
     * Data: every SystemPermission and no team claims.
     * Why: the team gates pass a null system permission, so the system-level shortcut never applies.
     */
    it('system permissions alone do not open team gates', async () => {
      const admin = await createService({ system: ALL_SYSTEM });
      expect(admin.canEditTeamScore('t1')).toBe(false);
      expect(admin.canSubmitTeamScore('t1')).toBe(false);
      expect(admin.canManageTeam('t1')).toBe(false);
    });

    /**
     * Verifies: hasTeamPermission checks the claim for the given team only.
     * Interacts with: PermissionDataService.hasTeamPermission.
     * Data: t1 holds ViewCurrentOfficialScore; t2 holds EditOfficialScore.
     */
    it('hasTeamPermission is scoped to the team id', async () => {
      const service = await createService({
        team: [
          {
            teamId: 't1',
            permissions: [TeamPermission.ViewCurrentOfficialScore],
          },
          { teamId: 't2', permissions: [TeamPermission.EditOfficialScore] },
        ],
      });
      expect(
        service.hasTeamPermission(
          't1',
          TeamPermission.ViewCurrentOfficialScore,
        ),
      ).toBe(true);
      expect(
        service.hasTeamPermission('t1', TeamPermission.EditOfficialScore),
      ).toBe(false);
      expect(
        service.hasTeamPermission('t2', TeamPermission.EditOfficialScore),
      ).toBe(true);
    });
  });
});
