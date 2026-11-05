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
import { TeamPermission, TeamRolesService } from '../../../../generated/cite.api';
import { ApiStub } from '../../../../test-utils/api-stub';
import { renderComponent } from '../../../../test-utils/render-component';
import { AdminTeamRolesComponent } from './admin-team-roles.component';

describe('AdminTeamRolesComponent', () => {
  /**
   * Verifies: each team role is a read-only column of its permissions, sorted by name, with one row per team permission; the official score permissions show on the role that holds them and not on the other.
   * Interacts with: real TeamRoleDataService over a stubbed TeamRolesService.
   * Data: roles Owner (ViewTeam, ManageTeam, ViewPastOfficialScore) and Official Scorer (ViewTeam and the three official score permissions), returned out of order.
   */
  it('renders each role as a read-only column of its permissions', async () => {
    const rolesApi = {
      getAllTeamRoles: vi.fn(() =>
        of([
          {
            id: 'owner',
            name: 'Owner',
            permissions: [
              TeamPermission.ViewTeam,
              TeamPermission.ManageTeam,
              TeamPermission.ViewPastOfficialScore,
            ],
          },
          {
            id: 'scorer',
            name: 'Official Scorer',
            permissions: [
              TeamPermission.ViewTeam,
              TeamPermission.ViewPastOfficialScore,
              TeamPermission.ViewCurrentOfficialScore,
              TeamPermission.EditOfficialScore,
            ],
          },
        ]),
      ),
    } satisfies ApiStub<TeamRolesService>;
    await renderComponent(AdminTeamRolesComponent, {
      imports: [
        MatButtonModule,
        MatCheckboxModule,
        MatIconModule,
        MatTableModule,
        MatTooltipModule,
      ],
      providers: [{ provide: TeamRolesService, useValue: rolesApi }],
    });

    const [header, ...rows] = screen.getAllByRole('row');
    expect(
      within(header)
        .getAllByRole('columnheader')
        .map((h) => h.textContent?.trim()),
    ).toEqual(['Permissions', 'Official Scorer', 'Owner']);
    expect(rows).toHaveLength(Object.values(TeamPermission).length);

    const editOfficial = screen.getByRole('checkbox', {
      name: `Official Scorer ${TeamPermission.EditOfficialScore}`,
    });
    expect(editOfficial).toBeChecked();
    expect(editOfficial).toBeDisabled();
    expect(
      screen.getByRole('checkbox', {
        name: `Owner ${TeamPermission.EditOfficialScore}`,
      }),
    ).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', {
        name: `Owner ${TeamPermission.ManageTeam}`,
      }),
    ).toBeChecked();
  });
});
