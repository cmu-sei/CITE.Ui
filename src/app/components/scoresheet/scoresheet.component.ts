// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { ScoringModelQuery } from 'src/app/data/scoring-model/scoring-model.query';
import { SubmissionDataService } from 'src/app/data/submission/submission-data.service';
import { SubmissionQuery } from 'src/app/data/submission/submission.query';
import { TeamQuery } from 'src/app/data/team/team.query';
import { TeamUserQuery } from 'src/app/data/team-user/team-user.query';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { ItemStatus,
  Evaluation,
  ScoringModel,
  ScoringOption,
  Submission,
  SubmissionComment,
  Team,
  User,
  ScoringCategory,
  ScoringOptionSelection
} from 'src/app/generated/cite.api/model/models';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { Title} from '@angular/platform-browser';
import { UIDataService } from 'src/app/data/ui/ui-data.service';

@Component({
  selector: 'app-scoresheet',
  templateUrl: './scoresheet.component.html',
  styleUrls: ['./scoresheet.component.scss'],
})
export class ScoresheetComponent implements OnDestroy {
  @Input() myTeamId: string;
  @Input() userOnly: boolean;
  @Input() noChanges: boolean;
  @Output() selectDisplayedSubmission = new EventEmitter<string>();
  loggedInUserId = '';
  userId = '';
  activeTeamId = '';
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
  haveSomeScoringCategories = false;
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
  showHeader = false;
  private unsubscribe$ = new Subject();

