// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, inject, output } from '@angular/core';
import { FormBuilder, FormGroup, UntypedFormControl, FormGroupDirective, NgForm, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import {
  MAT_DIALOG_DATA as MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { CrucibleDialogComponent, CrucibleDialogContentDirective } from '@cmusei/crucible-common';
import { MatFormField, MatLabel, MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/autocomplete';

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
    selector: 'app-admin-action-edit-dialog',
    templateUrl: './admin-action-edit-dialog.component.html',
    styleUrls: ['./admin-action-edit-dialog.component.scss'],
    imports: [CrucibleDialogComponent, CrucibleDialogContentDirective, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatSelect, MatOption]
})

export class AdminActionEditDialogComponent {
  data = inject(MAT_DIALOG_DATA);
  private formBuilder = inject(FormBuilder);

  readonly editComplete = output<any>();
  public form: FormGroup;

  constructor() {
    const data = this.data;

    this.form = this.formBuilder.group({
      description: [data.action.description, Validators.required],
      moveNumber: [
        data.action.moveNumber == null ? '' : data.action.moveNumber.toString(),
      ],
      // The API cannot move an existing action to another team.
      teamId: [{ value: data.action.teamId, disabled: !!data.action.id }],
    });
  }

  errorFree() {
    return this.form.valid;
  }

  /**
   * Closes the edit screen
   */
  handleEditComplete(saveChanges: boolean): void {
    if (!saveChanges) {
      this.editComplete.emit({ saveChanges: false, action: null });
    } else {
      if (this.errorFree()) {
        Object.assign(this.data.action, this.form.getRawValue());
        this.editComplete.emit({
          saveChanges: saveChanges,
          action: this.data.action,
        });
      }
    }
  }

}
