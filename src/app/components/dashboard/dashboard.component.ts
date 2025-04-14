// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, Input, OnDestroy } from '@angular/core';
import { animate, state, style, transition, trigger} from '@angular/animations';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  Action,
  Evaluation,
  Move,
  Role,
  ScoringModel,
  Team,
  TeamUser,
  User
} from 'src/app/generated/cite.api/model/models';
import { ActionDataService } from 'src/app/data/action/action-data.service';
import { ActionQuery } from 'src/app/data/action/action.query';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { MoveQuery } from 'src/app/data/move/move.query';
import { RoleDataService } from 'src/app/data/role/role-data.service';
import { RoleQuery } from 'src/app/data/role/role.query';
import { ScoringModelQuery } from 'src/app/data/scoring-model/scoring-model.query';
import { TeamQuery } from 'src/app/data/team/team.query';
import { TeamUserDataService } from 'src/app/data/team-user/team-user-data.service';
import { TeamUserQuery } from 'src/app/data/team-user/team-user.query';
import { UnreadArticlesDataService } from 'src/app/data/unread-articles/unread-articles-data.service';
import { UnreadArticles } from 'src/app/data/unread-articles/unread-articles';
import { Title } from '@angular/platform-browser';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { AdminActionEditDialogComponent } from '../admin/admin-action-edit-dialog/admin-action-edit-dialog.component';
import { AdminRoleEditDialogComponent } from '../admin/admin-role-edit-dialog/admin-role-edit-dialog.component';
import { AngularEditorConfig } from '@kolkov/angular-editor';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { DateTimeFormatOptions } from 'luxon';
import { UserDataService } from 'src/app/data/user/user-data.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition(
        'expanded <=> collapsed',
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')
      ),
    ]),
  ],
})
export class DashboardComponent implements OnDestroy {
  @Input() unreadArticles: UnreadArticles;
  @Input() myTeamId: string;
  @Input() noChanges: boolean;
  usersOnTheTeam: User[] = [];
  teamUsers: TeamUser[] = [];
  selectedEvaluation: Evaluation = {};
  scoringModel: ScoringModel = {};
  isLoading = false;
  actionList: Action[] = [];
  allActions: Action[] = [];
  roleList: Role[] = [];
  moveList: Move[] = [];
  currentMoveNumber: number;
  displayedMoveNumber: number;
  activeTeamId = '';
  isActionEditMode = false;
  isRoleEditMode = false;
  private unsubscribe$ = new Subject();
  editorConfig: AngularEditorConfig = {
    editable: false,
    height: 'auto',
    minHeight: '0',
    maxHeight: '400px',
    width: '100%',
    minWidth: '0',
    translate: 'yes',
    enableToolbar: false,
    showToolbar: false,
    placeholder: '',
    defaultParagraphSeparator: '',
    defaultFontName: '',
    defaultFontSize: '',
    sanitize: true,
  };
  galleryUrl = '';
  originalRole: Role = {};
  modifiedRole: Role = {};
  completeSituationDescription = '';
  loggedInUserId = '';
  showPermissions = false;
  showRoles = false;

