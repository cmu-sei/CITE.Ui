// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Observable, BehaviorSubject } from 'rxjs';
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
  Submission,
  Team
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
import { ActionDataService } from 'src/app/data/action/action-data.service';
import { RoleDataService } from 'src/app/data/role/role-data.service';
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
  selectedScoringModel = this.scoringModelQuery.selectActive();
  evaluationList: Evaluation[];
  submissionList = this.submissionQuery.selectAll();
  teamList: Team[] = [];
  expectingMyEvaluations = false;
  isReady = false;
  currentMoveNumber = -1;
  userCurrentSubmission: Submission;
  unreadArticles$ = this.unreadArticlesQuery.selectActive();
  loadedSubmissionsForEvaluation: Evaluation;
  moveList$ = this.moveQuery.selectAll() as Observable<Move[]>;


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
    private actionDataService: ActionDataService,
    private moveQuery: MoveQuery,
    private roleDataService: RoleDataService,
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
    this.evaluationDataService.unload();
    this.scoringModelDataService.unload();
    this.teamDataService.unload();
    // subscribe to teams
    this.teamQuery
      .selectAll()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((teams) => {
        this.teamList = teams;
        if (teams && teams.length > 0) {
          this.loadTeamData();
        }
      });
    // subscribe to evaluations
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
        const evaluation = evaluations.find(e => e.id === this.selectedEvaluationId);
        if (evaluation) {
          this.loadEvaluationData();
        } else if (numberOfEvaluations === 1) {
          this.selectEvaluation(evaluations[0].id);
        }
      }
    });
    // subscribe to the logged in user
    this.userDataService.loggedInUser
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((user) => {
        if (user && user.profile && user.profile.sub != this.loggedInUserId) {
          this.loggedInUserId = user.profile.sub;
          this.evaluationList = null;
          this.evaluationDataService.loadMine();
          this.expectingMyEvaluations = true;
        }
      });
    // subscribe to active submission
    (this.submissionQuery.selectActive() as Observable<Submission>).pipe(takeUntil(this.unsubscribe$)).subscribe(active => {
      const activeId = this.submissionQuery.getActiveId();
      active = active ? active : { id: '', moveNumber: -1 } as Submission;
      if (activeId && active.id === activeId) {
        this.isReady = true;
      }
    });
    // subscribe to submissions
    this.submissionQuery
      .selectAll()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(results => {
        const evaluation = this.evaluationQuery.getActive() as Evaluation;
        if (evaluation) {
          if (results && results.length > 0) {
            let submission = this.submissionQuery.getActive() as Submission;
            if (!submission) {
              submission = results.find(
                (s) =>
                  s.moveNumber == evaluation.currentMoveNumber &&
                  s.userId === this.loggedInUserId
              );
            } else {
              const upToDate = results.some(
                (s) =>
                  s.moveNumber == evaluation.currentMoveNumber &&
                  s.userId === submission.userId &&
                  s.teamId === submission.teamId &&
                  s.evaluationId === submission.evaluationId
              );
              submission = upToDate ? submission : null;
            }
            if (!submission) {
              this.makeNewSubmission(evaluation);
            } else {
              this.userCurrentSubmission = submission;
              this.submissionDataService.setActive(submission.id);
            }
          } else {
            this.makeNewSubmission(evaluation);
          }
        }
      });
    // subscribe to authorizedUser
    this.userDataService.isAuthorizedUser
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((isAuthorized) => {
        this.isAuthorizedUser = isAuthorized;
      });
    // subscribe to route changes
    activatedRoute.queryParamMap.pipe(takeUntil(this.unsubscribe$)).subscribe(params => {
      const evaluationId = params.get('evaluation');
      if (evaluationId) {
        this.selectedEvaluationId = evaluationId;
        this.loadEvaluationData();
      }
      const section = params.get('section');
      switch (section) {
        case 'scoresheet':
          this.selectedSection = Section.scoresheet;
          break;
        default:
          if (this.selectedSection === Section.scoresheet && this.userCurrentSubmission) {
            this.submissionDataService.setActive(this.userCurrentSubmission.id);
          }
          this.selectedSection = Section.dashboard;
          break;
      }
    });
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
      this.teamDataService.loadByEvaluationId(this.selectedEvaluationId);
      this.currentMoveNumber = evaluation.currentMoveNumber;
    }
  }

  loadTeamData() {
    this.teamList.forEach(t => {
      if (t.users.some(u => u.id === this.loggedInUserId)) {
        this.teamDataService.setActive(t.id);
        this.actionDataService.loadByEvaluationTeam(this.selectedEvaluationId, t.id);
        this.roleDataService.loadByEvaluationTeam(this.selectedEvaluationId, t.id);
      }
    });
  }

  selectEvaluation(evaluationId: string) {
    this.router.navigate([], {
      queryParams: { evaluation: evaluationId },
      queryParamsHandling: 'merge',
    });
  }

  makeNewSubmission(evaluation?: Evaluation) {
    if (!evaluation || this.loadedSubmissionsForEvaluation === evaluation) {
      return;
    }
    this.loadedSubmissionsForEvaluation = evaluation;
    const submission = {} as Submission;
    submission.teamId = this.teamQuery.getActiveId();
    submission.evaluationId = evaluation.id;
    submission.moveNumber = evaluation.currentMoveNumber;
    submission.score = 0;
    submission.scoringModelId = evaluation.scoringModelId;
    submission.status = ItemStatus.Active;
    submission.userId = this.loggedInUserId;
    this.submissionDataService.add(submission);
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
      .healthCheck()
      .pipe(take(1))
      .subscribe(
        (message) => {
          this.apiIsSick = message !== 'It is well';
          this.apiMessage = message;
        },
        (error) => {
          this.apiIsSick = true;
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
