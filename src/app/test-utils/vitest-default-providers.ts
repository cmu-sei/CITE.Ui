// Copyright 2024 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Provider } from '@angular/core';
import { of } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  MAT_BOTTOM_SHEET_DATA,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { ActivatedRoute } from '@angular/router';

// Akita Stores
import { UserStore, CurrentUserStore } from '../data/user/user.store';
import { ActionStore } from '../data/action/action.store';
import { ScoringOptionStore } from '../data/scoring-option/scoring-option.store';
import { DutyStore } from '../data/duty/duty.store';
import { TeamStore } from '../data/team/team.store';
import { TeamTypeStore } from '../data/teamtype/team-type.store';
import { MoveStore } from '../data/move/move.store';
import { SubmissionStore } from '../data/submission/submission.store';
import { EvaluationStore } from '../data/evaluation/evaluation.store';
import { ScoringModelStore } from '../data/scoring-model/scoring-model.store';
import { ScoringCategoryStore } from '../data/scoring-category/scoring-category.store';
import { UnreadArticlesStore } from '../data/unread-articles/unread-articles.store';

// Akita Queries
import { UserQuery, CurrentUserQuery } from '../data/user/user.query';
import { ActionQuery } from '../data/action/action.query';
import { ScoringOptionQuery } from '../data/scoring-option/scoring-option.query';
import { DutyQuery } from '../data/duty/duty.query';
import { TeamQuery } from '../data/team/team.query';
import { TeamTypeQuery } from '../data/teamtype/team-type.query';
import { MoveQuery } from '../data/move/move.query';
import { SubmissionQuery } from '../data/submission/submission.query';
import { EvaluationQuery } from '../data/evaluation/evaluation.query';
import { ScoringModelQuery } from '../data/scoring-model/scoring-model.query';
import { ScoringCategoryQuery } from '../data/scoring-category/scoring-category.query';
import { UnreadArticlesQuery } from '../data/unread-articles/unread-articles.query';

// Data Services
import { UserDataService } from '../data/user/user-data.service';
import { ActionDataService } from '../data/action/action-data.service';
import { ScoringOptionDataService } from '../data/scoring-option/scoring-option-data.service';
import { DutyDataService } from '../data/duty/duty-data.service';
import { TeamDataService } from '../data/team/team-data.service';
import { TeamMembershipDataService } from '../data/team/team-membership-data.service';
import { TeamRoleDataService } from '../data/team/team-role-data.service';
import { GroupTeamDataService } from '../data/team/group-team-data.service';
import { TeamTypeDataService } from '../data/teamtype/team-type-data.service';
import { MoveDataService } from '../data/move/move-data.service';
import { SubmissionDataService } from '../data/submission/submission-data.service';
import { EvaluationDataService } from '../data/evaluation/evaluation-data.service';
import { EvaluationMembershipDataService } from '../data/evaluation/evaluation-membership-data.service';
import { EvaluationRoleDataService } from '../data/evaluation/evaluation-role-data.service';
import { ScoringModelDataService } from '../data/scoring-model/scoring-model-data.service';
import { ScoringModelMembershipDataService } from '../data/scoring-model/scoring-model-membership-data.service';
import { ScoringModelRoleDataService } from '../data/scoring-model/scoring-model-role-data.service';
import { ScoringCategoryDataService } from '../data/scoring-category/scoring-category-data.service';
import { UnreadArticlesDataService } from '../data/unread-articles/unread-articles-data.service';
import { GroupDataService } from '../data/group/group-data.service';
import { GroupMembershipDataService } from '../data/group/group-membership.service';
import { PermissionDataService } from '../data/permission/permission-data.service';
import { RoleDataService } from '../data/role/role-data.service';
import { UIDataService } from '../data/ui/ui-data.service';

// App Services
import { DialogService } from '../services/dialog/dialog.service';
import { ErrorService } from '../services/error/error.service';
import { SignalRService } from '../services/signalr.service';
import { GallerySignalRService } from '../services/gallery-signalr.service';
import { SystemMessageService } from '../services/system-message/system-message.service';
import { ConfirmDialogService } from '../components/shared/confirm-dialog/service/confirm-dialog.service';

