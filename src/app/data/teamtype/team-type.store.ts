// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { EntityState, EntityStore, Store, StoreConfig } from '@datorama/akita';
import { TeamType } from 'src/app/generated/cite.api';
import { Injectable } from '@angular/core';

export interface TeamTypeState extends EntityState<TeamType> {}

@Injectable({
  providedIn: 'root',
})
@StoreConfig({ name: 'teamTypes' })
export class TeamTypeStore extends EntityStore<TeamTypeState> {
  constructor() {
    super();
  }
}
