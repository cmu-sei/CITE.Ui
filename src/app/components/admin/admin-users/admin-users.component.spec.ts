// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import {
  SystemPermission,
  User,
  UserService,
} from '../../../generated/cite.api';
import { UserStore } from '../../../data/user/user.store';
import { ApiStub } from '../../../test-utils/api-stub';
import { permissionDataProviders } from '../../../test-utils/mock-permission-data.service';
import { renderComponent } from '../../../test-utils/render-component';
import { AdminUsersComponent } from './admin-users.component';

@Component({ selector: 'app-admin-user-list', template: '' })
class UserListStubComponent {
  @Input() users!: User[];
  @Input() isLoading!: boolean;
  @Input() canEdit!: boolean;
  @Output() create = new EventEmitter<User>();
  @Output() delete = new EventEmitter<string>();
}

async function renderUsers(system: SystemPermission[]) {
  const userApi = {
    createUser: vi.fn((user?: User) => of({ ...user })),
    deleteUser: vi.fn(() => of(null)),
  } satisfies ApiStub<UserService>;
  const rendered = await renderComponent(AdminUsersComponent, {
    declarations: [AdminUsersComponent],
    imports: [UserListStubComponent],
    providers: [
      ...permissionDataProviders({ system }),
      { provide: UserService, useValue: userApi },
    ],
    configureTestBed: (testBed) => {
      // The admin container loads the users; seed what it would store.
      testBed.inject(UserStore).set([{ id: 'u1', name: 'Alice' }]);
    },
  });
  const list = () =>
    rendered.fixture.debugElement.query(By.directive(UserListStubComponent))
      .componentInstance as UserListStubComponent;
  return { ...rendered, userApi, list };
}

describe('AdminUsersComponent', () => {
  /**
   * Verifies: the stored users reach the list, and ManageUsers gives it canEdit true.
   * Interacts with: real UserQuery and PermissionDataService.hasPermission, the list stub's inputs.
   * Data: system [ManageUsers]; Alice in the store.
   */
  it('lets the list edit with ManageUsers', async () => {
    const { list } = await renderUsers([SystemPermission.ManageUsers]);

    expect(list().users.map((u) => u.name)).toEqual(['Alice']);
    expect(list().canEdit).toBe(true);
  });

  /**
   * Verifies: ViewUsers (a near miss) gives the list canEdit false.
   * Interacts with: real PermissionDataService.hasPermission, the list stub's canEdit input.
   * Data: system [ViewUsers].
   */
  it('keeps the list read-only with ViewUsers only', async () => {
    const { list } = await renderUsers([SystemPermission.ViewUsers]);

    expect(list().canEdit).toBe(false);
  });

  /**
   * Verifies: create and delete from the list go to the API and update the store.
   * Interacts with: the list stub's create and delete outputs, UserService stubs, real UserQuery.
   * Data: system [ManageUsers]; Bob created, Alice deleted.
   */
  it('creates and deletes users from the list', async () => {
    const { fixture, list, userApi } = await renderUsers([
      SystemPermission.ManageUsers,
    ]);
    list().create.emit({ id: 'u2', name: 'Bob' });
    list().delete.emit('u1');
    fixture.detectChanges();

    expect(userApi.createUser).toHaveBeenCalledWith({ id: 'u2', name: 'Bob' });
    expect(userApi.deleteUser).toHaveBeenCalledWith('u1');
    expect(list().users.map((u) => u.name)).toEqual(['Bob']);
  });
});
