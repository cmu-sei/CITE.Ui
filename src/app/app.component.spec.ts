// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ComnAuthQuery, ComnAuthService, Theme } from '@cmusei/crucible-common';
import { activatedRouteStub } from './test-utils/activated-route';
import { renderComponent } from './test-utils/render-component';
import { AppComponent } from './app.component';

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

describe('AppComponent', () => {
  beforeEach(() => document.body.classList.remove('darkMode'));

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
   * Verifies: the dark theme puts darkMode on the body and the top bar colour from settings in the primary variable.
   * Interacts with: ComnAuthQuery.userTheme$ stub, ComnSettingsService defaults.
   * Data: Theme.DARK; AppTopBarHexColor #C41230.
   */
  it('applies the dark theme and the top bar colour', async () => {
    await renderApp({ theme: Theme.DARK });

    expect(document.body).toHaveClass('darkMode');
    expect(
      document.documentElement.style.getPropertyValue('--mat-sys-primary'),
    ).toBe('#C41230');
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
});
