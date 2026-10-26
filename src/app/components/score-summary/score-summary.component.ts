// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, OnDestroy, inject, input } from '@angular/core';
import { ScoringModel, Submission } from 'src/app/generated/cite.api/model/models';
import { SubmissionQuery } from 'src/app/data/submission/submission.query';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NgClass } from '@angular/common';

export interface ScoreSummaryLevel {
  scoremin: string;
  scoremax: string;
  level: number;
  name: string;
  color: string;
  definition: string;
}

@Component({
    selector: 'app-score-summary',
    templateUrl: './score-summary.component.html',
    styleUrls: ['./score-summary.component.scss'],
    imports: [NgClass]
})
export class ScoreSummaryComponent implements OnDestroy {
  private submissionQuery = inject(SubmissionQuery);

  isLoading = false;
  readonly selectedScoringModel = input<ScoringModel>(undefined);
  submissionList: Submission[];
  activeSubmission: Submission = {};
  levels: ScoreSummaryLevel[] = [
    {
      scoremin: '90', scoremax: '100', level: 5, name: 'Emergency', color: 'black',
      definition: 'Poses an imminent threat to the provision of wide-scale critical infrastructure services, national government stability, or to the lives of U.S. persons'},
    {
      scoremin: '75', scoremax: '89.99', level: 4, name: 'Severe', color: 'red',
      definition: 'Likely to result in a significant impact to public health or safety, national security, economic security, foreign relations, or civil liberties.'},
    {
      scoremin: '65', scoremax: '74.99', level: 3, name: 'High', color: 'orange',
      definition: 'Likely to result in a demonstrable impact to public health or safety, national security, economic security, foreign relations, civil liberties, or public confidence'},
    {
      scoremin: '50', scoremax: '64.99', level: 2, name: 'Medium', color: 'yellow',
      definition: 'May impact public health or safety, national security, economic security, foreign relations, civil liberties, or public confidence.'},
    {
      scoremin: '35', scoremax: '49.99', level: 1, name: 'Low', color: 'green',
      definition: 'Unlikely to impact public health or safety, national security, economic security, foreign relations, civil liberties, or public confidence'},
    {
      scoremin: '0', scoremax: '34.99', level: 0, name: 'Baseline', color: 'white', definition: 'Unsubstantiated or inconsequential event'}
  ];
  private unsubscribe$ = new Subject();


  constructor() {
    this.submissionQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(submissions => {
      this.submissionList = submissions;
    });
    (this.submissionQuery.selectActive() as Observable<Submission>).pipe(takeUntil(this.unsubscribe$)).subscribe(submission => {
      if (submission) {
        this.activeSubmission = submission;
      }
    });
  }

  currentSubmissions() {
    if (this.activeSubmission && this.submissionList) {
      return this.submissionList
        .filter(s => s.moveNumber === this.activeSubmission.moveNumber)
        .sort((a, b) => b.score - a.score);
    } else {
      return [];
    }
  }

  // the active move's scores that fall in a level, highest first
  scoresInLevel(level: ScoreSummaryLevel) {
    return this.currentSubmissions()
      .filter(submission => this.inLevel(level, submission))
      .map(submission => ({
        id: submission.id,
        score: this.roundedScore(submission),
        type: this.submissionType(submission),
        isActive: submission.id === this.activeSubmission.id,
      }));
  }

  // the level holding the score shown on the scoresheet
  isCurrentLevel(level: ScoreSummaryLevel) {
    return !!this.activeSubmission.id && this.inLevel(level, this.activeSubmission);
  }

  // named as on the scoresheet's view buttons
  submissionType(submission: Submission) {
    if (submission.userId != null) {
      return 'User';
    } else if (submission.teamId != null) {
      return submission.scoreIsAnAverage ? 'Team Avg' : 'Team';
    } else if (submission.groupId != null) {
      return 'Group Avg';
    }
    return 'Official';
  }

  private inLevel(level: ScoreSummaryLevel, submission: Submission) {
    const score = this.roundedScore(submission);
    return score >= +level.scoremin && score <= +level.scoremax;
  }

  private roundedScore(submission: Submission) {
    return Math.round((submission.score + Number.EPSILON) * 100) / 100;
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
