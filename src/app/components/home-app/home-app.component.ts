// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.
import { Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
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
  UnreadArticles,
  User
} from 'src/app/generated/cite.api';
import { MoveDataService } from 'src/app/data/move/move-data.service';
import { MoveQuery } from 'src/app/data/move/move.query';
import { ScoringModelDataService } from 'src/app/data/scoring-model/scoring-model-data.service';
import { ScoringModelQuery } from 'src/app/data/scoring-model/scoring-model.query';
import { SubmissionDataService } from 'src/app/data/submission/submission-data.service';
import { SubmissionQuery } from 'src/app/data/submission/submission.query';
import { TeamDataService } from 'src/app/data/team/team-data.service';
import { TeamQuery } from 'src/app/data/team/team.query';
import { TeamUserDataService } from 'src/app/data/team-user/team-user-data.service';
import { ApplicationArea, SignalRService } from 'src/app/services/signalr.service';
import { GallerySignalRService } from 'src/app/services/gallery-signalr.service';
import { UnreadArticlesQuery } from 'src/app/data/unread-articles/unread-articles.query';
import { UIDataService } from 'src/app/data/ui/ui-data.service';
import { RightSideDisplay } from 'src/app/generated/cite.api/model/rightSideDisplay';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { MatSort, MatSortable } from '@angular/material/sort';
import { Sort } from '@angular/material/sort';

export enum Section {
  dashboard = 'dashboard',
  scoresheet = 'scoresheet',
  report = 'report'
}

