// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { ChangeDetectorRef, Component, Input, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  Action,
  Evaluation,
  Move,
  Duty,
  ScoringModel,
  Team,
  TeamMembership,
  TeamRole,
  User
} from 'src/app/generated/cite.api/model/models';
import { ActionDataService } from 'src/app/data/action/action-data.service';
import { ActionQuery } from 'src/app/data/action/action.query';
import { CurrentUserQuery } from 'src/app/data/user/user.query';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { MoveQuery } from 'src/app/data/move/move.query';
import { DutyDataService } from 'src/app/data/duty/duty-data.service';
import { DutyQuery } from 'src/app/data/duty/duty.query';
import { ScoringModelQuery } from 'src/app/data/scoring-model/scoring-model.query';
import { TeamQuery } from 'src/app/data/team/team.query';
import { TeamMembershipDataService } from 'src/app/data/team/team-membership-data.service';
import { TeamRoleDataService } from 'src/app/data/team/team-role-data.service';
import { UnreadArticlesDataService } from 'src/app/data/unread-articles/unread-articles-data.service';
import { UnreadArticles } from 'src/app/data/unread-articles/unread-articles';
import { Title } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { AdminActionEditDialogComponent } from '../admin/admin-action-edit-dialog/admin-action-edit-dialog.component';
import { AdminDutyEditDialogComponent } from '../admin/admin-duty-edit-dialog/admin-duty-edit-dialog.component';
import { ComnSettingsService, CrucibleDialogService } from '@cmusei/crucible-common';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { UserQuery } from 'src/app/data/user/user.query';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { MatCard } from '@angular/material/card';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatAccordion, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle } from '@angular/material/expansion';
import { MatIcon } from '@angular/material/icon';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTooltip } from '@angular/material/tooltip';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/autocomplete';
import { MatFormField, MatLabel } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

interface SituationMove {
  moveNumber?: number;
  title: string;
  time: string;
  description: string;
}

interface Situation extends SituationMove {
  isCurrent: boolean;
  pastMoves: SituationMove[];
}

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    imports: [MatCard, MatButton, MatAccordion, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle, MatIconButton, MatIcon, MatCheckbox, MatTooltip, MatSelect, MatOption, MatFormField, MatLabel, FormsModule]
})
export class DashboardComponent implements OnDestroy {
  @Input() unreadArticles: UnreadArticles;
  @Input() myTeamId: string;
  @Input() noChanges: boolean;
  evaluationUsers: User[] = [];
  teamUsers: User[] = [];
  teamMemberships: TeamMembership[] = [];
  teamRoles: TeamRole[] = [];
  selectedEvaluation: Evaluation = {};
  scoringModel: ScoringModel = {};
  isLoading = false;
  actionList: Action[] = [];
  allActions: Action[] = [];
  dutyList: Duty[] = [];
  moveList: Move[] = [];
  currentMoveNumber: number;
  displayedMoveNumber: number;
  activeTeamId = '';
  isActionEditMode = false;
  isDutyEditMode = false;
  private unsubscribe$ = new Subject();
  galleryUrl = '';
  originalDuty: Duty = {};
  modifiedDuty: Duty = {};
  situation: Situation = null;
  loggedInUserId = '';
  showPermissions = false;
  showDuties = false;
  showActions = false;
  canManageTeam = false;
  canSubmitTeamScore = false;
  canContributeToTeamScore = false;