  constructor(
    private actionDataService: ActionDataService,
    private actionQuery: ActionQuery,
    private evaluationQuery: EvaluationQuery,
    private moveQuery: MoveQuery,
    private roleDataService: RoleDataService,
    private roleQuery: RoleQuery,
    private scoringModelQuery: ScoringModelQuery,
    private teamQuery: TeamQuery,
    private teamUserDataService: TeamUserDataService,
    private teamUserQuery: TeamUserQuery,
    private unreadArticlesDataService: UnreadArticlesDataService,
    public dialogService: DialogService,
    public matDialog: MatDialog,
    private titleService: Title,
    private userDataService: UserDataService,
    private settingsService: ComnSettingsService
  ) {
    this.titleService.setTitle('CITE Dashboard');
    // observe the selected evaluation
    (this.evaluationQuery.selectActive() as Observable<Evaluation>)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((active) => {
        const activeId = this.evaluationQuery.getActiveId();
        active = active ? active : ({ id: '' } as Evaluation);
        if (active.id === activeId) {
          this.selectedEvaluation = active;
          this.currentMoveNumber = active.currentMoveNumber;
          this.unreadArticlesDataService.loadById(activeId);
          this.galleryUrl =
            this.settingsService.settings.GalleryUiUrl +
            '?exhibit=' +
            active.galleryExhibitId +
            '&section=archive';
          this.setCompleteSituationDescription();
          // load the team data
          this.loadTeamData();
        }
      });
    // observe the move list
    this.moveQuery
      .selectAll()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((moves) => {
        this.moveList = moves;
      });
    // observe the active move
    (this.moveQuery.selectActive() as Observable<Move>)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((active) => {
        if (active) {
          this.displayedMoveNumber = active.moveNumber;
          this.actionList = this.allActions
            .filter((a) => +a.moveNumber === +active.moveNumber)
            .sort((a, b) => (a.description < b.description ? -1 : 1));
        }
        this.setCompleteSituationDescription();
        // load the team data
        this.loadTeamData();
      });
    // observe the active team
    (this.teamQuery.selectActive() as Observable<Team>)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((active) => {
        if (active) {
          this.usersOnTheTeam = active.users;
          this.activeTeamId = active.id;
          // load the team data for this team
          this.loadTeamData();
        }
      });
    // observe the Action list
    this.actionQuery
      .selectAll()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((actions) => {
        this.allActions = actions;
        this.actionList = actions
          .filter((a) => +a.moveNumber === +this.displayedMoveNumber)
          .sort((a, b) => (a.description < b.description ? -1 : 1));
      });
    // observe the Role list
    this.roleQuery
      .selectAll()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((roles) => {
        this.roleList = [];
        roles.forEach((role) => {
          const newRole = { ...role };
          const newUsers: User[] = [];
          newRole.users.forEach((user) => {
            const addUser = this.usersOnTheTeam?.find(
              (tu) => tu.id === user.id
            );
            newUsers.push(addUser);
          });
          newRole.users = newUsers;
          this.roleList.push(newRole);
        });
      });
    // observe the scoring model
    (this.scoringModelQuery.selectActive() as Observable<ScoringModel>)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((scoringModel) => {
        this.scoringModel = scoringModel;
        this.setCompleteSituationDescription();
      });
    // observe the TeamUsers
    this.teamUserQuery
      .selectAll()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((tUsers) => {
        this.teamUsers = tUsers;
      });
    // observe the logged in user ID
    this.userDataService.loggedInUser
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((user) => {
        if (user && user.profile && user.profile.sub !== this.loggedInUserId) {
          this.loggedInUserId = user.profile.sub;
        }
      });
  }

  setCompleteSituationDescription() {
    if (!this.selectedEvaluation) {
      return;
    }
    const dateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZoneName: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    } as DateTimeFormatOptions;
    let description = '';
    let pastMovesBannerAdded = false;
    let lastDisplayedMoveNumber = 0;
    const isDisplayedMoveCurrent = +this.displayedMoveNumber === +this.currentMoveNumber;

    if (isDisplayedMoveCurrent) {
      const displayedMove = this.moveList.find(
        (m) => +m.moveNumber === +this.displayedMoveNumber
      );
      description =
        '<div style="display: flex; align-items: center; font-size: 25px;">' +
        '<b>' +
        'Current Move: ' +
        displayedMove.description +
        '</b></div>' +
        '</div>' +
        '<h4>' +
        this.selectedEvaluation.situationTime?.toLocaleString(
          'en-US',
          dateTimeFormatOptions
        ) +
        '<br /></h4>' +
        this.selectedEvaluation.situationDescription;
    } else if (
      this.moveList &&
      this.moveList.length > 0 &&
      this.displayedMoveNumber
    ) {
      const displayedMove = this.moveList.find(
        (m) => +m.moveNumber === +this.displayedMoveNumber
      );
      description =
        '<div style="display: flex; align-items: center; font-size: 25px;">' +
        'Previous Move: ' +
        displayedMove.description +
        '</div>' +
        '<h4>' +
        displayedMove.situationTime?.toLocaleString(
          'en-US',
          dateTimeFormatOptions
        ) +
        '<br /></h4>' +
        displayedMove.situationDescription;
      pastMovesBannerAdded = true;
      lastDisplayedMoveNumber = +this.displayedMoveNumber;
    }

