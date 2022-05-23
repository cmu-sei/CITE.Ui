// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { Order, Query, QueryConfig, QueryEntity } from '@datorama/akita';
import {
  GroupState,
  GroupStore,
} from './group.store';
import { Group } from 'src/app/generated/cite.api';
import { Injectable } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Observable } from 'rxjs';

@QueryConfig({
  sortBy: 'name',
  sortByOrder: Order.ASC,
})
@Injectable({
  providedIn: 'root',
})
export class GroupQuery extends QueryEntity<GroupState> {
  constructor(protected store: GroupStore) {
    super(store);
  }

  selectById(id: string): Observable<Group> {
    return this.selectEntity(id);
  }
}