@Component({
  selector: 'app-home-app',
  templateUrl: './home-app.component.html',
  styleUrls: ['./home-app.component.scss'],
})
export class HomeAppComponent implements OnDestroy, OnInit {
  @ViewChild('sidenav') sidenav: MatSidenav;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
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
  displayedMoveNumber = -1;
  requestedMoveNumber = -1;
  userCurrentSubmission: Submission;
  unreadArticles$ = this.unreadArticlesQuery.selectActive() as Observable<UnreadArticles>;
  evaluationForLoadedSubmissions: Evaluation;
  moveList$ = this.moveQuery.selectAll() as Observable<Move[]>;
  sortedMoveList: Move[] = [];
  loggedInUser$ = this.userDataService.loggedInUser;
  teamList$ = this.teamQuery.selectAll();
  myTeamId = '';
  myTeamId$ = new BehaviorSubject<string>('');
  activeSubmission$ = this.submissionQuery.selectActive() as Observable<Submission>;
  public filterString: string;
  userList: User[] = [];
  Evaluation: Evaluation[] = [];
  evaluationDataSource = new MatTableDataSource<Evaluation>(new Array<Evaluation>());
  public displayedColumns: string[] = ['description', 'status', 'createdBy', 'dateCreated'];
  public isLoading: boolean;
  waitingForCurrentMoveNumber = 0;
  noChanges$ = new BehaviorSubject<boolean>(false);

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
    private teamUserDataService: TeamUserDataService,
    private signalRService: SignalRService,
    private gallerySignalRService: GallerySignalRService,
    private healthCheckService: HealthCheckService,
    private moveQuery: MoveQuery,
    private unreadArticlesQuery: UnreadArticlesQuery,
    private uiDataService: UIDataService,
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
        this.sortedMoveList = moves.sort((a, b) => +a.moveNumber < +b.moveNumber ? -1 : 1);
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
          this.displayedMoveNumber = this.uiDataService.getMoveNumber(this.selectedEvaluationId);
          this.displayedMoveNumber =
            this.displayedMoveNumber >= 0 && this.displayedMoveNumber <= evaluation.currentMoveNumber ?
              this.displayedMoveNumber :
              evaluation.currentMoveNumber;
          this.uiDataService.setMoveNumber(this.selectedEvaluationId, this.displayedMoveNumber);
          if (moves.length > 0 && !this.moveQuery.getActive()) {
            if (!this.moveQuery.getActive()) {
              const move = this.moveQuery.getAll().find(m => m.moveNumber === this.displayedMoveNumber);
              if (move) {
                this.moveDataService.setActive(move.id);
              }
            }
          }
          if (teams.length > 0 && user && user.profile) {
            this.loggedInUserId = user.profile.sub;
            // set this user's team and the active team
            this.setTeams(teams);
          }
          // if we intiated advancing to next evaluation move, then display it
          if (this.waitingForCurrentMoveNumber > 0) {
            const newMove = this.sortedMoveList.find(m => +m.moveNumber === +this.waitingForCurrentMoveNumber);
            if (newMove) {
              this.waitingForCurrentMoveNumber = 0;
              this.nextDisplayedMove(newMove);
            }
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
        this.noChanges$.next(active.status === ItemStatus.Complete);
      }
    });
    // observe authorizedUser
    this.userDataService.isAuthorizedUser
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((isAuthorized) => {
        this.isAuthorizedUser = isAuthorized;
      });
    //get users
    this.userDataService.userList.pipe(takeUntil(this.unsubscribe$)).subscribe(users => {
      this.userList = users;
    });
    this.userDataService.getUsersFromApi();
    // observe route changes
    activatedRoute.queryParamMap.pipe(takeUntil(this.unsubscribe$)).subscribe(params => {
      // get and set the evaluation
      const evaluationId = params.get('evaluation');
      if (evaluationId) {
        this.evaluationDataService.setActive(evaluationId);
        this.uiDataService.setEvaluation(evaluationId);
      }
      // get the requested section or set the saved section
      const section = params.get('section');
      switch (section) {
        case 'scoresheet':
          // set scoresheet
          this.selectedSection = Section.scoresheet;
          this.uiDataService.setSection(evaluationId, Section.scoresheet);
          // now remove the section from the url, so that refreshes work properly
          this.router.navigate([], {
            queryParams: { evaluation: evaluationId },
          });
          break;
        case 'dashboard':
          // set dashboard
          this.selectedSection = Section.dashboard;
          this.uiDataService.setSection(evaluationId, Section.dashboard);
          // now remove the section from the url, so that refreshes work properly
          this.router.navigate([], {
            queryParams: { evaluation: evaluationId },
          });
          break;
        default:
          // get the saved section
          const savedSection = this.uiDataService.getSection(evaluationId);
          if (savedSection === 'scoresheet') {
            this.selectedSection =  Section.scoresheet;
          } else if (savedSection === 'report') {
            this.selectedSection =  Section.report;
          } else {
            this.selectedSection = Section.dashboard;
          }
          break;
      }
    });
    // observe the submissions
    this.submissionList$.pipe(takeUntil(this.unsubscribe$)).subscribe(submissions => {
      this.processSubmissions(submissions);
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

    this.evaluationQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(evaluations => {
      this.evaluationList = evaluations
        .sort((a, b) => {
          const aDescription = a.description.toLowerCase();
          const bDescription = b.description.toLowerCase();

          if (aDescription < bDescription) {
            return -1;
          } else if (aDescription > bDescription) {
            return 1;
          } else {
            return 0;
          }
        });
      this.setDataSources();
    });

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
    }, 10000);
    this.filterString = '';
    this.evaluationDataSource.sort = this.sort;
  }

  setDataSources() {
    this.evaluationDataSource.data = this.evaluationList;
  }

  loadEvaluationData() {
    const evaluation = this.evaluationQuery.getAll().find(e => e.id === this.selectedEvaluationId);
    if (evaluation) {
      this.evaluationDataService.setActive(this.selectedEvaluationId);
      this.scoringModelDataService.loadById(evaluation.scoringModelId);
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
    this.uiDataService.setEvaluation(evaluationId);
    this.router.navigate([], {
      queryParams: { evaluation: evaluationId },
    });
  }

  nextDisplayedMove(move: Move) {
    this.moveDataService.setActive(move.id);
    this.uiDataService.setMoveNumber(this.selectedEvaluationId, move.moveNumber);
    this.displayedMoveNumber = move.moveNumber;
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
      this.setAndGetActiveSubmission(newSubmission);
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
        this.setAndGetActiveSubmission(newSubmission);
      }
    }
  }

  previousDisplayedMove(move: Move) {
    this.moveDataService.setActive(move.id);
    this.uiDataService.setMoveNumber(this.selectedEvaluationId, move.moveNumber);
    this.displayedMoveNumber = move.moveNumber;
    const displayedSubmission = this.submissionQuery.getActive() as Submission;
    const newSubmission = this.submissionQuery.getAll()
      .find(s => +s.moveNumber === +move.moveNumber
        && s.userId === displayedSubmission.userId
        && s.teamId === displayedSubmission.teamId
        && s.groupId === displayedSubmission.groupId
        && s.scoreIsAnAverage === displayedSubmission.scoreIsAnAverage);
    if (newSubmission) {
      this.setAndGetActiveSubmission(newSubmission);
    }
  }

  nextEvaluationMove(moveNumber: number) {
    const evaluation = this.evaluationList.find(e => e.id === this.selectedEvaluationId);
    if (+moveNumber <= +this.getMaxMoveNumber()) {
      const updateEvaluation = { ...evaluation };
      updateEvaluation.currentMoveNumber = moveNumber;
      this.evaluationDataService.changeCurrentMove(updateEvaluation);
      this.waitingForCurrentMoveNumber = moveNumber;
    }
  }

  getMaxMoveNumber() {
    return this.sortedMoveList.length > 0 ? this.sortedMoveList[this.sortedMoveList.length - 1].moveNumber : +this.currentMoveNumber;
  }

  setTeams(teams: Team[]) {
    // check if saved teamId is in the list of teams
    const savedTeamId = this.uiDataService.getTeam(this.selectedEvaluationId);
    let activeTeamId = teams.some(t => t.id === savedTeamId) ? savedTeamId : '';
    // find the user's team
    teams.forEach(t => {
      if (t.users.some(u => u.id === this.loggedInUserId)) {
        this.myTeamId = t.id;
        this.myTeamId$.next(t.id);
        // if the saved team wasn't in the list, set the user's team to the active team
        if (!activeTeamId) {
          activeTeamId = t.id;
          this.uiDataService.setTeam(this.selectedEvaluationId, activeTeamId);
        }
      }
    });
    if (activeTeamId) {
      this.changeTeam(activeTeamId);
      this.teamUserDataService.loadByTeam(activeTeamId);
    }
  }

  changeTeam(teamId: string) {
    let oldTeamId = this.teamQuery.getActiveId();
    if (oldTeamId !== teamId) {
      // make sure to send a Guid for old team ID
      oldTeamId = oldTeamId ? oldTeamId : teamId;
      // signalR hub: leave the old team and join the new team
      this.signalRService.switchTeam(oldTeamId, teamId);
    }
    // when observing a team, you can't see the user or the team average
    if (teamId && this.myTeamId && teamId !== this.myTeamId) {
      if (this.uiDataService.getSubmissionType(this.selectedEvaluationId) === 'user' || this.uiDataService.getSubmissionType(this.selectedEvaluationId) === 'team-avg') {
        this.uiDataService.setSubmissionType(this.selectedEvaluationId, 'team');
      }
    }
    this.teamDataService.setActive(teamId);
    this.uiDataService.setTeam(this.selectedEvaluationId, teamId);
    this.submissionDataService.setActive('');
    this.moveDataService.setActive('');
    this.submissionDataService.unload();
    this.submissionDataService.loadByEvaluationTeam(this.selectedEvaluationId, teamId);
  }

  changeSection(section: string) {
    this.selectedSection = section as Section;
    this.uiDataService.setSection(this.selectedEvaluationId, section);
  }

  processSubmissions(submissions) {
    // process submissions
    const activeTeam = this.teamQuery.getActive() as Team;
    const scoringModel = this.scoringModelQuery.getActive() as ScoringModel;
    if (!activeTeam || !scoringModel) {
      return;
    }
    if (submissions.length === 0) {
      this.makeNewSubmission();
    // don't process the submissions if the selected team has changed, but the new submissions haven't been loaded yet
    } else if (submissions.some(s => s.teamId && s.teamId === activeTeam.id)) {
      let activeSubmission = this.submissionQuery.getActive() as Submission;
      activeSubmission = activeSubmission ? submissions.find(s => s.id === activeSubmission.id) : null;
      if (!activeSubmission || activeSubmission.submissionCategories.length === 0) {
        let submissionType = this.uiDataService.getSubmissionType(this.selectedEvaluationId);
        if (!submissionType) {
          submissionType = 'user';
        }
        if (submissionType === 'user' && !scoringModel.useUserScore) {
          submissionType = 'team';
        }
        this.selectDisplayedSubmission(submissionType);
      }
    }
  }

  makeNewSubmission() {
    const evaluation = this.evaluationQuery.getAll().find(e => e.id === this.selectedEvaluationId);
    const scoringModel = this.scoringModelQuery.getActive() as ScoringModel;
    const activeTeam = this.teamQuery.getActive() as Team;
    if (!evaluation || ! scoringModel || !activeTeam) {
      return;
    }
    const userId = !scoringModel.useUserScore || activeTeam.id !== this.myTeamId ? null : this.loggedInUserId;
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

  setAndGetActiveSubmission(submission: Submission) {
    if (!submission.scoreIsAnAverage) {
      this.submissionDataService.loadById(submission.id);
    } else {
      if (submission.teamId) {
        this.submissionDataService.loadTeamAverageSubmission(submission);
      } else {
        this.submissionDataService.loadTeamTypeAverageSubmission(submission);
      }
    }
    this.submissionDataService.setActive(submission.id);
    const activeMove = this.sortedMoveList.find(m => +m.moveNumber === +submission.moveNumber);
    this.moveDataService.setActive(activeMove.id);
  }

  selectDisplayedSubmission(selection: string) {
    if (selection === 'report') {
      this.selectedSection = this.selectedSection === this.section.report ? this.section.dashboard : this.section.report;
    } else {
      const submissions = this.submissionQuery.getAll();
      let newSubmission: Submission = null;
      switch (selection) {
        case 'user':
          newSubmission = submissions.find(s =>
            +s.moveNumber === +this.displayedMoveNumber &&
            s.userId === this.loggedInUserId);
          break;
        case 'team':
          newSubmission = submissions.find(s =>
            +s.moveNumber === +this.displayedMoveNumber &&
            s.userId === null &&
            s.teamId !== null &&
            !s.scoreIsAnAverage);
          break;
        case 'team-avg':
          newSubmission = submissions.find(s =>
            +s.moveNumber === +this.displayedMoveNumber &&
            s.userId === null &&
            s.teamId !== null &&
            s.scoreIsAnAverage);
          break;
        case 'group-avg':
          newSubmission = submissions.find(s =>
            +s.moveNumber === +this.displayedMoveNumber &&
            s.userId === null &&
            s.teamId === null &&
            s.scoreIsAnAverage);
          break;
        case 'official':
          newSubmission = submissions.find(s =>
            +s.moveNumber === +this.displayedMoveNumber &&
            s.userId === null &&
            s.teamId === null &&
            s.groupId === null);
          break;
        default:
          break;
      }
      if (newSubmission) {
        this.uiDataService.setSubmissionType(this.selectedEvaluationId, selection);
        this.setAndGetActiveSubmission(newSubmission);
      } else {
        this.makeNewSubmission();
      }
    }
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

  getAppContentClass() {
    if (this.inIframe()) {
      return 'app-model-container-no-topbar mat-elevation-z8 app-score-container-no-topbar ';
    } else {
      return 'app-model-container mat-elevation-z8 app-score-container';
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

  getUsername(userId: string): string {
    const user = this.userList.find(u => u.id === userId);
    return user ? user.name : ' ';
  }

 //Filter evaluation based on description value
 applyFilter(filterValue: string) {
  this.filterString = filterValue;
  filterValue = filterValue.trim();
  filterValue = filterValue.toLowerCase();
  this.evaluationDataSource.filter = filterValue;
}

//clear text on filter search bar
clearFilter() {
  this.applyFilter('');
}

//sort data based on evaluation's description
sortData(sort: Sort) {
  const data = this.evaluationList.slice();
  this.evaluationDataSource.data = data.sort((a, b) => {
    const isAsc = sort.direction === 'asc';
    return this.compare(a.description, b.description, isAsc);
  });
}

//compare function for evaluation's descriptions
compare(a: string, b: string, isAsc: boolean) {
  if (a === null || b === null) {
    return 0;
  } else {
    return (a.toLowerCase() < b.toLowerCase() ? -1 : 1) * (isAsc ? 1 : -1);
  }
}

topBarNavigate(url): void {
  this.router.navigate(['/']).then(() => {
    window.location.reload();
  });
}

ngOnDestroy() {
  this.unsubscribe$.next(null);
  this.unsubscribe$.complete();
  this.signalRService.leave();
  this.gallerySignalRService.leave();
}

}
