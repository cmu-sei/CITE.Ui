// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnDestroy,
  OnInit,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatLegacyPaginator as MatPaginator, LegacyPageEvent as PageEvent } from '@angular/material/legacy-paginator';
import { ActivatedRoute } from '@angular/router';
import { MatSort, Sort } from '@angular/material/sort';
import { Evaluation, Action, Move, Team, User } from 'src/app/generated/cite.api/model/models';
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
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { AdminActionEditDialogComponent } from '../admin-action-edit-dialog/admin-action-edit-dialog.component';

@Component({
  selector: 'app-admin-actions',
  templateUrl: './admin-actions.component.html',
  styleUrls: ['./admin-actions.component.scss'],
})
export class AdminActionsComponent implements OnDestroy, OnInit, AfterViewInit {
  @Input() showSelectionControls: boolean;
  @Input() pageSize: number;
  @Input() pageIndex: number;
  isLoading = false;
  topbarColor = '#ef3a47';
  actionList: Action[] = [];
  dataSource = new MatTableDataSource<Action>();
  selectedEvaluationId = '';
  evaluationList: Evaluation[] = [];
  filterString = '';
  selectedTeamId = '';
  teamList: Team[] = [];
  displayedActions: Action[] = [];
  selectedMoveNumber = -1;
  moveList: Move[] = [];
  userList$: User[] = [];
  sort: Sort = {
    active: 'description',
    direction: 'asc'
  };
  @ViewChild(MatPaginator) paginator: MatPaginator;
  displayedColumns: string[] = [
    'description',
    'teamId',
    'isChecked'
  ];
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
    this.evaluationQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(evaluations => {
      this.evaluationList = evaluations;
      if (!evaluations.some(e => e.id === this.selectedEvaluationId)) {
        this.selectedEvaluationId = '';
        this.selectedTeamId = '';
        this.teamList = [];
        this.actionList = [];
        this.criteriaChanged();
      }
    });
    this.moveDataService.unload();
    this.moveQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(moves => {
      this.moveList = moves;
      if (this.selectedMoveNumber === -1) {
        this.selectedMoveNumber = moves[0] ? +moves[0].moveNumber : -1;
        this.actionDataService.loadByEvaluationMove(this.selectedEvaluationId, this.selectedMoveNumber);
      }
    });
    this.teamQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(teams => {
      this.teamList = teams;
    });
    this.actionDataService.unload();
    this.actionQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe((actions) => {
      this.actionList = actions;
      this.criteriaChanged();
    });
  }

  ngOnInit() {
    if (this.showSelectionControls) {
      if (this.selectedEvaluationId) {
        this.selectEvaluation(this.selectedEvaluationId);
        if (this.selectedMoveNumber >= 0) {
          this.selectMove(this.selectedMoveNumber);
        }
      }
    } else {
      if (this.selectedEvaluationId && (this.selectedMoveNumber >= 0) && this.selectedTeamId) {
        this.actionDataService.loadByEvaluationMoveTeam(this.selectedEvaluationId, +this.selectedMoveNumber, this.selectedTeamId);
        this.teamDataService.loadByEvaluationId(this.selectedEvaluationId);
      }
    }
    
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  selectEvaluation(evaluationId: string) {
    this.selectedEvaluationId = evaluationId;
    this.selectedTeamId = '';
    this.selectedMoveNumber = -1;
    this.actionDataService.unload();
    this.moveDataService.unload();
    this.moveDataService.loadByEvaluation(evaluationId);
    this.teamDataService.loadByEvaluationId(evaluationId);
  }

  selectMove(moveNumber: number) {
    this.selectedMoveNumber = moveNumber;
    this.actionDataService.loadByEvaluationMove(this.selectedEvaluationId, this.selectedMoveNumber);
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
        teamId: this.selectedTeamId
      };
    } else {
      action = {... action};
    }
    const dialogRef = this.dialog.open(AdminActionEditDialogComponent, {
      width: '800px',
      data: {
        action: action,
        teamList: this.teamList
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
        this.teamList.forEach(team => {
          action.teamId = team.id;
          this.actionDataService.add(action);
        });
      }
    }
  }

  deleteActionRequest(action: Action) {
    this.dialogService.confirm(
      'Delete this action?',
      'Are you sure that you want to delete this action?'
    ).subscribe((result) => {
      if (result['confirm']) {
        this.actionDataService.delete(action.id);
      }
    });
  }

  criteriaChanged() {
    if (this.selectedTeamId) {
      this.dataSource.data = this.actionList.filter(r => r.teamId === this.selectedTeamId);
    } else {
      this.dataSource.data = this.actionList;
    }
    this.paginateActions();
  }

  sortChanged(sort: Sort) {
    this.sort = sort;
    this.sortActions();
  }

  sortActions() {
    if (this.sort.active && this.sort.direction !== '') {
      this.dataSource.data = this.dataSource.data.sort((a, b) => {
        const isAsc = this.sort.direction === 'asc';
        switch (this.sort.active) {
          case 'description':
            return this.compare(a.description, b.description, isAsc);
          case 'teamId':
            return this.compare(this.getTeamName(a.teamId), this.getTeamName(b.teamId), isAsc);
          default:
            return 0;
        }
      });
    }
  }

  compare(a: any, b: any, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }
  

  getTeamName(teamId: string) {
    let teamName = '';
    if (teamId) {
      const team = this.teamList.find(t => t.id === teamId);
      if (team) {
        teamName = team.name;
      }
    }
    return teamName;
  }

  paginatorEvent(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.paginateActions();
  }

  paginateActions() {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.displayedActions = this.dataSource.data.slice(startIndex, endIndex);
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
