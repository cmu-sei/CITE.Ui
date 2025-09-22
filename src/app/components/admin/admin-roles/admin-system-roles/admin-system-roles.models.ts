/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { SystemPermission } from 'src/app/generated/cite.api';

export class SystemRolesModel {
  public static SystemPermissions = new Map<string, string>([
    ['All', 'Gives permission to perform any action'],
    [
      SystemPermission.CreateScoringModels,
      'Allows creation of new ScoringModels. The creating User will be added as a Manager to the new ScoringModel.',
    ],
    [
      SystemPermission.EditScoringModels,
      'Allows performing most actions in a ScoringModel. Can make changes to the contents of a ScoringModel.',
    ],
    [
      SystemPermission.ViewScoringModels,
      'Allows viewing all ScoringModels and their Users and Groups. Implictly allows listing all Users and Groups. Enables the ScoringModels Administration panel',
    ],
    [
      SystemPermission.ManageScoringModels,
      'Allows for making changes to ScoringModel Memberships.',
    ],
    [
      SystemPermission.CreateEvaluations,
      'Allows creation of new Evaluations. The creating User will be added as a Manager to the new Evaluation.',
    ],
    [
      SystemPermission.EditEvaluations,
      'Allows performing most actions in a Evaluation. Can make changes to the contents of a Evaluation.',
    ],
    [
      SystemPermission.ViewEvaluations,
      'Allows viewing all Evaluations and their Users and Groups. Implictly allows listing all Users and Groups. Enables the Evaluations Administration panel',
    ],
    [
      SystemPermission.ManageEvaluations,
      'Allows for making changes to Evaluation Memberships.',
    ],
    [
      SystemPermission.ExecuteEvaluations,
      'Allows advancing the move in all Evaluations outside of the Administration panel.',
    ],
    [
      SystemPermission.ObserveEvaluations,
      'Allows viewing of all teams in all Evaluations outside of the Administration panel.',
    ],
    [
      SystemPermission.ViewGroups,
      'Allows viewing all Groups and Group Memberships. Implicitly allows listing of Users. Enables the Groups Administration panel. ',
    ],
    [
      SystemPermission.ViewRoles,
      'Allows viewing all Roles and Role Memberships.  Enables the Roles Administration panel. ',
    ],
    [
      SystemPermission.ManageGroups,
      'Allows for creating and making changes to all Groups and Group Memberships.',
    ],
    [
      SystemPermission.ManageRoles,
      'Allows for making changes to Roles. Can create new Roles, rename existing Roles, and assign and remove Permissions to Roles.',
    ],
    [
      SystemPermission.ViewUsers,
      'Allows viewing all Users. Enables the Users Administration panel',
    ],
    [
      SystemPermission.ManageUsers,
      'Allows for making changes to Users. Can add or remove Users and change their assigned Roles.',
    ],
  ]);
}
