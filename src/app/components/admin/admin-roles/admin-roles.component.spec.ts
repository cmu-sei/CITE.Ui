// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { screen } from '@testing-library/angular';
import { renderComponent } from '../../../test-utils/render-component';
import { AdminRolesComponent } from './admin-roles.component';
import { AdminSystemRolesComponent } from './admin-system-roles/admin-system-roles.component';
import { AdminScoringModelRolesComponent } from './admin-scoring-model-roles/admin-scoring-model-roles.component';
import { AdminEvaluationRolesComponent } from './admin-evaluation-roles/admin-evaluation-roles.component';

describe('AdminRolesComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers and shows one tab per role kind.
   * Interacts with: MatTabsModule; the role tables are unknown elements under CUSTOM_ELEMENTS_SCHEMA.
   * Data: none.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderComponent(AdminRolesComponent, {
      imports: [MatTabsModule],
      // The component is standalone, so the role tables are left out of its
      // own imports and allowed as unknown elements on the component itself.
      configureTestBed: (testBed) =>
        testBed.overrideComponent(AdminRolesComponent, {
          remove: {
            imports: [
              AdminSystemRolesComponent,
              AdminScoringModelRolesComponent,
              AdminEvaluationRolesComponent,
            ],
          },
          add: { schemas: [CUSTOM_ELEMENTS_SCHEMA] },
        }),
    });

    expect(fixture.componentInstance).toBeInstanceOf(AdminRolesComponent);
    expect(
      screen.getAllByRole('tab').map((tab) => tab.textContent?.trim()),
    ).toEqual(['Roles', 'Scoring Model Roles', 'Evaluation Roles']);
  });
});