  constructor(
    private actionDataService: ActionDataService,
    private actionQuery: ActionQuery,
    private currentUserQuery: CurrentUserQuery,
    private evaluationQuery: EvaluationQuery,
    private moveQuery: MoveQuery,
    private dutyDataService: DutyDataService,
    private dutyQuery: DutyQuery,
    private scoringModelQuery: ScoringModelQuery,
    private teamQuery: TeamQuery,
    private teamMembershipDataService: TeamMembershipDataService,
    private teamRoleDataService: TeamRoleDataService,
    private unreadArticlesDataService: UnreadArticlesDataService,
    public dialogService: CrucibleDialogService,
    public matDialog: MatDialog,
    private titleService: Title,
    private userDataService: UserDataService,
    private userQuery: UserQuery,
    private permissionDataService: PermissionDataService,
    private settingsService: ComnSettingsService,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.titleService.setTitle('CITE Dashboard');
    //observe the current user
    this.currentUserQuery
      .select()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((cu) => {
        this.loggedInUserId = cu.id;
      });
    this.userDataService.setCurrentUser();
    // observe the evaluation users
    this.userQuery.selectAll()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(users => {
        this.evaluationUsers = users;
      });
    // observe the selected evaluation
    (this.evaluationQuery.selectActive() as Observable<Evaluation>)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((active) => {
        const activeId = this.evaluationQuery.getActiveId();
        active = active ? active : ({ id: '' } as Evaluation);
        if (active.id === activeId) {
          this.selectedEvaluation = active;
          this.currentMoveNumber = active.currentMoveNumber;
          if (activeId) {
            this.unreadArticlesDataService.loadById(activeId);
          }
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
      });
    // observe the active team
    (this.teamQuery.selectActive() as Observable<Team>)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((active) => {
        if (active) {
          this.activeTeamId = active.id;
          // load the team data for this team
          this.loadTeamData();
          this.updatePermissions();
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
    // observe the Duty list
    this.dutyQuery
      .selectAll()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((duties) => {
        this.dutyList = [];
        duties.forEach((duty) => {
          const newDuty = { ...duty };
          const newUsers: User[] = [];
          newDuty.users.forEach((user) => {
            const addUser = this.evaluationUsers?.find(
              (tu) => tu.id === user.id
            );
            newUsers.push(addUser);
          });
          newDuty.users = newUsers;
          this.dutyList.push(newDuty);
        });
      });
    // observe the scoring model
    (this.scoringModelQuery.selectActive() as Observable<ScoringModel>)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((scoringModel) => {
        this.scoringModel = scoringModel;
        this.setCompleteSituationDescription();
      });
    // observe the TeamMemberships
    this.teamMembershipDataService
      .teamMemberships$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((m) => {
        this.teamMemberships = m;
      });
    // observe the TeamRoles
    this.teamRoleDataService
      .teamRoles$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((m) => {
        this.teamRoles = m;
      });
  }

  setCompleteSituationDescription() {
    if (!this.selectedEvaluation) {
      return;
    }
    const isDisplayedMoveCurrent = +this.displayedMoveNumber === +this.currentMoveNumber;
    const displayedMove = this.moveList?.find(
      (m) => +m.moveNumber === +this.displayedMoveNumber
    );
    if (!displayedMove) {
      this.situation = null;
      return;
    }
    // the current move's situation lives on the evaluation, past moves carry their own
    const situation: Situation = {
      isCurrent: isDisplayedMoveCurrent,
      title: displayedMove.description,
      time: this.formatSituationTime(
        isDisplayedMoveCurrent ? this.selectedEvaluation.situationTime : displayedMove.situationTime
      ),
      description: isDisplayedMoveCurrent
        ? this.selectedEvaluation.situationDescription
        : displayedMove.situationDescription,
      pastMoves: [],
    };
    if (this.scoringModel && this.scoringModel.showPastSituationDescriptions) {
      situation.pastMoves = this.moveList
        .filter((m) => +m.moveNumber < +this.displayedMoveNumber)
        .map((m) => ({
          moveNumber: m.moveNumber,
          title: m.description,
          time: this.formatSituationTime(m.situationTime),
          description: m.situationDescription,
        }));
    }
    this.situation = situation;
  }

  // the viewer's own time zone, labeled, like Blueprint
  formatSituationTime(situationTime: Date | string): string {
    if (!situationTime) {
      return '';
    }
    return new Date(situationTime).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  }

  loadTeamData() {
    // load the team data for this team
    if (this.activeTeamId && this.selectedEvaluation.id) {
      this.actionDataService.loadByEvaluationTeam(
        this.selectedEvaluation.id,
        this.activeTeamId
      );
      this.dutyDataService.loadByEvaluationTeam(
        this.selectedEvaluation.id,
        this.activeTeamId
      );
      this.teamMembershipDataService.loadMemberships(this.activeTeamId).subscribe();
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
      maxWidth: '90vw',
      width: 'auto',
      data: {
        action: action,
        teamList: [],
        moveList: [],
        allMovesValue: -999
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
      .confirm({
        title: 'Delete this action?',
        message: 'Are you sure that you want to delete this action?',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
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

  getUser(id) {
    return this.evaluationUsers?.find((u) => u.id === id);
  }
  getUserName(id) {
    const theUser = this.evaluationUsers?.find((u) => u.id === id);
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

  addOrEditDuty(duty: Duty) {
    if (!duty) {
      duty = {
        name: '',
        evaluationId: this.selectedEvaluation.id,
        teamId: this.activeTeamId,
      };
    } else {
      duty = { ...duty };
    }
    const dialogRef = this.matDialog.open(AdminDutyEditDialogComponent, {
      maxWidth: '90vw',
      width: 'auto',
      data: {
        duty: duty,
        canEdit: this.canSubmitTeamScore
      },
    });
    dialogRef.componentInstance.editComplete.subscribe((result) => {
      if (result.saveChanges && result.duty) {
        this.saveDuty(result.duty);
      }
      dialogRef.close();
    });
  }

  saveDuty(duty: Duty) {
    if (duty.id) {
      this.dutyDataService.updateDuty(duty);
    } else {
      this.dutyDataService.add(duty);
    }
  }

  deleteDutyRequest(duty: Duty) {
    this.dialogService
      .confirm({
        title: 'Delete this duty?',
        message: 'Are you sure that you want to delete this duty?',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.dutyDataService.delete(duty.id);
        }
      });
  }

  openDutyUsers(duty: Duty) {
    Object.assign(this.originalDuty, duty);
    Object.assign(this.modifiedDuty, duty);
  }

  updateDutyUsers(dutyId: string, event: any) {
    if (dutyId !== this.originalDuty.id || dutyId !== this.modifiedDuty.id) {
      alert(
        'There has been an error on this page.  Please refresh your browser and try again.  If the problem persists, please contact your system administrator.'
      );
    }
    this.modifiedDuty.users = [];
    event.value.forEach(m => {
      var user = this.evaluationUsers.find(u => u.id === m.id);
      if (user) {
        this.modifiedDuty.users.push(user);
      }
    });
  }

  closeDutyUsers(dutyId: string) {
    if (dutyId !== this.originalDuty.id || dutyId !== this.modifiedDuty.id) {
      alert(
        'There has been an error on this page.  Please refresh your browser and try again.  If the problem persists, please contact your system administrator.'
      );
    }
    const newUserIds = this.modifiedDuty.users.map(({ id }) => id);
    const oldUserIds = this.originalDuty.users.map(({ id }) => id);
    newUserIds.forEach((nru) => {
      if (!oldUserIds.some((ru) => ru === nru)) {
        this.dutyDataService.addDutyUser(dutyId, nru);
      }
    });
    oldUserIds.forEach((ru) => {
      if (!newUserIds.some((nru) => ru === nru)) {
        this.dutyDataService.removeDutyUser(dutyId, ru);
      }
    });
  }

  setTeamMembershipRole(teamMembership: TeamMembership, teamRole: TeamRole) {
    teamMembership.role = teamRole;
    teamMembership.roleId = teamRole.id;
    this.teamMembershipDataService.editMembership(teamMembership);
  }

  updatePermissions() {
    this.canManageTeam = this.permissionDataService.canManageTeam(this.activeTeamId);
    this.canSubmitTeamScore = this.canManageTeam || this.permissionDataService.canSubmitTeamScore(this.activeTeamId);
    this.canContributeToTeamScore = this.canSubmitTeamScore || this.permissionDataService.canEditTeamScore(this.activeTeamId);
    this.changeDetectorRef.detectChanges();
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
