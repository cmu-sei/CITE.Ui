// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, OnDestroy, computed, inject, input } from '@angular/core';
import { ScoringModel, Submission } from 'src/app/generated/cite.api/model/models';
import { SubmissionQuery } from 'src/app/data/submission/submission.query';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  DisplayedSeverityLevel,
  roundScore,
  severityLevelForScore,
  severityLevelRange,
  severityLevels,
} from 'src/app/utilities/severity-levels';

@Component({
    selector: 'app-score-summary',
    templateUrl: './score-summary.component.html',
    styleUrls: ['./score-summary.component.scss'],
    imports: []
})
export class ScoreSummaryComponent implements OnDestroy {
  private submissionQuery = inject(SubmissionQuery);

  isLoading = false;
  readonly selectedScoringModel = input<ScoringModel>(undefined);
  submissionList: Submission[];
  activeSubmission: Submission = {};
  // the scoring model's levels, or the default CISA levels, highest first
  readonly levels = computed(() => severityLevels(this.selectedScoringModel()));
  readonly levelRange = severityLevelRange;
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
  scoresInLevel(level: DisplayedSeverityLevel) {
    return this.currentSubmissions()
      .filter(submission => this.levelFor(submission) === level)
      .map(submission => ({
        id: submission.id,
        score: roundScore(submission.score),
        type: this.submissionType(submission),
        isActive: submission.id === this.activeSubmission.id,
      }));
  }

  // the level holding the score shown on the scoresheet
  isCurrentLevel(level: DisplayedSeverityLevel) {
    return !!this.activeSubmission.id && this.levelFor(this.activeSubmission) === level;
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

  private levelFor(submission: Submission) {
    return severityLevelForScore(this.levels(), submission.score);
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
