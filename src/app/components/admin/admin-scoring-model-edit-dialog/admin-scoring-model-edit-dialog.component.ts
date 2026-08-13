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
import { EDITOR_CONFIG } from 'src/app/utilities/editor-config';

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
    selector: 'app-admin-scoring-model-edit-dialog',
    templateUrl: './admin-scoring-model-edit-dialog.component.html',
    styleUrls: ['./admin-scoring-model-edit-dialog.component.scss'],
    standalone: false
})

export class AdminScoringModelEditDialogComponent {
  @Output() editComplete = new EventEmitter<any>();
  public form: FormGroup;
  editorConfig = EDITOR_CONFIG;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private formBuilder: FormBuilder
  ) {
    const model = data.scoringModel;
    const disabled = !data.canEdit;
    this.form = this.formBuilder.group({
      description: [{ value: model.description, disabled }, Validators.required],
      status: [{ value: model.status, disabled }, Validators.required],
      calculationEquation: [{ value: model.calculationEquation, disabled }],
      useUserScore: [{ value: model.useUserScore, disabled }],
      useTeamScore: [{ value: model.useTeamScore, disabled }],
      useOfficialScore: [{ value: model.useOfficialScore, disabled }],
      useTeamAverageScore: [{ value: model.useTeamAverageScore, disabled }],
      useTypeAverageScore: [{ value: model.useTypeAverageScore, disabled }],
      useSubmit: [{ value: model.useSubmit, disabled }],
      hideScoresOnScoreSheet: [{ value: model.hideScoresOnScoreSheet, disabled }],
      displayCommentTextBoxes: [{ value: model.displayCommentTextBoxes, disabled }],
      displayScoringModelByMoveNumber: [
        { value: model.displayScoringModelByMoveNumber, disabled },
      ],
      showPastSituationDescriptions: [
        { value: model.showPastSituationDescriptions, disabled },
      ],
      rightSideDisplay: [{ value: model.rightSideDisplay, disabled }],
      rightSideHtmlBlock: [{ value: model.rightSideHtmlBlock, disabled }],
      rightSideEmbeddedUrl: [{ value: model.rightSideEmbeddedUrl, disabled }],
    });

    const syncDependentControls = () => {
      const teamAverage = this.form.controls['useTeamAverageScore'];
      const typeAverage = this.form.controls['useTypeAverageScore'];

      if (data.canEdit && this.form.controls['useUserScore'].value) {
        teamAverage.enable({ emitEvent: false });
      } else {
        teamAverage.disable({ emitEvent: false });
      }

      if (data.canEdit && this.form.controls['useTeamScore'].value) {
        typeAverage.enable({ emitEvent: false });
      } else {
        typeAverage.disable({ emitEvent: false });
      }
    };

    this.form.controls['useUserScore'].valueChanges.subscribe(syncDependentControls);
    this.form.controls['useTeamScore'].valueChanges.subscribe(syncDependentControls);
    syncDependentControls();
  }

  errorFree() {
    return this.form.valid;
  }

  /**
   * Closes the edit screen
   */
  handleEditComplete(saveChanges: boolean): void {
    if (!saveChanges) {
      this.editComplete.emit({ saveChanges: false, scoringModel: null });
    } else {
      if (this.errorFree()) {
        Object.assign(this.data.scoringModel, this.form.getRawValue());
        this.editComplete.emit({
          saveChanges: saveChanges,
          scoringModel: this.data.scoringModel,
        });
      }
    }
  }

}
