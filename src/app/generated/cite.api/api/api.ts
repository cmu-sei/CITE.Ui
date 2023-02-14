/*
Copyright 2022 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the
// project root for license information.
*/

export * from './action.service';
import { ActionService } from './action.service';
export * from './evaluation.service';
import { EvaluationService } from './evaluation.service';
export * from './gallery.service';
import { GalleryService } from './gallery.service';
export * from './healthCheck.service';
import { HealthCheckService } from './healthCheck.service';
export * from './move.service';
import { MoveService } from './move.service';
export * from './permission.service';
import { PermissionService } from './permission.service';
export * from './role.service';
import { RoleService } from './role.service';
export * from './scoringCategory.service';
import { ScoringCategoryService } from './scoringCategory.service';
export * from './scoringModel.service';
import { ScoringModelService } from './scoringModel.service';
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
export * from './team.service';
import { TeamService } from './team.service';
export * from './teamType.service';
import { TeamTypeService } from './teamType.service';
export * from './teamUser.service';
import { TeamUserService } from './teamUser.service';
export * from './user.service';
import { UserService } from './user.service';
export * from './userPermission.service';
import { UserPermissionService } from './userPermission.service';
export const APIS = [ActionService, EvaluationService, GalleryService, HealthCheckService, MoveService, PermissionService, RoleService, ScoringCategoryService, ScoringModelService, ScoringOptionService, SubmissionService, SubmissionCategoryService, SubmissionCommentService, SubmissionOptionService, TeamService, TeamTypeService, TeamUserService, UserService, UserPermissionService];
