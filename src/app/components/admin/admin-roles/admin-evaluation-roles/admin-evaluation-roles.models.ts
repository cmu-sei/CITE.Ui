/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { EvaluationPermission } from 'src/app/generated/api';

export class EvaluationRolesModel {
  public static EvaluationPermissions = new Map<string, string>([
    ['All', 'Gives permission to perform any action within the Evaluation'],
    [
      EvaluationPermission.EditEvaluation,
      'Allows performing most actions in the Evaluation. Can make changes to the contents of the Evaluation, including creating and editing Files, Directories, and Workspaces. Can Plan and Apply Workspace Runs.',
    ],
    [
      EvaluationPermission.ManageEvaluation,
      'Allows for making changes to Evaluation Memberships in the Evaluation.',
    ],
    [
      EvaluationPermission.ViewEvaluation,
      'Allows viewing all contents of the Evaluation.',
    ],
  ]);
}
