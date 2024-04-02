// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, Input, OnDestroy } from '@angular/core';
import { Evaluation } from 'src/app/generated/cite.api';
import { SafeUrl, DomSanitizer } from '@angular/platform-browser';
import { map, takeUntil } from 'rxjs/operators';
import { Subject, Observable } from 'rxjs';
import { AngularEditorConfig } from '@kolkov/angular-editor';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';

@Component({
  selector: 'app-right-side-iframe',
  templateUrl: './right-side-iframe.component.html',
  styleUrls: ['./right-side-iframe.component.scss'],
})
export class RightSideIframeComponent implements OnDestroy {
  safeUrl: SafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl('');
  private unsubscribe$ = new Subject();


  constructor(
    private sanitizer: DomSanitizer,
    private evaluationQuery: EvaluationQuery
  ) {
    // observe active evaluation
    (this.evaluationQuery.selectActive() as Observable<Evaluation>).pipe(takeUntil(this.unsubscribe$)).subscribe(active => {
      if (active) {
        this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(active.scoringModel.rightSideEmbeddedUrl);
      }
    });
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
