// Copyright 2023 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { XApiService as GeneratedXApiService } from '../../generated/cite.api';
import { ComnSettingsService } from '@cmusei/crucible-common';

@Injectable({
  providedIn: 'root',
})
export class XApiService {
  private enabled: boolean;

  constructor(
    private generatedXApiService: GeneratedXApiService,
    private settingsService: ComnSettingsService
  ) {
    this.enabled = this.settingsService.settings.XApiEnabled ?? false;
  }

  /**
   * Logs xAPI observed statement when user observes the dashboard
   */
  observedDashboard(evaluationId: string, teamId: string): Observable<any> {
    if (!this.enabled) {
      return of(null);
    }
    return this.generatedXApiService.observedDashboard(evaluationId, teamId).pipe(
      catchError((error) => {
        console.error('xAPI tracking error:', error);
        return of(null);
      })
    );
  }

  /**
   * Logs xAPI observed statement when user observes the scoresheet
   */
  observedScoresheet(evaluationId: string, teamId: string): Observable<any> {
    if (!this.enabled) {
      return of(null);
    }
    return this.generatedXApiService.observedScoresheet(evaluationId, teamId).pipe(
      catchError((error) => {
        console.error('xAPI tracking error:', error);
        return of(null);
      })
    );
  }
}
