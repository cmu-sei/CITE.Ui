// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSelectHarness } from '@angular/material/select/testing';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { renderComponent } from '../../../../test-utils/render-component';
import { AdminEvaluationMemberListComponent } from './admin-evaluation-member-list.component';

async function renderMemberList(canEdit: boolean) {
  const deleteMembership = vi.fn();
  const editMembership = vi.fn();
  const rendered = await renderComponent(AdminEvaluationMemberListComponent, {
    declarations: [AdminEvaluationMemberListComponent],
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
        { id: 'em1', evaluationId: 'e1', userId: 'u1', roleId: 'r-member' },
        { id: 'em2', evaluationId: 'e1', groupId: 'g1', roleId: 'r-observer' },
      ],
      users: [{ id: 'u1', name: 'Alice' }],
      groups: [{ id: 'g1', name: 'Analysts' }],
      roles: [
        { id: 'r-member', name: 'Member' },
        { id: 'r-observer', name: 'Observer' },
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

describe('AdminEvaluationMemberListComponent', () => {
  /**
   * Verifies: user and group memberships are listed with their type and role.
   * Interacts with: the members table.
   * Data: Alice (User, Member) and Analysts (Group, Observer).
   */
  it('lists user and group members with their role', async () => {
    await renderMemberList(true);

    expect(row('Alice')).toHaveTextContent('User');
    expect(row('Alice')).toHaveTextContent('Member');
    expect(row('Analysts')).toHaveTextContent('Group');
    expect(row('Analysts')).toHaveTextContent('Observer');
  });

  /**
   * Verifies: with canEdit each member has a Remove button that emits the membership id.
   * Interacts with: the actions column, the deleteMembership output.
   * Data: canEdit true; Alice removed.
   */
  it('removes a member with canEdit', async () => {
    const { deleteMembership, user } = await renderMemberList(true);
    const remove = within(row('Alice')).getByRole('button', {
      description: 'Remove Alice',
    });
    expect(remove).toBeEnabled();

    await user.click(remove);
    expect(deleteMembership).toHaveBeenCalledWith('em1');
  });

  /**
   * Verifies: with canEdit picking a role emits the membership with the new role.
   * Interacts with: the role select (MatSelectHarness; its options render in an overlay), the editMembership output.
   * Data: canEdit true; Alice (the first row by name) changed to Observer.
   */
  it('changes a member role with canEdit', async () => {
    const { editMembership, fixture } = await renderMemberList(true);
    const [aliceRole] = await TestbedHarnessEnvironment.loader(
      fixture,
    ).getAllHarnesses(MatSelectHarness.with({ ancestor: 'table' }));
    await aliceRole.clickOptions({ text: 'Observer' });

    expect(editMembership).toHaveBeenCalledWith({
      id: 'em1',
      roleId: 'r-observer',
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
