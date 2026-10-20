// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, EventEmitter, Output, inject } from '@angular/core';
import { FormBuilder, FormGroup, UntypedFormControl, FormGroupDirective, NgForm, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
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
    selector: 'app-admin-duty-edit-dialog',
    templateUrl: './admin-duty-edit-dialog.component.html',
    styleUrls: ['./admin-duty-edit-dialog.component.scss'],
    imports: [CrucibleDialogComponent, CrucibleDialogContentDirective, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatSelect, MatOption]
})

export class AdminDutyEditDialogComponent {
  data = inject(MAT_DIALOG_DATA);
  private formBuilder = inject(FormBuilder);

  @Output() editComplete = new EventEmitter<any>();
  public form: FormGroup;

  constructor() {
    const data = this.data;

    this.form = this.formBuilder.group({
      name: [{ value: data.duty.name, disabled: !data.canEdit }, Validators.required],
      teamId: [{ value: data.duty.teamId, disabled: !data.canEdit }],
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
      this.editComplete.emit({ saveChanges: false, duty: null });
    } else {
      if (this.errorFree()) {
        Object.assign(this.data.duty, this.form.getRawValue());
        this.editComplete.emit({
          saveChanges: saveChanges,
          duty: this.data.duty,
        });
      }
    }
  }

  getUserName(userId: string) {
    return this.data.userList.find(u => u.id === userId).name;
  }

}
