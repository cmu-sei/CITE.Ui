// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Evaluation, ItemStatus, Move, Submission, Team } from 'src/app/generated/cite.api/model/models';
import { MoveQuery } from 'src/app/data/move/move.query';
import { SubmissionDataService } from 'src/app/data/submission/submission-data.service';
import { SubmissionQuery } from 'src/app/data/submission/submission.query';
import { TeamDataService } from 'src/app/data/team/team-data.service';
import { TeamQuery } from 'src/app/data/team/team.query';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Section } from 'src/app/components/home-app/home-app.component';

@Component({
  selector: 'app-evaluation-info',
  templateUrl: './evaluation-info.component.html',
  styleUrls: ['./evaluation-info.component.scss'],
})
export class EvaluationInfoComponent {
  @Input() showAdminButton: boolean;
  @Input() showMoveArrows: boolean;
  @Input() evaluationList: Evaluation[];
  @Input() teamList: Team[];
  selectedEvaluationId = '';
  selectedSection = Section.dashboard;
  scoresheetSection = Section.scoresheet;
  currentTeamId = '';
  maxMoveNumber = 0;
  minMoveNumber = 0;
  displayedMoveNumber = -1;
  displayedMoveDescription = '';
  displayedMoveStyle = {  };
  moveList: Move[] = [];
  selectedTeam: Team = {} as Team;
  private unsubscribe$ = new Subject();

  constructor(
    private moveQuery: MoveQuery,
    private submissionDataService: SubmissionDataService,
    private submissionQuery: SubmissionQuery,
    private teamDataService: TeamDataService,
    private teamQuery: TeamQuery,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) {
    // observe the move list
    (this.moveQuery.selectAll() as Observable<Move[]>).pipe(takeUntil(this.unsubscribe$)).subscribe(moves => {
      this.moveList = moves;
      if (moves && moves.length > 0) {
        const currentMove = moves.find(m => +m.moveNumber === this.displayedMoveNumber);
        this.displayedMoveDescription =  currentMove ? currentMove.description : '';
        this.maxMoveNumber = moves.sort((a, b) => +b.moveNumber - a.moveNumber)[0].moveNumber;
        this.minMoveNumber = moves.sort((a, b) => +a.moveNumber - b.moveNumber)[0].moveNumber;
      } else {
        this.displayedMoveDescription =  '';
        this.maxMoveNumber = 0;
        this.minMoveNumber = 0;
      }
    });
    // observe the active submission
    (this.submissionQuery.selectActive() as Observable<Submission>).pipe(takeUntil(this.unsubscribe$)).subscribe(active => {
      const activeId = this.submissionQuery.getActiveId();
      active = active ? active : { id: '', moveNumber: -1 } as Submission;
      if (active.id === activeId) {
        this.displayedMoveNumber = active.moveNumber;
        const currentMove = this.moveList.find(m => +m.moveNumber === +active.moveNumber);
        this.displayedMoveDescription =  currentMove ? currentMove.description : '';
        this.displayedMoveStyle = !this.selectedEvaluationId ||
            (+this.displayedMoveNumber === +this.getCurrentMoveNumber()) ? {  } : { color: 'darkgray' };
        this.currentTeamId = active.teamId;
      }
    });
    // observe the selected team
    (this.teamQuery.selectActive() as Observable<Team>).pipe(takeUntil(this.unsubscribe$)).subscribe(active => {
      this.selectedTeam = active ? active : this.selectedTeam;
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

  getLowestMoveNumber() {
    let lowestMoveNumber = this.moveList && this.moveList.length > 0 ? Number.MAX_SAFE_INTEGER : 0;
    this.moveList.forEach(m => {
      if (m.moveNumber < lowestMoveNumber) {
        lowestMoveNumber = m.moveNumber;
      }
    });

    return lowestMoveNumber;
  }

  getHighestMoveNumber() {
    let highestMoveNumber = this.moveList && this.moveList.length > 0 ? Number.MIN_SAFE_INTEGER : 0;
    this.moveList.forEach(m => {
      if (m.moveNumber > highestMoveNumber) {
        highestMoveNumber = m.moveNumber;
      }
    });

    return highestMoveNumber;
  }

  incrementDisplayedMove() {
    let newMoveNumber = this.getCurrentMoveNumber();
    this.moveList.forEach(m => {
      if (+m.moveNumber > +this.displayedMoveNumber && +m.moveNumber < +newMoveNumber) {
        newMoveNumber = m.moveNumber;
      }
    });
    const displayedSubmission = this.submissionQuery.getActive() as Submission;
    const submissions = this.submissionQuery.getAll();
    let newSubmission = submissions.find(s =>
      +s.moveNumber === +newMoveNumber  &&
      s.userId === displayedSubmission.userId  &&
      s.teamId === displayedSubmission.teamId  &&
      s.groupId === displayedSubmission.groupId  &&
      s.scoreIsAnAverage === displayedSubmission.scoreIsAnAverage
    );
    if (newSubmission) {
      this.submissionDataService.setActive(newSubmission.id);
    } else {
      // the new submission would not be allowed, so select the user's submission
      newSubmission = submissions.find(s =>
        +s.moveNumber === +newMoveNumber  &&
        s.userId  &&
        s.teamId &&
        !s.groupId  &&
        !s.scoreIsAnAverage
      );
      if (newSubmission) {
        this.submissionDataService.setActive(newSubmission.id);
      }
    }
  }

  decrementDisplayedMove() {
    let newMoveNumber = this.minMoveNumber;
    this.moveList.forEach(m => {
      if (+m.moveNumber < +this.displayedMoveNumber && +m.moveNumber > +newMoveNumber) {
        newMoveNumber = m.moveNumber;
      }
    });
    const displayedSubmission = this.submissionQuery.getActive() as Submission;
    const newSubmission = this.submissionQuery.getAll()
      .find(s => +s.moveNumber === +newMoveNumber
        && s.userId === displayedSubmission.userId
        && s.teamId === displayedSubmission.teamId
        && s.groupId === displayedSubmission.groupId
        && s.scoreIsAnAverage === displayedSubmission.scoreIsAnAverage);
    if (newSubmission) {
      this.submissionDataService.setActive(newSubmission.id);
    }
  }

  getCurrentMoveNumber() {
    if (!this.evaluationList) {
      return -1;
    }
    const evaluation = this.evaluationList.find(e => e.id === this.selectedEvaluationId);
    return evaluation ? evaluation.currentMoveNumber : -1;
  }

  selectEvaluation(evaluationId: string) {
    if (evaluationId !== this.selectedEvaluationId) {
      this.submissionDataService.unload();
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
    this.teamDataService.setActive(teamId);
  }

  activeEvaluations(): Evaluation[] {
    return this.evaluationList.filter(e => e.status === ItemStatus.Active);
  }

}
