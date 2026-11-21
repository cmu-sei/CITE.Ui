// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, DOCUMENT, OnDestroy, inject, input } from '@angular/core';
import { ScoringModel } from 'src/app/generated/cite.api';
import { SafeUrl, DomSanitizer } from '@angular/platform-browser';
import { takeUntil } from 'rxjs/operators';
import { Subject, Observable, combineLatest } from 'rxjs';
import { ScoringModelQuery } from 'src/app/data/scoring-model/scoring-model.query';
import { embeddableUrl } from 'src/app/utilities/embedded-url';

@Component({
  selector: 'app-right-side-iframe',
  templateUrl: './right-side-iframe.component.html',
  styleUrls: ['./right-side-iframe.component.scss'],
  imports: [],
})
export class RightSideIframeComponent implements OnDestroy {
  private sanitizer = inject(DomSanitizer);
  private scoringModelQuery = inject(ScoringModelQuery);
  private document = inject(DOCUMENT);

  readonly hideTopbar = input<boolean>(undefined);
  safeUrl: SafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl('');
  // the active model names a URL that isn't a full http(s) address
  refusedUrl = false;
  // safeUrl is on CITE's own origin, so the frame gets the stricter sandbox;
  // it changes only with safeUrl, which is kept when there is no active model
  sameOrigin = false;
  private unsubscribe$ = new Subject();

  constructor() {
    // observe active evaluation
    (this.scoringModelQuery.selectActive() as Observable<ScoringModel>)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((active) => {
        if (active) {
          // only a full http(s) address is trusted: any other scheme could run
          // script in the frame, and the bypass turns off Angular's own check;
          // the frame loads the parsed href, not the string as saved
          const url = active.rightSideEmbeddedUrl;
          const parsed = embeddableUrl(url);
          this.refusedUrl = !!url && !parsed;
          this.sameOrigin = parsed?.origin === this.document.location.origin;
          this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
            parsed ? parsed.href : '',
          );
        } else {
          this.refusedUrl = false;
        }
      });
  }

  getTopClass() {
    if (this.hideTopbar()) {
      return 'top-level-container in-player';
    } else {
      return 'top-level-container out-of-player';
    }
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
