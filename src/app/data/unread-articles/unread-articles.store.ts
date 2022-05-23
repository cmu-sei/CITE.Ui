// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { EntityState, EntityStore, Store, StoreConfig } from '@datorama/akita';
import { UnreadArticles } from './unread-articles';
import { Injectable } from '@angular/core';

export interface UnreadArticlesState extends EntityState<UnreadArticles> {}

@Injectable({
  providedIn: 'root',
})
@StoreConfig({ name: 'unreadArticless' })
export class UnreadArticlesStore extends EntityStore<UnreadArticlesState> {
  constructor() {
    super();
  }
}
