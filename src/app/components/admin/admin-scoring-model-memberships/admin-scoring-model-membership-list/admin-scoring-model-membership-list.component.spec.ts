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
import { AdminScoringModelMembershipListComponent } from './admin-scoring-model-membership-list.component';

async function renderNonMemberList(canEdit: boolean) {
  const createMembership = vi.fn();
  const rendered = await renderComponent(
    AdminScoringModelMembershipListComponent,
    {
      declarations: [AdminScoringModelMembershipListComponent],
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
        users: [{ id: 'u2', name: 'Bob' }],
        groups: [{ id: 'g2', name: 'Responders' }],
        canEdit,
      },
      on: { createMembership },
    },
  );
  return { ...rendered, createMembership, user: userEvent.setup() };
}

const row = (name: string) =>
  within(screen.getByRole('table'))
    .getByText(name, { exact: false })
    .closest('tr') as HTMLElement;

describe('AdminScoringModelMembershipListComponent', () => {
  /**
   * Verifies: users and groups that are not members are listed with their type.
   * Interacts with: the non-members table.
   * Data: user Bob and group Responders.
   */
  it('lists users and groups that can be added', async () => {
    await renderNonMemberList(true);

    expect(row('Bob')).toHaveTextContent('User');
    expect(row('Responders')).toHaveTextContent('Group');
  });

  /**
   * Verifies: with canEdit Add emits a user membership for a user and a group membership for a group.
   * Interacts with: the actions column, the createMembership output.
   * Data: canEdit true; Bob, then Responders added.
   */
  it('adds users and groups with canEdit', async () => {
    const { createMembership, user } = await renderNonMemberList(true);
    await user.click(
      within(row('Bob')).getByRole('button', { description: 'Add Bob' }),
    );
    await user.click(
      within(row('Responders')).getByRole('button', {
        description: 'Add Responders',
      }),
    );

    expect(createMembership.mock.calls).toEqual([
      [{ userId: 'u2' }],
      [{ groupId: 'g2' }],
    ]);
  });

  /**
   * Verifies: without canEdit no Add button is rendered.
   * Interacts with: the actions column.
   * Data: canEdit false.
   */
  it('hides Add without canEdit', async () => {
    await renderNonMemberList(false);

    expect(
      within(row('Bob')).queryByRole('button', { description: 'Add Bob' }),
    ).not.toBeInTheDocument();
  });
});
