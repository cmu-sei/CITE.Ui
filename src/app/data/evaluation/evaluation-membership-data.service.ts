// Copyright 2024 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  EvaluationMembership,
  EvaluationMembershipsService,
} from 'src/app/generated/cite.api';

@Injectable({
  providedIn: 'root',
})
export class EvaluationMembershipDataService {
  private evaluationMembershipsSubject = new BehaviorSubject<
    EvaluationMembership[]
  >([]);
  public evaluationMemberships$ = this.evaluationMembershipsSubject.asObservable();

  constructor(private evaluationMembershipsService: EvaluationMembershipsService) {}

  loadMemberships(evaluationId: string): Observable<EvaluationMembership[]> {
    return this.evaluationMembershipsService
      .getAllEvaluationMemberships(evaluationId)
      .pipe(tap((x) => this.evaluationMembershipsSubject.next(x)));
  }

  createMembership(evaluationId: string, evaluationMembership: EvaluationMembership) {
    return this.evaluationMembershipsService
      .createEvaluationMembership(evaluationId, evaluationMembership)
      .pipe(
        tap((x) => {
          this.upsert(x.id, x);
        })
      );
  }

  editMembership(evaluationMembership: EvaluationMembership) {
    return this.evaluationMembershipsService
      .updateEvaluationMembership(evaluationMembership.id, evaluationMembership)
      .pipe(
        tap((x) => {
          this.upsert(evaluationMembership.id, x);
        })
      );
  }

  deleteMembership(id: string) {
    return this.evaluationMembershipsService.deleteEvaluationMembership(id).pipe(
      tap(() => {
        this.remove(id);
      })
    );
  }

  upsert(id: string, evaluationMembership: Partial<EvaluationMembership>) {
    const memberships = this.evaluationMembershipsSubject.getValue();
    const membershipToUpdate = memberships.find((x) => x.id === id);

    if (membershipToUpdate != null) {
      Object.assign(membershipToUpdate, evaluationMembership);
    } else {
      memberships.push({
        ...evaluationMembership,
        id,
      } as EvaluationMembership);
    }

    this.evaluationMembershipsSubject.next(memberships);
  }

  remove(id: string) {
    let memberships = this.evaluationMembershipsSubject.getValue();
    memberships = memberships.filter((x) => x.id !== id);
    this.evaluationMembershipsSubject.next(memberships);
  }

  updateStore(evaluationMembership: EvaluationMembership) {
    this.upsert(evaluationMembership.id, evaluationMembership);
  }

  deleteFromStore(id: string) {
    this.remove(id);
  }
}
