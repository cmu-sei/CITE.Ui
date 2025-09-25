// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Order, Query, QueryConfig, QueryEntity } from '@datorama/akita';
import { SubmissionState, SubmissionStore } from './submission.store';
import { Submission } from 'src/app/generated/cite.api';
import { Injectable } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { PopulatedSubmission, SubmissionType } from './submission.models';
import { TeamQuery } from '../team/team.query';
import { map } from 'rxjs/operators';
import { UserQuery } from '../user/user.query';

@QueryConfig({
  sortBy: 'name',
  sortByOrder: Order.ASC,
})
@Injectable({
  providedIn: 'root',
})
export class SubmissionQuery extends QueryEntity<SubmissionState> {
  constructor(
    protected store: SubmissionStore,
    protected teamQuery: TeamQuery,
    protected userQuery: UserQuery
  ) {
    super(store);
  }

  selectById(id: string): Observable<Submission> {
    return this.selectEntity(id);
  }

  selectAllPopulated(): Observable<Array<PopulatedSubmission>> {
    return combineLatest([
      this.selectAll(),
      this.teamQuery.selectAll(),
      this.userQuery.selectAll()
    ]).pipe(
      map(([submissions, teams, users]) => {
        const populatedSubmissions: Array<PopulatedSubmission> = [];
        submissions.forEach((submission) => {
          if (submission.userId) {
            // user submission
            const populatedSubmission = {
              ...submission,
            } as PopulatedSubmission;
            const user = users.find((x) => x.id === submission.userId);
            if (user) {
              populatedSubmission.name = user.name;
            } else {
              populatedSubmission.name = submission.userId;
            }
            populatedSubmission.submissionType = SubmissionType.user;
            populatedSubmissions.push(populatedSubmission);
          } else if (submission.teamId) {
            if (!submission.scoreIsAnAverage) {
              // team submission
              const populatedSubmission = {
                ...submission,
              } as PopulatedSubmission;
              const team = teams.find((x) => x.id === submission.teamId);
              if (team) {
                populatedSubmission.name = team.name;
              } else {
                populatedSubmission.name = submission.teamId;
              }
              populatedSubmission.submissionType = SubmissionType.team;
              populatedSubmissions.push(populatedSubmission);
            } else if (submission.scoreIsAnAverage) {
              // team average submission
              const populatedSubmission = {
                ...submission,
              } as PopulatedSubmission;
              const team = teams.find((x) => x.id === submission.teamId);
              if (team) {
                populatedSubmission.name = team.name;
              } else {
                populatedSubmission.name = submission.teamId;
              }
              populatedSubmission.submissionType = SubmissionType.teamAvg;
              populatedSubmissions.push(populatedSubmission);
            }
          } else if (submission.groupId) {
            // group average submission
            const populatedSubmission = {
              ...submission,
            } as PopulatedSubmission;
            // const group = groups.find((x) => x.id === submission.groupId);
            // if (group) {
            //   populatedSubmission.name = group.name;
            // }
            populatedSubmission.name = submission.groupId;
            // TODO: fix the above code to work with team types
            populatedSubmission.submissionType = SubmissionType.groupAvg;
            populatedSubmissions.push(populatedSubmission);
          } else {
            // official submission
            const populatedSubmission = {
              ...submission,
            } as PopulatedSubmission;
            populatedSubmission.submissionType = SubmissionType.official;
            populatedSubmission.name = 'Official Score';
            populatedSubmissions.push(populatedSubmission);
          }
        });
        return populatedSubmissions.sort((a: PopulatedSubmission, b: PopulatedSubmission) => {
          if (a.moveNumber === b.moveNumber) {
            if (a.submissionType === b.submissionType) {
              return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
            } else {
              return a.submissionType < b.submissionType ? -1 : 1;
            }
          } else {
            return b.moveNumber - a.moveNumber;
          }
        });
      })
    );
  }
}
