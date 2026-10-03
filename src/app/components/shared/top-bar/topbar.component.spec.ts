// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ComnAuthService, Theme } from '@cmusei/crucible-common';
import { SystemPermission } from '../../../generated/cite.api';
import { TopbarComponent } from './topbar.component';
import { TopbarView } from './topbar.models';
import { CurrentUserStore } from '../../../data/user/user.store';
import { UIDataService } from '../../../data/ui/ui-data.service';
import { permissionDataProviders } from '../../../test-utils/mock-permission-data.service';
import { renderComponent } from '../../../test-utils/render-component';

async function renderTopbar(
  overrides: {
    system?: SystemPermission[];
    topbarView?: TopbarView;
    title?: string;
  } = {},
) {
  const auth: Pick<ComnAuthService, 'setUserTheme' | 'logout'> = {
    setUserTheme: vi.fn(),
    logout: vi.fn(() => Promise.resolve()),
  };
  const rendered = await renderComponent(TopbarComponent, {
    declarations: [TopbarComponent],
    imports: [
      MatButtonModule,
      MatIconModule,
      MatMenuModule,
      MatSlideToggleModule,
      MatToolbarModule,
    ],
    componentInputs: {
      title: overrides.title ?? 'Scoresheet',
      topbarView: overrides.topbarView ?? TopbarView.CITE_HOME,
    },
    providers: [
      ...permissionDataProviders({ system: overrides.system ?? [] }),
      { provide: ComnAuthService, useValue: auth },
      {
        // The signed-in user, as UserDataService.setCurrentUser() would leave it.
        provide: CurrentUserStore,
        useFactory: () => {
          const store = new CurrentUserStore();
          store.update({ name: 'Alice', id: 'u1' });
          return store;
        },
      },
    ],
  });
  return { ...rendered, auth, user: userEvent.setup() };
}

async function openUserMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Alice/ }));
}

describe('TopbarComponent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  /**
   * Verifies: the title input and the signed-in user's name are shown.
   * Interacts with: real CurrentUserQuery (seeded store), title input.
   * Data: title 'Scoresheet', user Alice.
   */
  it('shows the title and the current user', async () => {
    await renderTopbar();
    expect(screen.getByText('Scoresheet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Alice/ })).toBeInTheDocument();
  });

  /**
   * Verifies: a user who may view administration gets an Administration entry in the user menu.
   * Interacts with: real PermissionDataService (canViewAdministration), mat-menu opened with user-event.
   * Data: system [ViewEvaluations], home view.
   */
  it('offers Administration with an admin permission', async () => {
    const { user } = await renderTopbar({
      system: [SystemPermission.ViewEvaluations],
    });
    await openUserMenu(user);
    expect(
      screen.getByRole('menuitem', { name: 'Administration' }),
    ).toBeInTheDocument();
  });

  /**
   * Verifies: without an admin permission the user menu has no Administration entry.
   * Interacts with: real PermissionDataService, mat-menu.
   * Data: system [ObserveEvaluations] (not an admin permission), home view.
   */
  it('hides Administration without an admin permission', async () => {
    const { user } = await renderTopbar({
      system: [SystemPermission.ObserveEvaluations],
    });
    await openUserMenu(user);
    expect(
      screen.queryByRole('menuitem', { name: 'Administration' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Logout' }),
    ).toBeInTheDocument();
  });

  /**
   * Verifies: in the admin view the menu offers Exit Administration instead of Administration.
   * Interacts with: topbarView input, mat-menu.
   * Data: system [ManageEvaluations], admin view.
   */
  it('offers Exit Administration in the admin view', async () => {
    const { user } = await renderTopbar({
      system: [SystemPermission.ManageEvaluations],
      topbarView: TopbarView.CITE_ADMIN,
    });
    await openUserMenu(user);
    expect(
      screen.getByRole('menuitem', { name: 'Exit Administration' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: 'Administration' }),
    ).not.toBeInTheDocument();
  });

  /**
   * Verifies: Logout in the user menu signs the user out.
   * Interacts with: ComnAuthService.logout stub, mat-menu.
   * Data: default render.
   */
  it('logs out from the user menu', async () => {
    const { user, auth } = await renderTopbar();
    await openUserMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Logout' }));
    expect(auth.logout).toHaveBeenCalled();
  });

  /**
   * Verifies: the saved theme is applied on init, and the Dark Theme switch applies and saves the dark theme.
   * Interacts with: ComnAuthService.setUserTheme stub, real UIDataService (localStorage), mat-slide-toggle.
   * Data: no saved theme (so light on init); one switch toggle.
   */
  it('applies and saves the theme', async () => {
    const { user, auth, fixture } = await renderTopbar();
    expect(auth.setUserTheme).toHaveBeenCalledWith(Theme.LIGHT);
    await openUserMenu(user);
    await user.click(screen.getByRole('switch', { name: 'Dark Theme' }));
    expect(auth.setUserTheme).toHaveBeenLastCalledWith(Theme.DARK);
    expect(fixture.debugElement.injector.get(UIDataService).getTheme()).toBe(
      Theme.DARK,
    );
  });
});
