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
import { AdminGroupsMembershipListComponent } from './admin-groups-membership-list.component';

async function renderNonMemberList(canEdit: boolean) {
  const createMembership = vi.fn();
  const rendered = await renderComponent(AdminGroupsMembershipListComponent, {
    declarations: [AdminGroupsMembershipListComponent],
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
        { id: 'u3', name: 'Carol' },
        { id: 'u4', name: 'Dave' },
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

describe('AdminGroupsMembershipListComponent', () => {
  /**
   * Verifies: with canEdit Add emits the user id.
   * Interacts with: the actions column, the createMembership output.
   * Data: canEdit true; Dave added.
   */
  it('adds a user with canEdit', async () => {
    const { createMembership, user } = await renderNonMemberList(true);
    expect(row('Carol')).toBeInTheDocument();
    await user.click(
      within(row('Dave')).getByRole('button', { description: 'Add Dave' }),
    );

    expect(createMembership).toHaveBeenCalledWith('u4');
  });

  /**
   * Verifies: without canEdit no Add button is rendered.
   * Interacts with: the actions column.
   * Data: canEdit false.
   */
  it('hides Add without canEdit', async () => {
    await renderNonMemberList(false);

    expect(row('Carol')).toBeInTheDocument();
    expect(
      within(screen.getByRole('table')).queryAllByRole('button', {
        description: /^Add /,
      }),
    ).toEqual([]);
  });
});
