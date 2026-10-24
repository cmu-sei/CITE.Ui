// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Order, Query, QueryConfig, QueryEntity } from '@datorama/akita';
import {
  DutyState,
  DutyStore,
} from './duty.store';
import { Duty } from 'src/app/generated/cite.api';
import { Injectable, inject } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Observable } from 'rxjs';

@QueryConfig({
  sortBy: 'name',
  sortByOrder: Order.ASC,
})
@Injectable({
  providedIn: 'root',
})
export class DutyQuery extends QueryEntity<DutyState> {
  protected store: DutyStore;

  constructor() {
    const store = inject(DutyStore);

    super(store);
  
    this.store = store;
  }

  selectById(id: string): Observable<Duty> {
    return this.selectEntity(id);
  }
}
