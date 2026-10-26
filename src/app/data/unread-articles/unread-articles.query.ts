// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Order, Query, QueryConfig, QueryEntity } from '@datorama/akita';
import {
  UnreadArticlesState,
  UnreadArticlesStore,
} from './unread-articles.store';
import { UnreadArticles } from './unread-articles';
import { Injectable, inject } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Observable } from 'rxjs';

@QueryConfig({
})
@Injectable({
  providedIn: 'root',
})
export class UnreadArticlesQuery extends QueryEntity<UnreadArticlesState> {
  protected store: UnreadArticlesStore;

  constructor() {
    const store = inject(UnreadArticlesStore);

    super(store);
  
    this.store = store;
  }

  selectById(id: string): Observable<UnreadArticles> {
    return this.selectEntity(id);
  }
}
