// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, EventEmitter, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { ScoringModelQuery } from 'src/app/data/scoring-model/scoring-model.query';
import { SubmissionDataService } from 'src/app/data/submission/submission-data.service';
import { SubmissionQuery } from 'src/app/data/submission/submission.query';
import { TeamQuery } from 'src/app/data/team/team.query';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { ItemStatus,
         Evaluation,
         ScoringModel,
         ScoringOption,
         Submission,
         SubmissionComment,
         Team,
         User
       } from 'src/app/generated/cite.api/model/models';
import { DialogService } from "src/app/services/dialog/dialog.service";
import { AdminScoringOptionEditDialogComponent } from '../admin/admin-scoring-option-edit-dialog/admin-scoring-option-edit-dialog.component';
import {Title} from "@angular/platform-browser";

@Component({
  selector: 'app-scoring-model',
  templateUrl: './scoring-model.component.html',
  styleUrls: ['./scoring-model.component.scss'],
})
export class ScoringModelComponent {
  loggedInUserId = '';
  userId = '';
  teamId = '';
  teamUsers: User[];
  currentMoveNumber = -1;
  displayedMoveNumber = -1;
  selectedEvaluation: Evaluation = {};
  selectedScoringModel: ScoringModel = {};
  displayedSubmission: Submission = {};
  submissionList: Submission[] = [];
  displayedScoreClass = 'white';
  displayedScoreHover = 'Level 0 - Baseline';
  displaying = 'user';
  hasCanModifyPermission = false;
  hasCanSubmitPermission = false;
  canIncrementMove = false;
  isLoading = false;
  showOfficialScore = false;
  showGroupAvgScore = false;
  showSubmitButton = false;
  showReopenButton = false;
  showModifyControls = false;
  commentOptionDescription = 'this is the description';
  currentComment = 'current comment';
  tableClass = 'user-text';
  buttonClass = 'mat-user';
  private unsubscribe$ = new Subject();

  constructor(
    private scoringModelQuery: ScoringModelQuery,
    private submissionDataService: SubmissionDataService,
    private submissionQuery: SubmissionQuery,
    private evaluationQuery: EvaluationQuery,
    private userDataService: UserDataService,
    private teamQuery: TeamQuery,
    private dialogService: DialogService,
    public matDialog: MatDialog,
    private router: Router,
    private titleService: Title

  ) {
    this.titleService.setTitle('CITE Scoresheet');
    // observe the selected evaluation
    (this.evaluationQuery.selectActive() as Observable<Evaluation>).pipe(takeUntil(this.unsubscribe$)).subscribe(active => {
      const activeId = this.evaluationQuery.getActiveId();
      active = active ? active : { id: '', currentMoveNumber: -1} as Evaluation;
      if (active.id === activeId) {
        this.selectedEvaluation = active;
        this.currentMoveNumber = active.currentMoveNumber;
      }
    });

    // observe the active submission
    (this.submissionQuery.selectActive() as Observable<Submission>).pipe(takeUntil(this.unsubscribe$)).subscribe(active => {
      const activeId = this.submissionQuery.getActiveId();
      active = active ? active : { id: '', moveNumber: -1, submissionCategories: []} as Submission;
      if (active.id === activeId) {
        if (active.submissionCategories.length === 0) {
          if (active.scoreIsAnAverage) {
            if (active.teamId) {
              this.submissionDataService.loadTeamAverageSubmission(active);
            } else {
              this.submissionDataService.loadTeamTypeAverageSubmission(active);
            }
          } else {
            this.submissionDataService.loadById(active.id);
          }
        }
        this.displayedSubmission = active;
        this.displayedMoveNumber = active.moveNumber;
        if (+active.score < 35) {
          this.displayedScoreClass = 'white';
          this.displayedScoreHover = 'Level 0 - Baseline';
        } else if (+active.score < 50) {
          this.displayedScoreClass = 'green';
          this.displayedScoreHover = 'Level 1 - Low';
        } else if (+active.score < 65) {
          this.displayedScoreClass = 'yellow';
          this.displayedScoreHover = 'Level 2 - Medium';
        } else if (+active.score < 75) {
          this.displayedScoreClass = 'orange';
          this.displayedScoreHover = 'Level 3 - High';
        } else if (+active.score < 90) {
          this.displayedScoreClass = 'red';
          this.displayedScoreHover = 'Level 4 - Severe';
        } else {
          this.displayedScoreClass = 'black';
          this.displayedScoreHover = 'Level 5 - Emergency';
        }
        this.userId = active.userId;
        this.setFormatting();
      }
    });

    // observe the selected scoring model
    (this.scoringModelQuery.selectActive() as Observable<ScoringModel>).pipe(takeUntil(this.unsubscribe$)).subscribe(active => {
      const activeId = this.scoringModelQuery.getActiveId();
      active = active ? active : { id: '' } as ScoringModel;
      if (active.id === activeId) {
        this.selectedScoringModel = active;
      }
    });

    // observe the active team
    (this.teamQuery.selectActive() as Observable<Team>).pipe(takeUntil(this.unsubscribe$)).subscribe(active => {
      const activeId = this.teamQuery.getActiveId();
      active = active ? active : { id: '' } as Team;
      if (active.id === activeId) {
        this.teamId = active.id;
        this.teamUsers = active.users;
      }
    });

    // observe the logged in user ID
    this.userDataService.loggedInUser
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((user) => {
        if (user && user.profile && user.profile.sub !== this.loggedInUserId) {
          this.loggedInUserId = user.profile.sub;
          this.userId = this.loggedInUserId;
        }
    });

    // observe the submission list
    this.submissionQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(submissions => {
      this.submissionList = submissions;
      this.showGroupAvgScore = this.submissionList.some(
        s => +s.moveNumber === +this.displayedMoveNumber && !s.userId && !s.teamId && s.groupId && s.scoreIsAnAverage);
      this.showOfficialScore = this.submissionList.some(
        s => +s.moveNumber === +this.displayedMoveNumber && !s.userId && !s.teamId && !s.groupId);
    });

    // observe the permissions
    this.userDataService.canModify.pipe(takeUntil(this.unsubscribe$)).subscribe(canModify => {
      this.hasCanModifyPermission = canModify;
    });
    this.userDataService.canSubmit.pipe(takeUntil(this.unsubscribe$)).subscribe(canSubmit => {
      this.hasCanSubmitPermission = canSubmit;
    });
    this.userDataService.canIncrementMove.pipe(takeUntil(this.unsubscribe$)).subscribe(canIncrementMove => {
      this.canIncrementMove = canIncrementMove;
    });
  }

