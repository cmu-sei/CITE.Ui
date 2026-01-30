// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { MatSort, Sort } from '@angular/material/sort';
import {
  Evaluation,
  Action,
  Move,
  Team,
} from 'src/app/generated/cite.api/model/models';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { ActionDataService } from 'src/app/data/action/action-data.service';
import { ActionQuery } from 'src/app/data/action/action.query';
import { MoveDataService } from 'src/app/data/move/move-data.service';
import { MoveQuery } from 'src/app/data/move/move.query';
import { TeamDataService } from 'src/app/data/team/team-data.service';
import { TeamQuery } from 'src/app/data/team/team.query';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { AdminActionEditDialogComponent } from '../admin-action-edit-dialog/admin-action-edit-dialog.component';

const ALL_MOVES_VALUE: number = -999;

@Component({
    selector: 'app-admin-actions',
    templateUrl: './admin-actions.component.html',
    styleUrls: ['./admin-actions.component.scss'],
    standalone: false
})

export class AdminActionsComponent implements OnDestroy, OnInit {
  @Input() selectedEvaluationId: string;
  @Input() canEdit: boolean;
  teamList: Team[] = [];
  moveList: Move[] = [];
  pageIndex: number = 0;
  pageSize: number = 10;
  isLoading = false;
  topbarColor = '#ef3a47';
  actionList: Action[] = [];
  evaluationList: Evaluation[] = [];
  filteredActionList: Action[] = [];
  filterString = '';
  selectedTeamId = '';
  displayedActions: Action[] = [];
  selectedMoveNumber = ALL_MOVES_VALUE;
  allMovesValue = ALL_MOVES_VALUE;
  displayedColumns: string[] = ['description', 'moveNumber', 'teamId', 'isChecked'];
  private unsubscribe$ = new Subject();
  dataSource = new MatTableDataSource<Action>();
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private settingsService: ComnSettingsService,
    private evaluationQuery: EvaluationQuery,
    private actionDataService: ActionDataService,
    private actionQuery: ActionQuery,
    private moveDataService: MoveDataService,
    private moveQuery: MoveQuery,
    private teamDataService: TeamDataService,
    private teamQuery: TeamQuery,
    private dialog: MatDialog,
    public dialogService: DialogService,
    public matDialog: MatDialog
  ) {
    this.evaluationQuery
      .selectAll()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((evaluations) => {
        this.evaluationList = evaluations;
        if (!evaluations.some((e) => e.id === this.selectedEvaluationId)) {
          this.selectedEvaluationId = '';
          this.selectedTeamId = '';
          this.teamList = [];
          this.actionList = [];
          this.criteriaChanged();
        }
      });
    this.moveQuery
      .selectAll()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((moves) => {
        this.moveList = moves;
      });
    this.teamQuery
      .selectAll()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((teams) => {
        this.teamList = teams;
      });
    this.actionQuery
      .selectAll()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((actions) => {
        this.actionList = actions;
        this.criteriaChanged();
      });
  }

  ngOnInit() {
    this.moveDataService.loadByEvaluation(this.selectedEvaluationId);
    this.teamDataService.loadByEvaluationId(this.selectedEvaluationId);
    this.actionDataService.loadByEvaluation(this.selectedEvaluationId);
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    const initialSortState: Sort = {
      active: 'moveNumber',
      direction: 'asc'
    };
    this.dataSource.data = this.displayedActions;
    this.sort.active = initialSortState.active;
    this.sort.direction = initialSortState.direction;
    this.sort.sortChange.emit(initialSortState);
  }

  selectMove(moveNumber: number) {
    this.selectedMoveNumber = moveNumber;
    this.criteriaChanged();
  }

  selectTeam(teamId: string) {
    this.selectedTeamId = teamId;
    this.criteriaChanged();
  }

  addOrEditAction(action: Action) {
    if (!action) {
      action = {
        description: '',
        evaluationId: this.selectedEvaluationId,
        moveNumber: this.selectedMoveNumber,
        teamId: this.selectedTeamId,
      };
    } else {
      action = { ...action };
    }
    const dialogRef = this.dialog.open(AdminActionEditDialogComponent, {
      width: '800px',
      data: {
        action: action,
        teamList: this.teamList,
        moveList: this.moveList,
        allMovesValue: ALL_MOVES_VALUE
      },
    });
    dialogRef.componentInstance.editComplete.subscribe((result) => {
      if (result.saveChanges && result.action) {
        this.saveAction(result.action);
      }
      dialogRef.close();
    });
  }

  saveAction(action: Action) {
    if (action.id) {
      this.actionDataService.updateAction(action);
    } else {
      const addAllMoves = +action.moveNumber === ALL_MOVES_VALUE;
      const addAllTeams = !action.teamId;
      this.moveList.forEach((move) => {
        if (addAllMoves || +move.moveNumber === +action.moveNumber) {
          action.moveNumber = move.moveNumber;
          this.teamList.forEach((team) => {
            if (addAllTeams || action.teamId === team.id) {
              action.teamId = team.id;
              this.actionDataService.add(action);
            }
          });
        }
      });
    }
  }

  deleteActionRequest(action: Action) {
    this.dialogService
      .confirm(
        'Delete this action?',
        'Are you sure that you want to delete this action?'
      )
      .subscribe((result) => {
        if (result['confirm']) {
          this.actionDataService.delete(action.id);
        }
      });
  }

  criteriaChanged() {
    this.displayedActions = this.actionList.filter(
      (r) => (!this.selectedTeamId || r.teamId === this.selectedTeamId) && (+this.selectedMoveNumber === ALL_MOVES_VALUE || +r.moveNumber === +this.selectedMoveNumber)
    );
    this.dataSource.data = this.displayedActions;
  }

  getTeamName(teamId: string) {
    let teamName = '';
    if (teamId) {
      const team = this.teamList.find((t) => t.id === teamId);
      if (team) {
        teamName = team.name;
      }
    }
    return teamName;
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
