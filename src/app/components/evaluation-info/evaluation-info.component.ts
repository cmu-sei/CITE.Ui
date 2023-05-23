// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, EventEmitter, Input, Output, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Evaluation, ItemStatus, Move, Team } from 'src/app/generated/cite.api/model/models';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { MoveDataService } from 'src/app/data/move/move-data.service';
import { MoveQuery } from 'src/app/data/move/move.query';
import { TeamDataService } from 'src/app/data/team/team-data.service';
import { TeamQuery } from 'src/app/data/team/team.query';
import { Observable, Subject } from 'rxjs';
import { Section } from 'src/app/components/home-app/home-app.component';
import { takeUntil } from 'rxjs';

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
  @Input() evaluationList: Evaluation[];
  @Input() moveList: Move[];
  @Output() incrementActiveMove = new EventEmitter<Move>();
  @Output() decrementActiveMove = new EventEmitter<Move>();
  @Output() changeTeam = new EventEmitter<string>();
  @Output() changeSection = new EventEmitter<string>();
  @Output() changeEvaluation = new EventEmitter<string>();
  selectedEvaluationId = '';
  selectedSection = Section.dashboard;
  scoresheetSection = Section.scoresheet;
  displayedMoveNumber = -1;
  currentMoveNumber = -1;
  selectedTeamId = '';
  private unsubscribe$ = new Subject();

  constructor(
    private evaluationQuery: EvaluationQuery,
    private moveDataService: MoveDataService,
    private moveQuery: MoveQuery,
    private teamDataService: TeamDataService,
    private teamQuery: TeamQuery,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) {
    // observe the active evaluation
    (this.evaluationQuery.selectActive() as Observable<Evaluation>).pipe(takeUntil(this.unsubscribe$)).subscribe(e => {
      if (e) {
        this.selectedEvaluationId = e.id;
        this.currentMoveNumber = e.currentMoveNumber;
      }
    });
    // observe the active move
    (this.moveQuery.selectActive() as Observable<Move>).pipe(takeUntil(this.unsubscribe$)).subscribe(m => {
      this.displayedMoveNumber = m ? m.moveNumber : this.displayedMoveNumber;
    });
    // observe the active team
    (this.teamQuery.selectActive() as Observable<Team>).pipe(takeUntil(this.unsubscribe$)).subscribe(t => {
      if (t) {
        console.log('active team query setting selectedTeamId to ' + t.id);
        this.selectedTeamId = t ? t.id : this.selectedTeamId;
      }
    });
    // observe route changes
    this.activatedRoute.queryParamMap.pipe(takeUntil(this.unsubscribe$)).subscribe(params => {
      const section = params.get('section');
      switch (section) {
        case 'scoresheet':
          this.selectedSection = Section.scoresheet;
          break;
        default:
          this.selectedSection = Section.dashboard;
          break;
      }
      const team = params.get('team');
      console.log('query params setting selectedTeamId to ' + team);
      this.selectedTeamId = team ? team : this.selectedTeamId;
    });
  }

  sortedMoveList() {
    return this.moveList.sort((a, b) => +a.moveNumber < +b.moveNumber ? -1 : 1);
  }

  isMinMoveNumber() {
    return this.sortedMoveList().length === 0 ? true : +this.displayedMoveNumber === +this.sortedMoveList()[0].moveNumber;
  }

  isMaxMoveNumber() {
    return +this.displayedMoveNumber === +this.currentMoveNumber;
  }

  getMinMoveNumber() {
    return this.sortedMoveList().length > 0 ? this.sortedMoveList()[0].moveNumber : +this.currentMoveNumber;
  }

  getMaxMoveNumber() {
    return this.sortedMoveList().length > 0 ? this.sortedMoveList()[this.moveList.length - 1].moveNumber : +this.currentMoveNumber;
  }

  getMoveStyle() {
    return +this.displayedMoveNumber === +this.currentMoveNumber ? {} : { color: 'darkgray' };
  }

  getMoveDescription() {
    const move = this.moveList.find(m => m.moveNumber === this.displayedMoveNumber);
    return move ? move.description : 'Move not found in list (description)!';
  }

  incrementDisplayedMove() {
    const nextMoveIndex = this.sortedMoveList().findIndex(m => +m.moveNumber === +this.displayedMoveNumber) + 1;
    if (nextMoveIndex < this.moveList.length) {
      this.displayedMoveNumber = this.sortedMoveList()[nextMoveIndex].moveNumber;
      this.incrementActiveMove.emit(this.sortedMoveList()[nextMoveIndex]);
    }
  }

  decrementDisplayedMove() {
    const nextMoveIndex = this.sortedMoveList().findIndex(m => +m.moveNumber === +this.displayedMoveNumber) - 1;
    if (nextMoveIndex >= 0) {
      this.displayedMoveNumber = this.sortedMoveList()[nextMoveIndex].moveNumber;
      this.decrementActiveMove.emit(this.sortedMoveList()[nextMoveIndex]);
    }
  }

  selectEvaluation(evaluationId: string) {
    if (evaluationId !== this.selectedEvaluationId) {
      this.changeEvaluation.emit(evaluationId);
    }
  }

  setSection(section: string) {
    console.log('before changing section selectedTeamId is ' + this.selectedTeamId);
    this.changeSection.emit(section);
  }

  getTeamShortName() {
    const myTeam = this.teamList.find(t => t.id === this.myTeamId);
    return myTeam ? myTeam.shortName : '';
  }

  setActiveTeam(teamId: string) {
    console.log('setting selecetdTeamId to ' + teamId);
    this.selectedTeamId = teamId;
    this.changeTeam.emit(teamId);
  }

  activeEvaluations(): Evaluation[] {
    return this.evaluationList.filter(e => e.status === ItemStatus.Active);
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
