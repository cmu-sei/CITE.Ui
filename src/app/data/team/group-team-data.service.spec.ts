// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { UntypedFormControl } from '@angular/forms';
import { TeamService } from '../../generated/cite.api';
import { GroupTeamDataService } from './group-team-data.service';
import { getDefaultProviders } from '../../test-utils/default-test-providers';
import { unstubbed } from '../../test-utils/unstubbed';

function setup() {
  TestBed.configureTestingModule({
    // TeamService is injected but never called; the placeholder throws on any
    // member the service touches.
    providers: getDefaultProviders([
      unstubbed(TeamService),
      GroupTeamDataService,
    ]),
  });
  return TestBed.inject(GroupTeamDataService);
}

describe('GroupTeamDataService', () => {
  /**
   * Verifies: the service builds with an empty, enabled filter control and touches no TeamService member.
   * Interacts with: unstubbed TeamService placeholder, filterControl.
   * Data: no input.
   */
  it('starts with an empty filter control and no team request', () => {
    const service = setup();

    expect(service.filterControl).toBeInstanceOf(UntypedFormControl);
    expect(service.filterControl.value).toBeNull();
    expect(service.filterControl.enabled).toBe(true);
  });

  /**
   * Verifies: ngOnDestroy emits once on unsubscribe$ and then completes it.
   * Interacts with: unsubscribe$ subject, ngOnDestroy.
   * Data: one subscriber on unsubscribe$.
   */
  it('signals and completes unsubscribe$ on destroy', () => {
    const service = setup();
    const next = vi.fn();
    const complete = vi.fn();
    service.unsubscribe$.subscribe({ next, complete });

    service.ngOnDestroy();

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(null);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(service.unsubscribe$.observed).toBe(false);
  });
});
