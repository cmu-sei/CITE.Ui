// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { Theme } from '@cmusei/crucible-common';
import { CurrentUserQuery, UserQuery } from './user.query';
import { CurrentUserStore, initialUserUiState, UserStore } from './user.store';
import { recordEmissions } from '../../test-utils/record-emissions';

// Pure store + query tests: no TestBed, a fresh store per test.
describe('UserQuery', () => {
  /**
   * Verifies: every user set into the store gets the initial UI state in the UI store.
   * Interacts with: UserStore.set (createUIStore/setInitialEntityState), UserQuery.ui.
   * Data: two users.
   */
  it('gives new users the initial UI state', () => {
    const store = new UserStore();
    const query = new UserQuery(store);
    store.set([
      { id: 'u1', name: 'Alice' },
      { id: 'u2', name: 'Bob' },
    ]);
    expect(query.ui.getEntity('u2')).toEqual({
      id: 'u2',
      ...initialUserUiState,
    });
  });

  /**
   * Verifies: UI state changes for one user surface through ui.selectEntity without touching the user entity.
   * Interacts with: UserStore.ui.update, UserQuery.ui.selectEntity, UserQuery.selectByUserId.
   * Data: user u1 put into editing mode.
   */
  it('tracks UI state per user', () => {
    const store = new UserStore();
    const query = new UserQuery(store);
    store.set([{ id: 'u1', name: 'Alice' }]);
    const ui = recordEmissions(query.ui.selectEntity('u1'));
    store.ui.update('u1', { isEditing: true });
    expect(ui.map((u) => u?.isEditing)).toEqual([false, true]);
    expect(query.getEntity('u1')).toEqual({ id: 'u1', name: 'Alice' });
  });

  /**
   * Verifies: isLoading$ starts true and turns false once users are set.
   * Interacts with: UserStore.set, UserQuery.isLoading$.
   * Data: one user.
   */
  it('isLoading$ follows the store loading flag', () => {
    const store = new UserStore();
    const query = new UserQuery(store);
    const loading = recordEmissions(query.isLoading$);
    store.set([{ id: 'u1', name: 'Alice' }]);
    expect(loading).toEqual([true, false]);
  });

  /**
   * Verifies: selectByUserId emits the stored user.
   * Interacts with: UserStore.set, UserQuery.selectByUserId.
   * Data: one user.
   */
  it('selectByUserId emits the user', async () => {
    const store = new UserStore();
    const query = new UserQuery(store);
    store.set([{ id: 'u1', name: 'Alice' }]);
    expect((await firstValueFrom(query.selectByUserId('u1')))?.name).toBe(
      'Alice',
    );
  });
});

describe('CurrentUserQuery', () => {
  /**
   * Verifies: the current user starts on the light theme, and userTheme$ follows updates.
   * Interacts with: CurrentUserStore.update, CurrentUserQuery.userTheme$.
   * Data: theme switched to dark.
   */
  it('emits the theme as it changes', () => {
    const store = new CurrentUserStore();
    const query = new CurrentUserQuery(store);
    const themes = recordEmissions(query.userTheme$);
    store.update({ theme: Theme.DARK });
    expect(themes).toEqual([Theme.LIGHT, Theme.DARK]);
  });

  /**
   * Verifies: getLastRoute() falls back to '/' until a route is recorded.
   * Interacts with: CurrentUserQuery.getLastRoute.
   * Data: a fresh store with an empty lastRoute.
   */
  it('getLastRoute() defaults to the root', () => {
    const query = new CurrentUserQuery(new CurrentUserStore());
    expect(query.getLastRoute()).toBe('/');
  });

  /**
   * Verifies: getLastRoute() returns the recorded route.
   * Interacts with: CurrentUserStore.update, CurrentUserQuery.getLastRoute.
   * Data: lastRoute '/admin'.
   */
  it('getLastRoute() returns the recorded route', () => {
    const store = new CurrentUserStore();
    const query = new CurrentUserQuery(store);
    store.update({ lastRoute: '/admin' });
    expect(query.getLastRoute()).toBe('/admin');
  });
});
