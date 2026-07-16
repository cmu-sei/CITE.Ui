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
    selector: 'app-admin-scoring-category-edit-dialog',
    templateUrl: './admin-scoring-category-edit-dialog.component.html',
    styleUrls: ['./admin-scoring-category-edit-dialog.component.scss'],
    standalone: false
})

export class AdminScoringCategoryEditDialogComponent {
  @Output() editComplete = new EventEmitter<any>();
  public form: FormGroup;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private formBuilder: FormBuilder
  ) {
    const category = data.scoringCategory;
    const disabled = !data.canEdit;
    this.form = this.formBuilder.group({
      description: [{ value: category.description, disabled }, Validators.required],
      displayOrder: [{ value: category.displayOrder, disabled }],
      moveNumberFirstDisplay: [{ value: category.moveNumberFirstDisplay, disabled }],
      moveNumberLastDisplay: [{ value: category.moveNumberLastDisplay, disabled }],
      calculationEquation: [{ value: category.calculationEquation, disabled }],
      scoringWeight: [{ value: category.scoringWeight, disabled }],
      scoringOptionSelection: [{ value: category.scoringOptionSelection, disabled }],
      isModifierRequired: [{ value: category.isModifierRequired, disabled }],
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
      this.editComplete.emit({ saveChanges: false, scoringCategory: null });
    } else {
      if (this.errorFree()) {
        Object.assign(this.data.scoringCategory, this.form.getRawValue());
        this.editComplete.emit({
          saveChanges: saveChanges,
          scoringCategory: this.data.scoringCategory,
        });
      }
    }
  }

}
