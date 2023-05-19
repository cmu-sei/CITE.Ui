// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, EventEmitter, Input, Output, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Evaluation, ItemStatus, Move, Submission, Team } from 'src/app/generated/cite.api/model/models';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { MoveQuery } from 'src/app/data/move/move.query';
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
  @Output() setDisplayedMove = new EventEmitter<string>();
  evaluationList: Evaluation[] = [];
  evaluationList$ = this.evaluationQuery.selectAll();
  selectedEvaluationId = '';
  selectedSection = Section.dashboard;
  scoresheetSection = Section.scoresheet;
  moveList: Move[] = [];
  displayedMoveNumber = -1;
  currentMoveNumber = -1;
  selectedTeamId = '';
  loggedInUserId = '';
  loggedInUser$ = this.userDataService.loggedInUser;
  teams$ = this.teamQuery.selectAll();
  moves$ = (this.moveQuery.selectAll() as Observable<Move[]>);
  private unsubscribe$ = new Subject();

  constructor(
    private evaluationQuery: EvaluationQuery,
    private moveQuery: MoveQuery,
    private teamDataService: TeamDataService,
    private teamQuery: TeamQuery,
    private userDataService: UserDataService,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) {
    // observe the vital information and process it when it is all present
    combineLatest([this.evaluationList$, this.moves$, this.loggedInUser$, this.teams$])
      .pipe(takeUntil(this.unsubscribe$)).subscribe(([evaluationList, moves, user, teams]) => {
        this.evaluationList = evaluationList;
        let evaluation: Evaluation;
        if (this.selectedEvaluationId) {
          evaluation = evaluationList.find(e => e.id === this.selectedEvaluationId);
          this.currentMoveNumber = evaluation.currentMoveNumber;
        } else if (evaluationList && evaluationList.length === 1) {
          evaluation = evaluationList[0];
          this.selectedEvaluationId = evaluation.id;
          this.currentMoveNumber = evaluation.currentMoveNumber;
        }
        this.moveList = moves.sort((a, b) => +a.moveNumber < +b.moveNumber ? -1 : 1);
        if (evaluation && this.moveList.length > 0 && +this.displayedMoveNumber === -1) {
          this.displayedMoveNumber = evaluation.currentMoveNumber;
        }
        console.log('eval-info displayed move number is ' + this.displayedMoveNumber);
        if (evaluation && teams.length > 0) {
          this.selectedEvaluationId = evaluation.id;
          this.loggedInUserId = user.profile.sub;
          if (!this.selectedTeamId) {
            const selectedTeam = teams.find(t => t.users.some(u => u.id === this.loggedInUserId));
            this.selectedTeamId = selectedTeam ? selectedTeam.id : '';
            this.teamDataService.setActive(selectedTeam.id);
          }
          // if (submissions.length === 0) {
          //   this.makeNewSubmission();
          // // don't process the submissions if the selected team has changed, but the new submissions haven't been loaded yet
          // } else if (submissions.some(s => s.teamId && s.teamId === this.selectedTeamId)) {
          //   console.log('Processing submissions for team ' + this.selectedTeamId);
          //   if (!this.activeSubmission) {
          //     let submission: Submission;
          //     const moveNumber = this.displayedMoveNumber > -1 ? this.displayedMoveNumber : evaluation.currentMoveNumber;
          //     if (this.myTeamId === this.selectedTeamId) {
          //       submission = submissions.find(s => s.userId && +s.moveNumber === +moveNumber);
          //     } else {
          //       submission = submissions.find(s =>
          //         !s.userId &&
          //         s.teamId === this.selectedTeamId
          //         && +s.moveNumber === +moveNumber
          //       );
          //     }
          //     if (submission) {
          //       console.log('Eval-Info combineLatest setting active submission ' + submission.id);
          //       this.submissionDataService.setActive(submission.id);
          //     } else {
          //       this.makeNewSubmission();
          //     }
          //   }
          // } else {
          //   submissions.forEach(s => {
          //     if (s.teamId) {
          //       console.log('Got submissions for the wrong team - ' + s.teamId);
          //     }
          //   });
          // }
        }
      });
    // // observe active submission
    // this.activeSubmission$.pipe(takeUntil(this.unsubscribe$)).subscribe(activeSubmission => {
    //   if (activeSubmission && this.activeSubmission && this.activeSubmission === activeSubmission) {
    //     this.activeSubmission = activeSubmission;
    //     this.displayedMoveNumber = activeSubmission.moveNumber;
    //     console.log('ActiveSubmission set (move, userId, teamId) = (' +
    //       activeSubmission.moveNumber + ', ' + activeSubmission.userId + ', ' + activeSubmission.teamId + ')');
    //   } else {
    //     console.log('Observed an ActiveSubmission change with nothing to do.  Displayed move is ' + this.displayedMoveNumber);
    //   }
    // });
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

  // makeNewSubmission() {
  //   const evaluation = this.evaluationList.find(e => e.id === this.selectedEvaluationId);
  //   const userId = this.selectedTeamId !== this.myTeamId ? null : this.loggedInUserId;
  //   const submission = {
  //     teamId: this.selectedTeamId ? this.selectedTeamId : this.myTeamId,
  //     evaluationId: evaluation.id,
  //     moveNumber: evaluation.currentMoveNumber,
  //     score: 0,
  //     scoringModelId: evaluation.scoringModelId,
  //     status: ItemStatus.Active,
  //     userId: userId,
  //   } as Submission;
  //   this.submissionDataService.add(submission);
  // }

  isMinMoveNumber() {
    return this.moveList.length === 0 ? true : +this.displayedMoveNumber === +this.moveList[0].moveNumber;
  }

  isMaxMoveNumber() {
    return +this.displayedMoveNumber === +this.currentMoveNumber;
  }

  getMinMoveNumber() {
    return this.moveList.length > 0 ? this.moveList[0].moveNumber : +this.currentMoveNumber;
  }

  getMaxMoveNumber() {
    return this.moveList.length > 0 ? this.moveList[this.moveList.length - 1].moveNumber : +this.currentMoveNumber;
  }

  getMoveStyle() {
    return +this.displayedMoveNumber === +this.currentMoveNumber ? {} : { color: 'darkgray' };
  }

  getMoveDescription() {
    const move = this.moveList.find(m => m.moveNumber === this.displayedMoveNumber);
    return move ? move.description : 'Move not found in list (description)!';
  }

  incrementDisplayedMove() {
    const nextMoveIndex = this.moveList.findIndex(m => +m.moveNumber === +this.displayedMoveNumber) + 1;
    if (nextMoveIndex < this.moveList.length) {
      this.displayedMoveNumber = this.moveList[nextMoveIndex].moveNumber;
      this.setDisplayedMove.emit(this.moveList[nextMoveIndex].id);
    }
    // const displayedSubmission = this.submissionQuery.getActive() as Submission;
    // const submissions = this.submissionQuery.getAll();
    // let newSubmission = submissions.find(s =>
    //   s.moveNumber === +newMoveNumber  &&
    //   s.userId === displayedSubmission.userId  &&
    //   s.teamId === displayedSubmission.teamId  &&
    //   s.groupId === displayedSubmission.groupId  &&
    //   s.scoreIsAnAverage === displayedSubmission.scoreIsAnAverage
    // );
    // if (newSubmission) {
    //   console.log('increment 1 submission setActive move ' + newSubmission.moveNumber);
    //   this.submissionDataService.setActive(newSubmission.id);
    // } else {
    //   // the new submission would not be allowed, so select the default submission
    //   if (this.myTeamId === this.selectedTeamId) {
    //     // select the user score
    //     newSubmission = submissions.find(s =>
    //       +s.moveNumber === +newMoveNumber  &&
    //       s.userId  &&
    //       s.teamId &&
    //       !s.groupId  &&
    //       !s.scoreIsAnAverage
    //     );
    //   } else {
    //     // select the team score
    //     newSubmission = submissions.find(s =>
    //       +s.moveNumber === +newMoveNumber  &&
    //       !s.userId  &&
    //       s.teamId &&
    //       !s.groupId  &&
    //       !s.scoreIsAnAverage
    //     );
    //   }
    //   if (newSubmission) {
    //     console.log('increment 2 submission setActive move ' + newSubmission.moveNumber);
    //     this.submissionDataService.setActive(newSubmission.id);
    //   }
    // }
  }

  decrementDisplayedMove() {
    const nextMoveIndex = this.moveList.findIndex(m => +m.moveNumber === +this.displayedMoveNumber) - 1;
    if (nextMoveIndex >= 0) {
      this.displayedMoveNumber = this.moveList[nextMoveIndex].moveNumber;
      this.setDisplayedMove.emit(this.moveList[nextMoveIndex].id);
    }
    // const displayedSubmission = this.submissionQuery.getActive() as Submission;
    // const newSubmission = this.submissionList
    //   .find(s => +s.moveNumber === +newMoveNumber
    //     && s.userId === displayedSubmission.userId
    //     && s.teamId === displayedSubmission.teamId
    //     && s.groupId === displayedSubmission.groupId
    //     && s.scoreIsAnAverage === displayedSubmission.scoreIsAnAverage);
    // if (newSubmission) {
    //   console.log('decrement submission setActive move ' + newSubmission.moveNumber);
    //   this.submissionDataService.setActive(newSubmission.id);
    // }
  }

  selectEvaluation(evaluationId: string) {
    if (evaluationId !== this.selectedEvaluationId) {
      this.displayedMoveNumber = -1;
      this.selectedTeamId = '';
      this.selectedEvaluationId = '';
      this.moveList = [];
      this.teamDataService.unload();
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

  getTeamShortName() {
    const myTeam = this.teamList.find(t => t.id === this.myTeamId);
    return myTeam ? myTeam.shortName : this.myTeamId;
  }

  setActiveTeam(teamId: string) {
    this.selectedTeamId = teamId;
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
