// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import {
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Sort } from '@angular/material/sort';
import {
  Evaluation,
  Action,
  Move,
  Team,
  User,
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

@Component({
    selector: 'app-admin-actions',
    templateUrl: './admin-actions.component.html',
    styleUrls: ['./admin-actions.component.scss'],
    standalone: false
})
export class AdminActionsComponent implements OnDestroy, OnInit {
  @Input() selectedEvaluationId: string;
  teamList: Team[] = [];
  moveList: Move[] = [];
  pageIndex: number = 0;
  pageSize: number = 10;
  isLoading = false;
  topbarColor = '#ef3a47';
  actionList: Action[] = [];
  dataSource = new MatTableDataSource<Action>();
  evaluationList: Evaluation[] = [];
  filteredActionList: Action[] = [];
  filterString = '';
  selectedTeamId = '';
  displayedActions: Action[] = [];
  selectedMoveNumber = -99;
  sort: Sort = {
    active: 'description',
    direction: 'asc',
  };
  displayedColumns: string[] = ['description', 'moveNumber', 'teamId', 'isChecked'];
  private unsubscribe$ = new Subject();

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
    this.topbarColor = this.settingsService.settings.AppTopBarHexColor
      ? this.settingsService.settings.AppTopBarHexColor
      : this.topbarColor;
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
      if (action.teamId) {
        this.actionDataService.add(action);
      } else {
        this.teamList.forEach((team) => {
          action.teamId = team.id;
          this.actionDataService.add(action);
        });
      }
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
      (r) => (!this.selectedTeamId || r.teamId === this.selectedTeamId) && (+this.selectedMoveNumber === -99 || +r.moveNumber === +this.selectedMoveNumber)
    );
  }

  sortChanged(sort: Sort) {
    this.sort = sort;
    this.displayedActions.sort((a, b) =>
      this.sortActions(a, b, sort.active, sort.direction)
    );
  }

  private sortActions(a: Action, b: Action, column: string, direction: string) {
    const isAsc = direction !== 'desc';
    switch (column) {
      case 'description':
        return (
          (a.description.toLowerCase() < b.description.toLowerCase() ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      case 'teamId':
        return (
          (this.getTeamName(a.teamId) < this.getTeamName(b.teamId) ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      default:
        return 0;
    }
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
