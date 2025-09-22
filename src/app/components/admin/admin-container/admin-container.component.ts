// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.
import { Component, OnDestroy, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { map, tap, take, takeUntil } from 'rxjs/operators';
import { PermissionService } from 'src/app/generated/cite.api/api/api';
import {
  Permission,
  Team,
  User,
  UserPermission,
} from 'src/app/generated/cite.api/model/models';
import { EvaluationDataService } from 'src/app/data/evaluation/evaluation-data.service';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { ScoringModelDataService } from 'src/app/data/scoring-model/scoring-model-data.service';
import { TeamTypeDataService } from 'src/app/data/teamtype/team-type-data.service';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { TopbarView } from 'src/app/components/shared/top-bar/topbar.models';
import {
  ComnSettingsService,
  ComnAuthQuery,
  Theme,
} from '@cmusei/crucible-common';
import {
  ApplicationArea,
  SignalRService,
} from 'src/app/services/signalr.service';
import { environment } from 'src/environments/environment';
import { HealthCheckService } from 'src/app/generated/cite.api/api/api';

@Component({
  selector: 'app-admin-container',
  templateUrl: './admin-container.component.html',
  styleUrls: ['./admin-container.component.scss'],
  standalone: false,
})
export class AdminContainerComponent implements OnDestroy, OnInit {
  loggedInUser = this.userDataService.loggedInUser;
  usersText = 'Users';
  evaluationsText = 'Evaluations';
  scoringModelsText = 'Scoring Models';
  actionsText = 'Actions';
  dutiesText = 'Duties';
  submissionsText = 'Submissions';
  groupsText = 'Groups';
  teamsText = 'Teams';
  teamTypesText = 'Team Types';
  topbarText = 'Set AppTopBarText in Settings';
  showSection$: Observable<string>;
  displayedSection = this.evaluationsText;
  exitSection = '';
  originalEvaluationId: string;
  isSidebarOpen = true;
  isSuperUser = false;
  canAccessAdminSection = false;
  canSwitchEvaluations = new BehaviorSubject<boolean>(false);
  evaluationList = this.evaluationDataService.EvaluationList;
  scoringModelList = this.scoringModelDataService.scoringModelList;
  userList = this.userDataService.userList;
  permissionList: Observable<Permission[]>;
  pageSize: Observable<number>;
  pageIndex: Observable<number>;
  private unsubscribe$ = new Subject();
  hideTopbar = false;
  TopbarView = TopbarView;
  topbarColor = '#ef3a47';
  topbarTextColor = '#FFFFFF';
  topbarImage = this.settingsService.settings.AppTopBarImage;
  theme$: Observable<Theme>;
  uiVersion = environment.VERSION;
  apiVersion = 'API ERROR!';

  constructor(
    private router: Router,
    private evaluationDataService: EvaluationDataService,
    private evaluationQuery: EvaluationQuery,
    private scoringModelDataService: ScoringModelDataService,
    private teamTypeDataService: TeamTypeDataService,
    private userDataService: UserDataService,
    activatedRoute: ActivatedRoute,
    private permissionService: PermissionService,
    private healthCheckService: HealthCheckService,
    private settingsService: ComnSettingsService,
    private authQuery: ComnAuthQuery,
    titleService: Title,
    private signalRService: SignalRService
  ) {
    this.theme$ = this.authQuery.userTheme$;
    this.hideTopbar = this.inIframe();
    this.userDataService.isSuperUser
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((result) => {
        if (result !== this.isSuperUser) {
          this.isSuperUser = result;
          this.canSwitchEvaluations.next(result);
          if (this.isSuperUser) {
            this.evaluationDataService.load();
            this.userDataService.getUsersFromApi();
            this.userDataService
              .getPermissionsFromApi()
              .pipe(takeUntil(this.unsubscribe$))
              .subscribe();
            this.permissionList = this.permissionService.getPermissions();
          }
        }
      });
    this.userDataService.canAccessAdminSection
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((result) => {
        if (result !== this.canAccessAdminSection) {
          this.canAccessAdminSection = result;
          if (this.canAccessAdminSection && !this.isSuperUser) {
            this.evaluationDataService.loadMine();
          }
        }
      });
    this.pageSize = activatedRoute.queryParamMap.pipe(
      map((params) => parseInt(params.get('pagesize') || '20', 10))
    );
    this.pageIndex = activatedRoute.queryParamMap.pipe(
      map((params) => parseInt(params.get('pageindex') || '0', 10))
    );
    this.showSection$ = activatedRoute.queryParamMap.pipe(
      tap(
        (params) =>
          (this.displayedSection =
            params.get('section') || this.evaluationsText)
      ),
      map((params) => params.get('section') || this.evaluationsText)
    );
    this.showSection$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((section) => {
        this.displayedSection = section;
      });
    this.originalEvaluationId = this.evaluationQuery.getActiveId();
    // load and subscribe to TeamTypes
    this.teamTypeDataService.load();
    // Set the display settings from config file
    this.topbarColor = this.settingsService.settings.AppTopBarHexColor
      ? this.settingsService.settings.AppTopBarHexColor
      : this.topbarColor;
    this.topbarTextColor = this.settingsService.settings.AppTopBarHexTextColor
      ? this.settingsService.settings.AppTopBarHexTextColor
      : this.topbarTextColor;
    const appTitle =
      this.settingsService.settings.AppTitle || 'Set AppTitle in Settings';
    titleService.setTitle(appTitle);
    this.topbarText =
      this.settingsService.settings.AppTopBarText || this.topbarText;
    this.getApiVersion();
  }

  ngOnInit() {
    this.signalRService
      .startConnection(ApplicationArea.admin)
      .then(() => {
        this.signalRService.join();
      })
      .catch((err) => {
        console.log(err);
      });
  }

  gotoSection(section: string) {
    this.router.navigate([], {
      queryParams: {
        evaluation: this.originalEvaluationId,
        section: section,
      },
    });
  }

  getSelectedClass(section: string) {
    if (section === this.displayedSection) {
      return 'selected-item';
    } else {
      return 'non-selected-item';
    }
  }

  isSelectedClass(section: string): boolean {
    if (section === this.displayedSection) {
      return true;
    } else {
      return false;
    }
  }

  logout() {
    this.userDataService.logout();
  }

  addUserHandler(user: User) {
    this.userDataService.addUser(user);
  }

  deleteUserHandler(user: User) {
    this.userDataService.deleteUser(user);
  }

  addUserPermissionHandler(userPermission: UserPermission) {
    this.userDataService.addUserPermission(userPermission);
  }

  removeUserPermissionHandler(userPermission: UserPermission) {
    this.userDataService.deleteUserPermission(userPermission);
  }

  inIframe() {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }

  getApiVersion() {
    this.healthCheckService
      .getVersion()
      .pipe(take(1))
      .subscribe(
        (message) => {
          const messageParts = message.split('+');
          this.apiVersion = messageParts[0];
        },
        (error) => {
          this.apiVersion = 'API ERROR!';
        }
      );
  }

  exitAdminPages() {
    this.evaluationDataService.setActive(this.originalEvaluationId);
    this.router.navigate(['/'], {
      queryParams: { evaluation: this.originalEvaluationId },
    });
  }

  ngOnDestroy() {
    this.signalRService.leave();
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
