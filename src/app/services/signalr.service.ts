// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Injectable, OnDestroy } from '@angular/core';
import { ComnAuthService, ComnSettingsService } from '@cmusei/crucible-common';
import * as signalR from '@microsoft/signalr';
import { Action, Evaluation, ItemStatus, Move, Role, ScoringModel, Submission, Team, TeamUser, User } from 'src/app/generated/cite.api';
import { ActionDataService } from 'src/app/data/action/action-data.service';
import { EvaluationDataService } from 'src/app/data/evaluation/evaluation-data.service';
import { MoveDataService } from '../data/move/move-data.service';
import { RoleDataService } from 'src/app/data/role/role-data.service';
import { ScoringModelDataService } from 'src/app/data/scoring-model/scoring-model-data.service';
import { SubmissionDataService } from 'src/app/data/submission/submission-data.service';
import { TeamDataService } from 'src/app/data/team/team-data.service';
import { TeamUserDataService } from 'src/app/data/user/team-user-data.service';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';

export enum ApplicationArea {
  home = '',
  admin = 'Admin'
}
@Injectable({
  providedIn: 'root',
})
export class SignalRService implements OnDestroy {
  private hubConnection: signalR.HubConnection;
  private applicationArea: ApplicationArea;
  private connectionPromise: Promise<void>;
  private isJoined = false;
  private unsubscribe$ = new Subject();

  constructor(
    private authService: ComnAuthService,
    private settingsService: ComnSettingsService,
    private actionDataService: ActionDataService,
    private evaluationDataService: EvaluationDataService,
    private moveDataService: MoveDataService,
    private roleDataService: RoleDataService,
    private scoringModelDataService: ScoringModelDataService,
    private submissionDataService: SubmissionDataService,
    private teamDataService: TeamDataService,
    private teamUserDataService: TeamUserDataService,
    private userDataService: UserDataService,
    private router: Router
  ) {
    this.authService.user$.pipe(takeUntil(this.unsubscribe$)).subscribe(() => {
      this.reconnect();
    });
  }

  public startConnection(applicationArea: ApplicationArea): Promise<void> {
    if (this.connectionPromise && this.applicationArea === applicationArea) {
      return this.connectionPromise;
    }

    this.applicationArea = applicationArea;
    const accessToken = this.authService.getAuthorizationToken();
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(
        `${this.settingsService.settings.ApiUrl}/hubs/main?bearer=${accessToken}`
      )
      .withAutomaticReconnect(new RetryPolicy(120, 0, 5, this.router))
      .build();

    this.hubConnection.onreconnected(() => {
      this.join();
    });

    this.addHandlers();
    this.connectionPromise = this.hubConnection.start();
    this.connectionPromise.then((x) => this.join());

    return this.connectionPromise;
  }

  private reconnect() {
    if (this.hubConnection != null) {
      this.hubConnection.stop().then(() => {
        console.log('Reconnecting to the hub.');
        this.connectionPromise = this.hubConnection.start();
        this.connectionPromise.then(() => this.join());
      });
    }
  }

