// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { of } from 'rxjs';
import { ScoresheetComponent } from './scoresheet.component';

describe('ScoresheetComponent', () => {
  function createComponent() {
    return new ScoresheetComponent(
      {
        canEditTeamScore: () => false,
        canSubmitTeamScore: () => false,
        hasTeamPermission: () => false,
      } as any,
      {
        selectActive: () => of(null),
      } as any,
      {} as any,
      {
        selectActive: () => of(null),
        selectAll: () => of([]),
      } as any,
      {
        selectActive: () => of({ id: 'eval-1', currentMoveNumber: 2 }),
      } as any,
      {
        setCurrentUser: () => undefined,
      } as any,
      {
        selectAll: () => of([]),
      } as any,
      {
        select: () => of({ id: 'user-1' }),
      } as any,
      {
        selectActive: () => of(null),
      } as any,
      {
        teamMemberships$: of([]),
      } as any,
      {} as any,
      {} as any,
      {
        setTitle: () => undefined,
      } as any,
      {
        getSubmissionType: () => 'user',
      } as any
    );
  }

  it('should create', () => {
    const component = createComponent();
    expect(component).toBeTruthy();
  });

  it('should use the current move until the active submission is loaded', () => {
    const component = createComponent();
    component.selectedScoringModel = {
      displayScoringModelByMoveNumber: true,
      scoringCategories: [
        {
          id: 'cat-1',
          moveNumberFirstDisplay: 1,
          moveNumberLastDisplay: 1,
        },
        {
          id: 'cat-2',
          moveNumberFirstDisplay: 2,
          moveNumberLastDisplay: 2,
        },
      ],
    } as any;
    component.displayedMoveNumber = undefined;

    const displayedCategories = component.getDisplayedScoringCategories();

    expect(displayedCategories.map((category) => category.id)).toEqual(['cat-2']);
  });
});
