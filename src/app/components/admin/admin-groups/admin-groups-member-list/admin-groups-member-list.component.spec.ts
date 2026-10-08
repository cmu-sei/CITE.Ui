// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { renderComponent } from '../../../../test-utils/render-component';
import { AdminGroupsMemberListComponent } from './admin-groups-member-list.component';

async function renderMemberList(canEdit: boolean) {
  const deleteMembership = vi.fn();
  const rendered = await renderComponent(AdminGroupsMemberListComponent, {
    declarations: [AdminGroupsMemberListComponent],
    imports: [
      MatButtonModule,
      MatFormFieldModule,
      MatIconModule,
      MatInputModule,
      MatPaginatorModule,
      MatSortModule,
      MatTableModule,
      MatToolbarModule,
      MatTooltipModule,
    ],
    componentInputs: {
      memberships: [
        { id: 'gm1', groupId: 'g1', userId: 'u1' },
        { id: 'gm2', groupId: 'g1', userId: 'u2' },
      ],
      users: [
        { id: 'u1', name: 'Alice' },
        { id: 'u2', name: 'Bob' },
      ],
      canEdit,
    },
    on: { deleteMembership },
  });
  return { ...rendered, deleteMembership, user: userEvent.setup() };
}

const row = (name: string) =>
  within(screen.getByRole('table'))
    .getByRole('cell', { name })
    .closest('tr') as HTMLElement;

describe('AdminGroupsMemberListComponent', () => {
  /**
   * Verifies: with canEdit each member has a Remove button that emits the membership id.
   * Interacts with: the actions column, the deleteMembership output.
   * Data: canEdit true; Bob removed.
   */
  it('removes a member with canEdit', async () => {
    const { deleteMembership, user } = await renderMemberList(true);
    expect(row('Alice')).toBeInTheDocument();
    const remove = within(row('Bob')).getByRole('button', {
      description: 'Remove Bob',
    });
    expect(remove).toBeEnabled();

    await user.click(remove);
    expect(deleteMembership).toHaveBeenCalledWith('gm2');
  });

  /**
   * Verifies: without canEdit no Remove button is rendered.
   * Interacts with: the actions column.
   * Data: canEdit false.
   */
  it('hides Remove without canEdit', async () => {
    await renderMemberList(false);

    expect(row('Alice')).toBeInTheDocument();
    expect(
      within(screen.getByRole('table')).queryAllByRole('button', {
        description: /^Remove /,
      }),
    ).toEqual([]);
  });
});
