// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, Input, OnDestroy } from '@angular/core';
import { animate, state, style, transition, trigger} from '@angular/animations';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { TeamQuery } from 'src/app/data/team/team.query';
import {
  Action,
  Evaluation,
  Move,
  Role,
  Team,
  User
} from 'src/app/generated/cite.api/model/models';
import { ActionDataService } from 'src/app/data/action/action-data.service';
import { ActionQuery } from 'src/app/data/action/action.query';
import { MoveQuery } from 'src/app/data/move/move.query';
import { RoleDataService } from 'src/app/data/role/role-data.service';
import { RoleQuery } from 'src/app/data/role/role.query';
import { UnreadArticlesDataService } from 'src/app/data/unread-articles/unread-articles-data.service';
import { UnreadArticles } from 'src/app/data/unread-articles/unread-articles';
import { Title } from '@angular/platform-browser';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { AdminActionEditDialogComponent } from '../admin/admin-action-edit-dialog/admin-action-edit-dialog.component';
import { AdminRoleEditDialogComponent } from '../admin/admin-role-edit-dialog/admin-role-edit-dialog.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({height: '0px', minHeight: '0'})),
      state('expanded', style({height: '*'})),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class DashboardComponent implements OnDestroy {
  @Input() unreadArticles: UnreadArticles;
  @Input() moveList: Move[];
  @Input() myTeamId: string;
  teamUsers: User[];
  selectedEvaluation: Evaluation = {};
  isLoading = false;
  actionList: Action[] = [];
  allActions: Action[] = [];
  roleList: Role[];
  currentMoveNumber: number;
  activeTeamId = '';
  isActionEditMode = false;
  isRoleEditMode = false;
  private unsubscribe$ = new Subject();

  constructor(
    private evaluationQuery: EvaluationQuery,
    private teamQuery: TeamQuery,
    private actionDataService: ActionDataService,
    private actionQuery: ActionQuery,
    private moveQuery: MoveQuery,
    private roleDataService: RoleDataService,
    private roleQuery: RoleQuery,
    private unreadArticlesDataService: UnreadArticlesDataService,
    public dialogService: DialogService,
    public matDialog: MatDialog,
    private titleService: Title
  ) {
    this.titleService.setTitle('CITE Dashboard');
    // observe the selected evaluation
    (this.evaluationQuery.selectActive() as Observable<Evaluation>).pipe(takeUntil(this.unsubscribe$)).subscribe(active => {
      const activeId = this.evaluationQuery.getActiveId();
      active = active ? active : { id: ''} as Evaluation;
      if (active.id === activeId) {
        this.selectedEvaluation = active;
        this.unreadArticlesDataService.loadById(activeId);
      }
    });
    // observe the move list
    (this.moveQuery.selectAll() as Observable<Move[]>).pipe(takeUntil(this.unsubscribe$)).subscribe(moves => {
      this.moveList = moves;
      if (moves && moves.length > 0) {
        const currentMove = moves.find(m => +m.moveNumber === +this.selectedEvaluation.currentMoveNumber);
        this.currentMoveNumber = currentMove ? currentMove.moveNumber : this.currentMoveNumber;
        console.log('Dashboard set the current move to ' + this.currentMoveNumber);
        this.actionList = this.allActions
          .filter(a => +a.moveNumber === +this.currentMoveNumber)
          .sort((a, b) => a.description < b.description ? -1 : 1);
      } else {
        console.log('Dashboard reset the current move');
        this.currentMoveNumber = -1;
        this.actionList = [];
      }
    });
    // observe the active move
    (this.moveQuery.selectActive() as Observable<Move>).pipe(takeUntil(this.unsubscribe$)).subscribe(active => {
      if (active) {
        this.currentMoveNumber = active.moveNumber;
        this.actionList = this.allActions
          .filter(a => +a.moveNumber === +active.moveNumber)
          .sort((a, b) => a.description < b.description ? -1 : 1);
      }
    });
    // observe the active team
    (this.teamQuery.selectActive() as Observable<Team>).pipe(takeUntil(this.unsubscribe$)).subscribe(active => {
      if (active) {
        this.teamUsers = active.users;
        this.activeTeamId = active.id;
        if (active.id) {
          console.log('Dashboard loading articles and roles for team ' + active.id);
          // load the team data for this team
          this.actionDataService.loadByEvaluationTeam(active.evaluationId, active.id);
          this.roleDataService.loadByEvaluationTeam(active.evaluationId, active.id);
        }
      }
    });
    // observe the Action list
    this.actionQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(actions => {
      console.log('Dashboard received '  + actions.length + ' actions for team ');
      this.allActions = actions;
      console.log('Dashboard displaying actions for move ' + this.currentMoveNumber);
      this.actionList = actions
        .filter(a => +a.moveNumber === +this.currentMoveNumber)
        .sort((a, b) => a.description < b.description ? -1 : 1);
    });
    // observe the Role list
    this.roleQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(roles => {
      this.roleList = [];
      roles.forEach(role => {
        const newRole = {... role};
        const newUsers: User[] = [];
        newRole.users.forEach(user => {
          const addUser = this.teamUsers?.find(tu => tu.id === user.id);
          newUsers.push(addUser);
        });
        newRole.users = newUsers;
        this.roleList.push(newRole);
      });
    });
  }

  checkAction(actionId: string, isChecked: boolean) {
    if (isChecked) {
      this.actionDataService.checkAction(actionId);
    } else {
      this.actionDataService.uncheckAction(actionId);
    }
  }

  toggleActionEditMode() {
    this.isActionEditMode = !this.isActionEditMode;
  }

  addOrEditAction(action: Action) {
    if (!action) {
      action = {
        description: '',
        evaluationId: this.selectedEvaluation.id,
        moveNumber: this.currentMoveNumber,
        teamId: this.activeTeamId
      };
    } else {
      action = {... action};
    }
    const dialogRef = this.matDialog.open(AdminActionEditDialogComponent, {
      width: '800px',
      data: {
        action: action
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
      this.actionDataService.add(action);
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

  changedBy(actionId: string) {
    let changedBy = null;
    let isChecked = null;
    const action = this.actionList.find(a => a.id === actionId);

    if (action) {
      isChecked = action && action.isChecked;
      changedBy = action && action.changedBy;
      if (isChecked && changedBy) {
        return 'Selected by ' + this.getUserName(changedBy);
      } else if (!isChecked && changedBy) {
        return 'Unselected by ' + this.getUserName(changedBy);
      }
    }

    return;
  }

  getUserName(id) {
    const theUser = this.teamUsers?.find(tu => tu.id === id);
    return theUser ? theUser.name : '';
  }

  getUserNames(userList: User[]) {
    let nameList = '';
    userList.forEach(u => {
      nameList = u.name ? nameList + u.name + ', ' : nameList;
    });

    return nameList.length > 2 ? nameList.substring(0, nameList.length - 2) : nameList;
  }

  addOrEditRole(role: Role) {
    if (!role) {
      role = {
        name: '',
        evaluationId: this.selectedEvaluation.id,
        teamId: this.activeTeamId
      };
    } else {
      role = {... role};
    }
    const dialogRef = this.matDialog.open(AdminRoleEditDialogComponent, {
      width: '800px',
      data: {
        role: role
      },
    });
    dialogRef.componentInstance.editComplete.subscribe((result) => {
      if (result.saveChanges && result.role) {
        this.saveRole(result.role);
      }
      dialogRef.close();
    });
  }

  saveRole(role: Role) {
    if (role.id) {
      this.roleDataService.updateRole(role);
    } else {
      this.roleDataService.add(role);
    }
  }

  deleteRoleRequest(role: Role) {
    this.dialogService.confirm(
      'Delete this role?',
      'Are you sure that you want to delete this role?'
    ).subscribe((result) => {
      if (result['confirm']) {
        this.roleDataService.delete(role.id);
      }
    });
  }

  updateRoleUsers(role: Role, event: any) {
    const newRoleUsers = event.value;
    if (role.users.length < newRoleUsers.length) {
      newRoleUsers.forEach(nru => {
        if (!role.users.some(ru => ru.id === nru.id)) {
          this.roleDataService.addRoleUser(role.id, nru.id);
        }
      });
    } else {
      role.users.forEach(ru => {
        if (!newRoleUsers.some(nru => ru.id === nru.id)) {
          this.roleDataService.removeRoleUser(role.id, ru.id);
        }
      });
    }
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
