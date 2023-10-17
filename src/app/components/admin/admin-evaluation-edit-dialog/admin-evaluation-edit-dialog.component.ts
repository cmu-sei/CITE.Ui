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
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { Editor, Toolbar } from 'ngx-editor';


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
  editor: Editor;
  toolbar: Toolbar = [
    ['bold', 'italic'],
    ['underline', 'strike'],
    ['code', 'blockquote'],
    ['ordered_list', 'bullet_list'],
    [{ heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],
    ['link', 'image'],
    ['text_color', 'background_color'],
    ['align_left', 'align_center', 'align_right', 'align_justify'],
  ];

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
    this.editor = new Editor();
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
    this.editor.destroy();
  }

}
