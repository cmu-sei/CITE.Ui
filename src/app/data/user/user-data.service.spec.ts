// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, Observable, of, Subject, throwError } from 'rxjs';
import { ComnAuthService, Theme } from '@cmusei/crucible-common';
import { User, UserService } from '../../generated/cite.api';
import { UserDataService } from './user-data.service';
import { CurrentUserQuery, UserQuery } from './user.query';
import { initialUserUiState, UserStore } from './user.store';
import { ApiStub } from '../../test-utils/api-stub';
import { getDefaultProviders } from '../../test-utils/default-test-providers';
import {
  captureUnhandledRxErrors,
  flush,
} from '../../test-utils/unhandled-rx-errors';

type UserApi = ApiStub<UserService>;
// The OIDC user as setCurrentUser() reads it.
interface AuthUser {
  profile: { name: string; sub: string };
}

function setup(overrides: { api?: UserApi } = {}) {
  const api = {
    getUsers: vi.fn(() =>
      of([
        { id: 'u1', name: 'Alice' },
        { id: 'u2', name: 'Bob' },
      ]),
    ),
    getEvaluationUsers: vi.fn(() => of([{ id: 'u3', name: 'Carol' }])),
    getUser: vi.fn((id: string) => of({ id, name: `User ${id}` })),
    createUser: vi.fn((u?: User) => of({ ...u })),
    updateUser: vi.fn((_id: string, u?: User) => of({ ...u })),
    deleteUser: vi.fn(() => of(null)),
    ...overrides.api,
  } satisfies UserApi;
  const authUser$ = new Subject<AuthUser | null>();
  const auth: Pick<ComnAuthService, 'user$'> = {
    user$: authUser$ as unknown as ComnAuthService['user$'],
  };
  TestBed.configureTestingModule({
    providers: getDefaultProviders([
      { provide: UserService, useValue: api },
      { provide: ComnAuthService, useValue: auth },
      UserDataService,
    ]),
  });
  return {
    service: TestBed.inject(UserDataService),
    query: TestBed.inject(UserQuery),
    currentUserQuery: TestBed.inject(CurrentUserQuery),
    store: TestBed.inject(UserStore),
    api,
    authUser$,
  };
}

