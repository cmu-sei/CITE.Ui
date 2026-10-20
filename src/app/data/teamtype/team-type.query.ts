// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Order, Query, QueryConfig, QueryEntity } from '@datorama/akita';
import {
  TeamTypeState,
  TeamTypeStore,
} from './team-type.store';
import { TeamType } from 'src/app/generated/cite.api';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

@QueryConfig({
  sortBy: 'name',
  sortByOrder: Order.ASC,
})
@Injectable({
  providedIn: 'root',
})
export class TeamTypeQuery extends QueryEntity<TeamTypeState> {
  protected store: TeamTypeStore;

  constructor() {
    const store = inject(TeamTypeStore);

    super(store);
  
    this.store = store;
  }

  selectById(id: string): Observable<TeamType> {
    return this.selectEntity(id);
  }
}
