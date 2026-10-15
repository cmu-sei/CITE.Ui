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
import { ClipboardModule } from 'ngx-clipboard';
import { renderComponent } from '../../../../test-utils/render-component';
import { AdminTeamMembershipListComponent } from './admin-team-membership-list.component';

async function renderNonMemberList(canEdit: boolean) {
  const createMembership = vi.fn();
  const rendered = await renderComponent(AdminTeamMembershipListComponent, {
    declarations: [AdminTeamMembershipListComponent],
    imports: [
      ClipboardModule,
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
      users: [
        { id: 'u2', name: 'Bob' },
        { id: 'u3', name: 'Carol' },
      ],
      canEdit,
    },
    on: { createMembership },
  });
  return { ...rendered, createMembership, user: userEvent.setup() };
}

const row = (name: string) =>
  within(screen.getByRole('table'))
    .getByText(name, { exact: false })
    .closest('tr') as HTMLElement;

describe('AdminTeamMembershipListComponent', () => {
  /**
   * Verifies: users who are not on the team are listed as users.
   * Interacts with: the non-members table.
   * Data: Bob and Carol.
   */
  it('lists users that can be added', async () => {
    await renderNonMemberList(true);

    expect(row('Bob')).toHaveTextContent('User');
    expect(row('Carol')).toHaveTextContent('User');
  });

  /**
   * Verifies: with canEdit Add emits a membership for the user.
   * Interacts with: the actions column, the createMembership output.
   * Data: canEdit true; Carol added.
   */
  it('adds a user with canEdit', async () => {
    const { createMembership, user } = await renderNonMemberList(true);
    await user.click(
      within(row('Carol')).getByRole('button', { description: 'Add Carol' }),
    );

    expect(createMembership).toHaveBeenCalledWith({ userId: 'u3' });
  });

  /**
   * Verifies: without canEdit no Add button is rendered.
   * Interacts with: the actions column.
   * Data: canEdit false.
   */
  it('hides Add without canEdit', async () => {
    await renderNonMemberList(false);

    expect(
      within(screen.getByRole('table')).queryAllByRole('button', {
        description: /^Add /,
      }),
    ).toEqual([]);
  });
});
