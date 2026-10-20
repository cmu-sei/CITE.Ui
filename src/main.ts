// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { enableProdMode, provideZoneChangeDetection, ErrorHandler, importProvidersFrom } from '@angular/core';
import { platformBrowser, BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { enableAkitaProdMode, persistState } from '@datorama/akita';

import { environment } from './environments/environment';
import { SystemMessageService } from './app/services/system-message/system-message.service';
import { UserDataService } from './app/data/user/user-data.service';
import { UIDataService } from './app/data/ui/ui-data.service';
import { BASE_PATH } from './app/generated/cite.api';
import { ComnSettingsService, provideCrucibleTheme, ComnAuthModule, ComnSettingsModule, ComnHeaderBarModule } from '@cmusei/crucible-common';
import { ErrorService } from './app/services/error/error.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AkitaNgDevtools } from '@datorama/akita-ngdevtools';
import { AkitaNgRouterStoreModule } from '@datorama/akita-ng-router-store';
import { provideRouter } from '@angular/router';
import { ROUTES } from './app/app.routes';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { A11yModule } from '@angular/cdk/a11y';
import { ClipboardModule } from 'ngx-clipboard';
import { ApiModule as SwaggerCodegenApiModule } from './app/generated/cite.api/api.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatNativeDateModule, MatRippleModule } from '@angular/material/core';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatStepperModule } from '@angular/material/stepper';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatBadgeModule } from '@angular/material/badge';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CdkTableModule } from '@angular/cdk/table';
import { MatTreeModule } from '@angular/material/tree';
import { CdkTreeModule } from '@angular/cdk/tree';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { AppComponent } from './app/app.component';

if (environment.production) {
  enableProdMode();
  enableAkitaProdMode();
}

export function getBasePath(settingsSvc: ComnSettingsService) {
  return settingsSvc.settings.ApiUrl;
}

export const storage = persistState({
  key: 'akita-cite-ui',
  include: ['auth.ui'],
});

bootstrapApplication(AppComponent, {
    providers: [
        provideZoneChangeDetection(),
        importProvidersFrom(environment.production ? [] : AkitaNgDevtools.forRoot(), AkitaNgRouterStoreModule, BrowserModule, BrowserAnimationsModule, A11yModule, ClipboardModule, SwaggerCodegenApiModule, FormsModule, ReactiveFormsModule, MatAutocompleteModule, MatButtonModule, MatButtonToggleModule, MatCardModule, MatCheckboxModule, MatChipsModule, MatDatepickerModule, MatDialogModule, MatExpansionModule, MatGridListModule, MatIconModule, MatInputModule, MatListModule, MatMenuModule, MatNativeDateModule, MatPaginatorModule, MatProgressBarModule, MatProgressSpinnerModule, MatRadioModule, MatRippleModule, MatSelectModule, MatSidenavModule, MatSliderModule, MatSlideToggleModule, MatSnackBarModule, MatSortModule, MatTableModule, MatTabsModule, MatToolbarModule, MatTooltipModule, MatStepperModule, MatBottomSheetModule, MatBadgeModule, MatFormFieldModule, CdkTableModule, MatTreeModule, CdkTreeModule, ComnAuthModule.forRoot(), ComnSettingsModule.forRoot(), AngularEditorModule, ComnHeaderBarModule),
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
        provideRouter(ROUTES),
        provideHttpClient(withInterceptorsFromDi()),
        provideCrucibleTheme({
            brand: { color: '#E81717', text: '#FFFFFF' },
            faviconFillClass: 'cls-2',
        }),
    ]
})
  .catch((err) => console.error(err));