    if (this.scoringModel && this.scoringModel.showPastSituationDescriptions) {
      this.moveList?.forEach((m) => {
        if (+m.moveNumber < +this.displayedMoveNumber) {
          // Add the "Previous Moves" banner only for the first past move number
          if (!pastMovesBannerAdded) {
            description =
              description +
              '<br /><div style="display: flex; align-items: center; font-size: 25px;">' +
              '<div style="flex: 1; border-bottom: 3px solid grey; margin: 0 10px;"></div>' +
              'Previous Moves' +
              '<div style="flex: 1; border-bottom: 3px solid grey; margin: 0 10px;"></div>' +
              '</div>';
            pastMovesBannerAdded = true;
          } else {
            // Add a line separator for past moves without the banner
            description =
              description +
              '<br><div style="border-bottom: 3px solid grey; margin: 5px;"></div>';
          }

          // Add the past move details
          description =
            description +
            '<h4>' +
            m.situationTime.toLocaleString('en-US', dateTimeFormatOptions) +
            '</h4>' +
            m.situationDescription +
            '</div>';
        }
      });
    }
    this.completeSituationDescription = description;
  }

  loadTeamData() {
    // load the team data for this team
    if (this.activeTeamId && this.selectedEvaluation.id) {
      this.actionDataService.loadByEvaluationTeam(
        this.selectedEvaluation.id,
        this.activeTeamId
      );
      this.roleDataService.loadByEvaluationTeam(
        this.selectedEvaluation.id,
        this.activeTeamId
      );
      this.teamUserDataService.loadByTeam(this.activeTeamId);
    }
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
        moveNumber: this.displayedMoveNumber,
        teamId: this.activeTeamId,
      };
    } else {
      action = { ...action };
    }
    const dialogRef = this.matDialog.open(AdminActionEditDialogComponent, {
      width: '800px',
      data: {
        action: action,
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

  changedBy(actionId: string) {
    let changedBy = null;
    let isChecked = null;
    const action = this.actionList.find((a) => a.id === actionId);

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
    const theUser = this.usersOnTheTeam?.find((u) => u.id === id);
    return theUser ? theUser.name : '';
  }

  getUserNames(userList: User[]) {
    let nameList = '';
    userList.forEach((u) => {
      nameList = u.name ? nameList + u.name + ', ' : nameList;
    });

    return nameList.length > 2
      ? nameList.substring(0, nameList.length - 2)
      : nameList;
  }

  addOrEditRole(role: Role) {
    if (!role) {
      role = {
        name: '',
        evaluationId: this.selectedEvaluation.id,
        teamId: this.activeTeamId,
      };
    } else {
      role = { ...role };
    }
    const dialogRef = this.matDialog.open(AdminRoleEditDialogComponent, {
      width: '800px',
      data: {
        role: role,
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
    this.dialogService
      .confirm(
        'Delete this role?',
        'Are you sure that you want to delete this role?'
      )
      .subscribe((result) => {
        if (result['confirm']) {
          this.roleDataService.delete(role.id);
        }
      });
  }

  openRoleUsers(role: Role) {
    Object.assign(this.originalRole, role);
    Object.assign(this.modifiedRole, role);
  }

  updateRoleUsers(roleId: string, event: any) {
    if (roleId !== this.originalRole.id || roleId !== this.modifiedRole.id) {
      alert(
        'There has been an error on this page.  Please refresh your browser and try again.  If the problem persists, please contact your system administrator.'
      );
    }
    this.modifiedRole.users = event.value;
  }

  closeRoleUsers(roleId: string) {
    if (roleId !== this.originalRole.id || roleId !== this.modifiedRole.id) {
      alert(
        'There has been an error on this page.  Please refresh your browser and try again.  If the problem persists, please contact your system administrator.'
      );
    }
    const newUserIds = this.modifiedRole.users.map(({ id }) => id);
    const oldUserIds = this.originalRole.users.map(({ id }) => id);
    newUserIds.forEach((nru) => {
      if (!oldUserIds.some((ru) => ru === nru)) {
        this.roleDataService.addRoleUser(roleId, nru);
      }
    });
    oldUserIds.forEach((ru) => {
      if (!newUserIds.some((nru) => ru === nru)) {
        this.roleDataService.removeRoleUser(roleId, ru);
      }
    });
  }

  setManagerValue(teamUserId: string, value: boolean) {
    this.teamUserDataService.setManagerValue(teamUserId, value);
  }

  setIncrementerValue(teamUserId: string, value: boolean) {
    this.teamUserDataService.setIncrementerValue(teamUserId, value);
  }

  setModifierValue(teamUserId: string, value: boolean) {
    this.teamUserDataService.setModifierValue(teamUserId, value);
  }

  setSubmitterValue(teamUserId: string, value: boolean) {
    this.teamUserDataService.setSubmitterValue(teamUserId, value);
  }

  loggedInUserCanManageTeam(): boolean {
    return this.teamUsers.some(
      (tu) => tu.userId === this.loggedInUserId && tu.canManageTeam
    );
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
