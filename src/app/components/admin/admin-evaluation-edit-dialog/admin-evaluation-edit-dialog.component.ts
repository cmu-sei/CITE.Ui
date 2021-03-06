// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, EventEmitter, Inject, Output } from '@angular/core';
import {
  FormControl,
  FormGroupDirective,
  NgForm,
  Validators,
} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DialogService } from 'src/app/services/dialog/dialog.service';

/** Error when invalid control is dirty, touched, or submitted. */
export class UserErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(
    control: FormControl | null,
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

export class AdminEvaluationEditDialogComponent {
  @Output() editComplete = new EventEmitter<any>();

  public situationDateFormControl = new FormControl(
    this.data.evaluation.situationTime ? this.data.evaluation.situationTime : '',
    []
  );
  public situationTimeFormControl = new FormControl(
    this.data.evaluation.situationTime
      ? this.data.evaluation.situationTime.toTimeString().substr(0, 5)
      : '',
    []
  );

  constructor(
    public dialogService: DialogService,
    dialogRef: MatDialogRef<AdminEvaluationEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    dialogRef.disableClose = true;
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
      case 'situationTime':
        if (
          this.situationTimeFormControl.value.length === 5 &&
          (this.data.evaluation.situationTime.getHours() !==
            this.situationTimeFormControl.value.substr(0, 2) ||
            this.data.evaluation.situationTime.getMinutes() !==
              this.situationTimeFormControl.value.substr(2, 2))
        ) {
          const timeParts = this.situationTimeFormControl.value.split(':');
          const oldDate = new Date(this.data.evaluation.situationTime);
          this.data.evaluation.situationTime.setHours(timeParts[0]);
          this.data.evaluation.situationTime.setMinutes(timeParts[1]);
        }
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

}
