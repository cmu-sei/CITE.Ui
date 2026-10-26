// Copyright 2025 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  ScoringModelRole,
  ScoringModelRolesService,
} from 'src/app/generated/cite.api';

@Injectable({
  providedIn: 'root',
})
export class ScoringModelRoleDataService {
  private scoringModelRolesService = inject(ScoringModelRolesService);

  private scoringModelRolesSubject = new BehaviorSubject<ScoringModelRole[]>([]);
  public scoringModelRoles$ =
    this.scoringModelRolesSubject.asObservable();

  loadRoles(): Observable<ScoringModelRole[]> {
    return this.scoringModelRolesService
      .getAllScoringModelRoles()
      .pipe(tap((x) => this.scoringModelRolesSubject.next(x)));
  }
}
