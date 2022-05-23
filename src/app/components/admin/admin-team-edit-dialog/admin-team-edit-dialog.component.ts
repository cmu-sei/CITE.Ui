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
import { ItemStatus } from 'src/app/generated/cite.api/model/models';
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

const MIN_NAME_LENGTH = 3;

@Component({
  selector: 'app-admin-team-edit-dialog',
  templateUrl: './admin-team-edit-dialog.component.html',
  styleUrls: ['./admin-team-edit-dialog.component.scss'],
})

export class AdminTeamEditDialogComponent {
  @Output() editComplete = new EventEmitter<any>();

  public teamNameFormControl = new FormControl(
    this.data.team.name,
    [
      Validators.required,
      Validators.minLength(MIN_NAME_LENGTH),
    ]
  );
  public teamShortNameFormControl = new FormControl(
    this.data.team.shortName,
    [
      Validators.required,
      Validators.minLength(MIN_NAME_LENGTH),
    ]
  );
  public teamTypeIdFormControl = new FormControl(
    this.data.team.teamTypeId ,
    [
      Validators.required
    ]
  );

  constructor(
    public dialogService: DialogService,
    dialogRef: MatDialogRef<AdminTeamEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    dialogRef.disableClose = true;
  }

  errorFree() {
    return !(
      this.teamNameFormControl.hasError('required') ||
      this.teamNameFormControl.hasError('minlength') ||
      this.teamShortNameFormControl.hasError('required') ||
      this.teamShortNameFormControl.hasError('minlength') ||
      this.teamTypeIdFormControl.hasError('required')
    );
  }

  /**
   * Closes the edit screen
   */
  handleEditComplete(saveChanges: boolean): void {
    if (!saveChanges) {
      this.editComplete.emit({ saveChanges: false, team: null });
    } else {
      this.data.team.name = this.teamNameFormControl.value
        .toString()
        .trim();
        this.data.team.shortName = this.teamShortNameFormControl.value
        .toString()
        .trim();
        this.data.team.teamTypeId = this.teamTypeIdFormControl.value
        .toString()
        .trim();
      if (this.errorFree) {
        this.editComplete.emit({
          saveChanges: saveChanges,
          team: this.data.team,
        });
      }
    }
  }

  /**
   * Saves the current team
   */
  saveTeam(changedField): void {
    switch (changedField) {
      case 'name':
        this.data.team.name = this.teamNameFormControl.value.toString();
        break;
      case 'shortName':
        this.data.team.shortName = this.teamShortNameFormControl.value.toString();
        break;
      case 'teamTypeId':
        this.data.team.teamTypeId = this.teamTypeIdFormControl.value.toString();
        break;
      default:
        break;
    }
  }

  getUserName(userId: string) {
    return this.data.userList.find(u => u.id === userId).name;
  }

}
