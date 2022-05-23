// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { EntityState, EntityStore, Store, StoreConfig } from '@datorama/akita';
import { Move } from 'src/app/generated/cite.api';
import { Injectable } from '@angular/core';

export interface MoveState extends EntityState<Move> {}

@Injectable({
  providedIn: 'root',
})
@StoreConfig({ name: 'moves' })
export class MoveStore extends EntityStore<MoveState> {
  constructor() {
    super();
  }
}
