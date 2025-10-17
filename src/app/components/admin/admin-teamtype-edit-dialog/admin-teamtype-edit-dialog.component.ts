// Copyright 2025 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, EventEmitter, Inject, Output } from '@angular/core';
import {
  UntypedFormControl,
  FormGroupDirective,
  NgForm,
} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DialogService } from 'src/app/services/dialog/dialog.service';

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
    selector: 'app-admin-teamtype-edit-dialog',
    templateUrl: './admin-teamtype-edit-dialog.component.html',
    styleUrls: ['./admin-teamtype-edit-dialog.component.scss'],
    standalone: false
})

export class AdminTeamTypeEditDialogComponent {
  @Output() editComplete = new EventEmitter<any>();

  constructor(
    public dialogService: DialogService,
    dialogRef: MatDialogRef<AdminTeamTypeEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    dialogRef.disableClose = true;
  }

  errorFree() {
    return this.data.teamType.name.length > 0;
  }

  /**
   * Closes the edit screen
   */
  handleEditComplete(saveChanges: boolean): void {
    if (!saveChanges) {
      this.editComplete.emit({ saveChanges: false, teamType: null });
    } else {
      if (this.errorFree) {
        this.editComplete.emit({
          saveChanges: saveChanges,
          teamType: this.data.teamType,
        });
      }
    }
  }

  getUserName(userId: string) {
    return this.data.userList.find(u => u.id === userId).name;
  }

}
