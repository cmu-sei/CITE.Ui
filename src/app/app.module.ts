// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { CdkTableModule } from '@angular/cdk/table';
import { CdkTreeModule } from '@angular/cdk/tree';
import { HttpClientModule } from '@angular/common/http';
import { ErrorHandler, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips';
import { MatNativeDateModule, MatRippleModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator';
import { MatLegacyProgressBarModule as MatProgressBarModule } from '@angular/material/legacy-progress-bar';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { MatLegacyRadioModule as MatRadioModule } from '@angular/material/legacy-radio';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatLegacySlideToggleModule as MatSlideToggleModule } from '@angular/material/legacy-slide-toggle';
import { MatLegacySliderModule as MatSliderModule } from '@angular/material/legacy-slider';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatStepperModule } from '@angular/material/stepper';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatLegacyTabsModule as MatTabsModule } from '@angular/material/legacy-tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { MatTreeModule } from '@angular/material/tree';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  ComnAuthModule,
  ComnSettingsConfig,
  ComnSettingsModule,
  ComnSettingsService,
} from '@cmusei/crucible-common';
import { AkitaNgRouterStoreModule } from '@datorama/akita-ng-router-store';
import { AkitaNgDevtools } from '@datorama/akita-ngdevtools';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AdminActionsComponent } from './components/admin/admin-actions/admin-actions.component';
import { AdminActionEditDialogComponent } from './components/admin/admin-action-edit-dialog/admin-action-edit-dialog.component';
import { AdminContainerComponent } from './components/admin/admin-container/admin-container.component';
import { AdminEvaluationEditDialogComponent } from './components/admin/admin-evaluation-edit-dialog/admin-evaluation-edit-dialog.component';
import { AdminEvaluationsComponent } from './components/admin/admin-evaluations/admin-evaluations.component';
import { AdminMovesComponent } from './components/admin/admin-moves/admin-moves.component';
import { AdminMoveEditDialogComponent } from './components/admin/admin-move-edit-dialog/admin-move-edit-dialog.component';
import { AdminObserversComponent } from './components/admin/admin-observers/admin-observers.component';
import { AdminRoleEditDialogComponent } from './components/admin/admin-role-edit-dialog/admin-role-edit-dialog.component';
import { AdminRolesComponent } from 'src/app/components/admin/admin-roles/admin-roles.component';
import { AdminScoringCategoriesComponent } from './components/admin/admin-scoring-categories/admin-scoring-categories.component';
import {
  AdminScoringCategoryEditDialogComponent
} from './components/admin/admin-scoring-category-edit-dialog/admin-scoring-category-edit-dialog.component';
import { AdminScoringModelsComponent } from './components/admin/admin-scoring-models/admin-scoring-models.component';
import {
  AdminScoringModelEditDialogComponent
} from './components/admin/admin-scoring-model-edit-dialog/admin-scoring-model-edit-dialog.component';
import { AdminScoringOptionsComponent } from './components/admin/admin-scoring-options/admin-scoring-options.component';
import {
  AdminScoringOptionEditDialogComponent
} from './components/admin/admin-scoring-option-edit-dialog/admin-scoring-option-edit-dialog.component';
import { AdminSubmissionsComponent } from './components/admin/admin-submissions/admin-submissions.component';
import { AdminTeamsComponent } from './components/admin/admin-teams/admin-teams.component';
import { AdminTeamEditDialogComponent } from './components/admin/admin-team-edit-dialog/admin-team-edit-dialog.component';
import { AdminTeamUsersComponent } from './components/admin/admin-team-users/admin-team-users.component';
import { AdminUsersComponent } from './components/admin/admin-users/admin-users.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { HomeAppComponent } from './components/home-app/home-app.component';
import { EvaluationInfoComponent } from './components/evaluation-info/evaluation-info.component';
import { ScoreCardComponent } from './components/score-card/score-card.component';
import { ScoringModelComponent } from './components/scoring-model/scoring-model.component';
import { ConfirmDialogComponent } from './components/shared/confirm-dialog/confirm-dialog.component';
import { SystemMessageComponent } from './components/shared/system-message/system-message.component';
import { TopbarComponent } from './components/shared/top-bar/topbar.component';
import { UserDataService } from './data/user/user-data.service';
import { DialogService } from './services/dialog/dialog.service';
import { ErrorService } from './services/error/error.service';
import { SystemMessageService } from './services/system-message/system-message.service';
import { BASE_PATH } from './generated/cite.api';
import { ApiModule as SwaggerCodegenApiModule } from './generated/cite.api/api.module';
import { DisplayOrderPipe, SortByPipe } from 'src/app/utilities/sort-by-pipe';
import { NgxEditorModule } from 'ngx-editor';
import { NgxMatDatetimePickerModule, NgxMatTimepickerModule, NgxMatNativeDateModule } from '@angular-material-components/datetime-picker';
import { UIDataService } from './data/ui/ui-data.service';

const settings: ComnSettingsConfig = {
  url: 'assets/config/settings.json',
  envUrl: 'assets/config/settings.env.json',
};

export function getBasePath(settingsSvc: ComnSettingsService) {
  return settingsSvc.settings.ApiUrl;
}

@NgModule({
  declarations: [
    AppComponent,
    HomeAppComponent,
    EvaluationInfoComponent,
    ScoreCardComponent,
    ScoringModelComponent,
    SystemMessageComponent,
    ConfirmDialogComponent,
    AdminActionsComponent,
    AdminActionEditDialogComponent,
    AdminContainerComponent,
    AdminEvaluationEditDialogComponent,
    AdminEvaluationsComponent,
    AdminMovesComponent,
    AdminMoveEditDialogComponent,
    AdminObserversComponent,
    AdminRoleEditDialogComponent,
    AdminRolesComponent,
    AdminScoringCategoriesComponent,
    AdminScoringCategoryEditDialogComponent,
    AdminScoringModelsComponent,
    AdminScoringModelEditDialogComponent,
    AdminScoringOptionsComponent,
    AdminScoringOptionEditDialogComponent,
    AdminSubmissionsComponent,
    AdminTeamsComponent,
    AdminTeamEditDialogComponent,
    AdminTeamUsersComponent,
    AdminUsersComponent,
    DashboardComponent,
    TopbarComponent,
    DisplayOrderPipe,
    SortByPipe
  ],
  imports: [
    AkitaNgDevtools,
    AkitaNgRouterStoreModule,
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    SwaggerCodegenApiModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDatepickerModule,
    MatDialogModule,
    MatExpansionModule,
    MatGridListModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatMenuModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatRippleModule,
    MatSelectModule,
    MatSidenavModule,
    MatSliderModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatSortModule,
    MatTableModule,
    MatTabsModule,
    MatToolbarModule,
    MatTooltipModule,
    MatStepperModule,
    MatBottomSheetModule,
    MatBadgeModule,
    MatFormFieldModule,
    CdkTableModule,
    MatTreeModule,
    CdkTreeModule,
    ComnAuthModule.forRoot(),
    ComnSettingsModule.forRoot(),
    MatDatepickerModule,
    NgxEditorModule,
    NgxMatTimepickerModule,
    NgxMatDatetimePickerModule,
    NgxMatNativeDateModule,
  ],
  exports: [MatSortModule],
  providers: [
    DialogService,
    SystemMessageService,
    UserDataService,
    UIDataService,
    {
      provide: BASE_PATH,
      useFactory: getBasePath,
      deps: [ComnSettingsService],
    },
    {
      provide: ErrorHandler,
      useClass: ErrorService,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
