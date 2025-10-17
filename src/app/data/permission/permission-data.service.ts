// Copyright 2025 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the scoringModel root for license information.

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap, take } from 'rxjs/operators';
import {
  EvaluationPermission,
  EvaluationPermissionClaim,
  EvaluationPermissionsService,
  ScoringModelPermission,
  ScoringModelPermissionClaim,
  ScoringModelPermissionsService,
  SystemPermission,
  SystemPermissionsService,
  TeamPermission,
  TeamPermissionClaim,
  TeamPermissionsService
} from 'src/app/generated/cite.api';

@Injectable({
  providedIn: 'root',
})
export class PermissionDataService {
  private _permissions: SystemPermission[] = [];
  get permissions(): SystemPermission[] {
    return this._permissions;
  }

  private _evaluationPermissions: EvaluationPermissionClaim[] = [];
  get evaluationPermissions(): EvaluationPermissionClaim[] {
    return this._evaluationPermissions;
  }

  private _scoringModelPermissions: ScoringModelPermissionClaim[] = [];
  get scoringModelPermissions(): ScoringModelPermissionClaim[] {
    return this._scoringModelPermissions;
  }

  private _teamPermissions: TeamPermissionClaim[] = [];
  get TeamPermissions(): TeamPermissionClaim[] {
    return this._teamPermissions;
  }

  constructor(
    private permissionsService: SystemPermissionsService,
    private evaluationPermissionsService: EvaluationPermissionsService,
    private scoringModelPermissionsService: ScoringModelPermissionsService,
    private teamPermissionService: TeamPermissionsService
  ) {}

  load(): Observable<SystemPermission[]> {
    return this.permissionsService.getMySystemPermissions().pipe(
      take(1),
      tap((x) => (this._permissions = x))
    );
  }

  hasPermission(permission: SystemPermission) {
    return this._permissions.includes(permission);
  }

  loadEvaluationPermissions(): Observable<EvaluationPermissionClaim[]> {
    return this.evaluationPermissionsService
      .getMyEvaluationPermissions()
      .pipe(
        take(1),
        tap((x) => (this._evaluationPermissions = x))
      );
  }

  loadScoringModelPermissions(): Observable<ScoringModelPermissionClaim[]> {
    return this.scoringModelPermissionsService
      .getMyScoringModelPermissions()
      .pipe(
        take(1),
        tap((x) => (this._scoringModelPermissions = x))
      );
  }

  loadTeamPermissions(): Observable<TeamPermissionClaim[]> {
    return this.teamPermissionService
      .getMyTeamPermissions()
      .pipe(
        take(1),
        tap((x) => (this._teamPermissions = x))
      );
  }

  hasTeamPermission(teamId: string, permission: TeamPermission) {
    return this._teamPermissions.some(claim => claim.teamId === teamId && claim.permissions.some(p => p === permission));
  }

  canCreateEvaluations(): boolean {
    return this.canEvaluation(
      SystemPermission.CreateEvaluations,
      '',
      null
    );
  }

  canEditEvaluation(evaluationId: string): boolean {
    return this.canEvaluation(SystemPermission.EditEvaluations, evaluationId, EvaluationPermission.EditEvaluation) ||
      this.canEvaluation(SystemPermission.ManageEvaluations, evaluationId, EvaluationPermission.ManageEvaluation);
  }

  canManageEvaluation(evaluationId: string): boolean {
    return this.canEvaluation(
      SystemPermission.ManageEvaluations,
      evaluationId,
      EvaluationPermission.ManageEvaluation
    );
  }

  canAdvanceMove(evaluationId: string): boolean {
    return this.canEvaluation(
      SystemPermission.ManageEvaluations,
      evaluationId,
      EvaluationPermission.ManageEvaluation) || this.canEvaluation(
      SystemPermission.ExecuteEvaluations,
      evaluationId,
      EvaluationPermission.ExecuteEvaluation
    );
  }

  canCreateScoringModels(): boolean {
    return this.canScoringModel(
      SystemPermission.CreateScoringModels,
      '',
      null
    );
  }

  canEditScoringModel(scoringModelId: string): boolean {
    return this.canScoringModel(SystemPermission.EditScoringModels, scoringModelId, ScoringModelPermission.EditScoringModel) ||
      this.canScoringModel(SystemPermission.ManageScoringModels, scoringModelId, ScoringModelPermission.ManageScoringModel);
  }

  canManageScoringModel(scoringModelId: string): boolean {
    return this.canScoringModel(
      SystemPermission.ManageScoringModels,
      scoringModelId,
      ScoringModelPermission.ManageScoringModel
    );
  }

  canEditTeamScore(teamId: string): boolean {
    return this.canTeam(
      null,
      teamId,
      TeamPermission.EditTeamScore
    );
  }

  canSubmitTeamScore(teamId: string): boolean {
    return this.canTeam(
      null,
      teamId,
      TeamPermission.SubmitTeamScore
    );
  }

  canManageTeam(teamId: string): boolean {
    return this.canTeam(
      null,
      teamId,
      TeamPermission.ManageTeam
    );
  }

  private canEvaluation(
    permission: SystemPermission,
    evaluationId?: string,
    evaluationPermission?: EvaluationPermission
  ) {
    const permissions = this._permissions;
    const evaluationPermissionClaims = this._evaluationPermissions;
    if (permissions.includes(permission)) {
      return true;
    } else if (evaluationId !== null && evaluationPermission !== null) {
      const evaluationPermissionClaim = evaluationPermissionClaims.find(
        (x) => x.evaluationId === evaluationId
      );

      if (
        evaluationPermissionClaim &&
        evaluationPermissionClaim.permissions.includes(evaluationPermission)
      ) {
        return true;
      }
    }

    return false;
  }

  private canScoringModel(
    permission: SystemPermission,
    scoringModelId?: string,
    scoringModelPermission?: ScoringModelPermission
  ) {
    const permissions = this._permissions;
    const scoringModelPermissionClaims = this._scoringModelPermissions;
    if (permissions.includes(permission)) {
      return true;
    } else if (
      scoringModelId !== null &&
      scoringModelPermission !== null
    ) {
      const scoringModelPermissionClaim =
        scoringModelPermissionClaims.find(
          (x) => x.scoringModelId === scoringModelId
        );

      if (
        scoringModelPermissionClaim &&
        scoringModelPermissionClaim.permissions.includes(
          scoringModelPermission
        )
      ) {
        return true;
      }
    }

    return false;
  }

  private canTeam(
    permission: SystemPermission,
    teamId?: string,
    teamPermission?: TeamPermission
  ) {
    const permissions = this._permissions;
    const teamPermissionClaims = this._teamPermissions;
    if (permissions.includes(permission)) {
      return true;
    } else if (teamId !== null && teamPermission !== null) {
      const evaluationPermissionClaim = teamPermissionClaims.find(
        (x) => x.teamId === teamId
      );

      if (
        evaluationPermissionClaim &&
        evaluationPermissionClaim.permissions.includes(teamPermission)
      ) {
        return true;
      }
    }

    return false;
  }

}
