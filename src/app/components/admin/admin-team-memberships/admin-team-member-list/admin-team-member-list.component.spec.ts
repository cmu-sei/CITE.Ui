// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { renderComponent } from '../../../../test-utils/render-component';
import { AdminTeamMemberListComponent } from './admin-team-member-list.component';

async function renderMemberList(canEdit: boolean) {
  const deleteMembership = vi.fn();
  const editMembership = vi.fn();
  const rendered = await renderComponent(AdminTeamMemberListComponent, {
    declarations: [AdminTeamMemberListComponent],
    imports: [
      MatButtonModule,
      MatFormFieldModule,
      MatIconModule,
      MatInputModule,
      MatPaginatorModule,
      MatSelectModule,
      MatSortModule,
      MatTableModule,
      MatToolbarModule,
      MatTooltipModule,
    ],
    componentInputs: {
      memberships: [
        { id: 'tm1', teamId: 't1', userId: 'u1', roleId: 'r-member' },
        { id: 'tm2', teamId: 't1', userId: 'u2', roleId: 'r-lead' },
      ],
      users: [
        { id: 'u1', name: 'Alice' },
        { id: 'u2', name: 'Bob' },
      ],
      roles: [
        { id: 'r-member', name: 'Member' },
        { id: 'r-lead', name: 'Lead' },
      ],
      canEdit,
    },
    on: { deleteMembership, editMembership },
  });
  // mat-select shows its value once its options exist, one pass later.
  rendered.fixture.detectChanges();
  return {
    ...rendered,
    deleteMembership,
    editMembership,
    user: userEvent.setup(),
  };
}

const row = (name: string) =>
  within(screen.getByRole('table'))
    .getByRole('cell', { name })
    .closest('tr') as HTMLElement;

describe('AdminTeamMemberListComponent', () => {
  /**
   * Verifies: team members are listed with their type and role.
   * Interacts with: the members table.
   * Data: Alice (Member) and Bob (Lead).
   */
  it('lists team members with their role', async () => {
    await renderMemberList(true);

    expect(row('Alice')).toHaveTextContent('User');
    expect(row('Alice')).toHaveTextContent('Member');
    expect(row('Bob')).toHaveTextContent('Lead');
  });

  /**
   * Verifies: with canEdit each member has a Remove button that emits the membership id.
   * Interacts with: the actions column, the deleteMembership output.
   * Data: canEdit true; Bob removed.
   */
  it('removes a member with canEdit', async () => {
    const { deleteMembership, user } = await renderMemberList(true);
    const remove = within(row('Bob')).getByRole('button', {
      description: 'Remove Bob',
    });
    expect(remove).toBeEnabled();

    await user.click(remove);
    expect(deleteMembership).toHaveBeenCalledWith('tm2');
  });

  /**
   * Verifies: with canEdit picking a role emits the membership with the new role.
   * Interacts with: the role select (MatSelectHarness; its options render in an overlay), the editMembership output.
   * Data: canEdit true; Alice (the first row by name) made Lead.
   */
  it('changes a member role with canEdit', async () => {
    const { editMembership, fixture } = await renderMemberList(true);
    const [aliceRole] = await TestbedHarnessEnvironment.loader(
      fixture,
    ).getAllHarnesses(MatSelectHarness.with({ ancestor: 'table' }));
    await aliceRole.clickOptions({ text: 'Lead' });

    expect(editMembership).toHaveBeenCalledWith({
      id: 'tm1',
      roleId: 'r-lead',
    });
  });

  /**
   * Verifies: without canEdit the Remove buttons are absent and the role selects are disabled.
   * Interacts with: the actions column and the role select.
   * Data: canEdit false.
   */
  it('hides Remove and locks roles without canEdit', async () => {
    await renderMemberList(false);

    expect(
      within(screen.getByRole('table')).queryAllByRole('button', {
        description: /^Remove /,
      }),
    ).toEqual([]);
    expect(within(row('Alice')).getByRole('combobox')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });
});
