// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { of } from 'rxjs';
import { ScoresheetComponent } from './scoresheet.component';

describe('ScoresheetComponent', () => {
  let moves: any[] = [];

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
        getAll: () => moves,
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
  it('should count each comment box as a question when comment boxes are on', () => {
    const component = createComponent();
    component.selectedScoringModel = {
      displayCommentTextBoxes: true,
      scoringCategories: [
        {
          id: 'cat-1',
          scoringOptions: [{ id: 'opt-1' }, { id: 'opt-2' }, { id: 'mod-1', isModifier: true }],
        },
      ],
    } as any;
    component.displayedSubmission = {
      submissionCategories: [
        {
          scoringCategoryId: 'cat-1',
          submissionOptions: [
            { scoringOptionId: 'opt-1', submissionComments: [{ comment: 'an answer' }] },
            { scoringOptionId: 'opt-2', submissionComments: [] },
          ],
        },
      ],
    } as any;

    expect(component.getAnsweredCounts()).toEqual({ answered: 1, total: 2 });
  });

  it('should count each selectable category as a question without comment boxes', () => {
    const component = createComponent();
    component.selectedScoringModel = {
      scoringCategories: [
        { id: 'cat-1', scoringOptionSelection: 'Single', scoringOptions: [{ id: 'opt-1' }] },
        { id: 'cat-2', scoringOptionSelection: 'Single', scoringOptions: [{ id: 'opt-2' }] },
        { id: 'cat-3', scoringOptionSelection: 'None', scoringOptions: [{ id: 'opt-3' }] },
      ],
    } as any;
    component.displayedSubmission = {
      submissionCategories: [
        { scoringCategoryId: 'cat-1', submissionOptions: [{ scoringOptionId: 'opt-1', isSelected: true }] },
        { scoringCategoryId: 'cat-2', submissionOptions: [{ scoringOptionId: 'opt-2', isSelected: false }] },
      ],
    } as any;

    expect(component.getAnsweredCounts()).toEqual({ answered: 1, total: 2 });
  });

  it('should name the next move with questions on an empty move', () => {
    moves = [{ moveNumber: 3, description: 'Move 3: Escalation' }];
    const component = createComponent();
    component.selectedScoringModel = {
      displayScoringModelByMoveNumber: true,
      scoringCategories: [
        { id: 'cat-1', moveNumberFirstDisplay: 0, moveNumberLastDisplay: 0 },
        { id: 'cat-2', moveNumberFirstDisplay: 3, moveNumberLastDisplay: 3 },
        { id: 'cat-3', moveNumberFirstDisplay: 5, moveNumberLastDisplay: 5 },
      ],
    } as any;
    component.displayedMoveNumber = 1;

    expect(component.getDisplayedScoringCategories()).toEqual([]);
    expect(component.getNextQuestionMove()).toBe('Move 3: Escalation');
    moves = [];
  });
});
