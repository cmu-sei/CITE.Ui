// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, Input, OnDestroy } from '@angular/core';
import { ScoringModel } from 'src/app/generated/cite.api';
import { SubmissionQuery } from 'src/app/data/submission/submission.query';
import { Subject, Observable } from 'rxjs';
import { AngularEditorConfig } from '@kolkov/angular-editor';

@Component({
  selector: 'app-right-side-html',
  templateUrl: './right-side-html.component.html',
  styleUrls: ['./right-side-html.component.scss'],
})
export class RightSideHtmlComponent implements OnDestroy {
  isLoading = false;
  @Input() scoringModel$: Observable<ScoringModel>;
  @Input() hideTopbar: boolean;
  editorConfig: AngularEditorConfig = {
    editable: false,
    height: 'auto',
    minHeight: '1200px',
    width: '100%',
    minWidth: '0',
    translate: 'yes',
    enableToolbar: false,
    showToolbar: false,
    placeholder: '',
    defaultParagraphSeparator: '',
    defaultFontName: '',
    defaultFontSize: '',
    sanitize: true,
  };
  private unsubscribe$ = new Subject();


  constructor(
    private submissionQuery: SubmissionQuery
  ) {}

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
