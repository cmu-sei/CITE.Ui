// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { EntityState, EntityStore, Store, StoreConfig } from '@datorama/akita';
import { ScoringModel } from 'src/app/generated/cite.api';
import { Injectable } from '@angular/core';

export interface ScoringModelState extends EntityState<ScoringModel> {}

@Injectable({
  providedIn: 'root',
})
@StoreConfig({ name: 'scoring-models' })
export class ScoringModelStore extends EntityStore<ScoringModelState> {
  constructor() {
    super();
  }
}
