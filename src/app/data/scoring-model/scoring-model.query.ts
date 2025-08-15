// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Order, Query, QueryConfig, QueryEntity } from '@datorama/akita';
import {
  ScoringModelState,
  ScoringModelStore,
} from './scoring-model.store';
import { ScoringModel } from 'src/app/generated/cite.api';
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
export class ScoringModelQuery extends QueryEntity<ScoringModelState> {
  constructor(protected store: ScoringModelStore) {
    super(store);
  }

  selectById(id: string): Observable<ScoringModel> {
    return this.selectEntity(id);
  }
}
