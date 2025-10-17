// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { EntityState, EntityStore, Store, StoreConfig } from '@datorama/akita';
import { Duty } from 'src/app/generated/cite.api';
import { Injectable } from '@angular/core';

export interface DutyState extends EntityState<Duty> {}

@Injectable({
  providedIn: 'root',
})
@StoreConfig({ name: 'duties' })
export class DutyStore extends EntityStore<DutyState> {
  constructor() {
    super();
  }
}
