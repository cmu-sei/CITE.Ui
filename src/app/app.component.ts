// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { OverlayContainer } from '@angular/cdk/overlay';
import { Component, HostListener, OnDestroy } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ComnAuthQuery,
  ComnAuthService,
  ComnSettingsService,
  Theme,
} from '@cmusei/crucible-common';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DynamicThemeService } from './services/dynamic-theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnDestroy {
  @HostListener('document:keydown.backspace', ['$event'])
  onKeyDown(evt: KeyboardEvent) {
    let doPrevent = true;
    const types = [
      'text',
      'password',
      'file',
      'search',
      'email',
      'number',
      'date',
      'color',
      'datetime',
      'datetime-local',
      'month',
      'range',
      'search',
      'tel',
      'time',
      'url',
      'week',
    ];
    const target = <HTMLInputElement>evt.target;

    const disabled =
      target.disabled || (<HTMLInputElement>event.target).readOnly;
    if (!disabled) {
      if (target.isContentEditable) {
        doPrevent = false;
      } else if (target.nodeName === 'INPUT') {
        let type = target.type;
        if (type) {
          type = type.toLowerCase();
        }
        if (types.indexOf(type) > -1) {
          doPrevent = false;
        }
      } else if (target.nodeName === 'TEXTAREA') {
        doPrevent = false;
      }
    }
    if (doPrevent) {
      evt.preventDefault();
      return false;
    }
  }

  theme$: Observable<Theme> = this.authQuery.userTheme$;
  private paramTheme;
  unsubscribe$: Subject<null> = new Subject<null>();

  constructor(
    iconRegistry: MatIconRegistry,
    sanitizer: DomSanitizer,
    private overlayContainer: OverlayContainer,
    private authQuery: ComnAuthQuery,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private authService: ComnAuthService,
    private themeService: DynamicThemeService,
    private settingsService: ComnSettingsService
  ) {
    this.registerIcons(iconRegistry, sanitizer);
    this.theme$.pipe(takeUntil(this.unsubscribe$)).subscribe((theme) => {
      if (this.paramTheme && this.paramTheme !== theme) {
        this.router.navigate([], {
          queryParams: { theme: theme },
          queryParamsHandling: 'merge',
        });
      }
      this.setTheme(theme);
    });
    this.activatedRoute.queryParamMap.pipe(takeUntil(this.unsubscribe$)).subscribe(params => {
      const theme = params.get('theme');
      if (theme) {
        this.paramTheme = theme === Theme.DARK ? Theme.DARK : Theme.LIGHT;
        this.authService.setUserTheme(this.paramTheme);
      }
    });
  }

  registerIcons(iconRegistry: MatIconRegistry, sanitizer: DomSanitizer) {
    iconRegistry.setDefaultFontSetClass('mdi');

    iconRegistry.addSvgIcon(
      'crucible-icon-cite',
      sanitizer.bypassSecurityTrustResourceUrl(
        'assets/svg-icons/crucible-icon-cite.svg'
      )
    );
  }

  setTheme(theme: Theme) {
    const classList = this.overlayContainer.getContainerElement().classList;
    const hexColor =
      this.settingsService.settings.AppPrimaryThemeColor || '#E81717';

    switch (theme) {
      case Theme.LIGHT:
        document.body.classList.toggle('darkMode', false);
        this.themeService.applyLightTheme(hexColor);
        break;
      case Theme.DARK:
        document.body.classList.toggle('darkMode', true);
        this.themeService.applyDarkTheme(hexColor);
        break;
    }
  }
  ngOnDestroy(): void {
    throw new Error('Method not implemented.');
  }
}
