// Copyright 2025 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  ScoringModelMembership,
  ScoringModelMembershipsService,
} from 'src/app/generated/cite.api';

@Injectable({
  providedIn: 'root',
})
export class ScoringModelMembershipDataService {
  private scoringModelMembershipsSubject = new BehaviorSubject<ScoringModelMembership[]>([]);
  public scoringModelMemberships$ =
    this.scoringModelMembershipsSubject.asObservable();

  constructor(
    private scoringModelMembershipsService: ScoringModelMembershipsService
  ) {}

  loadMemberships(
    scoringModelId: string
  ): Observable<ScoringModelMembership[]> {
    return this.scoringModelMembershipsService
      .getAllScoringModelMemberships(scoringModelId)
      .pipe(tap((x) => this.scoringModelMembershipsSubject.next(x)));
  }

  createMembership(
    scoringModelId: string,
    scoringModelMembership: ScoringModelMembership
  ) {
    return this.scoringModelMembershipsService
      .createScoringModelMembership(
        scoringModelId,
        scoringModelMembership
      )
      .pipe(
        tap((x) => {
          this.upsert(x.id, x);
        })
      );
  }

  editMembership(scoringModelMembership: ScoringModelMembership) {
    return this.scoringModelMembershipsService
      .updateScoringModelMembership(
        scoringModelMembership.id,
        scoringModelMembership
      )
      .pipe(
        tap((x) => {
          this.upsert(scoringModelMembership.id, x);
        })
      );
  }

  deleteMembership(id: string) {
    return this.scoringModelMembershipsService
      .deleteScoringModelMembership(id)
      .pipe(
        tap(() => {
          this.remove(id);
        })
      );
  }

  upsert(
    id: string,
    scoringModelMembership: Partial<ScoringModelMembership>
  ) {
    const memberships = this.scoringModelMembershipsSubject.getValue();
    const membershipToUpdate = memberships.find((x) => x.id === id);

    if (membershipToUpdate != null) {
      Object.assign(membershipToUpdate, scoringModelMembership);
    } else {
      memberships.push({
        ...scoringModelMembership,
        id,
      } as ScoringModelMembership);
    }

    this.scoringModelMembershipsSubject.next(memberships);
  }

  remove(id: string) {
    let memberships = this.scoringModelMembershipsSubject.getValue();
    memberships = memberships.filter((x) => x.id !== id);
    this.scoringModelMembershipsSubject.next(memberships);
  }

  updateStore(scoringModelMembership: ScoringModelMembership) {
    this.upsert(scoringModelMembership.id, scoringModelMembership);
  }

  deleteFromStore(id: string) {
    this.remove(id);
  }
}
