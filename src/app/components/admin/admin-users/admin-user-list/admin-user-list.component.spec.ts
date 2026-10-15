// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ClipboardModule } from 'ngx-clipboard';
import { of } from 'rxjs';
import { CrucibleDialogService } from '@cmusei/crucible-common';
import {
  SystemRolesService,
  User,
  UserService,
} from '../../../../generated/cite.api';
import { ApiStub } from '../../../../test-utils/api-stub';
import { dialogRefStub } from '../../../../test-utils/dialog-refs';
import { renderComponent } from '../../../../test-utils/render-component';
import { AdminUserListComponent } from './admin-user-list.component';

const USERS: User[] = [
  { id: 'u1', name: 'Alice', roleId: 'r-admin' },
  { id: 'u2', name: 'Bob' },
];

async function renderUserList(canEdit: boolean) {
  const rolesApi = {
    getAllSystemRoles: vi.fn(() =>
      of([
        { id: 'r-admin', name: 'Administrator' },
        { id: 'r-observer', name: 'Observer' },
      ]),
    ),
  } satisfies ApiStub<SystemRolesService>;
  const userApi = {
    updateUser: vi.fn((id: string, user?: User) => of({ ...user, id })),
  } satisfies ApiStub<UserService>;
  const confirm = vi.fn(() => dialogRefStub<unknown, boolean>(true).dialogRef);
  const dialogService: Pick<CrucibleDialogService, 'confirm'> = { confirm };
  const create = vi.fn();
  const deleteUser = vi.fn();

  const rendered = await renderComponent(AdminUserListComponent, {
    declarations: [AdminUserListComponent],
    imports: [
      ClipboardModule,
      MatButtonModule,
      MatCardModule,
      MatFormFieldModule,
      MatIconModule,
      MatInputModule,
      MatPaginatorModule,
      MatProgressSpinnerModule,
      MatSelectModule,
      MatSortModule,
      MatTableModule,
      MatTooltipModule,
    ],
    componentInputs: { users: USERS, isLoading: false, canEdit },
    on: { create, delete: deleteUser },
    providers: [
      { provide: SystemRolesService, useValue: rolesApi },
      { provide: UserService, useValue: userApi },
      { provide: CrucibleDialogService, useValue: dialogService },
    ],
  });
  // mat-select shows its value once its options exist, one pass later.
  rendered.fixture.detectChanges();
  // Role queries are slow over this table in jsdom (the global stylesheets
  // make computed-style lookups slow): rows are found by their text, and the
  // icon buttons, named only by their title, by that title.
  const row = (name: string) =>
    screen.getByText(name, { selector: 'td' }).closest('tr') as HTMLElement;
  return {
    ...rendered,
    userApi,
    confirm,
    create,
    deleteUser,
    row,
    user: userEvent.setup(),
  };
}

describe('AdminUserListComponent', () => {
  /**
   * Verifies: users are listed with their system role, and a user without one shows None Locally.
   * Interacts with: the users table, real RoleDataService over a stubbed SystemRolesService.
   * Data: Alice (Administrator) and Bob (no role).
   */
  it('lists users with their role', async () => {
    const { row } = await renderUserList(true);

    expect(row('Alice')).toHaveTextContent('Administrator');
    expect(row('Bob')).toHaveTextContent('None Locally');
  });

  /**
   * Verifies: with canEdit a confirmed Delete emits the user id.
   * Interacts with: the Delete User button, CrucibleDialogService.confirm stub, the delete output.
   * Data: canEdit true; Bob deleted.
   */
  it('deletes a user after confirmation with canEdit', async () => {
    const { confirm, deleteUser, row, user } = await renderUserList(true);
    await user.click(within(row('Bob')).getByTitle('Delete User'));

    expect(confirm).toHaveBeenCalledOnce();
    expect(deleteUser).toHaveBeenCalledWith('u2');
  });

  /**
   * Verifies: with canEdit picking a role updates the user through the API.
   * Interacts with: the role select (MatSelectHarness), real UserDataService.update over a stubbed UserService.
   * Data: canEdit true; Bob (the second row) made Observer.
   */
  it('changes a user role with canEdit', async () => {
    const { fixture, userApi } = await renderUserList(true);
    const [, bobRole] = await TestbedHarnessEnvironment.loader(
      fixture,
    ).getAllHarnesses(MatSelectHarness.with({ ancestor: 'table' }));
    await bobRole.clickOptions({ text: 'Observer' });

    expect(userApi.updateUser).toHaveBeenCalledWith('u2', {
      id: 'u2',
      name: 'Bob',
      roleId: 'r-observer',
    });
  });

  /**
   * Verifies: without canEdit the Delete buttons are absent and the role selects are disabled.
   * Interacts with: the role column.
   * Data: canEdit false.
   */
  it('hides Delete and locks roles without canEdit', async () => {
    const { row } = await renderUserList(false);

    expect(screen.queryAllByTitle('Delete User')).toEqual([]);
    expect(within(row('Alice')).getByRole('combobox')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  /**
   * Verifies: Add User stays enabled without canEdit and opens the new-user row (current behavior).
   * Interacts with: the Add User header button, the create output.
   * Data: canEdit false; a new user typed and added.
   */
  it('offers Add User without canEdit', async () => {
    const { create, user } = await renderUserList(false);
    const add = screen.getByTitle('Add User');

    // Current behavior; see agent-docs/ui-test-bugs/cite.ui.md.
    expect(add).toBeEnabled();
    await user.click(add);
    await user.type(screen.getByPlaceholderText('User ID'), 'u3');
    const name = screen.getByPlaceholderText('User Name');
    await user.type(name, 'Carol');
    // The row's buttons carry their tooltip on the icon, so they have no
    // accessible name; the first one is "Add this user".
    const [addThisUser] = within(
      name.closest('.new-user-row') as HTMLElement,
    ).getAllByRole('button');
    await user.click(addThisUser);
    expect(create).toHaveBeenCalledWith({ id: 'u3', name: 'Carol' });
  });
});
