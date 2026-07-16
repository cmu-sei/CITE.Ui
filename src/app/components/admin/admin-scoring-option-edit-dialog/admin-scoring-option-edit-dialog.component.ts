// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, EventEmitter, Inject, Output } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  UntypedFormControl,
  FormGroupDirective,
  NgForm,
  Validators,
} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

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
    selector: 'app-admin-scoring-option-edit-dialog',
    templateUrl: './admin-scoring-option-edit-dialog.component.html',
    styleUrls: ['./admin-scoring-option-edit-dialog.component.scss'],
    standalone: false
})

export class AdminScoringOptionEditDialogComponent {
  @Output() editComplete = new EventEmitter<any>();
  public form: FormGroup;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private formBuilder: FormBuilder
  ) {
    const option = data.scoringOption;
    this.form = this.formBuilder.group({
      description: [option.description, Validators.required],
      displayOrder: [option.displayOrder],
      value: [option.value],
      isModifier: [option.isModifier],
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
      this.editComplete.emit({ saveChanges: false, scoringOption: null });
    } else {
      if (this.errorFree()) {
        Object.assign(this.data.scoringOption, this.form.getRawValue());
        this.editComplete.emit({
          saveChanges: saveChanges,
          scoringOption: this.data.scoringOption,
        });
      }
    }
  }

}
