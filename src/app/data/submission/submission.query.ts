// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { Order, Query, QueryConfig, QueryEntity } from '@datorama/akita';
import { SubmissionState, SubmissionStore } from './submission.store';
import { Submission } from 'src/app/generated/cite.api';
import { Injectable } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { combineLatest, Observable } from 'rxjs';
import { PopulatedSubmission, SubmissionType } from './submission.models';
import { TeamQuery } from '../team/team.query';
import { filter, map, switchMap } from 'rxjs/operators';
import { GroupQuery } from '../group/group.query';
import { UserDataService } from 'src/app/data/user/user-data.service';

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
    protected groupQuery: GroupQuery,
    protected userDataService: UserDataService
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
      this.groupQuery.selectAll(),
      this.userDataService.userList
    ]).pipe(
      map(([submissions, teams, groups, users]) => {
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
            }
            populatedSubmission.submissionType = SubmissionType.user;
            populatedSubmissions.push(populatedSubmission);
          }
          else if (submission.teamId) {
            if (!submission.scoreIsAnAverage) {
              // team submission
              const populatedSubmission = {
                ...submission,
              } as PopulatedSubmission;
              const team = teams.find((x) => x.id === submission.teamId);
              if (team) {
                populatedSubmission.name = team.name;
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
              }
              populatedSubmission.submissionType = SubmissionType.teamAvg;
              populatedSubmissions.push(populatedSubmission);
            }
          } else if (submission.groupId) {
            // group average submission
            const populatedSubmission = {
              ...submission,
            } as PopulatedSubmission;
            const group = groups.find((x) => x.id === submission.groupId);
            if (group) {
              populatedSubmission.name = group.name;
            }
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
