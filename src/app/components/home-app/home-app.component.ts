// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Subject, Observable, combineLatest } from 'rxjs';
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
  canAccessAdminSection$ = new BehaviorSubject<boolean>(false);
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
  activeEvaluation$ = this.evaluationQuery.selectActive() as Observable<Evaluation>;
  activeScoringModel$ = this.scoringModelQuery.selectActive() as Observable<ScoringModel>;
  evaluationList: Evaluation[] = [];
  evaluationList$ = this.evaluationQuery.selectAll();
  submissionList$ = this.submissionQuery.selectAll();
  displayedSubmission: Submission;
  waitedLongEnough = false;
  isReady = false;
  currentMoveNumber = -1;
  userCurrentSubmission: Submission;
  unreadArticles$ = this.unreadArticlesQuery.selectActive() as Observable<UnreadArticles>;
  evaluationForLoadedSubmissions: Evaluation;
  moveList$ = this.moveQuery.selectAll() as Observable<Move[]>;
  loggedInUser$ = this.userDataService.loggedInUser;
  teamList$ = this.teamQuery.selectAll();
  myTeamId = '';
  myTeamId$ = new BehaviorSubject<string>('');
  activeSubmission$ = new BehaviorSubject<Submission>(null);
  waitingForActiveTeam = false;

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
    // observe the vital information and process it when it is all present
    combineLatest([this.evaluationList$, this.moveList$, this.loggedInUser$, this.teamList$])
      .pipe(takeUntil(this.unsubscribe$)).subscribe(([evaluations, moves, user, teams]) => {
        // set the top bar text
        this.evaluationList = evaluations;
        const numberOfEvaluations = evaluations ? evaluations.length : 0;
        this.topbarText = numberOfEvaluations !== 1 ?
          this.topbarTextBase + ' (' + numberOfEvaluations + ' Active Incidents)' :
          this.topbarTextBase + ' (1 Active Incident)';
        let evaluation: Evaluation;
        // if an evaluation has been selected, make it the active one
        if (this.selectedEvaluationId && evaluations && evaluations.length > 0) {
          evaluation = evaluations.find(e => e.id === this.selectedEvaluationId);
          this.currentMoveNumber = evaluation.currentMoveNumber;
          this.evaluationDataService.setActive(evaluation.id);
        // if there is only one evaluation, make it the active one, so that the user doesn't have to select it
        } else if (evaluations && evaluations.length === 1) {
          evaluation = evaluations[0];
          this.currentMoveNumber = evaluation.currentMoveNumber;
          this.selectedEvaluationId = evaluation.id;
          this.evaluationDataService.setActive(evaluation.id);
        }
        if (evaluation) {
          this.selectedEvaluationId = evaluation.id;
          if (moves.length > 0 && !this.moveQuery.getActive()) {
            if (!this.moveQuery.getActive()) {
              const move = this.moveQuery.getAll().find(m => m.moveNumber === evaluation.currentMoveNumber);
              if (move) {
                this.moveDataService.setActive(move.id);
              }
            }
          }
          if (teams.length > 0 && user.profile) {
            this.loggedInUserId = user.profile.sub;
            // set this user's team and optionally the active team
            this.setTeams(teams, true);
          }
        }
        if (user) {
          this.canAccessAdminSection$.next(this.userDataService.canAccessAdminSection.getValue());
        }
      });
    // observe active evaluation
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
    // observe the submissions
    this.submissionList$.pipe(takeUntil(this.unsubscribe$)).subscribe(submissions => {
      this.processSubmissions(submissions);
    });
    // observe active submission
    (this.submissionQuery.selectActive() as Observable<Submission>).pipe(takeUntil(this.unsubscribe$)).subscribe(s => {
      if (s) {
        this.activeSubmission$.next(s);
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
    const thisScope = this;
    setTimeout(function() {
      thisScope.waitedLongEnough = true;
    }, 1000);
  }

  loadEvaluationData() {
    const evaluation = this.evaluationQuery.getAll().find(e => e.id === this.selectedEvaluationId);
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

  changeEvaluation(evaluationId: string) {
    this.selectedEvaluationId = evaluationId;
    this.moveDataService.unload();
    this.teamDataService.unload();
    this.router.navigate([], {
      queryParams: { evaluation: evaluationId, team: '' },
      queryParamsHandling: 'merge',
    });



    this.router.navigate([], {
      queryParams: { evaluation: evaluationId },
      queryParamsHandling: 'merge',
    });
  }

  incrementActiveMove(move: Move) {
    this.moveDataService.setActive(move.id);
    const displayedSubmission = this.submissionQuery.getActive() as Submission;
    const submissions = this.submissionQuery.getAll();
    let newSubmission = submissions.find(s =>
      +s.moveNumber === +move.moveNumber  &&
      s.userId === displayedSubmission.userId  &&
      s.teamId === displayedSubmission.teamId  &&
      s.groupId === displayedSubmission.groupId  &&
      s.scoreIsAnAverage === displayedSubmission.scoreIsAnAverage
    );
    if (newSubmission) {
      this.setAndGetActiveSubmission(newSubmission.id);
    } else {
      // the new submission would not be allowed, so select the default submission
      if (this.myTeamId === (this.teamQuery.getActive() as Team).id) {
        // select the user score
        newSubmission = submissions.find(s =>
          +s.moveNumber === +move.moveNumber  &&
          s.userId  &&
          s.teamId &&
          !s.groupId  &&
          !s.scoreIsAnAverage
        );
      } else {
        // select the team score
        newSubmission = submissions.find(s =>
          +s.moveNumber === +move.moveNumber  &&
          !s.userId  &&
          s.teamId &&
          !s.groupId  &&
          !s.scoreIsAnAverage
        );
      }
      if (newSubmission) {
        this.setAndGetActiveSubmission(newSubmission.id);
      }
    }
  }

  decrementActiveMove(move: Move) {
    this.moveDataService.setActive(move.id);
    const displayedSubmission = this.submissionQuery.getActive() as Submission;
    const newSubmission = this.submissionQuery.getAll()
      .find(s => +s.moveNumber === +move.moveNumber
        && s.userId === displayedSubmission.userId
        && s.teamId === displayedSubmission.teamId
        && s.groupId === displayedSubmission.groupId
        && s.scoreIsAnAverage === displayedSubmission.scoreIsAnAverage);
    if (newSubmission) {
      this.setAndGetActiveSubmission(newSubmission.id);
    }
  }

  setTeams(teams: Team[], setActive: boolean) {
    teams.forEach(t => {
      if (t.users.some(u => u.id === this.loggedInUserId)) {
        this.myTeamId = t.id;
        this.myTeamId$.next(t.id);
        if (setActive) {
          this.teamDataService.setActive(t.id);
          this.signalRService.switchTeam(t.id, t.id);
        }
        if (this.waitingForActiveTeam) {
          this.processSubmissions(this.submissionQuery.getAll());
        }
      }
    });
  }

  changeTeam(teamId: string) {
    let oldTeamId = this.teamQuery.getActiveId();
    if (oldTeamId !== teamId) {
      // make sure to send a Guid for old team ID
      oldTeamId = oldTeamId ? oldTeamId : teamId;
      this.signalRService.switchTeam(oldTeamId, teamId);
    }
    this.teamDataService.setActive(teamId);
    this.submissionDataService.setActive('');
    this.submissionDataService.unload();
    this.submissionDataService.loadByEvaluationTeam(this.selectedEvaluationId, teamId);
    this.router.navigate([], {
      queryParams: { team: teamId },
      queryParamsHandling: 'merge',
    });
  }

  changeSection(section: string) {
    this.router.navigate([], {
      queryParams: { section: section },
      queryParamsHandling: 'merge',
    });
  }

  processSubmissions(submissions) {
    // process submissions
    const activeTeam = this.teamQuery.getActive() as Team;
    if (!activeTeam) {
      this.waitingForActiveTeam = true;
      return;
    }
    if (submissions.length === 0) {
      this.makeNewSubmission();
    // don't process the submissions if the selected team has changed, but the new submissions haven't been loaded yet
    } else if (submissions.some(s => s.teamId && s.teamId === activeTeam.id)) {
      let activeSubmission = this.activeSubmission$.getValue();
      activeSubmission = activeSubmission ? submissions.find(s => s.id === activeSubmission.id) : null;
      if (!activeSubmission) {
        let submission: Submission;
        const moveNumber = (this.moveQuery.getActive() as Move).moveNumber;
        if (this.myTeamId === activeTeam.id) {
          submission = submissions.find(s => s.userId && +s.moveNumber === +moveNumber);
        } else {
          submission = submissions.find(s =>
            !s.userId &&
            s.teamId === activeTeam.id
            && +s.moveNumber === +moveNumber
          );
        }
        if (submission) {
          this.setAndGetActiveSubmission(submission.id);
        } else {
          this.makeNewSubmission();
        }
      } else {
        this.activeSubmission$.next(activeSubmission);
      }
    }
  }

  makeNewSubmission() {
    const activeTeam = this.teamQuery.getActive() as Team;
    const evaluation = this.evaluationQuery.getAll().find(e => e.id === this.selectedEvaluationId);
    const userId = activeTeam && activeTeam.id !== this.myTeamId ? null : this.loggedInUserId;
    const submission = {
      teamId: activeTeam ? activeTeam.id : this.myTeamId,
      evaluationId: evaluation.id,
      moveNumber: evaluation.currentMoveNumber,
      score: 0,
      scoringModelId: evaluation.scoringModelId,
      status: ItemStatus.Active,
      userId: userId,
    } as Submission;
    this.submissionDataService.add(submission);
  }

  setAndGetActiveSubmission(submissionId: string) {
    this.submissionDataService.loadById(submissionId);
    this.submissionDataService.setActive(submissionId);
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
