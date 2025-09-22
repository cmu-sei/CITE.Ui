// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Injectable, OnDestroy } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { TeamService } from 'src/app/generated/cite.api/api/api';

@Injectable({
  providedIn: 'root',
})
export class GroupTeamDataService implements OnDestroy {
  readonly filterControl = new UntypedFormControl();
  private filterTerm: Observable<string>;
  private sortColumn: Observable<string>;
  private sortIsAscending: Observable<boolean>;
  private pageSize: Observable<number>;
  private pageIndex: Observable<number>;
  unsubscribe$: Subject<null> = new Subject<null>();

  constructor(
    private teamService: TeamService,
  ) {}

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
