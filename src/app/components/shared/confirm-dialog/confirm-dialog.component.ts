// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import {Component, Inject} from '@angular/core';

@Component({
    selector: 'confirm-dialog',
    templateUrl: './confirm-dialog.component.html'
})
export class ConfirmDialogComponent {
  public title: string;
  public message: string;
  public removeArtifacts: boolean = true;
  constructor(@Inject(MAT_DIALOG_DATA) public data: any, public dialogRef: MatDialogRef<ConfirmDialogComponent>) {
    this.dialogRef.disableClose = true;
  }
  onClick(confirm: boolean): void {
    this.data.artifacts && this.data.artifacts.length > 0 ? this.data.removeArtifacts = this.removeArtifacts : this.data.removeArtifacts = false;
    this.data.confirm = confirm;
    this.dialogRef.close(this.data);
  }
}


