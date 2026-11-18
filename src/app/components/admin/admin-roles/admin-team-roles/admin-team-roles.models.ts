// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { TeamPermission } from 'src/app/generated/cite.api';

export class TeamRolesModel {
  public static TeamPermissions = new Map<string, string>([
    [TeamPermission.ViewTeam, 'Allows viewing the Team and its scoresheet.'],
    [
      TeamPermission.EditTeamScore,
      "Allows selecting options and adding comments on the Team's scoresheet.",
    ],
    [
      TeamPermission.SubmitTeamScore,
      "Allows submitting and reopening the Team's scoresheet.",
    ],
    [
      TeamPermission.ManageTeam,
      "Allows making changes to the Team's memberships.",
    ],
    [
      TeamPermission.ViewPastOfficialScore,
      'Allows viewing the Official score of moves before the current move.',
    ],
    [
      TeamPermission.ViewCurrentOfficialScore,
      'Allows viewing the Official score of the current move.',
    ],
    [
      TeamPermission.EditOfficialScore,
      'Allows viewing the Official score of the current move, and scoring and submitting the Official score of any move. Held on any of a user\'s Teams, it applies to the Official score of that Team\'s Evaluation.',
    ],
  ]);
}
