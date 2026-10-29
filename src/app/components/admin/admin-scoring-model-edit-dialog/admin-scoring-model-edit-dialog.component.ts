// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, inject, output } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, UntypedFormControl, FormGroupDirective, NgForm, ValidationErrors, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { EDITOR_CONFIG } from 'src/app/utilities/editor-config';
import { CrucibleDialogComponent, CrucibleDialogContentDirective } from '@cmusei/crucible-common';
import { MatFormField, MatLabel, MatInput } from '@angular/material/input';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/autocomplete';
import { MatCheckbox } from '@angular/material/checkbox';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { SeverityLevel } from 'src/app/generated/cite.api/model/models';
import { DEFAULT_SEVERITY_LEVELS } from 'src/app/utilities/severity-levels';

// no two severity levels may start at the same score
export function distinctMinimumScores(control: AbstractControl): ValidationErrors | null {
  const scores = (control.value as SeverityLevel[]).map((level) => level.minimumScore).filter((score) => score != null);
  return new Set(scores).size === scores.length ? null : { duplicateMinimumScore: true };
}

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
    imports: [CrucibleDialogComponent, CrucibleDialogContentDirective, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatButton, MatIconButton, MatTooltip, MatIcon, MatSelect, MatOption, MatCheckbox, AngularEditorModule]
})

export class AdminScoringModelEditDialogComponent {
  data = inject(MAT_DIALOG_DATA);
  private formBuilder = inject(FormBuilder);

  readonly editComplete = output<any>();
  public form: FormGroup;
  editorConfig = EDITOR_CONFIG;

  constructor() {
    const data = this.data;

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
      // empty means the default CISA levels
      severityLevels: this.formBuilder.array(
        (model.severityLevels ?? []).map((level: SeverityLevel) => this.severityLevelGroup(level)),
        distinctMinimumScores
      ),
    });
    if (disabled) {
      this.severityLevels.disable();
    }

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

  get severityLevels() {
    return this.form.controls['severityLevels'] as FormArray<FormGroup>;
  }

  severityLevelGroup(level: SeverityLevel) {
    return this.formBuilder.group({
      name: [level.name, Validators.required],
      minimumScore: [level.minimumScore, Validators.required],
      color: [level.color, [Validators.required, Validators.pattern(/^#[0-9a-fA-F]{6}$/)]],
      description: [level.description],
    });
  }

  // start from the default levels, highest first, to edit them
  customizeSeverityLevels() {
    [...DEFAULT_SEVERITY_LEVELS].reverse().forEach((level) => this.severityLevels.push(this.severityLevelGroup(level)));
    this.form.markAsDirty();
  }

  addSeverityLevel() {
    this.severityLevels.push(this.severityLevelGroup({ name: '', minimumScore: null, color: '#FFFFFF', description: '' }));
    this.form.markAsDirty();
  }

  removeSeverityLevel(index: number) {
    this.severityLevels.removeAt(index);
    this.form.markAsDirty();
  }

  useDefaultSeverityLevels() {
    this.severityLevels.clear();
    this.form.markAsDirty();
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
