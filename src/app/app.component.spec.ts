// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatIconRegistry } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import {
  ComnAuthQuery,
  ComnAuthService,
  CrucibleThemeService,
  Theme,
  provideCrucibleTheme,
} from '@cmusei/crucible-common';
import { activatedRouteStub } from './test-utils/activated-route';
import { renderComponent } from './test-utils/render-component';
import { AppComponent } from './app.component';
import { UIDataService } from './data/ui/ui-data.service';

async function renderApp(options: { theme?: Theme; queryTheme?: string } = {}) {
  const setUserTheme = vi.fn();
  const auth: Pick<ComnAuthService, 'setUserTheme'> = { setUserTheme };
  const authQuery: Pick<ComnAuthQuery, 'userTheme$'> = {
    userTheme$: of(options.theme ?? Theme.LIGHT),
  };
  const { route } = activatedRouteStub(
    options.queryTheme ? { theme: options.queryTheme } : {},
  );
  const addSvgIcon = vi.spyOn(MatIconRegistry.prototype, 'addSvgIcon');
  const setDefaultFontSetClass = vi.spyOn(
    MatIconRegistry.prototype,
    'setDefaultFontSetClass',
  );
  const rendered = await renderComponent(AppComponent, {
    declarations: [AppComponent],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    providers: [
      // The real theme service, so the CSS variables it writes can be
      // asserted. Its favicon service needs an HttpBackend.
      provideHttpClient(),
      provideHttpClientTesting(),
      provideCrucibleTheme({
        brand: { color: '#E81717', text: '#FFFFFF' },
        faviconFillClass: 'cls-2',
      }),
      // The real registry, so its registrations can be observed (README,
      // "Icons"); the defaults install MatIconTestingModule's fake.
      { provide: MatIconRegistry, useClass: MatIconRegistry },
      { provide: ComnAuthService, useValue: auth },
      { provide: ComnAuthQuery, useValue: authQuery },
      { provide: ActivatedRoute, useValue: route },
    ],
  });
  return { ...rendered, setUserTheme, addSvgIcon, setDefaultFontSetClass };
}

const THEME_PROPERTIES = [
  '--crucible-topbar-background',
  '--crucible-topbar-text',
  '--mat-sys-primary',
  '--mat-sys-on-primary',
];

function bodyStyle(prop: string): string {
  return document.body.style.getPropertyValue(prop);
}

describe('AppComponent', () => {
  beforeEach(() => {
    document.body.classList.remove('darkMode');
    for (const el of [document.documentElement, document.body]) {
      for (const prop of THEME_PROPERTIES) {
        el.style.removeProperty(prop);
      }
    }
  });

  /**
   * Verifies: the component mounts with the default test providers, registers the CITE icon and the mdi font set.
   * Interacts with: the real MatIconRegistry (spied), ComnAuthQuery.userTheme$ stub.
   * Data: light theme, no theme query parameter.
   */
  it('renders with the default test providers', async () => {
    const { fixture, addSvgIcon, setDefaultFontSetClass } = await renderApp();

    expect(fixture.componentInstance).toBeInstanceOf(AppComponent);
    expect(setDefaultFontSetClass).toHaveBeenCalledWith('mdi');
    expect(addSvgIcon).toHaveBeenCalledWith(
      'crucible-icon-cite',
      expect.anything(),
    );
    expect(document.body).not.toHaveClass('darkMode');
  });

  /**
   * Verifies: each user theme is handed to CrucibleThemeService.applyTheme.
   * Interacts with: ComnAuthQuery.userTheme$ stub, CrucibleThemeService spy.
   * Data: Theme.DARK.
   */
  it('delegates the theme to CrucibleThemeService', async () => {
    const applyTheme = vi.spyOn(CrucibleThemeService.prototype, 'applyTheme');
    await renderApp({ theme: Theme.DARK });

    expect(applyTheme).toHaveBeenCalledWith(Theme.DARK);
  });

  /**
   * Verifies: the dark theme puts darkMode on the body, paints the top bar from
   *           the AppTopBar* settings, and keeps primary separate from the top bar
   *           (falling back to the CITE brand colour when no primary keys are set).
   * Interacts with: the real CrucibleThemeService, ComnSettingsService defaults.
   * Data: Theme.DARK; AppTopBarHexColor #C41230, no AppLight/DarkModePrimary* keys.
   */
  it('applies the dark theme with top bar colours split from primary', async () => {
    await renderApp({ theme: Theme.DARK });

    expect(document.body).toHaveClass('darkMode');
    expect(bodyStyle('--crucible-topbar-background')).toBe('#C41230');
    expect(bodyStyle('--crucible-topbar-text')).toBe('#FFFFFF');
    expect(bodyStyle('--mat-sys-primary').toUpperCase()).toBe('#E81717');
    expect(bodyStyle('--mat-sys-on-primary').toUpperCase()).toBe('#FFFFFF');
  });

  /**
   * Verifies: a theme query parameter is saved as the user's theme.
   * Interacts with: the ActivatedRoute stub's queryParamMap, ComnAuthService.setUserTheme stub.
   * Data: ?theme=dark-theme.
   */
  it('saves the theme from the query string', async () => {
    const { setUserTheme } = await renderApp({ queryTheme: Theme.DARK });

    expect(setUserTheme).toHaveBeenCalledWith(Theme.DARK);
  });

  /**
   * Verifies: a theme query parameter is also saved where the top bar restores the theme from when it
   *           initializes, so a top bar created after the param (as after a login redirect) keeps it.
   * Interacts with: the ActivatedRoute stub's queryParamMap, the real UIDataService (localStorage).
   * Data: ?theme=dark-theme, no saved uiState.
   */
  it('saves the theme from the query string for the top bar to restore', async () => {
    localStorage.removeItem('uiState');
    const { fixture } = await renderApp({ queryTheme: Theme.DARK });

    expect(fixture.debugElement.injector.get(UIDataService).getTheme()).toBe(Theme.DARK);
  });
});
