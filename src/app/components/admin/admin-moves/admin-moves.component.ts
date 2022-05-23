// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Move } from 'src/app/generated/cite.api/model/models';
import { MoveDataService } from 'src/app/data/move/move-data.service';
import { MoveQuery } from 'src/app/data/move/move.query';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DialogService } from "src/app/services/dialog/dialog.service";

@Component({
  selector: 'app-admin-moves',
  templateUrl: './admin-moves.component.html',
  styleUrls: ['./admin-moves.component.scss'],
})
export class AdminMovesComponent implements OnInit, OnDestroy {
  @Input() evaluationId: string;
  moveList: Move[];
  isLoading = false;
  topbarColor = '#ef3a47';
  editMove: Move = {};
  scoringModels = [];
  selectedScoringModelId = '';
  private unsubscribe$ = new Subject();

  constructor(
    private settingsService: ComnSettingsService,
    private moveDataService: MoveDataService,
    private moveQuery: MoveQuery,
    private dialogService: DialogService
  ) {
    this.topbarColor = this.settingsService.settings.AppTopBarHexColor
      ? this.settingsService.settings.AppTopBarHexColor
      : this.topbarColor;
    this.moveQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(moves => {
      this.moveList = moves
        .filter(move => move.evaluationId === this.evaluationId)
        .sort((a, b) => +a.moveNumber - b.moveNumber);
    });
  }

  ngOnInit() {
    this.moveDataService.loadByEvaluation(this.evaluationId);
  }

  addMove() {
    const newMoveNumber: number = this.moveList.length > 0 ? +this.moveList[this.moveList.length - 1].moveNumber + 1 : 0;
    const newMoveDescription = 'Move #' + newMoveNumber.toString();
    const newMove = {
      evaluationId: this.evaluationId,
      description: newMoveDescription,
      moveNumber: newMoveNumber
    };
    this.moveDataService.add(newMove);
  }

  editMoveDescription(move: Move) {
    this.editMove = { ...move };
  }

  saveMoveDescription() {
    this.updateMove(this.editMove);
    this.editMove = {};
  }

  cancelMoveDescriptionEdit() {
    this.editMove = {};
  }

  updateMove(move: Move) {
    this.moveDataService.updateMove(move);
  }

  deleteMoveRequest(move: Move) {
    this.dialogService.confirm(
      'Delete this move?',
      'Are you sure that you want to delete ' + move.description + '?'
    ).subscribe((result) => {
      if (result["confirm"]) {
        this.moveDataService.delete(move.id);
      }
    });
  }

  handleInput(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case 'Tab':
        if (this.editMove.id) {
          this.saveMoveDescription();
        }
        break;
      case 'Escape':
        if (this.editMove.id) {
          this.cancelMoveDescriptionEdit();
        }
        break;
      default:
        break;
    }
    event.stopPropagation();
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
