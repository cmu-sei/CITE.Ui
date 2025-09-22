// Copyright 2024 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  EvaluationRole,
  EvaluationRolesService,
} from 'src/app/generated/cite.api';

@Injectable({
  providedIn: 'root',
})
export class EvaluationRoleDataService {
  private evaluationRolesSubject = new BehaviorSubject<EvaluationRole[]>([]);
  public evaluationRoles$ = this.evaluationRolesSubject.asObservable();

  constructor(private evaluationRolesService: EvaluationRolesService) {}

  loadRoles(): Observable<EvaluationRole[]> {
    return this.evaluationRolesService
      .getAllEvaluationRoles()
      .pipe(tap((x) => this.evaluationRolesSubject.next(x)));
  }
}
