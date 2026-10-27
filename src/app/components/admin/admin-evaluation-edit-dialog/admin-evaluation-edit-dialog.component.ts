// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, OnDestroy, OnInit, inject, output } from '@angular/core';
import { FormBuilder, FormGroup, FormGroupDirective, NgForm, UntypedFormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import {
  MAT_DIALOG_DATA as MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { EDITOR_CONFIG } from 'src/app/utilities/editor-config';
import { CrucibleDialogComponent, CrucibleDialogContentDirective } from '@cmusei/crucible-common';
import { MatFormField, MatLabel, MatInput, MatSuffix } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/autocomplete';
import { NgxMatDatepickerInput, NgxMatDatetimepicker, NgxMatDatepickerActions, NgxMatDatepickerApply, NgxMatDatepickerCancel } from '@ngxmc/datetime-picker';
import { MatDatepickerToggle } from '@angular/material/datepicker';
import { MatButton } from '@angular/material/button';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { MatCheckbox } from '@angular/material/checkbox';
import { DatePipe } from '@angular/common';

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
    imports: [
        CrucibleDialogComponent,
        CrucibleDialogContentDirective,
        FormsModule,
        ReactiveFormsModule,
        MatFormField,
        MatLabel,
        MatInput,
        MatSelect,
        MatOption,
        NgxMatDatepickerInput,
        MatDatepickerToggle,
        MatSuffix,
        NgxMatDatetimepicker,
        NgxMatDatepickerActions,
        MatButton,
        NgxMatDatepickerApply,
        NgxMatDatepickerCancel,
        AngularEditorModule,
        MatCheckbox,
        DatePipe,
    ],
})
export class AdminEvaluationEditDialogComponent implements OnInit, OnDestroy {
  data = inject(MAT_DIALOG_DATA);
  private formBuilder = inject(FormBuilder);

  readonly editComplete = output<any>();
  public form: FormGroup;

  editorConfig = EDITOR_CONFIG;
  constructor() {
    const data = this.data;

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

  // label the zone from the date shown, so a date across a DST change gets its own abbreviation
  getTimezoneAbbr(value?: Date | string): string {
    try {
      const date = value ? new Date(value) : new Date();
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
