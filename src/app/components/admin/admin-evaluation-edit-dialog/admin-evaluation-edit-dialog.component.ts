// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import {
  Component,
  EventEmitter,
  Inject,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormGroupDirective,
  NgForm,
  UntypedFormControl,
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
  selector: 'app-admin-evaluation-edit-dialog',
  templateUrl: './admin-evaluation-edit-dialog.component.html',
  styleUrls: ['./admin-evaluation-edit-dialog.component.scss'],
  standalone: false,
})
export class AdminEvaluationEditDialogComponent implements OnInit, OnDestroy {
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
      { class: 'arial', name: 'Arial' },
      { class: 'times-new-roman', name: 'Times New Roman' },
      { class: 'calibri', name: 'Calibri' },
      { class: 'comic-sans-ms', name: 'Comic Sans MS' },
    ],
    uploadUrl: '',
    uploadWithCredentials: false,
    sanitize: true,
    toolbarPosition: 'top',
    toolbarHiddenButtons: [['backgroundColor']],
  };
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private formBuilder: FormBuilder
  ) {
    const evaluation = data.evaluation;
    const disabled = !data.canEdit;
    this.form = this.formBuilder.group({
      description: [{ value: evaluation.description, disabled }, Validators.required],
      scoringModelId: [
        { value: evaluation.scoringModelId, disabled: data.isExisting || disabled },
        data.isExisting ? [] : Validators.required,
      ],
      status: [{ value: evaluation.status, disabled }],
      galleryExhibitId: [{ value: evaluation.galleryExhibitId, disabled }],
      currentMoveNumber: [{ value: evaluation.currentMoveNumber, disabled }],
      situationTime: [{ value: evaluation.situationTime || '', disabled }],
      situationDescription: [{ value: evaluation.situationDescription, disabled }],
      showAdvanceButton: [{ value: evaluation.showAdvanceButton, disabled }],
    });
  }

  get situationDateFormControl(): UntypedFormControl {
    return this.form.controls['situationTime'] as UntypedFormControl;
  }

  ngOnInit() {}

  errorFree() {
    return this.form.valid;
  }

  /**
   * Closes the edit screen
   */
  handleEditComplete(saveChanges: boolean): void {
    if (!saveChanges) {
      this.editComplete.emit({ saveChanges: false, evaluation: null });
    } else {
      if (this.errorFree()) {
        Object.assign(this.data.evaluation, this.form.getRawValue());
        if (this.data.evaluation.situationTime) {
          this.data.evaluation.situationTime = new Date(
            this.data.evaluation.situationTime
          );
        }
        this.editComplete.emit({
          saveChanges: saveChanges,
          evaluation: this.data.evaluation,
        });
      }
    }
  }

  /**
   * Saves the current evaluation
   */
  saveEvaluation(changedField): void {
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
    return this.data.userList.find((u) => u.id === userId).name;
  }

  incrementCurrentMoveNumber() {
    this.data.evaluation.currentMoveNumber++;
  }

  decrementCurrentMoveNumber() {
    this.data.evaluation.currentMoveNumber--;
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

  ngOnDestroy() {}
}
