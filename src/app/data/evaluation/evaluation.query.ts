// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Order, Query, QueryConfig, QueryEntity } from '@datorama/akita';
import {
  EvaluationState,
  EvaluationStore,
} from './evaluation.store';
import { Evaluation } from 'src/app/generated/cite.api';
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
export class EvaluationQuery extends QueryEntity<EvaluationState> {
  protected store: EvaluationStore;

  constructor() {
    const store = inject(EvaluationStore);

    super(store);
  
    this.store = store;
  }

  selectById(id: string): Observable<Evaluation> {
    return this.selectEntity(id);
  }
}
