// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import {
  ScoringModelPermission,
  ScoringModelRole,
  ScoringModelRolesService,
} from '../../generated/cite.api';
import { ScoringModelRoleDataService } from './scoring-model-role-data.service';
import { ApiStub } from '../../test-utils/api-stub';
import { getDefaultProviders } from '../../test-utils/default-test-providers';

describe('ScoringModelRoleDataService', () => {
  /**
   * Verifies: loadRoles() fetches every scoring model role and publishes them on scoringModelRoles$.
   * Interacts with: ScoringModelRolesService.getAllScoringModelRoles stub.
   * Data: one role with EditScoringModel; the stream starts empty.
   */
  it('loadRoles() publishes the scoring model roles', async () => {
    const roles: ScoringModelRole[] = [
      {
        id: 'r1',
        name: 'Editor',
        permissions: [ScoringModelPermission.EditScoringModel],
      },
    ];
    const api = {
      getAllScoringModelRoles: vi.fn(() => of(roles)),
    } satisfies ApiStub<ScoringModelRolesService>;
    TestBed.configureTestingModule({
      providers: getDefaultProviders([
        { provide: ScoringModelRolesService, useValue: api },
        ScoringModelRoleDataService,
      ]),
    });
    const service = TestBed.inject(ScoringModelRoleDataService);
    expect(await firstValueFrom(service.scoringModelRoles$)).toEqual([]);
    await firstValueFrom(service.loadRoles());
    expect(await firstValueFrom(service.scoringModelRoles$)).toEqual(roles);
  });
});
