// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Move } from 'src/app/generated/cite.api/model/models';
import { MoveDataService } from 'src/app/data/move/move-data.service';
import { MoveQuery } from 'src/app/data/move/move.query';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { Sort } from '@angular/material/sort';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { MatDialog } from '@angular/material/dialog';
import { AdminMoveEditDialogComponent } from '../admin-move-edit-dialog/admin-move-edit-dialog.component';
import { UntypedFormControl } from '@angular/forms';

@Component({
    selector: 'app-admin-moves',
    templateUrl: './admin-moves.component.html',
    styleUrls: ['./admin-moves.component.scss'],
    standalone: false
})
export class AdminMovesComponent implements OnInit, OnDestroy {
  @Input() evaluationId: string;
  @Input() canEdit: boolean;
  filterControl: UntypedFormControl = this.moveDataService.filterControl;
  filterString = '';
  sort: Sort = {active: 'moveNumber', direction: 'asc'};
  sortedMoves: Move[] = [];
  moveList: Move[];
  filteredMoveList: Move[];
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
    this.moveQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(moves => {
      this.moveList = moves;
      this.sortedMoves = this.getSortedMoves(this.getFilteredMoves(this.moveList));
    });
    this.filterControl.valueChanges
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((term) => {
        this.filterString = term;
        this.sortedMoves = this.getSortedMoves(this.getFilteredMoves(this.moveList));
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
      maxWidth: '90vw',
      width: 'auto',
      minWidth: '900px',
      data: {
        move: move,
        canEdit: this.canEdit
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

  applyFilter(filterValue: string) {
    this.filterControl.setValue(filterValue);
  }

  sortChanged(sort: Sort) {
    this.sort = sort && sort.direction ? sort : {active: 'moveNumber', direction: 'asc'};
    this.sortedMoves = this.getSortedMoves(this.getFilteredMoves(this.moveList));
  }

  getFilteredMoves(moves: Move[]): Move[] {
    let filteredMoves: Move[] = [];
    if (moves) {
      moves.forEach(se => {
        if (se.evaluationId === this.evaluationId) {
          filteredMoves.push({... se});
        }
      });
      if (filteredMoves && filteredMoves.length > 0 && this.filterString) {
        const filterString = this.filterString.toLowerCase();
        filteredMoves = filteredMoves
          .filter((a) =>
            a.description.toLowerCase().includes(filterString)
          );
      }
    }
    return filteredMoves;
  }

  getSortedMoves(moves: Move[]) {
    if (moves) {
      moves.sort((a, b) => this.sortMoves(a, b, this.sort.active, this.sort.direction));
    }
    return moves;
  }

  private sortMoves(
    a: Move,
    b: Move,
    column: string,
    direction: string
  ) {
    const isAsc = direction !== 'desc';
    switch (column) {
      case 'description':
        if (a.description.toLowerCase() === b.description.toLowerCase()) {
          return ( (+a.moveNumber < +b.moveNumber ? -1 : 1) * (isAsc ? 1 : -1) );
        }
        return ( (a.description < b.description ? -1 : 1) * (isAsc ? 1 : -1) );
        break;
      default:
        return ( (+a.moveNumber < +b.moveNumber ? -1 : 1) * (isAsc ? 1 : -1) );
        break;
    }
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
