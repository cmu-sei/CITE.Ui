// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, Input, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Evaluation, ItemStatus, Move, Submission, Team } from 'src/app/generated/cite.api/model/models';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { MoveDataService } from 'src/app/data/move/move-data.service';
import { MoveQuery } from 'src/app/data/move/move.query';
import { SubmissionDataService } from 'src/app/data/submission/submission-data.service';
import { SubmissionQuery } from 'src/app/data/submission/submission.query';
import { TeamDataService } from 'src/app/data/team/team-data.service';
import { TeamQuery } from 'src/app/data/team/team.query';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Section } from 'src/app/components/home-app/home-app.component';
import { UserDataService } from 'src/app/data/user/user-data.service';

@Component({
  selector: 'app-evaluation-info',
  templateUrl: './evaluation-info.component.html',
  styleUrls: ['./evaluation-info.component.scss'],
})
export class EvaluationInfoComponent implements OnDestroy {
  @Input() showAdminButton: boolean;
  @Input() showMoveArrows: boolean;
  @Input() teamList: Team[];
  @Input() myTeamId: string;
  @Input() submissionList: Submission[];
  evaluationList: Evaluation[] = [];
  evaluationList$ = this.evaluationQuery.selectAll();
  selectedEvaluationId = '';
  selectedSection = Section.dashboard;
  scoresheetSection = Section.scoresheet;
  moveList: Move[] = [];
  displayedMoveNumber = -1;
  selectedTeamId = '';
  loggedInUserId = '';
  loggedInUser$ = this.userDataService.loggedInUser;
  submissions$ = this.submissionQuery.selectAll();
  teams$ = this.teamQuery.selectAll();
  activeSubmission: Submission;
  activeSubmission$ = (this.submissionQuery.selectActive() as Observable<Submission>);
  moves$ = (this.moveQuery.selectAll() as Observable<Move[]>);
  private unsubscribe$ = new Subject();