  categoryScore(scoringCategoryId: string) {
    const submissionCategories = this.displayedSubmission.submissionCategories;
    if (!submissionCategories || submissionCategories.length === 0) {
      return 0;
    } else {
      const submissionCategory = submissionCategories.find(sc => sc.scoringCategoryId === scoringCategoryId);
      return submissionCategory ? submissionCategory.score : 0;
    }
  }

  isSelected(scoringCategoryId: string, scoringOptionId: string) {
    let isSelected = false;
    const submissionCategories = this.displayedSubmission.submissionCategories;
    if (submissionCategories && submissionCategories.length > 0) {
      const sc = submissionCategories.find(sc => sc.scoringCategoryId === scoringCategoryId);
      if (sc) {
        const so = sc.submissionOptions.find(so => so.scoringOptionId === scoringOptionId);
        isSelected = so && so.isSelected;
      }
      if (isSelected) {
        const scoringCategory = this.selectedScoringModel.scoringCategories.find(sc => sc.id === scoringCategoryId);
        const scoringOption = scoringCategory.scoringOptions.find(so => so.id === scoringOptionId);
      }
    }
    return isSelected;
  }

  selectedCount(scoringCategoryId: string, scoringOptionId: string) {
    let selectedCount = 0;
    const submissionCategories = this.displayedSubmission.submissionCategories;
    if (submissionCategories && submissionCategories.length > 0) {
      const sc = submissionCategories.find(sc => sc.scoringCategoryId === scoringCategoryId);
      if (sc) {
        const so = sc.submissionOptions.find(so => so.scoringOptionId === scoringOptionId);
        selectedCount = so ? so.selectedCount : 0;
      }
    }
    return selectedCount > 0 ? selectedCount.toString() : '   ';
  }

  toggleOption(event: any, scoringCategoryId: string, scoringOptionId: string) {
    const submissionOptionId = this.displayedSubmission.submissionCategories
      .find(sc => sc.scoringCategoryId === scoringCategoryId)
      .submissionOptions.find(so => so.scoringOptionId === scoringOptionId).id;
    this.submissionDataService.toggleSubmissionOption(submissionOptionId, event.checked);
  }

  clearSelections() {
    if (this.displayedSubmission.status === ItemStatus.Active) {
      this.submissionDataService.clearSubmission(this.displayedSubmission.id);
    }
  }

  presetSelections() {
    if (this.displayedSubmission.status === ItemStatus.Active) {
      this.submissionDataService.presetSubmission(this.displayedSubmission.id);
    }
  }

