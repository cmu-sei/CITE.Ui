// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSortModule } from '@angular/material/sort';
import { By } from '@angular/platform-browser';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { CrucibleDialogService } from '@cmusei/crucible-common';
import { Team, TeamService } from '../../../generated/cite.api';
import { TeamTypeStore } from '../../../data/teamtype/team-type.store';
import { ApiStub } from '../../../test-utils/api-stub';
import { dialogRefStub } from '../../../test-utils/dialog-refs';
import { matDialogStub } from '../../../test-utils/mat-dialog';
import { renderComponent } from '../../../test-utils/render-component';
import { AdminTeamsComponent } from './admin-teams.component';

@Component({ selector: 'app-admin-team-memberships', template: '' })
class TeamMembershipsStubComponent {
  @Input() teamId!: string;
}

const TEAMS: Team[] = [
  {
    id: 't1',
    evaluationId: 'e1',
    name: 'Blue Team',
    shortName: 'BLU',
    teamTypeId: 'tt1',
  },
  {
    id: 't2',
    evaluationId: 'e1',
    name: 'Red Team',
    shortName: 'RED',
    teamTypeId: 'tt1',
  },
];

async function renderTeams(canEdit: boolean) {
  const teamApi = {
    getEvaluationTeams: vi.fn(() => of(structuredClone(TEAMS))),
    updateTeam: vi.fn((id: string, team?: Team) => of({ ...team, id })),
    deleteTeam: vi.fn(() => of(null)),
  } satisfies ApiStub<TeamService>;
  const confirm = vi.fn(() => dialogRefStub<unknown, boolean>(true).dialogRef);
  const dialogService: Pick<CrucibleDialogService, 'confirm'> = { confirm };
  const editDialog = matDialogStub();

  const rendered = await renderComponent(AdminTeamsComponent, {
    declarations: [AdminTeamsComponent],
    imports: [
      MatButtonModule,
      MatCardModule,
      MatExpansionModule,
      MatFormFieldModule,
      MatIconModule,
      MatInputModule,
      MatProgressSpinnerModule,
      MatSortModule,
      TeamMembershipsStubComponent,
    ],
    componentInputs: { evaluationId: 'e1', canEdit },
    providers: [
      { provide: TeamService, useValue: teamApi },
      { provide: CrucibleDialogService, useValue: dialogService },
      { provide: MatDialog, useValue: editDialog.dialog },
    ],
    configureTestBed: (testBed) => {
      testBed.inject(TeamTypeStore).set([{ id: 'tt1', name: 'Agency' }]);
    },
  });
  await rendered.fixture.whenStable();
  return {
    ...rendered,
    teamApi,
    confirm,
    editDialog,
    user: userEvent.setup(),
  };
}

describe('AdminTeamsComponent', () => {
  /**
   * Verifies: the evaluation's teams are listed with their team type name.
   * Interacts with: real TeamDataService/TeamQuery and TeamTypeQuery over a stubbed TeamService.
   * Data: teams BLU and RED of type Agency.
   */
  it('lists the teams of the evaluation', async () => {
    const { teamApi } = await renderTeams(true);

    expect(teamApi.getEvaluationTeams).toHaveBeenCalledWith('e1');
    const headers = Array.from(
      document.querySelectorAll('mat-expansion-panel-header'),
    ).map((h) => h.textContent?.replace(/\s+/g, ' ').trim());
    expect(headers).toEqual(['BLU Blue Team Agency', 'RED Red Team Agency']);
  });

  /**
   * Verifies: with canEdit Add, Edit and Delete are enabled.
   * Interacts with: the rendered buttons.
   * Data: canEdit true.
   */
  it('enables adding, editing and deleting with canEdit', async () => {
    await renderTeams(true);

    expect(screen.getByRole('button', { name: 'Add Team' })).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Edit Blue Team' }),
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Delete Blue Team' }),
    ).toBeEnabled();
  });

  /**
   * Verifies: without canEdit Add, Edit and Delete are disabled.
   * Interacts with: the rendered buttons.
   * Data: canEdit false.
   */
  it('disables adding, editing and deleting without canEdit', async () => {
    await renderTeams(false);

    expect(screen.getByRole('button', { name: 'Add Team' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Edit Blue Team' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Delete Red Team' }),
    ).toBeDisabled();
  });

  /**
   * Verifies: a confirmed Delete removes the team through the API.
   * Interacts with: CrucibleDialogService.confirm stub (answers true), TeamService.deleteTeam stub.
   * Data: canEdit true; Red Team deleted.
   */
  it('deletes a team after confirmation', async () => {
    const { teamApi, confirm, user } = await renderTeams(true);
    await user.click(screen.getByRole('button', { name: 'Delete Red Team' }));

    expect(confirm).toHaveBeenCalledOnce();
    expect(teamApi.deleteTeam).toHaveBeenCalledWith('t2');
  });

  /**
   * Verifies: saving the edit dialog sends the edited team to the API.
   * Interacts with: matDialogStub (dialog data, editComplete), TeamService.updateTeam stub.
   * Data: canEdit true; Blue Team renamed.
   */
  it('updates a team saved in the edit dialog', async () => {
    const { teamApi, editDialog, user } = await renderTeams(true);
    await user.click(screen.getByRole('button', { name: 'Edit Blue Team' }));
    expect(editDialog.config()?.data.team).toEqual(
      expect.objectContaining({ id: 't1' }),
    );

    editDialog.complete({
      saveChanges: true,
      team: { ...TEAMS[0], name: 'Blue Cell' },
    });

    expect(teamApi.updateTeam).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ name: 'Blue Cell' }),
    );
  });

  /**
   * Verifies: expanding a team shows its memberships editor for that team.
   * Interacts with: the expansion panel header click, the memberships child stub's teamId input.
   * Data: canEdit true; Red Team expanded.
   */
  it('opens the memberships of an expanded team', async () => {
    const { fixture, user } = await renderTeams(true);
    await user.click(screen.getByText('Red Team'));

    const memberships = fixture.debugElement.query(
      By.directive(TeamMembershipsStubComponent),
    ).componentInstance as TeamMembershipsStubComponent;
    expect(memberships.teamId).toBe('t2');
  });
});
