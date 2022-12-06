// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, ElementRef, EventEmitter, Input, OnDestroy, ViewChild } from '@angular/core';
import { animate, state, style, transition, trigger} from '@angular/animations';
import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { TeamQuery } from 'src/app/data/team/team.query';
import { UserDataService } from 'src/app/data/user/user-data.service';
import {
         Action,
         Evaluation,
         Move,
         Role,
         Submission,
         Team,
         User
       } from 'src/app/generated/cite.api/model/models';
import { ActionDataService } from 'src/app/data/action/action-data.service';
import { ActionQuery } from 'src/app/data/action/action.query';
import { MoveQuery } from 'src/app/data/move/move.query';
import { RoleDataService } from 'src/app/data/role/role-data.service';
import { RoleQuery } from 'src/app/data/role/role.query';
import { SubmissionQuery } from 'src/app/data/submission/submission.query';
import { UnreadArticlesDataService } from 'src/app/data/unread-articles/unread-articles-data.service';
import { UnreadArticles } from 'src/app/data/unread-articles/unread-articles';

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
  teamUsers: User[];
  selectedEvaluation: Evaluation = {};
  isLoading = false;
  actionList: Action[];
  roleList: Role[];
  currentMove: Move = {};
  private unsubscribe$ = new Subject();

  constructor(
    private evaluationQuery: EvaluationQuery,
    private userDataService: UserDataService,
    private teamQuery: TeamQuery,
    private actionDataService: ActionDataService,
    private actionQuery: ActionQuery,
    private moveQuery: MoveQuery,
    private roleDataService: RoleDataService,
    private roleQuery: RoleQuery,
    private submissionQuery: SubmissionQuery,
    private unreadArticlesDataService: UnreadArticlesDataService,
    private router: Router
  ) {
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
        this.currentMove = moves.find(m => +m.moveNumber === +this.selectedEvaluation.currentMoveNumber);
      } else {
        this.currentMove = {};
      }
    });
    // observe the active submission
    (this.submissionQuery.selectActive() as Observable<Submission>).pipe(takeUntil(this.unsubscribe$)).subscribe(active => {
      const activeId = this.submissionQuery.getActiveId();
      active = active ? active : { id: '', moveNumber: -1, submissionCategories: []} as Submission;
      if (this.moveList && this.moveList.length > 0) {
        this.currentMove = this.moveList.find(m => +m.moveNumber === +active.moveNumber);
      } else {
        this.currentMove = {};
      }
    });

    // observe the active team
    (this.teamQuery.selectActive() as Observable<Team>).pipe(takeUntil(this.unsubscribe$)).subscribe(active => {
      const activeId = this.teamQuery.getActiveId();
      active = active ? active : { id: '' } as Team;
      if (active.id === activeId) {
        this.teamUsers = active.users;
      }
    });
    // observe the Action list
    this.actionQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(actions => {
      this.actionList = actions.sort((a, b) => a.description < b.description ? -1 : 1);
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
