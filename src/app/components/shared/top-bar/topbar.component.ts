// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { ComnAuthQuery, ComnAuthService, Theme } from '@cmusei/crucible-common';
import { Observable, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { TopbarView } from './topbar.models';
import { UIDataService } from 'src/app/data/ui/ui-data.service';
import { CurrentUserQuery } from 'src/app/data/user/user.query';
import { CurrentUserState } from 'src/app/data/user/user.store';

@Component({
    selector: 'app-topbar',
    templateUrl: './topbar.component.html',
    styleUrls: ['./topbar.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class TopbarComponent implements OnInit, OnDestroy {
  @Input() title?: string;
  @Input() sidenav?;
  @Input() teams?;
  @Input() team?;
  @Input() topbarColor?;
  @Input() topbarTextColor?;
  @Input() topbarView?: TopbarView;
  @Input() imageFilePath: string;
  @Output() sidenavToggle?: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() setTeam?: EventEmitter<string> = new EventEmitter<string>();
  @Output() urlNavigate?: EventEmitter<string> = new EventEmitter<string>();
  @Output() editView?: EventEmitter<any> = new EventEmitter<any>();
  currentUser$: Observable<CurrentUserState>;
  theme$: Observable<Theme>;
  unsubscribe$: Subject<null> = new Subject<null>();
  TopbarView = TopbarView;
  constructor(
    private authService: ComnAuthService,
    private currentUserQuery: CurrentUserQuery,
    private authQuery: ComnAuthQuery,
    private uiDataService: UIDataService
  ) {}

  ngOnInit() {
    this.currentUser$ = this.currentUserQuery.select().pipe(
      filter((user) => user !== null),
      takeUntil(this.unsubscribe$)
    );
    this.theme$ = this.authQuery.userTheme$;
    this.authService.setUserTheme(<Theme>this.uiDataService.getTheme() || Theme.LIGHT);
  }

  setTeamFn(id: string) {
    if (this.setTeam && id) {
      this.setTeam.emit(id);
    }
  }

  themeFn(event) {
    const theme = event.checked ? Theme.DARK : Theme.LIGHT;
    this.authService.setUserTheme(theme);
    this.uiDataService.setTheme(theme);
  }
  editFn(event) {
    this.editView.emit(event);
  }

  goToUrl(url): void {
    this.urlNavigate.emit(url);
  }

  sidenavToggleFn() {
    this.sidenavToggle.emit(!this.sidenav.opened);
  }

  logout(): void {
    this.authService.logout();
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
