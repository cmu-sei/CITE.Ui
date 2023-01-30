// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { Order, Query, QueryConfig, QueryEntity } from '@datorama/akita';
import {
  ScoringCategoryState,
  ScoringCategoryStore,
} from './scoring-category.store';
import { ScoringCategory } from 'src/app/generated/cite.api';
import { Injectable } from '@angular/core';
import { LegacyPageEvent as PageEvent } from '@angular/material/legacy-paginator';
import { Observable } from 'rxjs';

@QueryConfig({
  sortBy: 'name',
  sortByOrder: Order.ASC,
})
@Injectable({
  providedIn: 'root',
})
export class ScoringCategoryQuery extends QueryEntity<ScoringCategoryState> {
  constructor(protected store: ScoringCategoryStore) {
    super(store);
  }

  selectById(id: string): Observable<ScoringCategory> {
    return this.selectEntity(id);
  }
}
