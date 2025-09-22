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
} from 'src/app/generated/cite.api';

@Injectable({
  providedIn: 'root',
})
export class PermissionDataService {
  private _permissions: SystemPermission[] = [];
  get permissions(): SystemPermission[] {
    return this._permissions;
  }

  private _EvaluationPermissions: EvaluationPermissionClaim[] = [];
  get EvaluationPermissions(): EvaluationPermissionClaim[] {
    return this._EvaluationPermissions;
  }

  private _scoringModelPermissions: ScoringModelPermissionClaim[] = [];
  get scoringModelPermissions(): ScoringModelPermissionClaim[] {
    return this._scoringModelPermissions;
  }

  constructor(
    private permissionsService: SystemPermissionsService,
    private evaluationPermissionsService: EvaluationPermissionsService,
    private scoringModelPermissionsService: ScoringModelPermissionsService
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

  loadEvaluationPermissions(id: string): Observable<EvaluationPermissionClaim[]> {
    return this.evaluationPermissionsService
      .getMyEvaluationPermissions(id)
      .pipe(
        take(1),
        tap((x) => (this._EvaluationPermissions = x))
      );
  }

  loadScoringModelPermissions(id: string): Observable<ScoringModelPermissionClaim[]> {
    return this.scoringModelPermissionsService
      .getMyScoringModelPermissions(id)
      .pipe(
        take(1),
        tap((x) => (this._scoringModelPermissions = x))
      );
  }

  canEditEvaluation(EvaluationId: string): boolean {
    return this.canEvaluation(SystemPermission.EditEvaluations, EvaluationId, EvaluationPermission.EditEvaluation) ||
      this.canEvaluation(SystemPermission.ManageEvaluations, EvaluationId, EvaluationPermission.ManageEvaluation);
  }

  canEditScoringModel(scoringModelId: string): boolean {
    return this.canScoringModel(SystemPermission.EditScoringModels, scoringModelId, ScoringModelPermission.EditScoringModel) ||
      this.canScoringModel(SystemPermission.ManageScoringModels, scoringModelId, ScoringModelPermission.ManageScoringModel);
  }

  canManageEvaluation(EvaluationId: string): boolean {
    return this.canEvaluation(
      SystemPermission.ManageEvaluations,
      EvaluationId,
      EvaluationPermission.ManageEvaluation
    );
  }

  canManageScoringModel(scoringModelId: string): boolean {
    return this.canScoringModel(
      SystemPermission.ManageScoringModels,
      scoringModelId,
      ScoringModelPermission.ManageScoringModel
    );
  }

  private canEvaluation(
    permission: SystemPermission,
    evaluationId?: string,
    evaluationPermission?: EvaluationPermission
  ) {
    const permissions = this._permissions;
    const evaluationPermissionClaims = this._EvaluationPermissions;
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
}