// Generated API Services
import {
  ActionService,
  DutyService,
  EvaluationService,
  EvaluationMembershipsService,
  EvaluationPermissionsService,
  EvaluationRolesService,
  GalleryService,
  GroupService,
  HealthCheckService,
  MoveService,
  ScoringCategoryService,
  ScoringModelService,
  ScoringModelMembershipsService,
  ScoringModelPermissionsService,
  ScoringModelRolesService,
  ScoringOptionService,
  SubmissionService,
  SubmissionCategoryService,
  SubmissionCommentService,
  SubmissionOptionService,
  SystemPermissionsService,
  SystemRolesService,
  TeamService as ApiTeamService,
  TeamMembershipsService,
  TeamPermissionsService,
  TeamRolesService,
  TeamTypeService,
  UserService,
} from '../generated/cite.api';

// RoleService is not re-exported from the barrel
import { RoleService } from '../generated/cite.api/api/role.service';

// Common library
import {
  ComnSettingsService,
  ComnAuthService,
  ComnAuthQuery,
} from '@cmusei/crucible-common';

function getProvideToken(provider: any): any {
  if (typeof provider === 'function') return provider;
  return provider?.provide;
}

export function getDefaultProviders(overrides?: Provider[]): Provider[] {
  const queryStub = {
    selectAll: () => of([]),
    select: () => of(null),
    selectEntity: () => of(null),
    selectLoading: () => of(false),
    selectActive: () => of(null),
    selectActiveId: () => of(null),
    getAll: () => [],
    getEntity: () => null,
  };

  const defaults: Provider[] = [
    // Akita Stores
    { provide: UserStore, useValue: {} },
    { provide: CurrentUserStore, useValue: {} },
    { provide: ActionStore, useValue: {} },
    { provide: ScoringOptionStore, useValue: {} },
    { provide: DutyStore, useValue: {} },
    { provide: TeamStore, useValue: {} },
    { provide: TeamTypeStore, useValue: {} },
    { provide: MoveStore, useValue: {} },
    { provide: SubmissionStore, useValue: {} },
    { provide: EvaluationStore, useValue: {} },
    { provide: ScoringModelStore, useValue: {} },
    { provide: ScoringCategoryStore, useValue: {} },
    { provide: UnreadArticlesStore, useValue: {} },

    // Akita Queries
    { provide: UserQuery, useValue: { ...queryStub } },
    {
      provide: CurrentUserQuery,
      useValue: {
        userTheme$: of('light-theme'),
        select: () =>
          of({ name: '', id: '', theme: 'light-theme', lastRoute: '/' }),
        getLastRoute: () => '/',
      },
    },
    { provide: ActionQuery, useValue: { ...queryStub } },
    { provide: ScoringOptionQuery, useValue: { ...queryStub } },
    { provide: DutyQuery, useValue: { ...queryStub } },
    { provide: TeamQuery, useValue: { ...queryStub } },
    { provide: TeamTypeQuery, useValue: { ...queryStub } },
    { provide: MoveQuery, useValue: { ...queryStub } },
    { provide: SubmissionQuery, useValue: { ...queryStub } },
    { provide: EvaluationQuery, useValue: { ...queryStub } },
    { provide: ScoringModelQuery, useValue: { ...queryStub } },
    { provide: ScoringCategoryQuery, useValue: { ...queryStub } },
    { provide: UnreadArticlesQuery, useValue: { ...queryStub } },

    // Data Services
    { provide: UserDataService, useValue: { load: () => of([]), setCurrentUser: () => {} } },
    { provide: ActionDataService, useValue: {} },
    { provide: ScoringOptionDataService, useValue: {} },
    { provide: DutyDataService, useValue: {} },
    { provide: TeamDataService, useValue: {} },
    { provide: TeamMembershipDataService, useValue: {} },
    { provide: TeamRoleDataService, useValue: {} },
    { provide: GroupTeamDataService, useValue: {} },
    { provide: TeamTypeDataService, useValue: {} },
    { provide: MoveDataService, useValue: {} },
    { provide: SubmissionDataService, useValue: {} },
    { provide: EvaluationDataService, useValue: {} },
    { provide: EvaluationMembershipDataService, useValue: {} },
    { provide: EvaluationRoleDataService, useValue: {} },
    { provide: ScoringModelDataService, useValue: {} },
    { provide: ScoringModelMembershipDataService, useValue: {} },
    { provide: ScoringModelRoleDataService, useValue: {} },
    { provide: ScoringCategoryDataService, useValue: {} },
    { provide: UnreadArticlesDataService, useValue: {} },
    { provide: GroupDataService, useValue: {} },
    { provide: GroupMembershipDataService, useValue: {} },
    { provide: PermissionDataService, useValue: { load: () => of([]), hasPermission: () => false } },
    { provide: RoleDataService, useValue: {} },
    { provide: UIDataService, useValue: {} },

    // App Services
    { provide: DialogService, useValue: { confirm: () => of(true) } },
    { provide: ErrorService, useValue: { handleError: () => {} } },
    {
      provide: SignalRService,
      useValue: {
        startConnection: () => Promise.resolve(),
        joinChannel: () => {},
        leaveChannel: () => {},
        join: () => {},
      },
    },
    {
      provide: GallerySignalRService,
      useValue: {
        startConnection: () => Promise.resolve(),
        joinChannel: () => {},
        leaveChannel: () => {},
      },
    },
    { provide: SystemMessageService, useValue: {} },
    { provide: ConfirmDialogService, useValue: { confirm: () => of(true) } },

    // Generated API Services
    { provide: ActionService, useValue: {} },
    { provide: DutyService, useValue: {} },
    { provide: EvaluationService, useValue: {} },
    { provide: EvaluationMembershipsService, useValue: {} },
    { provide: EvaluationPermissionsService, useValue: {} },
    { provide: EvaluationRolesService, useValue: {} },
    { provide: GalleryService, useValue: {} },
    { provide: GroupService, useValue: {} },
    { provide: HealthCheckService, useValue: { getVersion: () => of('1.0.0'), healthCheck: () => of({}) } },
    { provide: MoveService, useValue: {} },
    { provide: RoleService, useValue: {} },
    { provide: ScoringCategoryService, useValue: {} },
    { provide: ScoringModelService, useValue: {} },
    { provide: ScoringModelMembershipsService, useValue: {} },
    { provide: ScoringModelPermissionsService, useValue: {} },
    { provide: ScoringModelRolesService, useValue: {} },
    { provide: ScoringOptionService, useValue: {} },
    { provide: SubmissionService, useValue: {} },
    { provide: SubmissionCategoryService, useValue: {} },
    { provide: SubmissionCommentService, useValue: {} },
    { provide: SubmissionOptionService, useValue: {} },
    { provide: SystemPermissionsService, useValue: {} },
    { provide: SystemRolesService, useValue: {} },
    { provide: ApiTeamService, useValue: {} },
    { provide: TeamMembershipsService, useValue: {} },
    { provide: TeamPermissionsService, useValue: {} },
    { provide: TeamRolesService, useValue: {} },
    { provide: TeamTypeService, useValue: {} },
    { provide: UserService, useValue: {} },

    // Common library services
    {
      provide: ComnSettingsService,
      useValue: {
        settings: {
          ApiUrl: '',
          AppTopBarText: 'CITE',
          AppTopBarHexColor: '#0F1D47',
          AppTopBarHexTextColor: '#FFFFFF',
          AppTitle: 'CITE',
        },
      },
    },
    {
      provide: ComnAuthService,
      useValue: {
        isAuthenticated$: of(true),
        user$: of({}),
        logout: () => {},
      },
    },
    {
      provide: ComnAuthQuery,
      useValue: {
        userTheme$: of('light-theme'),
        isLoggedIn$: of(true),
      },
    },

    // Dialog/BottomSheet tokens
    { provide: MAT_DIALOG_DATA, useValue: {} },
    { provide: MatDialogRef, useValue: { close: () => {} } },
    { provide: MAT_BOTTOM_SHEET_DATA, useValue: {} },
    { provide: MatBottomSheetRef, useValue: { dismiss: () => {} } },

    // Router
    {
      provide: ActivatedRoute,
      useValue: {
        params: of({}),
        paramMap: of({ get: () => null, has: () => false }),
        queryParams: of({}),
        queryParamMap: of({ get: () => null, has: () => false }),
        snapshot: {
          params: {},
          paramMap: { get: () => null, has: () => false },
        },
      },
    },
  ];

  if (!overrides?.length) return defaults;

  const overrideTokens = new Set(overrides.map(getProvideToken));
  const filtered = defaults.filter(
    (p) => !overrideTokens.has(getProvideToken(p))
  );
  return [...filtered, ...overrides];
}
