// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, Input, OnDestroy } from '@angular/core';
import { ScoringModel, Submission } from 'src/app/generated/cite.api/model/models';
import { SubmissionQuery } from 'src/app/data/submission/submission.query';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-score-card',
  templateUrl: './score-card.component.html',
  styleUrls: ['./score-card.component.scss'],
})
export class ScoreCardComponent implements OnDestroy {
  isLoading = false;
  @Input() selectedScoringModel: ScoringModel;
  @Input() submissionList: Submission[];
  displayedMoveNumber = -1;
  levels = [
    {
      scoremin: '90', scoremax: '100', level: 5, name: 'Emergency', color: 'black',
      definition: 'Poses an imminent threat to the provision of wide-scale critical infrastructure services, national goverment stability, or to the lives of U.S. persons'},
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
  columnsToDisplay = ['score', 'scoremin', 'name'];
  private unsubscribe$ = new Subject();


  constructor(
    private submissionQuery: SubmissionQuery
  ) {
    (this.submissionQuery.selectActive() as Observable<Submission>).pipe(takeUntil(this.unsubscribe$)).subscribe((active) => {
      if (active && active.id) {
        this.displayedMoveNumber = active.moveNumber;
      }
    });
  }

  currentSubmissions() {
    if (this.submissionList) {
      return this.submissionList
        .filter(s => s.moveNumber === this.displayedMoveNumber)
        .sort((a, b) => b.score - a.score);
    } else {
      return [];
    }
  }

  showScore(level, submission) {
    let displayText = '';
    const score = (Math.round((submission.score + Number.EPSILON) * 100) / 100);
    if (score >= +level.scoremin && score <= +level.scoremax) {
      if (submission.userId != null) {
        displayText = ' (user)';
      } else if (submission.teamId != null) {
        if (submission.scoreIsAnAverage) {
          displayText = ' (team-avg)';
        } else {
          displayText = ' (team)';
        }
      } else if (submission.groupId != null) {
        displayText = ' (group-avg)';
      } else {
        displayText = ' (official)';
      }
      return score + displayText;
    }

    return '';
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
