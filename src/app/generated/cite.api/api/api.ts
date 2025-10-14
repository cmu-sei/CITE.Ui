/*
 Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the
 project root for license information.
*/

export * from './action.service';
import { ActionService } from './action.service';
export * from './duty.service';
import { DutyService } from './duty.service';
export * from './evaluation.service';
import { EvaluationService } from './evaluation.service';
export * from './evaluationMemberships.service';
import { EvaluationMembershipsService } from './evaluationMemberships.service';
export * from './evaluationPermissions.service';
import { EvaluationPermissionsService } from './evaluationPermissions.service';
export * from './evaluationRoles.service';
import { EvaluationRolesService } from './evaluationRoles.service';
export * from './gallery.service';
import { GalleryService } from './gallery.service';
export * from './group.service';
import { GroupService } from './group.service';
export * from './healthCheck.service';
import { HealthCheckService } from './healthCheck.service';
export * from './move.service';
import { MoveService } from './move.service';
export * from './scoringCategory.service';
import { ScoringCategoryService } from './scoringCategory.service';
export * from './scoringModel.service';
import { ScoringModelService } from './scoringModel.service';
export * from './scoringModelMemberships.service';
import { ScoringModelMembershipsService } from './scoringModelMemberships.service';
export * from './scoringModelPermissions.service';
import { ScoringModelPermissionsService } from './scoringModelPermissions.service';
export * from './scoringModelRoles.service';
import { ScoringModelRolesService } from './scoringModelRoles.service';
export * from './scoringOption.service';
import { ScoringOptionService } from './scoringOption.service';
export * from './submission.service';
import { SubmissionService } from './submission.service';
export * from './submissionCategory.service';
import { SubmissionCategoryService } from './submissionCategory.service';
export * from './submissionComment.service';
import { SubmissionCommentService } from './submissionComment.service';
export * from './submissionOption.service';
import { SubmissionOptionService } from './submissionOption.service';
export * from './systemPermissions.service';
import { SystemPermissionsService } from './systemPermissions.service';
export * from './systemRoles.service';
import { SystemRolesService } from './systemRoles.service';
export * from './team.service';
import { TeamService } from './team.service';
export * from './teamMemberships.service';
import { TeamMembershipsService } from './teamMemberships.service';
export * from './teamPermissions.service';
import { TeamPermissionsService } from './teamPermissions.service';
export * from './teamRoles.service';
import { TeamRolesService } from './teamRoles.service';
export * from './teamType.service';
import { TeamTypeService } from './teamType.service';
export * from './user.service';
import { UserService } from './user.service';
export const APIS = [ActionService, DutyService, EvaluationService, EvaluationMembershipsService, EvaluationPermissionsService, EvaluationRolesService, GalleryService, GroupService, HealthCheckService, MoveService, ScoringCategoryService, ScoringModelService, ScoringModelMembershipsService, ScoringModelPermissionsService, ScoringModelRolesService, ScoringOptionService, SubmissionService, SubmissionCategoryService, SubmissionCommentService, SubmissionOptionService, SystemPermissionsService, SystemRolesService, TeamService, TeamMembershipsService, TeamPermissionsService, TeamRolesService, TeamTypeService, UserService];
