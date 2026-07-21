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

const MIN_NAME_LENGTH = 3;

@Component({
    selector: 'app-admin-team-edit-dialog',
    templateUrl: './admin-team-edit-dialog.component.html',
    styleUrls: ['./admin-team-edit-dialog.component.scss'],
    standalone: false
})

export class AdminTeamEditDialogComponent {
  @Output() editComplete = new EventEmitter<any>();
  public form: FormGroup;

  readonly MIN_NAME_LENGTH = MIN_NAME_LENGTH;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private formBuilder: FormBuilder
  ) {
    this.form = this.formBuilder.group({
      name: [
        data.team.name,
        [Validators.required, Validators.minLength(MIN_NAME_LENGTH)],
      ],
      shortName: [
        data.team.shortName,
        [Validators.required, Validators.minLength(MIN_NAME_LENGTH)],
      ],
      teamTypeId: [data.team.teamTypeId, Validators.required],
      hideScoresheet: [data.team.hideScoresheet],
    });
  }

  get teamNameFormControl(): UntypedFormControl {
    return this.form.controls['name'] as UntypedFormControl;
  }

  get teamShortNameFormControl(): UntypedFormControl {
    return this.form.controls['shortName'] as UntypedFormControl;
  }

  get teamTypeIdFormControl(): UntypedFormControl {
    return this.form.controls['teamTypeId'] as UntypedFormControl;
  }

  errorFree() {
    return this.form.valid;
  }

  /**
   * Closes the edit screen
   */
  handleEditComplete(saveChanges: boolean): void {
    if (!saveChanges) {
      this.editComplete.emit({ saveChanges: false, team: null });
    } else {
      if (this.errorFree()) {
        const values = this.form.getRawValue();
        Object.assign(this.data.team, values, {
          name: values.name.toString().trim(),
          shortName: values.shortName.toString().trim(),
          teamTypeId: values.teamTypeId.toString().trim(),
        });
        this.editComplete.emit({
          saveChanges: saveChanges,
          team: this.data.team,
        });
      }
    }
  }

  getUserName(userId: string) {
    return this.data.userList.find(u => u.id === userId).name;
  }

}
