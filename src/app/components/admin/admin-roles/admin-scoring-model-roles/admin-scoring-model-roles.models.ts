/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ScoringModelPermission } from 'src/app/generated/api';

export class ScoringModelRolesModel {
  public static ScoringModelPermissions = new Map<string, string>([
    [
      'All',
      'Gives permission to perform any action within the ScoringModel',
    ],
    [
      ScoringModelPermission.EditScoringModel,
      'Allows performing most actions in the ScoringModel. Can make changes to the contents of the ScoringModel, including creating and editing Files, Directories, and Workspaces. Can Plan and Apply Workspace Runs.',
    ],
    [
      ScoringModelPermission.ManageScoringModel,
      'Allows for making changes to ScoringModel Memberships in the ScoringModel.',
    ],
    [
      ScoringModelPermission.ViewScoringModel,
      'Allows viewing all contents of the ScoringModel.',
    ],
  ]);
}
