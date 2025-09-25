// Copyright 2025 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  TeamMembership,
  TeamMembershipsService,
} from 'src/app/generated/cite.api';

@Injectable({
  providedIn: 'root',
})
export class TeamMembershipDataService {
  private teamMembershipsSubject = new BehaviorSubject<
    TeamMembership[]
  >([]);
  public teamMemberships$ = this.teamMembershipsSubject.asObservable();
  public teamMemberships: TeamMembership[] = [];

  constructor(private teamMembershipsService: TeamMembershipsService) {}

  loadMemberships(teamId: string): Observable<TeamMembership[]> {
    return this.teamMembershipsService
      .getAllTeamMemberships(teamId)
      .pipe(tap((x) => {
        this.teamMemberships = x;
        this.teamMembershipsSubject.next(x);
      }));
  }

  createMembership(teamId: string, teamMembership: TeamMembership) {
    return this.teamMembershipsService
      .createTeamMembership(teamId, teamMembership)
      .pipe(
        tap((x) => {
          this.upsert(x.id, x);
        })
      );
  }

  editMembership(teamMembership: TeamMembership) {
    return this.teamMembershipsService
      .updateTeamMembership(teamMembership.id, teamMembership)
      .pipe(
        tap((x) => {
          this.upsert(teamMembership.id, x);
        })
      );
  }

  deleteMembership(id: string) {
    return this.teamMembershipsService.deleteTeamMembership(id).pipe(
      tap(() => {
        this.remove(id);
      })
    );
  }

  upsert(id: string, teamMembership: Partial<TeamMembership>) {
    const memberships = this.teamMembershipsSubject.getValue();
    const membershipToUpdate = memberships.find((x) => x.id === id);

    if (membershipToUpdate != null) {
      Object.assign(membershipToUpdate, teamMembership);
    } else {
      memberships.push({
        ...teamMembership,
        id,
      } as TeamMembership);
    }

    this.teamMembershipsSubject.next(memberships);
  }

  remove(id: string) {
    let memberships = this.teamMembershipsSubject.getValue();
    memberships = memberships.filter((x) => x.id !== id);
    this.teamMembershipsSubject.next(memberships);
  }

  updateStore(teamMembership: TeamMembership) {
    this.upsert(teamMembership.id, teamMembership);
  }

  deleteFromStore(id: string) {
    this.remove(id);
  }
}
