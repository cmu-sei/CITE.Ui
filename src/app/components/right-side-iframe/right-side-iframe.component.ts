// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, Input, OnDestroy } from '@angular/core';
import { ScoringModel } from 'src/app/generated/cite.api';
import { SafeUrl, DomSanitizer } from '@angular/platform-browser';
import { takeUntil } from 'rxjs/operators';
import { Subject, Observable, combineLatest } from 'rxjs';
import { ScoringModelQuery } from 'src/app/data/scoring-model/scoring-model.query';

@Component({
  selector: 'app-right-side-iframe',
  templateUrl: './right-side-iframe.component.html',
  styleUrls: ['./right-side-iframe.component.scss'],
})
export class RightSideIframeComponent implements OnDestroy {
  @Input() hideTopbar: boolean;
  safeUrl: SafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl('');
  private unsubscribe$ = new Subject();


  constructor(
    private sanitizer: DomSanitizer,
    private scoringModelQuery: ScoringModelQuery
  ) {
    // observe active evaluation
    (this.scoringModelQuery.selectActive() as Observable<ScoringModel>).pipe(takeUntil(this.unsubscribe$)).subscribe(active => {
      if (active) {
        this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(active.rightSideEmbeddedUrl);
      }
    });
  }

  getTopClass() {
    if (this.hideTopbar) {
      return 'top-level-container in-player'
    } else {
      return 'top-level-container out-of-player'
    }
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