  constructor(
    private scoringModelQuery: ScoringModelQuery,
    private submissionDataService: SubmissionDataService,
    private submissionQuery: SubmissionQuery,
    private evaluationQuery: EvaluationQuery,
    private userDataService: UserDataService,
    private teamQuery: TeamQuery,
    private teamUserQuery: TeamUserQuery,
    private dialogService: DialogService,
    public matDialog: MatDialog,
    private titleService: Title,
    private uiDataService: UIDataService

  ) {
    this.titleService.setTitle('CITE Scoresheet');
    // observe the selected evaluation
    (this.evaluationQuery.selectActive() as Observable<Evaluation>).pipe(takeUntil(this.unsubscribe$)).subscribe(active => {
      if (active) {
        this.selectedEvaluation = active;
        this.currentMoveNumber = +active.currentMoveNumber;
        this.setFormatting();
      }
    });
    // observe the active submission
    (this.submissionQuery.selectActive() as Observable<Submission>).pipe(takeUntil(this.unsubscribe$)).subscribe(active => {
      if (active) {
        this.displayedSubmission = active;
        this.displayedMoveNumber = +active.moveNumber;
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
      if (active) {
        this.selectedScoringModel = active;
        this.showHeader = (active.useUserScore && active.useTeamScore) || active.useTeamAverageScore || active.useTypeAverageScore || active.useOfficialScore;
      }
    });
    // observe the active team
    (this.teamQuery.selectActive() as Observable<Team>).pipe(takeUntil(this.unsubscribe$)).subscribe(active => {
      if (active) {
        this.activeTeamId = active.id;
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
      this.setFormatting();
    });
    // observe the team users to get permissions
    this.teamUserQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(teamUsers => {
      const userId = this.userDataService.loggedInUser?.value?.profile?.sub;
      const currentTeamUser = teamUsers.find(tu => tu.userId === userId);
      this.canIncrementMove = currentTeamUser ? currentTeamUser.canIncrementMove : false;
      this.hasCanModifyPermission = currentTeamUser ? currentTeamUser.canModify : false;
      this.hasCanSubmitPermission = currentTeamUser ? currentTeamUser.canSubmit : false;
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
      const sc = submissionCategories.find(subCat => subCat.scoringCategoryId === scoringCategoryId);
      if (sc) {
        const so = sc.submissionOptions.find(subOpt => subOpt.scoringOptionId === scoringOptionId);
        isSelected = so && so.isSelected;
      }
      if (isSelected) {
        const scoringCategory = this.selectedScoringModel.scoringCategories.find(subCat => subCat.id === scoringCategoryId);
        const scoringOption = scoringCategory.scoringOptions.find(so => so.id === scoringOptionId);
      }
    }
    return isSelected;
  }

  selectedCount(scoringCategoryId: string, scoringOptionId: string) {
    let selectedCount = 0;
    const submissionCategories = this.displayedSubmission.submissionCategories;
    if (submissionCategories && submissionCategories.length > 0) {
      const sc = submissionCategories.find(subCat => subCat.scoringCategoryId === scoringCategoryId);
      if (sc) {
        const so = sc.submissionOptions.find(subOpt => subOpt.scoringOptionId === scoringOptionId);
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
        this.submissionDataService.addSubmissionComment(this.displayedSubmission.id, submissionOption.id, this.currentComment);
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
        this.submissionDataService.changeSubmissionComment(this.displayedSubmission.id, newComment);
      }
      this.currentComment = '';
      this.commentOptionDescription = '';
    });
  }

  changeComment(scoringCategoryId, scoringOptionId, event) {
    let comments = this.optionComments(scoringCategoryId, scoringOptionId);
    const comment = comments ? comments[0] : null;
    const commentText = event.target.value;
    if (comment) {
      if (commentText) {
        const newComment = { ...comment} as SubmissionComment;
        newComment.comment = event.target.value;
        this.submissionDataService.changeSubmissionComment(this.displayedSubmission.id, newComment);
      } else {
        this.submissionDataService.removeSubmissionComment(this.displayedSubmission.id, comment.id);
      }
    } else {
      const submissionCategory = this.displayedSubmission.submissionCategories
        .find(sc => sc.scoringCategoryId === scoringCategoryId);
      if (submissionCategory) {
        const submissionOption = submissionCategory.submissionOptions.find(so => so.scoringOptionId === scoringOptionId);
        if (submissionOption) {
          this.submissionDataService.addSubmissionComment(this.displayedSubmission.id, submissionOption.id, commentText);
        }
      }
    }
  }

  deleteComment(submissionComment: SubmissionComment) {
    this.dialogService.confirm(
      'Delete this comment?',
      submissionComment.comment
    ).subscribe((result) => {
      if (result['confirm']) {
        this.submissionDataService.removeSubmissionComment(this.displayedSubmission.id, submissionComment.id);
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
      const sc = submissionCategories.find(subCat => subCat.scoringCategoryId === scoringCategoryId);
      if (sc) {
        const so = sc.submissionOptions.find(subOpt => subOpt.scoringOptionId === scoringOptionId);
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
    return theUser ? theUser.name : '';
  }

  getSubmissionStatusText() {
    return this.displayedSubmission.status === ItemStatus.Complete ? 'Submitted' : 'Unsubmitted';
  }

  completeSubmission() {
    // if not the curret move, score cannot be reopened, so ask for confirmation
    if (+this.displayedMoveNumber < +this.currentMoveNumber) {
      this.dialogService.confirm(
        'WARNING:  You will not be able to reopen this response!',
        'Move ' + this.displayedMoveNumber +
          ' has ended. You will not be able to reopen this response. Are you sure that you wish to submit?'
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
      console.log('submitting score for move #' + this.displayedSubmission.moveNumber + ' and current move is #' + this.currentMoveNumber);
      this.submit();
    } else {
      // there were missing values, so confirm submission
      this.dialogService.confirm(
        'Submit this response?',
        errorMessage + '    Are you sure that you want to submit this response?'
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
      if (scoringCategory.scoringOptionSelection !== ScoringOptionSelection.None &&
          (+scoringCategory.moveNumberFirstDisplay <= +this.displayedSubmission.moveNumber &&
           +scoringCategory.moveNumberLastDisplay >= +this.displayedSubmission.moveNumber)) {
        const scoringOptions = scoringCategory.scoringOptions;
        const optionIds = scoringOptions.filter(x => !x.isModifier).map(function(x) {
          return x.id;
        });
        const modifierIds = scoringOptions.filter(x => x.isModifier).map(function(x) {
          return x.id;
        });
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
      }
    });
    let errorMessage = '';
    if (noCategoryOption.length > 0) {
      errorMessage = 'No options selected for categories (' + noCategoryOption.sort((a, b) => a - b).toString() + ').    ';
    }
    if (noCategoryModifier.length > 0) {
      errorMessage = errorMessage
        + 'No modifier selected for categories ('
        + noCategoryModifier.sort((a, b) => a - b).toString() + ').    ';
    }
    return errorMessage;
  }

  activateSubmission() {
    const submission = { ...this.displayedSubmission };
    submission.status = ItemStatus.Active;
    this.submissionDataService.updateSubmission(submission);
  }

  setFormatting() {
    this.displaying = this.uiDataService.getSubmissionType(this.selectedEvaluation.id);
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
                            +this.displayedSubmission.moveNumber === +this.currentMoveNumber;
    this.showSubmitButton = this.displayedSubmission && canSubmit &&
                            !this.displayedSubmission.scoreIsAnAverage &&
                            this.displayedSubmission.status === ItemStatus.Active;
    this.showModifyControls = this.displayedSubmission && canModify &&
                              !this.displayedSubmission.scoreIsAnAverage &&
                              this.displayedSubmission.status === ItemStatus.Active;
    this.tableClass = this.displaying + '-text';
    this.buttonClass = 'mat-' + this.displaying;
  }

  getDisplayedScoringCategories(): ScoringCategory[] {
    const displayedScoringCategories: ScoringCategory[] = [];
    this.selectedScoringModel.scoringCategories.forEach(scoringCategory => {
      let hideIt = false;
      if (this.selectedScoringModel.displayScoringModelByMoveNumber) {
        if (+this.displayedMoveNumber < +scoringCategory.moveNumberFirstDisplay ||
            +this.displayedMoveNumber > +scoringCategory.moveNumberLastDisplay) {
          hideIt = true
        }
      }
      if (!hideIt) {
        displayedScoringCategories.push(scoringCategory);
      }
    });
    this.haveSomeScoringCategories = displayedScoringCategories.length > 0;
    return displayedScoringCategories;
  }

  matHeaderClass() {
    if (this.showHeader) {
      return 'cssLayoutRowSpaceBetween';
    } else {
      return 'no-display';
    }
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
