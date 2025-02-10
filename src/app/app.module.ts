// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { CdkTableModule } from '@angular/cdk/table';
import { CdkTreeModule } from '@angular/cdk/tree';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ErrorHandler, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatNativeDateModule, MatRippleModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
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
import { AdminTeamTypesComponent } from './components/admin/admin-teamtypes/admin-teamtypes.component';
import { AdminTeamUsersComponent } from './components/admin/admin-team-users/admin-team-users.component';
import { AdminUsersComponent } from './components/admin/admin-users/admin-users.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { HomeAppComponent } from './components/home-app/home-app.component';
import { EvaluationInfoComponent } from './components/evaluation-info/evaluation-info.component';
import { ScoreSummaryComponent } from './components/score-summary/score-summary.component';
import { ScoresheetComponent } from './components/scoresheet/scoresheet.component';
import { ReportComponent } from './components/report/report.component';
import { ConfirmDialogComponent } from './components/shared/confirm-dialog/confirm-dialog.component';
import { RightSideHtmlComponent } from './components/right-side-html/right-side-html.component';
import { RightSideIframeComponent } from './components/right-side-iframe/right-side-iframe.component';
import { SystemMessageComponent } from './components/shared/system-message/system-message.component';
import { TopbarComponent } from './components/shared/top-bar/topbar.component';
import { UserDataService } from './data/user/user-data.service';
import { DialogService } from './services/dialog/dialog.service';
import { ErrorService } from './services/error/error.service';
import { SystemMessageService } from './services/system-message/system-message.service';
import { BASE_PATH } from './generated/cite.api';
import { ApiModule as SwaggerCodegenApiModule } from './generated/cite.api/api.module';
import { DisplayOrderPipe, SortByPipe } from 'src/app/utilities/sort-by-pipe';
import { UIDataService } from './data/ui/ui-data.service';
import { AngularEditorModule } from '@kolkov/angular-editor';

const settings: ComnSettingsConfig = {
  url: 'assets/config/settings.json',
  envUrl: 'assets/config/settings.env.json',
};

export function getBasePath(settingsSvc: ComnSettingsService) {
  return settingsSvc.settings.ApiUrl;
}

@NgModule({ declarations: [
        AppComponent,
        HomeAppComponent,
        EvaluationInfoComponent,
        ScoreSummaryComponent,
        ScoresheetComponent,
        ReportComponent,
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
        AdminTeamTypesComponent,
        AdminTeamUsersComponent,
        AdminUsersComponent,
        DashboardComponent,
        RightSideHtmlComponent,
        RightSideIframeComponent,
        TopbarComponent,
        DisplayOrderPipe,
        SortByPipe,
    ],
    exports: [MatSortModule],
    bootstrap: [AppComponent], imports: [AkitaNgDevtools,
        AkitaNgRouterStoreModule,
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        SwaggerCodegenApiModule,
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
        AngularEditorModule], providers: [
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
        provideHttpClient(withInterceptorsFromDi()),
    ] })
export class AppModule {}
