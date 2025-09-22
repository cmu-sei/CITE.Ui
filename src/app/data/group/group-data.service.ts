// Copyright 2024 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Group, GroupService } from 'src/app/generated/cite.api';

@Injectable({
  providedIn: 'root',
})
export class GroupDataService {
  private groupSubject = new BehaviorSubject<Group[]>([]);
  public groups$ = this.groupSubject.asObservable();

  constructor(private groupService: GroupService) {}

  load(): Observable<Group[]> {
    return this.groupService
      .getAllGroups()
      .pipe(tap((x) => this.groupSubject.next(x)));
  }

  create(group: Group) {
    return this.groupService.createGroup(group).pipe(
      tap((x) => {
        const groups = this.groupSubject.getValue();
        groups.push(x);
        this.groupSubject.next(groups);
      })
    );
  }

  edit(group: Group) {
    return this.groupService.updateGroup(group.id, group).pipe(
      tap((x) => {
        const groups = this.groupSubject.getValue();
        const index = groups.findIndex((g) => g.id === x.id);

        if (index !== -1) {
          groups[index] = x;
          this.groupSubject.next(groups);
        }
      })
    );
  }

  delete(id: string) {
    return this.groupService.deleteGroup(id).pipe(
      tap(() => {
        let groups = this.groupSubject.getValue();
        groups = groups.filter((x) => !(x.id === id));
        this.groupSubject.next(groups);
      })
    );
  }
}
