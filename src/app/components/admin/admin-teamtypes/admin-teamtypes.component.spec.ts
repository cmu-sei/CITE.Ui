// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { screen, within } from '@testing-library/angular';
import userEvent, {
  PointerEventsCheckLevel,
} from '@testing-library/user-event';
import { of } from 'rxjs';
import { CrucibleDialogService } from '@cmusei/crucible-common';
import {
  SystemPermission,
  TeamType,
  TeamTypeService,
} from '../../../generated/cite.api';
import { TeamTypeStore } from '../../../data/teamtype/team-type.store';
import { ApiStub } from '../../../test-utils/api-stub';
import { dialogRefStub } from '../../../test-utils/dialog-refs';
import { matDialogStub } from '../../../test-utils/mat-dialog';
import { permissionDataProviders } from '../../../test-utils/mock-permission-data.service';
import { renderComponent } from '../../../test-utils/render-component';
import { AdminTeamTypesComponent } from './admin-teamtypes.component';

// The global stylesheets make every computed-style lookup slow in jsdom, and
// user-event's pointer-events check looks one up per ancestor on each click
// (about a second per click on this page under coverage). Clicks go to
// enabled, visible controls here, so the check is skipped.
const FAST_POINTER = { pointerEventsCheck: PointerEventsCheckLevel.Never };

const TEAM_TYPES: TeamType[] = [
  {
    id: 'tt1',
    name: 'Agency',
    isOfficialScoreContributor: true,
    showTeamTypeAverage: false,
  },
  {
    id: 'tt2',
    name: 'Contractor',
    isOfficialScoreContributor: false,
    showTeamTypeAverage: false,
  },
];

async function renderTeamTypes(system: SystemPermission[]) {
  const teamTypeApi = {
    updateTeamType: vi.fn((id: string, teamType?: TeamType) =>
      of({ ...teamType, id }),
    ),
    deleteTeamType: vi.fn(() => of(null)),
  } satisfies ApiStub<TeamTypeService>;
  const confirm = vi.fn(() => dialogRefStub<unknown, boolean>(true).dialogRef);
  const dialogService: Pick<CrucibleDialogService, 'confirm'> = { confirm };
  const editDialog = matDialogStub();

  const rendered = await renderComponent(AdminTeamTypesComponent, {
    declarations: [AdminTeamTypesComponent],
    imports: [
      MatButtonModule,
      MatCardModule,
      MatCheckboxModule,
      MatFormFieldModule,
      MatIconModule,
      MatInputModule,
      MatPaginatorModule,
      MatProgressSpinnerModule,
      MatSortModule,
      MatTableModule,
    ],
    providers: [
      ...permissionDataProviders({ system }),
      { provide: TeamTypeService, useValue: teamTypeApi },
      { provide: CrucibleDialogService, useValue: dialogService },
      { provide: MatDialog, useValue: editDialog.dialog },
    ],
    configureTestBed: (testBed) => {
      // The admin container loads the team types; seed what it would store.
      testBed.inject(TeamTypeStore).set(structuredClone(TEAM_TYPES));
    },
  });
  return {
    ...rendered,
    teamTypeApi,
    confirm,
    editDialog,
    user: userEvent.setup(FAST_POINTER),
  };
}

// Role queries cost up to a second each over this table in jsdom (the global
// stylesheets make every computed-style lookup slow), so rows are found by
// their text and the icon buttons, named only by their title, by that title.
const row = (name: string) =>
  screen.getByText(name, { selector: 'td' }).closest('tr') as HTMLElement;

describe('AdminTeamTypesComponent', () => {
  /**
   * Verifies: with ManageTeamTypes the Add, Edit and Delete buttons and the flag checkboxes are enabled.
   * Interacts with: real PermissionDataService.hasPermission, the rendered table.
   * Data: system [ManageTeamTypes].
   */
  it('enables editing with ManageTeamTypes', async () => {
    await renderTeamTypes([SystemPermission.ManageTeamTypes]);

    expect(screen.getByTitle('Add TeamType')).toBeEnabled();
    const agency = row('Agency');
    expect(within(agency).getByTitle('Edit Team Type')).toBeEnabled();
    expect(within(agency).getByTitle('Delete Team Type')).toBeEnabled();
    for (const checkbox of within(agency).getAllByRole('checkbox')) {
      expect(checkbox).toBeEnabled();
    }
  });

  /**
   * Verifies: ViewTeamTypes (a near miss) leaves Add, Edit, Delete and the flag checkboxes disabled.
   * Interacts with: real PermissionDataService.hasPermission, the rendered table.
   * Data: system [ViewTeamTypes].
   */
  it('is read-only with ViewTeamTypes only', async () => {
    await renderTeamTypes([SystemPermission.ViewTeamTypes]);

    expect(screen.getByTitle('Add TeamType')).toBeDisabled();
    const agency = row('Agency');
    expect(within(agency).getByTitle('Edit Team Type')).toBeDisabled();
    expect(within(agency).getByTitle('Delete Team Type')).toBeDisabled();
    for (const checkbox of within(agency).getAllByRole('checkbox')) {
      expect(checkbox).toBeDisabled();
    }
  });

  /**
   * Verifies: ticking a flag checkbox updates the team type through the API.
   * Interacts with: the Show TeamType Average checkbox, TeamTypeService.updateTeamType stub.
   * Data: system [ManageTeamTypes]; Contractor's average turned on.
   */
  it('toggles a team type flag with ManageTeamTypes', async () => {
    const { teamTypeApi, user } = await renderTeamTypes([
      SystemPermission.ManageTeamTypes,
    ]);
    const [, showAverage] = within(row('Contractor')).getAllByRole('checkbox');
    await user.click(showAverage);

    expect(teamTypeApi.updateTeamType).toHaveBeenCalledWith(
      'tt2',
      expect.objectContaining({ showTeamTypeAverage: true }),
    );
  });

  /**
   * Verifies: a confirmed Delete removes the team type through the API and from the table.
   * Interacts with: CrucibleDialogService.confirm stub (answers true), TeamTypeService.deleteTeamType stub.
   * Data: system [ManageTeamTypes]; Contractor deleted.
   */
  it('deletes a team type after confirmation', async () => {
    const { teamTypeApi, confirm, fixture, user } = await renderTeamTypes([
      SystemPermission.ManageTeamTypes,
    ]);
    await user.click(within(row('Contractor')).getByTitle('Delete Team Type'));
    fixture.detectChanges();

    expect(confirm).toHaveBeenCalledOnce();
    expect(teamTypeApi.deleteTeamType).toHaveBeenCalledWith('tt2');
    expect(
      screen.queryByText('Contractor', { selector: 'td' }),
    ).not.toBeInTheDocument();
  });

  /**
   * Verifies: Edit hands the permission to the dialog, and a saved edit is sent to the API.
   * Interacts with: matDialogStub (dialog data, editComplete), TeamTypeService.updateTeamType stub.
   * Data: system [ManageTeamTypes]; Agency renamed.
   */
  it('updates a team type saved in the edit dialog', async () => {
    const { teamTypeApi, editDialog, user } = await renderTeamTypes([
      SystemPermission.ManageTeamTypes,
    ]);
    await user.click(within(row('Agency')).getByTitle('Edit Team Type'));
    expect(editDialog.config()?.data.canEdit).toBe(true);

    editDialog.complete({
      saveChanges: true,
      teamType: { ...TEAM_TYPES[0], name: 'Federal agency' },
    });

    expect(teamTypeApi.updateTeamType).toHaveBeenCalledWith(
      'tt1',
      expect.objectContaining({ name: 'Federal agency' }),
    );
  });
});
