// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Observable, combineLatest } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import {
  ComnSettingsService,
  Theme,
  ComnAuthQuery,
} from '@cmusei/crucible-common';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { TopbarView } from './../shared/top-bar/topbar.models';
import { EvaluationDataService } from 'src/app/data/evaluation/evaluation-data.service';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import {
  Evaluation,
  HealthCheckService,
  ItemStatus,
  Move,
  ScoringModel,
  Submission,
  Team,
  UnreadArticles
} from 'src/app/generated/cite.api';
import { MoveDataService } from 'src/app/data/move/move-data.service';
import { MoveQuery } from 'src/app/data/move/move.query';
import { ScoringModelDataService } from 'src/app/data/scoring-model/scoring-model-data.service';
import { ScoringModelQuery } from 'src/app/data/scoring-model/scoring-model.query';
import { SubmissionDataService } from 'src/app/data/submission/submission-data.service';
import { SubmissionQuery } from 'src/app/data/submission/submission.query';
import { TeamDataService } from 'src/app/data/team/team-data.service';
import { TeamQuery } from 'src/app/data/team/team.query';
import { ApplicationArea, SignalRService } from 'src/app/services/signalr.service';
import { GallerySignalRService } from 'src/app/services/gallery-signalr.service';
import { UnreadArticlesQuery } from 'src/app/data/unread-articles/unread-articles.query';

export enum Section {
  dashboard = 'dashboard',
  scoresheet = 'scoresheet'
}

@Component({
  selector: 'app-home-app',
  templateUrl: './home-app.component.html',
  styleUrls: ['./home-app.component.scss'],
})
export class HomeAppComponent implements OnDestroy, OnInit {
  @ViewChild('sidenav') sidenav: MatSidenav;
  apiIsSick = false;
  apiMessage = 'The API web service is not responding.';
  topbarTextBase = 'Set AppTopBarText in Settings';
  topbarText = 'blank';
  section = Section;
  selectedSection = Section.dashboard;
  loggedInUserId = '';
  canAccessAdminSection$ = this.userDataService.canAccessAdminSection;
  isAuthorizedUser = false;
  isSidebarOpen = true;
  private unsubscribe$ = new Subject();
  hideTopbar = false;
  topbarColor = '#ef3a47';
  topbarTextColor = '#FFFFFF';
  topbarImage = this.settingsService.settings.AppTopBarImage;
  TopbarView = TopbarView;
  theme$: Observable<Theme>;
  selectedEvaluationId = '';
  selectedEvaluation = this.evaluationQuery.selectActive();
  selectedScoringModel = this.scoringModelQuery.selectActive() as Observable<ScoringModel>;
  evaluationList: Evaluation[];
  submissionList = this.submissionQuery.selectAll();
  teamList: Team[] = [];
  expectingMyEvaluations = false;
  isReady = false;
  currentMoveNumber = -1;
  userCurrentSubmission: Submission;
  unreadArticles$ = this.unreadArticlesQuery.selectActive() as Observable<UnreadArticles>;
  evaluationForLoadedSubmissions: Evaluation;
  moveList$ = this.moveQuery.selectAll() as Observable<Move[]>;
  myTeamId = '';
  myTeamId$ = new Subject<string>();
  xyz = '';


