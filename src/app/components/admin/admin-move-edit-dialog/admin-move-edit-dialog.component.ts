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
import {
  MAT_DIALOG_DATA as MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { AngularEditorConfig } from '@kolkov/angular-editor';

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
    standalone: false
})

export class AdminMoveEditDialogComponent {
  @Output() editComplete = new EventEmitter<any>();
  public form: FormGroup;
  editorConfig: AngularEditorConfig = {
    editable: true,
    spellcheck: true,
    height: 'auto',
    minHeight: '0',
    maxHeight: 'auto',
    width: 'auto',
    minWidth: '0',
    translate: 'yes',
    enableToolbar: true,
    showToolbar: true,
    placeholder: 'Enter text here...',
    defaultParagraphSeparator: '',
    defaultFontName: '',
    defaultFontSize: '',
    fonts: [
      {class: 'arial', name: 'Arial'},
      {class: 'times-new-roman', name: 'Times New Roman'},
      {class: 'calibri', name: 'Calibri'},
      {class: 'comic-sans-ms', name: 'Comic Sans MS'}
    ],
    uploadUrl: '',
    uploadWithCredentials: false,
    sanitize: true,
    toolbarPosition: 'top',
    toolbarHiddenButtons: [
      ['backgroundColor']
    ]
  };

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private formBuilder: FormBuilder
  ) {
    this.form = this.formBuilder.group({
      moveNumber: [data.move.moveNumber],
      description: [data.move.description, Validators.required],
      situationTime: [data.move.situationTime || ''],
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

  getTimezoneAbbr(): string {
    try {
      const date = new Date();
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