  addComment(templateRef, scoringOption: ScoringOption) {
    const submissionOption = this.displayedSubmission.submissionCategories
      .find(sc => sc.scoringCategoryId === scoringOption.scoringCategoryId)
      .submissionOptions.find(so => so.scoringOptionId === scoringOption.id);
    this.currentComment = '';
    this.commentOptionDescription = scoringOption.description;
    const dialogRef = this.matDialog.open(templateRef, {
      width: '70%'
    });
    dialogRef.disableClose = true;
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.submissionDataService.addSubmissionComment(submissionOption.id, this.currentComment);
      }
      this.currentComment = '';
      this.commentOptionDescription = '';
    });
  }

  editComment(templateRef, scoringOption: ScoringOption, submissionComment: SubmissionComment) {
    this.currentComment = submissionComment.comment;
    this.commentOptionDescription = scoringOption.description;
    const dialogRef = this.matDialog.open(templateRef, {
      width: '70%'
    });
    dialogRef.disableClose = true;
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const newComment = { ...submissionComment};
        newComment.comment = this.currentComment;
        this.submissionDataService.updateSubmissionComment(newComment);
      }
      this.currentComment = '';
      this.commentOptionDescription = '';
    });
  }

  deleteComment(submissionComment: SubmissionComment) {
    this.dialogService.confirm(
      'Delete this comment?',
      submissionComment.comment
    ).subscribe((result) => {
      if (result['confirm']) {
        this.submissionDataService.deleteSubmissionComment(submissionComment.id);
      }
    });
  }

  optionComments(scoringCategoryId: string, scoringOptionId: string) {
    if (!this.displayedSubmission ||
        !this.displayedSubmission.submissionCategories ||
        !scoringCategoryId ||
        !scoringOptionId) {
      return [];
    }
    const submissionCategory = this.displayedSubmission.submissionCategories
      .find(sc => sc.scoringCategoryId === scoringCategoryId);
      if (submissionCategory) {
        const submissionOption = submissionCategory.submissionOptions.find(so => so.scoringOptionId === scoringOptionId);
        if (submissionOption) {
          return submissionOption.submissionComments;
        }
      }
    return [];
  }

  selectedBy(scoringCategoryId: string, scoringOptionId: string) {
    if (this.displaying !== 'team') {
      return;
    }
    let selectedBy = null;
    let isSelected = null;
    const submissionCategories = this.displayedSubmission.submissionCategories;
    if (submissionCategories && submissionCategories.length > 0) {
      const sc = submissionCategories.find(sc => sc.scoringCategoryId === scoringCategoryId);
      if (sc) {
        const so = sc.submissionOptions.find(so => so.scoringOptionId === scoringOptionId);
        isSelected = so && so.isSelected;
        selectedBy = so && so.modifiedBy;
      }
      if (isSelected && selectedBy) {
        return 'Selected by ' + this.getUserName(selectedBy);
      } else if (!isSelected && selectedBy) {
        return 'Unselected by ' + this.getUserName(selectedBy);
      }
    }
     return;
  }

  getUserName(id) {
    const theUser = this.teamUsers?.find(tu => tu.id === id);
    return theUser.name;
  }

  completeSubmission() {
    // if not the curret move, score cannot be reopened, so ask for confirmation
    if (this.displayedMoveNumber != this.currentMoveNumber) {
      this.dialogService.confirm(
        'WARNING:  You will not be able to reopen this score!',
        'Move ' + this.displayedMoveNumber + ' has ended. You will not be able to reopen this score. Are you sure that you wish to submit this score?'
      ).subscribe((result) => {
        if (result['confirm']) {
          this.verifyAndSubmit();
        }
      });
    } else {
      this.verifyAndSubmit();
    }
  }

  verifyAndSubmit() {
    // check submission for missing values
    const errorMessage = this.verifySubmission();
    if (errorMessage === '') {
      // all is well, so submit the score
      this.submit();
    } else {
      // there were missing values, so confirm submission
      this.dialogService.confirm(
        'Submit this score?',
        errorMessage + '    Are you sure that you want to submit this score?'
      ).subscribe((result) => {
        if (result['confirm']) {
          this.submit();
        }
      });
    }
  }

  submit() {
    const submission = { ...this.displayedSubmission };
    submission.status = ItemStatus.Complete;
    this.submissionDataService.updateSubmission(submission);
  }

  verifySubmission() {
    const noCategoryOption = [];
    const noCategoryModifier = [];
    this.displayedSubmission.submissionCategories.forEach(sc => {
      const scoringCategory = this.selectedScoringModel.scoringCategories.find(x => x.id === sc.scoringCategoryId);
      const scoringOptions = scoringCategory.scoringOptions;
      const optionIds = scoringOptions.filter(x => !x.isModifier).map(function(x) { return x.id });
      const modifierIds = scoringOptions.filter(x => x.isModifier).map(function(x) { return x.id });
      const optionSelected = sc.submissionOptions.filter(so => optionIds.includes(so.scoringOptionId)).some(so => so.isSelected);
      if (!optionSelected) {
        noCategoryOption.push(scoringCategory.displayOrder);
      }
      if (modifierIds.length > 1) {
        const modifierSelected = sc.submissionOptions.filter(so => modifierIds.includes(so.scoringOptionId)).some(so => so.isSelected);
        if (!modifierSelected) {
          noCategoryModifier.push(scoringCategory.displayOrder);
        }
      }
    });
    let errorMessage = '';
    if (noCategoryOption.length > 0) {
      errorMessage = 'No options selected for categories (' + noCategoryOption.sort((a, b) => a - b).toString() + ').    ';
    }
    if (noCategoryModifier.length > 0) {
      errorMessage = errorMessage + 'No modifier selected for categories (' + noCategoryModifier.sort((a, b) => a - b).toString() + ').    ';
    }
    return errorMessage;
  }

  activateSubmission() {
    const submission = { ...this.displayedSubmission };
    submission.status = ItemStatus.Active;
    this.submissionDataService.updateSubmission(submission);
  }

  selectDisplayedSubmission(selection: string) {
    const submissions = this.submissionQuery.getAll();
    let newSubmission: Submission = null;
    switch (selection) {
      case 'user':
        newSubmission = submissions.find(s =>
            s.moveNumber == this.displayedMoveNumber &&
            s.userId === this.loggedInUserId);
        break;
      case 'team':
        newSubmission = submissions.find(s =>
            s.moveNumber == this.displayedMoveNumber &&
            s.userId === null &&
            s.teamId !== null &&
            !s.scoreIsAnAverage);
        break;
      case 'team-avg':
        newSubmission = submissions.find(s =>
            s.moveNumber == this.displayedMoveNumber &&
            s.userId === null &&
            s.teamId !== null &&
            s.scoreIsAnAverage);
        break;
      case 'group-avg':
        newSubmission = submissions.find(s =>
            s.moveNumber == this.displayedMoveNumber &&
            s.userId === null &&
            s.teamId === null &&
            s.scoreIsAnAverage);
        break;
      case 'official':
        newSubmission = submissions.find(s =>
            s.moveNumber == this.displayedMoveNumber &&
            s.userId === null &&
            s.teamId === null &&
            s.groupId === null);
        break;
      default:
        break;
    }
    if (newSubmission) {
      this.submissionDataService.setActive(newSubmission.id);
    }
  }

  setFormatting() {
    this.setDisplayedSelection();
    // set proper permissions for this selection
    const canModify =
      (this.displaying === 'user') ||
      (this.displaying === 'team' && (this.hasCanModifyPermission || this.hasCanSubmitPermission)) ||
      this.canIncrementMove;
    const canSubmit =
      (this.displaying === 'user') ||
      (this.displaying === 'team' && this.hasCanSubmitPermission) ||
      this.canIncrementMove;
    this.showReopenButton = this.displayedSubmission && canSubmit &&
                            !this.displayedSubmission.scoreIsAnAverage &&
                            this.displayedSubmission.status === ItemStatus.Complete &&
                            this.displayedSubmission.moveNumber == this.currentMoveNumber;
    this.showSubmitButton = this.displayedSubmission && canSubmit &&
                            !this.displayedSubmission.scoreIsAnAverage &&
                            this.displayedSubmission.status === ItemStatus.Active;
    this.showModifyControls = this.displayedSubmission && canModify &&
                              !this.displayedSubmission.scoreIsAnAverage &&
                              this.displayedSubmission.status === ItemStatus.Active;
    this.tableClass = this.displaying + '-text';
    this.buttonClass = 'mat-' + this.displaying;
  }

  setDisplayedSelection() {
    let selection = '';
    if (!this.displayedSubmission.userId
      && !this.displayedSubmission.teamId
      && !this.displayedSubmission.groupId
      && !this.displayedSubmission.scoreIsAnAverage) {
        selection = 'official';
    } else if (!this.displayedSubmission.userId
      && !this.displayedSubmission.teamId
      && this.displayedSubmission.groupId
      && this.displayedSubmission.scoreIsAnAverage) {
        selection = 'group-avg';
    } else if (this.displayedSubmission.moveNumber == this.displayedMoveNumber
      && !this.displayedSubmission.userId
      && this.displayedSubmission.teamId
      && this.displayedSubmission.scoreIsAnAverage) {
        selection = 'team-avg';
    } else if (!this.displayedSubmission.userId
      && this.displayedSubmission.teamId
      && !this.displayedSubmission.scoreIsAnAverage) {
        selection = 'team';
    } else {
      selection = 'user';
    }
    this.displaying = selection;
  }

  setSection(section: string) {
    this.router.navigate([], {
      queryParams: { section: section },
      queryParamsHandling: 'merge',
    });
  }

}