  constructor(
    private evaluationQuery: EvaluationQuery,
    private moveDataService: MoveDataService,
    private moveQuery: MoveQuery,
    private submissionDataService: SubmissionDataService,
    private submissionQuery: SubmissionQuery,
    private teamDataService: TeamDataService,
    private teamQuery: TeamQuery,
    private userDataService: UserDataService,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) {
    // observe the evaluations and submissions
    combineLatest([this.evaluationList$, this.submissions$, this.moves$, this.loggedInUser$, this.teams$]).pipe(takeUntil(this.unsubscribe$)).subscribe(([evaluationList, submissions, moves, user, teams]) => {
      if (!evaluationList || !submissions || !moves || !user || !teams) {
        console.log('something was undefined in the combinelatest');
      }
      this.evaluationList = evaluationList;
      let evaluation: Evaluation;
      if (this.selectedEvaluationId) {
        evaluation = evaluationList.find(e => e.id === this.selectedEvaluationId);
      } else if (evaluationList && evaluationList.length === 1) {
        evaluation = evaluationList[0];
      }
      if (evaluation && !this.displayedMoveNumber) {
        this.displayedMoveNumber = evaluation.currentMoveNumber;
      }
      console.log('eval-info displayed move number is ' + this.displayedMoveNumber);
      this.moveList = moves;
      if (evaluation && teams.length > 0) {
        this.selectedEvaluationId = evaluation.id;
        this.loggedInUserId = user.profile.sub;
        if (!this.selectedTeamId) {
          const selectedTeam = teams.find(t => t.users.some(u => u.id === this.loggedInUserId));
          this.selectedTeamId = selectedTeam ? selectedTeam.id : '';
          this.teamDataService.setActive(selectedTeam.id);
        }
        if (submissions.length === 0) {
          this.makeNewSubmission();
        // don't process the submissions if the selected team has changed, but the new submissions haven't been loaded yet
        } else if (submissions.some(s => s.teamId && s.teamId === this.selectedTeamId)) {
          console.log('Processing submissions for team ' + this.selectedTeamId);
          if (!this.activeSubmission) {
            let submission: Submission;
            const moveNumber = this.displayedMoveNumber > -1 ? this.displayedMoveNumber : evaluation.currentMoveNumber;
            if (this.myTeamId === this.selectedTeamId) {
              submission = submissions.find(s => s.userId && +s.moveNumber === +moveNumber);
            } else {
              submission = submissions.find(s =>
                !s.userId &&
                s.teamId === this.selectedTeamId
                && +s.moveNumber === +moveNumber
              );
            }
            if (submission) {
              console.log('submission setActive move ' + submission.moveNumber);
              this.submissionDataService.setActive(submission.id);
            } else {
              this.makeNewSubmission();
            }
          }
        } else {
          submissions.forEach(s => {
            if (s.teamId) {
              console.log('Got submissions for the wrong team - ' + s.teamId);
            }
          });
        }
      }
    });
    // observe active submission
    this.activeSubmission$.pipe(takeUntil(this.unsubscribe$)).subscribe(activeSubmission => {
      if (activeSubmission) {
        this.activeSubmission = activeSubmission;
        this.displayedMoveNumber = activeSubmission.moveNumber;
        console.log('ActiveSubmission set (move, userId, teamId) = (' + activeSubmission.moveNumber + ', ' + activeSubmission.userId + ', ' + activeSubmission.teamId + ')');
      } else {
        console.log('Observed a blank ActiveSubmission.  Displayed move is ' + this.displayedMoveNumber);
      }
    });
    // subscribe to route changes
    this.activatedRoute.queryParamMap.pipe(takeUntil(this.unsubscribe$)).subscribe(params => {
      const evaluationId = params.get('evaluation');
      if (evaluationId) {
        this.selectedEvaluationId = evaluationId;
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
  }

  makeNewSubmission() {
    const evaluation = this.evaluationList.find(e => e.id === this.selectedEvaluationId);
    const userId = this.selectedTeamId !== this.myTeamId ? null : this.loggedInUserId;
    const submission = {
      teamId: this.selectedTeamId ? this.selectedTeamId : this.myTeamId,
      evaluationId: evaluation.id,
      moveNumber: evaluation.currentMoveNumber,
      score: 0,
      scoringModelId: evaluation.scoringModelId,
      status: ItemStatus.Active,
      userId: userId,
    } as Submission;
    this.submissionDataService.add(submission);
  }

  getMinMoveNumber() {
    let lowestMoveNumber = this.moveList && this.moveList.length > 0 ? Number.MAX_SAFE_INTEGER : 0;
    this.moveList.forEach(m => {
      if (m.moveNumber < lowestMoveNumber) {
        lowestMoveNumber = m.moveNumber;
      }
    });

    return lowestMoveNumber;
  }

  getMaxMoveNumber() {
    let highestMoveNumber = this.moveList && this.moveList.length > 0 ? Number.MIN_SAFE_INTEGER : 0;
    this.moveList.forEach(m => {
      if (m.moveNumber > highestMoveNumber) {
        highestMoveNumber = m.moveNumber;
      }
    });

    return highestMoveNumber;
  }

  getCurrentMoveNumber() {
    if (!this.evaluationList) {
      return -1;
    }
    const evaluation = this.evaluationList.find(e => e.id === this.selectedEvaluationId);
    return evaluation ? evaluation.currentMoveNumber : -1;
  }

  getMoveStyle() {
    return this.activeSubmission && +this.activeSubmission.moveNumber === +this.getCurrentMoveNumber() ? {} : { color: 'darkgray' };
  }

  getMoveDescription() {
    const moveNumber = this.activeSubmission ? this.activeSubmission.moveNumber : -1;
    const move = this.moveList.find(m => m.moveNumber === moveNumber);
    return move ? move.description : 'Move not found in list (description)!';
  }

  incrementDisplayedMove() {
    let newMoveNumber = this.getCurrentMoveNumber();
    this.moveList.forEach(m => {
      if (+m.moveNumber > +this.activeSubmission.moveNumber && +m.moveNumber < +newMoveNumber) {
        newMoveNumber = m.moveNumber;
      }
    });
    const displayedSubmission = this.submissionQuery.getActive() as Submission;
    const submissions = this.submissionQuery.getAll();
    let newSubmission = submissions.find(s =>
      s.moveNumber === +newMoveNumber  &&
      s.userId === displayedSubmission.userId  &&
      s.teamId === displayedSubmission.teamId  &&
      s.groupId === displayedSubmission.groupId  &&
      s.scoreIsAnAverage === displayedSubmission.scoreIsAnAverage
    );
    if (newSubmission) {
      console.log('increment 1 submission setActive move ' + newSubmission.moveNumber);
      this.submissionDataService.setActive(newSubmission.id);
    } else {
      // the new submission would not be allowed, so select the default submission
      if (this.myTeamId === this.selectedTeamId) {
        // select the user score
        newSubmission = submissions.find(s =>
          +s.moveNumber === +newMoveNumber  &&
          s.userId  &&
          s.teamId &&
          !s.groupId  &&
          !s.scoreIsAnAverage
        );
      } else {
        // select the team score
        newSubmission = submissions.find(s =>
          +s.moveNumber === +newMoveNumber  &&
          !s.userId  &&
          s.teamId &&
          !s.groupId  &&
          !s.scoreIsAnAverage
        );
      }
      if (newSubmission) {
        console.log('increment 2 submission setActive move ' + newSubmission.moveNumber);
        this.submissionDataService.setActive(newSubmission.id);
      }
    }
  }

  decrementDisplayedMove() {
    let newMoveNumber = this.getMinMoveNumber();
    this.moveList.forEach(m => {
      if (+m.moveNumber < +this.activeSubmission.moveNumber && +m.moveNumber > +newMoveNumber) {
        newMoveNumber = m.moveNumber;
      }
    });
    const displayedSubmission = this.submissionQuery.getActive() as Submission;
    const newSubmission = this.submissionList
      .find(s => +s.moveNumber === +newMoveNumber
        && s.userId === displayedSubmission.userId
        && s.teamId === displayedSubmission.teamId
        && s.groupId === displayedSubmission.groupId
        && s.scoreIsAnAverage === displayedSubmission.scoreIsAnAverage);
    if (newSubmission) {
      console.log('decrement submission setActive move ' + newSubmission.moveNumber);
      this.submissionDataService.setActive(newSubmission.id);
    }
  }

  selectEvaluation(evaluationId: string) {
    if (evaluationId !== this.selectedEvaluationId) {
      this.displayedMoveNumber = -1;
      this.selectedTeamId = '';
      this.activeSubmission = null;
      this.selectedEvaluationId = '';
      this.moveList = [];
      this.submissionDataService.unload();
      this.teamDataService.unload();
      this.moveDataService.unload();
      this.router.navigate([], {
        queryParams: { evaluation: evaluationId },
        queryParamsHandling: 'merge',
      });
    }
  }

  setSection(section: string) {
    this.router.navigate([], {
      queryParams: { section: section },
      queryParamsHandling: 'merge',
    });
  }

  setActiveTeam(teamId: string) {
    this.selectedTeamId = teamId;
    this.activeSubmission = null;
    console.log('********** Requesting team ' + teamId);
    this.submissionDataService.loadByEvaluationTeam(this.selectedEvaluationId, teamId);
    this.teamDataService.setActive(teamId);
  }

  activeEvaluations(): Evaluation[] {
    return this.evaluationList.filter(e => e.status === ItemStatus.Active);
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
