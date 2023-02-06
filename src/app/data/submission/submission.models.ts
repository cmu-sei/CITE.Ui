// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import {
  ItemStatus,
  Submission,
  SubmissionCategory,
} from 'src/app/generated/cite.api';

export enum SubmissionType {
  user = 'User',
  team = 'Team',
  teamAvg = 'Team Average',
  groupAvg = 'Group Average',
  official = 'Official'
}

export class PopulatedSubmission implements Submission {
  id?: string;
  score?: number;
  status?: ItemStatus;
  scoringModelId?: string;
  userId?: string | null;
  evaluationId?: string;
  teamId?: string | null;
  groupId?: string | null;
  moveNumber?: number;
  scoreIsAnAverage?: boolean;
  submissionCategories?: Array<SubmissionCategory> | null;
  dateCreated?: Date;
  dateModified?: Date | null;
  createdBy?: string;
  modifiedBy?: string | null;
  name?: string | null;
  submissionType?: SubmissionType | null;
}
