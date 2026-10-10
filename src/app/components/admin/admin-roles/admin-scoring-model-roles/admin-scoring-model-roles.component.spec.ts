// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { screen, within } from '@testing-library/angular';
import { of } from 'rxjs';
import {
  ScoringModelPermission,
  ScoringModelRolesService,
} from '../../../../generated/cite.api';
import { ApiStub } from '../../../../test-utils/api-stub';
import { renderComponent } from '../../../../test-utils/render-component';
import { AdminScoringModelRolesComponent } from './admin-scoring-model-roles.component';

describe('AdminScoringModelRolesComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers and shows each role as a read-only column of its permissions.
   * Interacts with: real ScoringModelRoleDataService over a stubbed ScoringModelRolesService.
   * Data: roles Observer (ViewScoringModel) and Manager (all permissions), returned out of order.
   */
  it('renders with the default test providers', async () => {
    const rolesApi = {
      getAllScoringModelRoles: vi.fn(() =>
        of([
          {
            id: 'r2',
            name: 'Observer',
            allPermissions: false,
            permissions: [ScoringModelPermission.ViewScoringModel],
          },
          { id: 'r1', name: 'Manager', allPermissions: true, permissions: [] },
        ]),
      ),
    } satisfies ApiStub<ScoringModelRolesService>;
    const { fixture } = await renderComponent(AdminScoringModelRolesComponent, {
      declarations: [AdminScoringModelRolesComponent],
      imports: [
        MatButtonModule,
        MatCheckboxModule,
        MatIconModule,
        MatTableModule,
        MatTooltipModule,
      ],
      providers: [{ provide: ScoringModelRolesService, useValue: rolesApi }],
    });

    expect(fixture.componentInstance).toBeInstanceOf(
      AdminScoringModelRolesComponent,
    );
    const [header] = screen.getAllByRole('row');
    expect(
      within(header)
        .getAllByRole('columnheader')
        .map((h) => h.querySelector('p')?.textContent),
    ).toEqual([undefined, 'Manager', 'Observer']);
    const viewRow = within(screen.getByRole('table'))
      .getByText(ScoringModelPermission.ViewScoringModel, { selector: 'td' })
      .closest('tr') as HTMLElement;
    // Manager holds every permission, so only its All row has a checkbox.
    const [observerView] = within(viewRow).getAllByRole('checkbox');
    expect(observerView).toBeChecked();
    expect(observerView).toBeDisabled();
  });
});