  public join() {
    if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('Join' + this.applicationArea);
    }
    this.isJoined = true;
  }

  public leave() {
    if (this.isJoined) {
      this.hubConnection.invoke('Leave' + this.applicationArea);
    }
    this.isJoined = false;
  }

  private addHandlers() {
    this.addActionHandlers();
    this.addEvaluationHandlers();
    this.addMoveHandlers();
    this.addRoleHandlers();
    this.addScoringModelHandlers();
    this.addSubmissionHandlers();
    this.addTeamHandlers();
    this.addTeamUserHandlers();
    this.addUserHandlers();
  }

  private addActionHandlers() {
    this.hubConnection.on(
      'ActionUpdated', (action: Action) => {
        this.actionDataService.updateStore(action);
      }
    );

    this.hubConnection.on('ActionCreated', (action: Action) => {
      this.actionDataService.updateStore(action);
    });

    this.hubConnection.on('ActionDeleted', (id: string) => {
      this.actionDataService.deleteFromStore(id);
    });
  }

  private addEvaluationHandlers() {
    this.hubConnection.on(
      'EvaluationUpdated', (evaluation: Evaluation) => {
        this.evaluationDataService.updateStore(evaluation);
      }
    );

    this.hubConnection.on('EvaluationCreated', (evaluation: Evaluation) => {
      this.evaluationDataService.updateStore(evaluation);
    });

    this.hubConnection.on('EvaluationDeleted', (id: string) => {
      this.evaluationDataService.deleteFromStore(id);
    });
  }

  private addMoveHandlers() {
    this.hubConnection.on(
      'MoveUpdated', (move: Move) => {
        this.moveDataService.updateStore(move);
      }
    );

    this.hubConnection.on('MoveCreated', (move: Move) => {
      this.moveDataService.updateStore(move);
    });

    this.hubConnection.on('MoveDeleted', (id: string) => {
      this.moveDataService.deleteFromStore(id);
    });
  }

  private addSubmissionHandlers() {
    this.hubConnection.on(
      'SubmissionUpdated', (submission: Submission) => {
        this.submissionDataService.updateStore(submission);
      }
    );

    this.hubConnection.on('SubmissionCreated', (submission: Submission) => {
      this.submissionDataService.updateStore(submission);
    });

    this.hubConnection.on('SubmissionDeleted', (id: string) => {
      this.submissionDataService.deleteFromStore(id);
    });
  }

  private addRoleHandlers() {
    this.hubConnection.on(
      'RoleUpdated', (role: Role) => {
        this.roleDataService.updateStore(role);
      }
    );

    this.hubConnection.on('RoleCreated', (role: Role) => {
      this.roleDataService.updateStore(role);
    });

    this.hubConnection.on('RoleDeleted', (id: string) => {
      this.roleDataService.deleteFromStore(id);
    });
  }

  private addScoringModelHandlers() {
    this.hubConnection.on(
      'ScoringModelUpdated', (scoringModel: ScoringModel) => {
        this.scoringModelDataService.updateStore(scoringModel);
      }
    );

    this.hubConnection.on('ScoringModelCreated', (scoringModel: ScoringModel) => {
      this.scoringModelDataService.updateStore(scoringModel);
    });

    this.hubConnection.on('ScoringModelDeleted', (id: string) => {
      this.scoringModelDataService.deleteFromStore(id);
    });
  }

  private addTeamHandlers() {
    this.hubConnection.on('TeamUpdated', (team: Team) => {
      this.teamDataService.updateStore(team);
    }
    );

    this.hubConnection.on('TeamCreated', (team: Team) => {
      this.teamDataService.updateStore(team);
    });

    this.hubConnection.on('TeamDeleted', (id: string) => {
      this.teamDataService.deleteFromStore(id);
    });
  }

  private addTeamUserHandlers() {
    this.hubConnection.on('TeamUserUpdated', (teamUser: TeamUser) => {
      this.teamUserDataService.updateStore(teamUser);
    }
    );

    this.hubConnection.on('TeamUserCreated', (teamUser: TeamUser) => {
      this.teamUserDataService.updateStore(teamUser);
    });

    this.hubConnection.on('TeamUserDeleted', (teamUser: TeamUser) => {
      this.teamUserDataService.deleteFromStore(teamUser);
    });
  }

  private addUserHandlers() {
    this.hubConnection.on('UserUpdated', (user: User) => {
      this.userDataService.updateStore(user);
    }
    );

    this.hubConnection.on('UserCreated', (user: User) => {
      this.userDataService.updateStore(user);
    });

    this.hubConnection.on('UserDeleted', (id: string) => {
      this.userDataService.deleteFromStore(id);
    });
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}

class RetryPolicy {
  constructor(
    private maxSeconds: number,
    private minJitterSeconds: number,
    private maxJitterSeconds: number,
    private router: Router
  ) {}

  nextRetryDelayInMilliseconds(
    retryContext: signalR.RetryContext
  ): number | null {
    let nextRetrySeconds = Math.pow(2, retryContext.previousRetryCount + 1);

    if (retryContext.elapsedMilliseconds / 1000 > this.maxSeconds) {
      location.reload();
    }

    nextRetrySeconds +=
      Math.floor(
        Math.random() * (this.maxJitterSeconds - this.minJitterSeconds + 1)
      ) + this.minJitterSeconds; // Add Jitter

    return nextRetrySeconds * 1000;
  }
}
