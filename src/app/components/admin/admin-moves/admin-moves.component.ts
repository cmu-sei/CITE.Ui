// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Move } from 'src/app/generated/cite.api/model/models';
import { MoveDataService } from 'src/app/data/move/move-data.service';
import { MoveQuery } from 'src/app/data/move/move.query';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { AdminMoveEditDialogComponent } from '../admin-move-edit-dialog/admin-move-edit-dialog.component';

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
  private unsubscribe$ = new Subject();

  constructor(
    private settingsService: ComnSettingsService,
    private moveDataService: MoveDataService,
    private moveQuery: MoveQuery,
    private dialogService: DialogService,
    private dialog: MatDialog
  ) {
    this.topbarColor = this.settingsService.settings.AppTopBarHexColor
      ? this.settingsService.settings.AppTopBarHexColor
      : this.topbarColor;
    this.moveQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(moves => {
      this.moveList = moves
        .sort((a, b) => +a.moveNumber - b.moveNumber);
    });
  }

  ngOnInit() {
    this.moveDataService.loadByEvaluation(this.evaluationId);
  }

  addOrEditMove(move: Move) {
    if (!move) {
      move = {
        evaluationId: this.evaluationId,
        description: '',
        moveNumber: this.moveList.length !== 0 ? this.moveList.length : 0,
        situationDescription: '',
        situationTime: new Date()
      };
    } else {
      move = {... move};
    }
    const dialogRef = this.dialog.open(AdminMoveEditDialogComponent, {
      width: '800px',
      data: {
        move: move
      },
    });
    dialogRef.componentInstance.editComplete.subscribe((result) => {
      if (result.saveChanges && result.move) {
        if (result.move.id) {
          this.moveDataService.updateMove(move);
        } else {
          this.moveDataService.add(result.move);
        }
      }
      dialogRef.close();
    });
  }

  deleteMoveRequest(move: Move) {
    this.dialogService.confirm(
      'Delete this move?',
      'Are you sure that you want to delete ' + move.description + '?'
    ).subscribe((result) => {
      if (result['confirm']) {
        this.moveDataService.delete(move.id);
      }
    });
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
