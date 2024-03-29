// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, EventEmitter, Input, Output, OnDestroy } from '@angular/core';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { Evaluation, ItemStatus, Move, Team } from 'src/app/generated/cite.api/model/models';
import { EvaluationDataService } from 'src/app/data/evaluation/evaluation-data.service';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { MoveQuery } from 'src/app/data/move/move.query';
import { TeamQuery } from 'src/app/data/team/team.query';
import { Observable, Subject } from 'rxjs';
import { Section } from 'src/app/components/home-app/home-app.component';
import { takeUntil } from 'rxjs';
import { UIDataService } from 'src/app/data/ui/ui-data.service';
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
  @Input() evaluationList: Evaluation[];
  @Input() moveList: Move[];
  @Input() scoresheetOnRight: boolean;
  @Output() incrementActiveMove = new EventEmitter<Move>();
  @Output() decrementActiveMove = new EventEmitter<Move>();
  @Output() changeTeam = new EventEmitter<string>();
  @Output() changeSection = new EventEmitter<string>();
  @Output() changeEvaluation = new EventEmitter<string>();
  selectedEvaluationId = '';
  selectedSection = Section.dashboard;
  dashboardSection = Section.dashboard;
  scoresheetSection = Section.scoresheet;
  reportSection = Section.report;
  displayedMoveNumber = -1;
  currentMoveNumber = -1;
  selectedTeamId = '';
  canIncrementMove = false;
  waitingForCurrentMoveToAdvance = false;
  basePageUrl = location.origin + '/report/';
  private unsubscribe$ = new Subject();

  constructor(
    private evaluationQuery: EvaluationQuery,
    private moveQuery: MoveQuery,
    private teamQuery: TeamQuery,
    private uiDataService: UIDataService,
    private evaluationDataService: EvaluationDataService,
    public dialogService: DialogService,
    private userDataService: UserDataService
  ) {
    // observe the active evaluation
    (this.evaluationQuery.selectActive() as Observable<Evaluation>).pipe(takeUntil(this.unsubscribe$)).subscribe(e => {
      if (e) {
        this.selectedEvaluationId = e.id;
        this.currentMoveNumber = e.currentMoveNumber;
        if (this.waitingForCurrentMoveToAdvance) {
          this.waitingForCurrentMoveToAdvance = false;
          this.incrementDisplayedMove();
        }
      }
    });
    // observe the active move
    (this.moveQuery.selectActive() as Observable<Move>).pipe(takeUntil(this.unsubscribe$)).subscribe(m => {
      this.displayedMoveNumber = m ? m.moveNumber : this.displayedMoveNumber;
    });
    // observe the active team
    (this.teamQuery.selectActive() as Observable<Team>).pipe(takeUntil(this.unsubscribe$)).subscribe(t => {
      if (t) {
        this.selectedTeamId = t ? t.id : this.selectedTeamId;
        this.setSection(this.selectedSection);
      }
    });
    this.setSection(this.uiDataService.getSection() as Section);
    this.selectedTeamId = this.uiDataService.getTeam();
    this.userDataService.canIncrementMove.pipe(takeUntil(this.unsubscribe$)).subscribe(canIncrementMove => {
      this.canIncrementMove = canIncrementMove;
    });
  }

  sortedMoveList() {
    return this.moveList.sort((a, b) => +a.moveNumber < +b.moveNumber ? -1 : 1);
  }

  isMinMoveNumber() {
    return this.sortedMoveList().length === 0 ? true : +this.displayedMoveNumber === +this.sortedMoveList()[0].moveNumber;
  }

  isCurrentMoveNumber() {
    return +this.displayedMoveNumber === +this.currentMoveNumber;
  }

  isIncrementDisabled(): boolean {
    return (this.isCurrentMoveNumber() && !this.canIncrementMove) || (this.canIncrementMove && +this.displayedMoveNumber === +this.getMaxMoveNumber());
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
    if (+nextMoveIndex <= +this.currentMoveNumber) {
      this.displayedMoveNumber = this.sortedMoveList()[nextMoveIndex].moveNumber;
      this.incrementActiveMove.emit(this.sortedMoveList()[nextMoveIndex]);
    } else if (this.canIncrementMove) {
      this.dialogService.confirm(
        'Advance to the next Move?',
        'Are you sure that you want to advance to the next move?'
      ).subscribe((result) => {
        if (result['confirm']) {
          this.advanceCurrentMove(nextMoveIndex);
        }
      });
    }
  }

  decrementDisplayedMove() {
    const nextMoveIndex = this.sortedMoveList().findIndex(m => +m.moveNumber === +this.displayedMoveNumber) - 1;
    if (nextMoveIndex >= 0) {
      this.displayedMoveNumber = this.sortedMoveList()[nextMoveIndex].moveNumber;
      this.decrementActiveMove.emit(this.sortedMoveList()[nextMoveIndex]);
    }
  }

  advanceCurrentMove(nextMoveIndex: number) {
    const evaluation = this.evaluationList.find(e => e.id === this.selectedEvaluationId);
    if (+nextMoveIndex <= +this.getMaxMoveNumber()) {
      const updateEvaluation = { ...evaluation };
      updateEvaluation.currentMoveNumber = nextMoveIndex;
      this.evaluationDataService.changeCurrentMove(updateEvaluation);
      this.waitingForCurrentMoveToAdvance = true;
    }
  }

  selectEvaluation(evaluationId: string) {
    if (evaluationId !== this.selectedEvaluationId) {
      this.selectedEvaluationId = evaluationId;
      this.changeEvaluation.emit(evaluationId);
    }
  }

  setSection(section: Section) {
    if (this.hideScoresheet() && section !== Section.report) {
      section = Section.dashboard;
    }
    this.selectedSection = section;
    this.changeSection.emit(section);
  }

  getTeamShortName() {
    const myTeam = this.teamList.find(t => t.id === this.myTeamId);
    return myTeam ? myTeam.shortName : '';
  }

  setActiveTeam(teamId: string) {
    this.selectedTeamId = teamId;
    this.changeTeam.emit(teamId);
  }

  activeEvaluations(): Evaluation[] {
    return this.evaluationList.filter(e => e.status === ItemStatus.Active);
  }

  hideScoresheet(): boolean {
    let hideIt = this.scoresheetOnRight;
    const selectedTeam = this.teamList?.find(t => t.id === this.selectedTeamId);
    if (!hideIt && selectedTeam) {
      hideIt = selectedTeam.hideScoresheet;
    }
    return hideIt;
  }

  openReport() {
    window.open(this.basePageUrl + this.selectedEvaluationId);
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
