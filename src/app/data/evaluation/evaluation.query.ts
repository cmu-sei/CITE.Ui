// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { Order, Query, QueryConfig, QueryEntity } from '@datorama/akita';
import {
  EvaluationState,
  EvaluationStore,
} from './evaluation.store';
import { Evaluation } from 'src/app/generated/cite.api';
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
export class EvaluationQuery extends QueryEntity<EvaluationState> {
  constructor(protected store: EvaluationStore) {
    super(store);
  }

  selectById(id: string): Observable<Evaluation> {
    return this.selectEntity(id);
  }
}
