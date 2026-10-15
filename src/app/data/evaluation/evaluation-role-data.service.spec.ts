// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import {
  EvaluationPermission,
  EvaluationRole,
  EvaluationRolesService,
} from '../../generated/cite.api';
import { EvaluationRoleDataService } from './evaluation-role-data.service';
import { ApiStub } from '../../test-utils/api-stub';
import { getDefaultProviders } from '../../test-utils/default-test-providers';

describe('EvaluationRoleDataService', () => {
  /**
   * Verifies: loadRoles() fetches the evaluation roles and publishes them on evaluationRoles$.
   * Interacts with: EvaluationRolesService.getAllEvaluationRoles stub, evaluationRoles$.
   * Data: one role granting ExecuteEvaluation; the stream starts empty.
   */
  it('loadRoles() publishes the evaluation roles', async () => {
    const roles: EvaluationRole[] = [
      {
        id: 'r1',
        name: 'Facilitator',
        permissions: [EvaluationPermission.ExecuteEvaluation],
      },
    ];
    const api = {
      getAllEvaluationRoles: vi.fn(() => of(roles)),
    } satisfies ApiStub<EvaluationRolesService>;
    TestBed.configureTestingModule({
      providers: getDefaultProviders([
        { provide: EvaluationRolesService, useValue: api },
        EvaluationRoleDataService,
      ]),
    });
    const service = TestBed.inject(EvaluationRoleDataService);
    expect(await firstValueFrom(service.evaluationRoles$)).toEqual([]);
    await firstValueFrom(service.loadRoles());
    expect(await firstValueFrom(service.evaluationRoles$)).toEqual(roles);
  });
});
