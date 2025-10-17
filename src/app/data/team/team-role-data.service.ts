// Copyright 2025 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  TeamRole,
  TeamRolesService,
} from 'src/app/generated/cite.api';

@Injectable({
  providedIn: 'root',
})
export class TeamRoleDataService {
  private teamRolesSubject = new BehaviorSubject<TeamRole[]>([]);
  public teamRoles$ = this.teamRolesSubject.asObservable();
  public teamRoles: TeamRole[] = [];

  constructor(private teamRolesService: TeamRolesService) {}

  loadRoles(): Observable<TeamRole[]> {
    return this.teamRolesService
      .getAllTeamRoles()
      .pipe(tap((x) => this.teamRolesSubject.next(x)));
  }

}
