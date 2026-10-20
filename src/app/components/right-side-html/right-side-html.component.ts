// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, OnDestroy, inject, input } from '@angular/core';
import { ScoringModel } from 'src/app/generated/cite.api';
import { SubmissionQuery } from 'src/app/data/submission/submission.query';
import { Subject, Observable } from 'rxjs';
import { VIEW_CONFIG } from 'src/app/utilities/editor-config';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';

@Component({
    selector: 'app-right-side-html',
    templateUrl: './right-side-html.component.html',
    styleUrls: ['./right-side-html.component.scss'],
    imports: [AngularEditorModule, FormsModule, AsyncPipe]
})
export class RightSideHtmlComponent implements OnDestroy {
  private submissionQuery = inject(SubmissionQuery);

  isLoading = false;
  readonly scoringModel$ = input<Observable<ScoringModel>>(undefined);
  readonly hideTopbar = input<boolean>(undefined);
  editorConfig = VIEW_CONFIG;
  private unsubscribe$ = new Subject();

  getTopClass() {
    if (this.hideTopbar()) {
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