describe('UserDataService', () => {
  /**
   * Verifies: load() fills the store only once subscribed, and clears loading.
   * Interacts with: UserService.getUsers stub, real UserStore/UserQuery.
   * Data: two users from the API.
   */
  it('load() fills the store when subscribed', async () => {
    const { service, query, api } = setup();
    const users$ = service.load();
    expect(query.getAll()).toEqual([]);
    await firstValueFrom(users$);
    expect(api.getUsers).toHaveBeenCalled();
    expect(query.getAll().map((u) => u.name)).toEqual(['Alice', 'Bob']);
    expect(await firstValueFrom(query.isLoading$)).toBe(false);
  });

  /**
   * Verifies: loadByEvaluation() replaces the store with that evaluation's users and gives them initial UI state.
   * Interacts with: UserService.getEvaluationUsers stub, UserQuery.ui.
   * Data: evaluation e1 with user Carol.
   */
  it('loadByEvaluation() loads the evaluation users', async () => {
    const { service, query, api } = setup();
    await firstValueFrom(service.loadByEvaluation('e1'));
    expect(api.getEvaluationUsers).toHaveBeenCalledWith('e1');
    expect(query.getAll().map((u) => u.id)).toEqual(['u3']);
    expect(query.ui.getEntity('u3')).toEqual({
      id: 'u3',
      ...initialUserUiState,
    });
  });

  /**
   * Verifies: loadById() upserts a user next to those already loaded.
   * Interacts with: UserService.getUser stub, UserQuery.
   * Data: two users loaded; u7 loaded by id.
   */
  it('loadById() upserts the user', async () => {
    const { service, query } = setup();
    await firstValueFrom(service.load());
    await firstValueFrom(service.loadById('u7'));
    expect(query.getAll().map((u) => u.id)).toEqual(['u1', 'u2', 'u7']);
  });

  /**
   * Verifies: create() adds the new user with initial UI state.
   * Interacts with: UserService.createUser stub, UserQuery and UserQuery.ui.
   * Data: empty store; user u5 created.
   */
  it('create() adds the user with initial UI state', async () => {
    const { service, query } = setup();
    await firstValueFrom(service.create({ id: 'u5', name: 'Eve' }));
    expect(query.getEntity('u5')?.name).toBe('Eve');
    expect(query.ui.getEntity('u5')).toEqual({
      id: 'u5',
      ...initialUserUiState,
    });
  });

  /**
   * Verifies: delete() removes the user and its UI state.
   * Interacts with: UserService.deleteUser stub, UserQuery and UserQuery.ui.
   * Data: users u1 and u2 loaded; u1 deleted.
   */
  it('delete() removes the user and its UI state', async () => {
    const { service, query, api } = setup();
    await firstValueFrom(service.load());
    await firstValueFrom(service.delete('u1'));
    expect(api.deleteUser).toHaveBeenCalledWith('u1');
    expect(query.getAll().map((u) => u.id)).toEqual(['u2']);
    expect(query.ui.getAll().map((u) => u.id)).toEqual(['u2']);
  });

  /**
   * Verifies: updateStore() (UserCreated/UserUpdated) adds an unknown user and merges a pushed change into a known one.
   * Interacts with: UserDataService.updateStore, UserQuery.
   * Data: Alice loaded; a pushed rename of Alice and a pushed new user Dan.
   */
  it('updateStore() adds an unknown user and merges a known one', async () => {
    const { service, query } = setup();
    await firstValueFrom(service.load());
    service.updateStore({ id: 'u1', name: 'Alice Renamed' });
    service.updateStore({ id: 'u4', name: 'Dan' });
    expect(query.getEntity('u4')?.name).toBe('Dan');
    expect(query.getEntity('u1')?.name).toBe('Alice Renamed');
    expect(query.ui.getEntity('u4')).toEqual({
      id: 'u4',
      ...initialUserUiState,
    });
  });

  /**
   * Verifies: update() sends the user to the API and the stored user takes the API's answer, including a new role.
   * Interacts with: UserService.updateUser stub, UserQuery.
   * Data: Alice loaded with no role; update gives her role r1.
   */
  it('update() merges the saved user into the stored one', async () => {
    const { service, query, api } = setup();
    await firstValueFrom(service.load());
    service.update({ id: 'u1', name: 'Alice', roleId: 'r1' });
    expect(api.updateUser).toHaveBeenCalledWith('u1', {
      id: 'u1',
      name: 'Alice',
      roleId: 'r1',
    });
    expect(query.getEntity('u1')?.roleId).toBe('r1');
  });

  /**
   * Verifies: a user saved without a role has no role in the store: the API answers a removed role as an explicit null.
   * Interacts with: UserService.updateUser stub, UserQuery.
   * Data: Alice stored with role r1; the answer has roleId null.
   */
  it('update() removes the stored role when the answer has roleId null', () => {
    const { service, query, store } = setup();
    store.add({ id: 'u1', name: 'Alice', roleId: 'r1' });
    service.update({ id: 'u1', name: 'Alice', roleId: null });
    expect(query.getEntity('u1')?.roleId).toBeNull();
  });

  /**
   * Verifies: saving a user keeps that user's UI state.
   * Interacts with: UserService.updateUser stub, UserQuery.ui.
   * Data: Alice loaded and marked selected, then given role r2.
   */
  it('update() keeps the stored user UI state', async () => {
    const { service, query, store } = setup();
    await firstValueFrom(service.load());
    store.ui.update('u1', { isSelected: true });
    service.update({ id: 'u1', name: 'Alice', roleId: 'r2' });
    expect(query.getEntity('u1')?.roleId).toBe('r2');
    expect(query.ui.getEntity('u1')?.isSelected).toBe(true);
  });

  describe('failed requests', () => {
    const failure = new HttpErrorResponse({ status: 500 });
    const failing = () => vi.fn(() => throwError(() => failure));
    const loadCases: {
      method: string;
      api: () => UserApi;
      run: (service: UserDataService) => Observable<unknown>;
    }[] = [
      {
        method: 'load',
        api: () => ({ getUsers: failing() }),
        run: (s) => s.load(),
      },
      {
        method: 'loadById',
        api: () => ({ getUser: failing() }),
        run: (s) => s.loadById('u1'),
      },
    ];

    /**
     * Verifies: when load or loadById fails, the caller gets the error but loading stays true.
     * Interacts with: the failing UserService endpoint for each method, UserQuery.isLoading$.
     * Data: empty store; each endpoint answers 500; the test subscribes with an error callback, as a caller would.
     */
    it.each(loadCases)(
      '$method leaves loading set when the request fails',
      async ({ api, run }) => {
        const { service, query } = setup({ api: api() });
        await expect(firstValueFrom(run(service))).rejects.toBe(failure);
        expect(await firstValueFrom(query.isLoading$)).toBe(true);
        expect(query.getAll()).toEqual([]);
      },
    );

    /**
     * Verifies: when loadByEvaluation fails, the caller gets the error and the store stops loading, so a failed reload cannot leave the page waiting.
     * Interacts with: the failing UserService.getEvaluationUsers, UserQuery.isLoading$.
     * Data: empty store; the endpoint answers 500.
     */
    it("'loadByEvaluation' clears loading when the request fails", async () => {
      const { service, query } = setup({
        api: { getEvaluationUsers: failing() },
      });
      await expect(firstValueFrom(service.loadByEvaluation('e1'))).rejects.toBe(
        failure,
      );
      expect(await firstValueFrom(query.isLoading$)).toBe(false);
      expect(query.getAll()).toEqual([]);
    });

    /**
     * Verifies: when evaluations' users load at once, the store ends with the evaluation requested last, whichever response comes last.
     * Interacts with: UserService.getEvaluationUsers stub with controlled responses, UserQuery.
     * Data: evaluation e1 requested first, e2 second; e2 answers first, e1 last.
     */
    it('loadByEvaluation keeps the users of the evaluation requested last', async () => {
      const first = new Subject<User[]>();
      const second = new Subject<User[]>();
      const getEvaluationUsers = vi
        .fn()
        .mockReturnValueOnce(first)
        .mockReturnValueOnce(second);
      const { service, query } = setup({ api: { getEvaluationUsers } });
      service.loadByEvaluation('e1').subscribe();
      service.loadByEvaluation('e2').subscribe();

      second.next([{ id: 'u2', name: 'Bob' }]);
      second.complete();
      first.next([{ id: 'u1', name: 'Alice' }]);
      first.complete();

      expect(query.getAll().map((u) => u.id)).toEqual(['u2']);
      expect(await firstValueFrom(query.isLoading$)).toBe(false);
    });

    /**
     * Verifies: when update() fails, the stored user is unchanged and the error escapes to the app's ErrorHandler.
     * Interacts with: UserService.updateUser (throws), UserQuery, captureUnhandledRxErrors.
     * Data: Alice loaded; a 500 response to the rename.
     */
    it('update() lets a failed request escape', async () => {
      const errors = captureUnhandledRxErrors();
      const { service, query } = setup({ api: { updateUser: failing() } });
      await firstValueFrom(service.load());
      service.update({ id: 'u1', name: 'Alice Renamed' });
      await flush();
      // update() subscribes without an error callback but sets no loading
      // flag; the escaped error reaches ErrorService, the app's ErrorHandler
      // (app.config.ts), which shows it.
      expect(query.getEntity('u1')?.name).toBe('Alice');
      expect(errors).toEqual([failure]);
    });
  });

  /**
   * Verifies: setActive() activates the user in both the entity store and the UI store.
   * Interacts with: UserDataService.setActive, UserQuery.getActiveId, UserQuery.ui.getActiveId.
   * Data: two loaded users; u2 activated.
   */
  it('setActive() activates the user and its UI state', async () => {
    const { service, query } = setup();
    await firstValueFrom(service.load());
    service.setActive('u2');
    expect(query.getActiveId()).toBe('u2');
    expect(query.ui.getActiveId()).toBe('u2');
  });

  /**
   * Verifies: setCurrentUser() leaves a blank current user while nobody is signed in.
   * Interacts with: ComnAuthService.user$ (Subject), real CurrentUserStore/CurrentUserQuery.
   * Data: a null emission.
   */
  it('setCurrentUser() keeps a blank user until someone signs in', () => {
    const { service, currentUserQuery, authUser$ } = setup();
    service.setCurrentUser();
    authUser$.next(null);
    expect(currentUserQuery.getValue()).toMatchObject({ name: '', id: '' });
  });

  /**
   * Verifies: setCurrentUser() copies name and id from the signed-in OIDC profile.
   * Interacts with: ComnAuthService.user$ (Subject), real CurrentUserStore/CurrentUserQuery.
   * Data: a profile for Alice (sub u1).
   */
  it('setCurrentUser() copies name and id from the signed-in profile', () => {
    const { service, currentUserQuery, authUser$ } = setup();
    service.setCurrentUser();
    authUser$.next({ profile: { name: 'Alice', sub: 'u1' } });
    expect(currentUserQuery.getValue()).toMatchObject({
      name: 'Alice',
      id: 'u1',
    });
  });

  /**
   * Verifies: setUserTheme() updates the current user's theme.
   * Interacts with: CurrentUserStore, CurrentUserQuery.userTheme$.
   * Data: dark theme.
   */
  it('setUserTheme() updates the current user theme', async () => {
    const { service, currentUserQuery } = setup();
    service.setUserTheme(Theme.DARK);
    expect(await firstValueFrom(currentUserQuery.userTheme$)).toBe(Theme.DARK);
  });
});