  constructor(
    activatedRoute: ActivatedRoute,
    private router: Router,
    private userDataService: UserDataService,
    private settingsService: ComnSettingsService,
    private authQuery: ComnAuthQuery,
    private evaluationDataService: EvaluationDataService,
    private evaluationQuery: EvaluationQuery,
    private moveDataService: MoveDataService,
    private scoringModelDataService: ScoringModelDataService,
    private scoringModelQuery: ScoringModelQuery,
    private submissionDataService: SubmissionDataService,
    private submissionQuery: SubmissionQuery,
    private teamDataService: TeamDataService,
    private teamQuery: TeamQuery,
    private signalRService: SignalRService,
    private gallerySignalRService: GallerySignalRService,
    private healthCheckService: HealthCheckService,
    private moveQuery: MoveQuery,
    private unreadArticlesQuery: UnreadArticlesQuery,
    titleService: Title
  ) {
    this.healthCheck();

    const appTitle = this.settingsService.settings.AppTitle || 'Set AppTitle in Settings';
    titleService.setTitle(appTitle);
    this.topbarTextBase = this.settingsService.settings.AppTopBarText || this.topbarTextBase;
    this.topbarText = this.topbarTextBase;
    this.theme$ = this.authQuery.userTheme$;
    this.hideTopbar = this.inIframe();
    this.submissionDataService.unload();
    this.scoringModelDataService.unload();
    this.teamDataService.unload();
    // observe logged in user and teams
    combineLatest([this.userDataService.loggedInUser, this.teamQuery.selectAll()])
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(([user, teams]) => {
        if (user && user.profile && teams && teams.length > 0) {
          this.loggedInUserId = user.profile.sub;
          this.expectingMyEvaluations = true;
          this.teamList = teams;
          // set the active team for this user
          teams.forEach(t => {
            if (t.users.some(u => u.id === this.loggedInUserId)) {
              this.myTeamId = t.id;
              this.teamDataService.setActive(t.id);
              const thisScope = this;
              setTimeout(function() {
                thisScope.myTeamId$.next(t.id);
              }, 200);
            }
          });
        }
      });
    // observe evaluations
    this.evaluationQuery.selectAll()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(evaluations => {
        this.evaluationList = evaluations;
        const numberOfEvaluations = evaluations ? evaluations.length : 0;
        this.topbarText = numberOfEvaluations !== 1 ?
          this.topbarTextBase + ' (' + numberOfEvaluations + ' Active Incidents)' :
          this.topbarTextBase + ' (1 Active Incident)';
        // make sure the requested evaluation is contained in the active ones.  If not force manual selection.
        if (numberOfEvaluations > 0) {
          this.expectingMyEvaluations = false;
          const evaluation = evaluations.find(e => e.id === this.selectedEvaluationId);
          if (evaluation) {
            this.loadEvaluationData();
          } else if (numberOfEvaluations === 1) {
            this.selectEvaluation(evaluations[0].id);
          }
        }
      });
    // observe active submission
    (this.evaluationQuery.selectActive() as Observable<Evaluation>).pipe(takeUntil(this.unsubscribe$)).subscribe(active => {
      if (active) {
        this.selectedEvaluationId = active.id;
        this.loadEvaluationData();
      }
    });
    // observe authorizedUser
    this.userDataService.isAuthorizedUser
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((isAuthorized) => {
        this.isAuthorizedUser = isAuthorized;
      });
    // observe route changes
    activatedRoute.queryParamMap.pipe(takeUntil(this.unsubscribe$)).subscribe(params => {
      const evaluationId = params.get('evaluation');
      if (evaluationId) {
        this.evaluationDataService.setActive(evaluationId);
      }
      const section = params.get('section');
      switch (section) {
        case 'scoresheet':
          this.selectedSection = Section.scoresheet;
          break;
        default:
          this.selectedSection = Section.dashboard;
          break;
      }
    });
    // load the user's evaluations
    this.evaluationDataService.loadMine();
    // Set the display settings from config file
    this.topbarColor = this.settingsService.settings.AppTopBarHexColor
      ? this.settingsService.settings.AppTopBarHexColor
      : this.topbarColor;
    this.topbarTextColor = this.settingsService.settings.AppTopBarHexTextColor
      ? this.settingsService.settings.AppTopBarHexTextColor
      : this.topbarTextColor;
  }

  ngOnInit() {
    this.signalRService
      .startConnection(ApplicationArea.home)
      .then(() => {
        this.signalRService.join();
      })
      .catch((err) => {
        console.log(err);
      });
    if (this.settingsService.settings.GalleryApiUrl) {
      this.gallerySignalRService
        .startConnection()
        .then(() => {
          this.gallerySignalRService.join();
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }

  loadEvaluationData() {
    if (!this.evaluationList) {
      return;
    }
    const evaluation = this.evaluationList.find(e => e.id === this.selectedEvaluationId);
    if (evaluation) {
      this.evaluationDataService.setActive(this.selectedEvaluationId);
      this.scoringModelDataService.loadById(evaluation.scoringModelId);
      this.submissionDataService.loadMineByEvaluation(this.selectedEvaluationId);
      this.moveDataService.loadByEvaluation(this.selectedEvaluationId);
      this.teamDataService.loadMine(this.selectedEvaluationId);
      this.currentMoveNumber = evaluation.currentMoveNumber;
    }
    this.isReady = true;
  }

  selectEvaluation(evaluationId: string) {
    this.router.navigate([], {
      queryParams: { evaluation: evaluationId },
      queryParamsHandling: 'merge',
    });
  }

  setDisplayedMove(moveId: string) {
    this.moveDataService.setActive(moveId);
  }

  logout() {
    this.userDataService.logout();
  }

  inIframe() {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }

  healthCheck() {
    this.healthCheckService
      .healthGetReadiness()
      .pipe(take(1))
      .subscribe(
        (message) => {
          this.apiIsSick = !message || !message.status || message.status !== 'Healthy';
          if (!message || !message.status) {
            this.apiIsSick = true;
            if (message.status !== 'Healthy') {
              this.apiMessage = 'The API web service is not healthy (' + message.status + ').';
            }
          }
          this.apiMessage = message;
        },
        (error) => {
          this.apiIsSick = true;
          this.apiMessage = 'The API web service is not responding.';
        }
      );
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
    this.signalRService.leave();
    this.gallerySignalRService.leave();
  }
}
