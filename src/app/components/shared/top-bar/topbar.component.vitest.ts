// Copyright 2024 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { TopbarComponent } from './topbar.component';
import { TopbarView } from './topbar.models';
import { renderComponent } from 'src/app/test-utils/render-component';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { CurrentUserQuery } from 'src/app/data/user/user.query';
import { ComnAuthService, ComnAuthQuery } from '@cmusei/crucible-common';
import { UIDataService } from 'src/app/data/ui/ui-data.service';

async function renderTopbar(overrides: {
  title?: string;
  topbarView?: TopbarView;
  canViewAdmin?: boolean;
  teams?: any[];
  team?: any;
} = {}) {
  const {
    title = 'CITE',
    topbarView = TopbarView.CITE_HOME,
    canViewAdmin = false,
    teams,
    team,
  } = overrides;

  const mockPermissionDataService = {
    load: () => of([]),
    permissions: [],
    hasPermission: () => false,
    canViewAdministration: () => canViewAdmin,
  };

  const mockLogoutFn = vi.fn();

  return renderComponent(TopbarComponent, {
    declarations: [TopbarComponent],
    providers: [
      { provide: PermissionDataService, useValue: mockPermissionDataService },
      {
        provide: CurrentUserQuery,
        useValue: {
          select: () => of({ name: 'Test User', id: 'user-1', theme: 'light-theme', lastRoute: '/' }),
          userTheme$: of('light-theme'),
          getLastRoute: () => '/',
        },
      },
      {
        provide: ComnAuthService,
        useValue: {
          isAuthenticated$: of(true),
          user$: of({}),
          logout: mockLogoutFn,
          setUserTheme: () => {},
          getAuthorizationToken: () => 'token',
        },
      },
      {
        provide: ComnAuthQuery,
        useValue: {
          userTheme$: of('light-theme'),
          isLoggedIn$: of(true),
        },
      },
      {
        provide: UIDataService,
        useValue: {
          getTheme: () => 'light-theme',
          setTheme: () => {},
        },
      },
    ],
    componentProperties: {
      title,
      topbarView,
      teams,
      team,
    } as any,
  });
}

describe('TopbarComponent', () => {
  it('should create', async () => {
    const { fixture } = await renderTopbar();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display title from input', async () => {
    await renderTopbar({ title: 'My Custom Title' });
    expect(screen.getByText('My Custom Title')).toBeInTheDocument();
  });

  it('should show user menu button with user name', async () => {
    await renderTopbar();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('should show Administration link when canViewAdmin is true', async () => {
    await renderTopbar({ canViewAdmin: true, topbarView: TopbarView.CITE_HOME });
    const user = userEvent.setup();
    const menuTrigger = screen.getByText('Test User');
    await user.click(menuTrigger);
    expect(screen.getByText('Administration')).toBeInTheDocument();
  });

  it('should hide Administration link when canViewAdmin is false', async () => {
    await renderTopbar({ canViewAdmin: false, topbarView: TopbarView.CITE_HOME });
    const user = userEvent.setup();
    const menuTrigger = screen.getByText('Test User');
    await user.click(menuTrigger);
    expect(screen.queryByText('Administration')).not.toBeInTheDocument();
  });

  it('should show logout option', async () => {
    await renderTopbar();
    const user = userEvent.setup();
    const menuTrigger = screen.getByText('Test User');
    await user.click(menuTrigger);
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('should show dark theme toggle', async () => {
    await renderTopbar();
    const user = userEvent.setup();
    const menuTrigger = screen.getByText('Test User');
    await user.click(menuTrigger);
    expect(screen.getByText('Dark Theme')).toBeInTheDocument();
  });

  it('should call logout when logout clicked', async () => {
    const { fixture } = await renderTopbar();
    const logoutSpy = vi.spyOn(fixture.componentInstance, 'logout');
    const user = userEvent.setup();
    const menuTrigger = screen.getByText('Test User');
    await user.click(menuTrigger);
    const logoutButton = screen.getByText('Logout');
    await user.click(logoutButton);
    expect(logoutSpy).toHaveBeenCalled();
  });

  it('should emit sidenavToggle when toggle method called', async () => {
    const { fixture } = await renderTopbar();
    const emitSpy = vi.spyOn(fixture.componentInstance.sidenavToggle, 'emit');
    fixture.componentInstance.sidenav = { opened: false };
    fixture.componentInstance.sidenavToggleFn();
    expect(emitSpy).toHaveBeenCalledWith(true);
  });

  it('should display CITE icon button', async () => {
    await renderTopbar();
    const homeButton = screen.getByTitle('Home');
    expect(homeButton).toBeInTheDocument();
  });

  it('should show Exit Administration when in admin view', async () => {
    await renderTopbar({ topbarView: TopbarView.CITE_ADMIN });
    const user = userEvent.setup();
    const menuTrigger = screen.getByText('Test User');
    await user.click(menuTrigger);
    expect(screen.getByText('Exit Administration')).toBeInTheDocument();
  });

  it('should hide Exit Administration when not in admin view', async () => {
    await renderTopbar({ topbarView: TopbarView.CITE_HOME });
    const user = userEvent.setup();
    const menuTrigger = screen.getByText('Test User');
    await user.click(menuTrigger);
    expect(screen.queryByText('Exit Administration')).not.toBeInTheDocument();
  });
});
