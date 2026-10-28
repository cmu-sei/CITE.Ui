// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, inject, output } from '@angular/core';
import { FormBuilder, FormGroup, UntypedFormControl, FormGroupDirective, NgForm, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import {
  MAT_DIALOG_DATA as MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { EDITOR_CONFIG } from 'src/app/utilities/editor-config';
import { CrucibleDialogComponent, CrucibleDialogContentDirective } from '@cmusei/crucible-common';
import { MatFormField, MatLabel, MatInput, MatSuffix } from '@angular/material/input';
import { NgxMatDatepickerInput, NgxMatDatetimepicker, NgxMatDatepickerActions, NgxMatDatepickerApply, NgxMatDatepickerCancel } from '@ngxmc/datetime-picker';
import { MatDatepickerToggle } from '@angular/material/datepicker';
import { MatButton } from '@angular/material/button';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { DatePipe } from '@angular/common';

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
    selector: 'app-admin-move-edit-dialog',
    templateUrl: './admin-move-edit-dialog.component.html',
    styleUrls: ['./admin-move-edit-dialog.component.scss'],
    imports: [CrucibleDialogComponent, CrucibleDialogContentDirective, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, NgxMatDatepickerInput, MatDatepickerToggle, MatSuffix, NgxMatDatetimepicker, NgxMatDatepickerActions, MatButton, NgxMatDatepickerApply, NgxMatDatepickerCancel, AngularEditorModule, DatePipe]
})

export class AdminMoveEditDialogComponent {
  data = inject(MAT_DIALOG_DATA);
  private formBuilder = inject(FormBuilder);

  readonly editComplete = output<any>();
  public form: FormGroup;
  editorConfig = EDITOR_CONFIG;

  constructor() {
    const data = this.data;

    this.form = this.formBuilder.group({
      moveNumber: [data.move.moveNumber],
      description: [data.move.description, Validators.required],
      // the API requires a situation time, and an empty one fails the save
      situationTime: [data.move.situationTime || new Date()],
      situationDescription: [data.move.situationDescription],
    });
  }

  get situationDateFormControl(): UntypedFormControl {
    return this.form.controls['situationTime'] as UntypedFormControl;
  }

  errorFree() {
    return this.form.valid;
  }

  /**
   * Closes the edit screen
   */
  handleEditComplete(saveChanges: boolean): void {
    if (!saveChanges) {
      this.editComplete.emit({ saveChanges: false, move: null });
    } else {
      if (this.errorFree()) {
        Object.assign(this.data.move, this.form.getRawValue());
        if (this.data.move.situationTime) {
          this.data.move.situationTime = new Date(this.data.move.situationTime);
        }
        this.editComplete.emit({
          saveChanges: saveChanges,
          move: this.data.move,
        });
      }
    }
  }

  /**
   * Saves the current move
   */
  saveMove(changedField): void {
    switch (changedField) {
      case 'situationDate':
        if (this.situationDateFormControl.value) {
          this.situationDateFormControl.setValue(
            new Date(this.situationDateFormControl.value),
            { emitEvent: false }
          );
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
    this.data.move.currentMoveNumber ++;
  }

  decrementCurrentMoveNumber() {
    this.data.move.currentMoveNumber --;
  }

  getUserTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  }

  // label the zone from the date shown, so a date across a DST change gets its own abbreviation
  getTimezoneAbbr(value?: Date | string): string {
    try {
      const date = value ? new Date(value) : new Date();
      const timeZone = this.getUserTimezone();
      const formatted = date.toLocaleTimeString('en-US', {
        timeZoneName: 'short',
        timeZone
      });
      const parts = formatted.split(' ');
      return parts[parts.length - 1] || 'UTC';
    } catch (error) {
      return 'UTC';
    }
  }

}
