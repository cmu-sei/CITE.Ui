// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, EventEmitter, Inject, OnDestroy, OnInit, Output } from '@angular/core';
import {
  UntypedFormControl,
  FormGroupDirective,
  NgForm,
} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import {
  MatDialogRef,
  MAT_DIALOG_DATA as MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { AngularEditorConfig } from '@kolkov/angular-editor';

/** Error when invalid control is dirty, touched, or submitted. */
export class UserErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(
    control: UntypedFormControl | null,
    form: FormGroupDirective | NgForm | null
  ): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || isSubmitted));
  }
}

@Component({
  selector: 'app-admin-evaluation-edit-dialog',
  templateUrl: './admin-evaluation-edit-dialog.component.html',
  styleUrls: ['./admin-evaluation-edit-dialog.component.scss'],
})

export class AdminEvaluationEditDialogComponent implements OnInit, OnDestroy {
  @Output() editComplete = new EventEmitter<any>();

  editorConfig: AngularEditorConfig = {
    editable: true,
    spellcheck: true,
    height: 'auto',
    minHeight: '0',
    maxHeight: 'auto',
    width: 'auto',
    minWidth: '0',
    translate: 'yes',
    enableToolbar: true,
    showToolbar: true,
    placeholder: 'Enter text here...',
    defaultParagraphSeparator: '',
    defaultFontName: '',
    defaultFontSize: '',
    fonts: [
      {class: 'arial', name: 'Arial'},
      {class: 'times-new-roman', name: 'Times New Roman'},
      {class: 'calibri', name: 'Calibri'},
      {class: 'comic-sans-ms', name: 'Comic Sans MS'}
    ],
    uploadUrl: '',
    uploadWithCredentials: false,
    sanitize: true,
    toolbarPosition: 'top',
    toolbarHiddenButtons: [
      ['backgroundColor']
    ]
  };
  public situationDateFormControl = new UntypedFormControl(
    this.data.evaluation.situationTime ? this.data.evaluation.situationTime : '',
    []
  );

  constructor(
    public dialogService: DialogService,
    dialogRef: MatDialogRef<AdminEvaluationEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    dialogRef.disableClose = true;
  }

  ngOnInit() {
  }

  errorFree() {
    return this.data.evaluation.description.length > 0;
  }

  /**
   * Closes the edit screen
   */
  handleEditComplete(saveChanges: boolean): void {
    if (!saveChanges) {
      this.editComplete.emit({ saveChanges: false, evaluation: null });
    } else {
      if (this.errorFree) {
        this.editComplete.emit({
          saveChanges: saveChanges,
          evaluation: this.data.evaluation,
        });
      }
    }
  }

  /**
   * Saves the current evaluation
   */
  saveEvaluation(changedField): void {
    switch (changedField) {
      case 'situationDate':
        const newSituation = new Date(this.situationDateFormControl.value);
        const oldSituation = new Date(this.data.evaluation.situationTime);
        newSituation.setHours(oldSituation.getHours());
        newSituation.setMinutes(oldSituation.getMinutes());
        this.data.evaluation.situationTime = newSituation;
        break;
      default:
        break;
    }
  }

  getUserName(userId: string) {
    return this.data.userList.find(u => u.id === userId).name;
  }

  incrementCurrentMoveNumber() {
    this.data.evaluation.currentMoveNumber ++;
  }

  decrementCurrentMoveNumber() {
    this.data.evaluation.currentMoveNumber --;
  }

  ngOnDestroy() {
  }

}
