// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { map, tap, take, takeUntil } from 'rxjs/operators';
import { User } from 'src/app/generated/cite.api/model/models';
import { EvaluationDataService } from 'src/app/data/evaluation/evaluation-data.service';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { ScoringModelDataService } from 'src/app/data/scoring-model/scoring-model-data.service';
import { TeamTypeDataService } from 'src/app/data/teamtype/team-type-data.service';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { UserQuery } from 'src/app/data/user/user.query';
import { CurrentUserQuery } from 'src/app/data/user/user.query';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { ComnAuthService } from '@cmusei/crucible-common';
import { SystemPermission } from 'src/app/generated/cite.api';
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
  usersText = 'Users';
  evaluationsText = 'Evaluations';
  scoringModelsText = 'Scoring Models';
  actionsText = 'Actions';
  dutiesText = 'Duties';
  submissionsText = 'Submissions';
  groupsText = 'Groups';
  rolesText = 'Roles';
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
  pageSize: Observable<number>;
  pageIndex: Observable<number>;
  private unsubscribe$ = new Subject();
  hideTopbar = false;
  TopbarView = TopbarView;
  topbarImage = this.settingsService.settings.AppTopBarImage;
  theme$: Observable<Theme>;
  uiVersion = environment.VERSION;
  apiVersion = 'API ERROR!';
  username = '';
  permissions: SystemPermission[] = [];
  userList: Observable<User[]>;
  canViewScoringModels = false;
  canCreateScoringModels = false;
  canViewEvaluations = false;
  canCreateEvaluations = false;
  canViewTeamTypes = false;
  canViewUsers = false;
  canViewGroups = false;
  canViewRoles = false;
  readonly SystemPermission = SystemPermission;

  constructor(
    private router: Router,
    private authService: ComnAuthService,
    private evaluationDataService: EvaluationDataService,
    private evaluationQuery: EvaluationQuery,
    private scoringModelDataService: ScoringModelDataService,
    private teamTypeDataService: TeamTypeDataService,
    private userDataService: UserDataService,
    private userQuery: UserQuery,
    activatedRoute: ActivatedRoute,
    private healthCheckService: HealthCheckService,
    private settingsService: ComnSettingsService,
    private authQuery: ComnAuthQuery,
    private currentUserQuery: CurrentUserQuery,
    private permissionDataService: PermissionDataService,
    titleService: Title,
    private signalRService: SignalRService
  ) {
    this.theme$ = this.authQuery.userTheme$;
    this.hideTopbar = this.inIframe();
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
    // load Evaluations
    this.evaluationDataService.load();
    // load and subscribe to TeamTypes
    this.teamTypeDataService.load();
    // Set the display settings from config file
    const appTitle =
      this.settingsService.settings.AppTitle || 'Set AppTitle in Settings';
    titleService.setTitle(appTitle + ' Admin');
    this.topbarText =
      this.settingsService.settings.AppTopBarText || this.topbarText;
    this.getApiVersion();
  }

  ngOnInit() {
    this.userList = this.userQuery.selectAll();
    this.userDataService.load().pipe(take(1)).subscribe();
    this.permissionDataService.load().subscribe((x) => {
      this.permissions = this.permissionDataService.permissions;
      this.canViewScoringModels = this.canViewScoringModels || this.permissionDataService.hasPermission(SystemPermission.ViewScoringModels);
      this.canCreateScoringModels = this.permissionDataService.hasPermission(SystemPermission.CreateScoringModels);
      this.canViewEvaluations = this.canViewEvaluations || this.permissionDataService.hasPermission(SystemPermission.ViewEvaluations);
      this.canCreateEvaluations = this.permissionDataService.hasPermission(SystemPermission.CreateEvaluations);
      this.canViewGroups = this.permissionDataService.hasPermission(SystemPermission.ViewGroups);
      this.canViewRoles = this.permissionDataService.hasPermission(SystemPermission.ViewRoles);
      this.canViewTeamTypes = this.permissionDataService.hasPermission(SystemPermission.ViewTeamTypes);
      this.canViewUsers = this.permissionDataService.hasPermission(SystemPermission.ViewUsers);
    });
    this.permissionDataService.loadScoringModelPermissions().subscribe();
    this.permissionDataService.loadEvaluationPermissions().subscribe();
    this.signalRService
      .startConnection(ApplicationArea.admin)
      .then(() => {
        this.signalRService.join();
      })
      .catch((err) => {
        console.log(err);
      });
    this.currentUserQuery
      .select()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((cu) => {
        this.username = cu.name;
      });
    this.userDataService.setCurrentUser();
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

  logout() {
    this.authService.logout();
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
