// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, inject, output } from '@angular/core';
import { FormBuilder, FormGroup, UntypedFormControl, FormGroupDirective, NgForm, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CrucibleDialogComponent, CrucibleDialogContentDirective } from '@cmusei/crucible-common';
import { MatFormField, MatLabel, MatInput } from '@angular/material/input';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/autocomplete';
import { MatCheckbox } from '@angular/material/checkbox';

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
    imports: [CrucibleDialogComponent, CrucibleDialogContentDirective, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatIconButton, MatTooltip, MatIcon, MatSelect, MatOption, MatCheckbox]
})

export class AdminScoringCategoryEditDialogComponent {
  data = inject(MAT_DIALOG_DATA);
  private formBuilder = inject(FormBuilder);

  readonly editComplete = output<any>();
  public form: FormGroup;

  constructor() {
    const data = this.data;

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
