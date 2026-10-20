// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, EventEmitter, OnDestroy, Output, inject, input } from '@angular/core';
import { MatDialog, MatDialogClose } from '@angular/material/dialog';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { MoveQuery } from 'src/app/data/move/move.query';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { ScoringModelQuery } from 'src/app/data/scoring-model/scoring-model.query';
import { SubmissionDataService } from 'src/app/data/submission/submission-data.service';
import { SubmissionQuery } from 'src/app/data/submission/submission.query';
import { TeamQuery } from 'src/app/data/team/team.query';
import { TeamMembershipDataService } from 'src/app/data/team/team-membership-data.service';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { UserQuery } from 'src/app/data/user/user.query';
import { CurrentUserQuery } from 'src/app/data/user/user.query';
import {
  ItemStatus,
  Evaluation,
  ScoringModel,
  ScoringOption,
  Submission,
  SubmissionComment,
  Team,
  User,
  ScoringCategory,
  ScoringOptionSelection,
  TeamPermission,
} from 'src/app/generated/cite.api/model/models';
import { Title } from '@angular/platform-browser';
import { UIDataService } from 'src/app/data/ui/ui-data.service';
import { CrucibleDialogService, CrucibleDialogComponent, CrucibleDialogContentDirective, CrucibleDialogActionsDirective } from '@cmusei/crucible-common';
import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatRowDef, MatRow, MatHeaderRowDef, MatHeaderRow } from '@angular/material/table';
import { MatButton, MatIconButton } from '@angular/material/button';
import { NgClass, DecimalPipe } from '@angular/common';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatInput, MatFormField, MatLabel } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { DisplayOrderPipe } from 'src/app/utilities/sort-by-pipe';

@Component({
    selector: 'app-scoresheet',
    templateUrl: './scoresheet.component.html',
    styleUrls: ['./scoresheet.component.scss'],
    imports: [
        MatTable,
        MatColumnDef,
        MatHeaderCellDef,
        MatHeaderCell,
        MatButton,
        NgClass,
        MatCellDef,
        MatCell,
        MatCheckbox,
        MatTooltip,
        MatIconButton,
        MatIcon,
        MatInput,
        FormsModule,
        MatRowDef,
        MatRow,
        MatHeaderRowDef,
        MatHeaderRow,
        CrucibleDialogComponent,
        CrucibleDialogContentDirective,
        MatFormField,
        MatLabel,
        CrucibleDialogActionsDirective,
        MatDialogClose,
        DecimalPipe,
        DisplayOrderPipe,
    ],
})
export class ScoresheetComponent implements OnDestroy {
  private permissionDataService = inject(PermissionDataService);
  private scoringModelQuery = inject(ScoringModelQuery);
  private submissionDataService = inject(SubmissionDataService);
  private submissionQuery = inject(SubmissionQuery);
  private evaluationQuery = inject(EvaluationQuery);
  private moveQuery = inject(MoveQuery);
  private userDataService = inject(UserDataService);
  private userQuery = inject(UserQuery);
  private currentUserQuery = inject(CurrentUserQuery);
  private teamQuery = inject(TeamQuery);
  private teamMembershipDataService = inject(TeamMembershipDataService);
  private dialogService = inject(CrucibleDialogService);
  matDialog = inject(MatDialog);
  private titleService = inject(Title);
  private uiDataService = inject(UIDataService);

  readonly myTeamId = input<string>(undefined);
  readonly rightSideDisplay = input<boolean>(undefined);
  readonly noChanges = input<boolean>(undefined);
  @Output() selectDisplayedSubmission = new EventEmitter<string>();
  loggedInUserId = '';
  userId = '';
  activeTeamId = '';
  teamMemberships: User[];
  evaluationUsers: User[] = [];
  currentMoveNumber: number;
  displayedMoveNumber: number;
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
  tableClass = '';
  showHeader = false;
  // save state of each answer box, keyed by scoring option id
  commentSaveStates: { [scoringOptionId: string]: 'saving' | 'saved' | 'failed' } = {};
  private unsubscribe$ = new Subject();

  constructor() {
    this.titleService.setTitle('CITE Scoresheet');
    // observe the selected evaluation
    (this.evaluationQuery.selectActive() as Observable<Evaluation>)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((active) => {
        if (active) {
          this.selectedEvaluation = active;
          this.currentMoveNumber = +active.currentMoveNumber;
          if (!Number.isFinite(this.displayedMoveNumber)) {
            this.displayedMoveNumber = this.currentMoveNumber;
          }
          this.updateDisplayedSubmissionFlags();
          this.setFormatting();
        }
      });
    // observe the active submission
    (this.submissionQuery.selectActive() as Observable<Submission>)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((active) => {
        if (active) {
          if (active.id !== this.displayedSubmission.id) {
            this.commentSaveStates = {};
          }
          this.displayedSubmission = active;
          this.displayedMoveNumber = +active.moveNumber;
          this.updateDisplayedSubmissionFlags();
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
    (this.scoringModelQuery.selectActive() as Observable<ScoringModel>)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((active) => {
        if (active) {
          this.selectedScoringModel = active;
          this.showHeader =
            (active.useUserScore && active.useTeamScore) ||
            active.useTeamAverageScore ||
            active.useTypeAverageScore ||
            active.useOfficialScore;
        }
      });
    // observe the active team
    (this.teamQuery.selectActive() as Observable<Team>)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((active) => {
        if (active) {
          this.activeTeamId = active.id;
          this.teamMemberships = active.memberships;
        }
      });
    //observe the current user
    this.currentUserQuery
      .select()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((cu) => {
        this.loggedInUserId = cu.id;
      });
    this.userDataService.setCurrentUser();
    // observe the evaluation users
    this.userQuery.selectAll()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(users => {
        this.evaluationUsers = users;
      });
    // observe the submission list
    this.submissionQuery
      .selectAll()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((submissions) => {
        this.submissionList = submissions;
        this.updateDisplayedSubmissionFlags();
        this.setFormatting();
      });
    // observe the team users to get permissions
    this.teamMembershipDataService
      .teamMemberships$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((teamMemberships) => {
        const currentTeamMembership = teamMemberships.find((tu) => tu.userId === this.loggedInUserId);
        this.hasCanModifyPermission = currentTeamMembership
          ? this.permissionDataService.canEditTeamScore(this.activeTeamId)
          : false;
        this.hasCanSubmitPermission = currentTeamMembership
          ? this.permissionDataService.canSubmitTeamScore(this.activeTeamId)
          : false;
      });
  }

  categoryScore(scoringCategoryId: string) {
    const submissionCategories = this.displayedSubmission.submissionCategories;
    if (!submissionCategories || submissionCategories.length === 0) {
      return 0;
    } else {
      const submissionCategory = submissionCategories.find(
        (sc) => sc.scoringCategoryId === scoringCategoryId
      );
      return submissionCategory ? submissionCategory.score : 0;
    }
  }

  isSelected(scoringCategoryId: string, scoringOptionId: string) {
    let isSelected = false;
    const submissionCategories = this.displayedSubmission.submissionCategories;
    if (submissionCategories && submissionCategories.length > 0) {
      const sc = submissionCategories.find(
        (subCat) => subCat.scoringCategoryId === scoringCategoryId
      );
      if (sc) {
        const so = sc.submissionOptions.find(
          (subOpt) => subOpt.scoringOptionId === scoringOptionId
        );
        isSelected = so && so.isSelected;
      }
      if (isSelected) {
        const scoringCategory =
          this.selectedScoringModel.scoringCategories.find(
            (subCat) => subCat.id === scoringCategoryId
          );
        const scoringOption = scoringCategory.scoringOptions.find(
          (so) => so.id === scoringOptionId
        );
      }
    }
    return isSelected;
  }

  selectedCount(scoringCategoryId: string, scoringOptionId: string) {
    let selectedCount = 0;
    const submissionCategories = this.displayedSubmission.submissionCategories;
    if (submissionCategories && submissionCategories.length > 0) {
      const sc = submissionCategories.find(
        (subCat) => subCat.scoringCategoryId === scoringCategoryId
      );
      if (sc) {
        const so = sc.submissionOptions.find(
          (subOpt) => subOpt.scoringOptionId === scoringOptionId
        );
        selectedCount = so ? so.selectedCount : 0;
      }
    }
    return selectedCount > 0 ? selectedCount.toString() : '   ';
  }

  toggleOption(event: any, scoringCategoryId: string, scoringOptionId: string) {
    const submissionOptionId = this.displayedSubmission.submissionCategories
      .find((sc) => sc.scoringCategoryId === scoringCategoryId)
      .submissionOptions.find(
        (so) => so.scoringOptionId === scoringOptionId
      ).id;
    this.submissionDataService.toggleSubmissionOption(
      submissionOptionId,
      event.checked
    );
  }

  clearSelections() {
    if (this.displayedSubmission.status !== ItemStatus.Active) {
      return;
    }
    this.dialogService
      .confirm({
        title: 'Clear all selections?',
        message: 'This removes every selection on this scoresheet. Are you sure?',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.submissionDataService.clearSubmission(this.displayedSubmission.id);
        }
      });
  }

  presetSelections() {
    if (this.displayedSubmission.status === ItemStatus.Active) {
      this.submissionDataService.presetSubmission(this.displayedSubmission.id);
    }
  }

  addComment(templateRef, scoringOption: ScoringOption) {
    const submissionOption = this.displayedSubmission.submissionCategories
      .find((sc) => sc.scoringCategoryId === scoringOption.scoringCategoryId)
      .submissionOptions.find((so) => so.scoringOptionId === scoringOption.id);
    this.currentComment = '';
    this.commentOptionDescription = scoringOption.description;
    const dialogRef = this.matDialog.open(templateRef, {
      maxWidth: '90vw',
      width: '600px',
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.submissionDataService.addSubmissionComment(
          this.displayedSubmission.id,
          submissionOption.id,
          this.currentComment
        );
      }
      this.currentComment = '';
      this.commentOptionDescription = '';
    });
  }

  editComment(
    templateRef,
    scoringOption: ScoringOption,
    submissionComment: SubmissionComment
  ) {
    this.currentComment = submissionComment.comment;
    this.commentOptionDescription = scoringOption.description;
    const dialogRef = this.matDialog.open(templateRef, {
      maxWidth: '90vw',
      width: '600px',
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const newComment = { ...submissionComment };
        newComment.comment = this.currentComment;
        this.submissionDataService.changeSubmissionComment(
          this.displayedSubmission.id,
          newComment
        );
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
        const newComment = { ...comment } as SubmissionComment;
        newComment.comment = event.target.value;
        this.trackCommentSave(scoringOptionId, this.submissionDataService.changeSubmissionComment(
          this.displayedSubmission.id,
          newComment
        ));
      } else {
        this.trackCommentSave(scoringOptionId, this.submissionDataService.removeSubmissionComment(
          this.displayedSubmission.id,
          comment.id
        ));
      }
    } else {
      const submissionCategory =
        this.displayedSubmission.submissionCategories.find(
          (sc) => sc.scoringCategoryId === scoringCategoryId
        );
      if (submissionCategory) {
        const submissionOption = submissionCategory.submissionOptions.find(
          (so) => so.scoringOptionId === scoringOptionId
        );
        if (submissionOption) {
          this.trackCommentSave(scoringOptionId, this.submissionDataService.addSubmissionComment(
            this.displayedSubmission.id,
            submissionOption.id,
            commentText
          ));
        }
      }
    }
  }

  private trackCommentSave(scoringOptionId: string, request$: Observable<Submission>) {
    this.commentSaveStates[scoringOptionId] = 'saving';
    request$.subscribe({
      next: () => (this.commentSaveStates[scoringOptionId] = 'saved'),
      error: () => (this.commentSaveStates[scoringOptionId] = 'failed'),
    });
  }

  // with answer boxes each box is a question answered by its text, otherwise each category that needs
  // a selection counts once
  getAnsweredCounts(): { answered: number; total: number } {
    const counts = { answered: 0, total: 0 };
    this.getDisplayedScoringCategories().forEach((scoringCategory) => {
      const scoringOptions = (scoringCategory.scoringOptions || []).filter((so) => !so.isModifier);
      if (this.selectedScoringModel.displayCommentTextBoxes) {
        scoringOptions.forEach((scoringOption) => {
          counts.total++;
          if (this.optionComments(scoringCategory.id, scoringOption.id).some((c) => c.comment)) {
            counts.answered++;
          }
        });
      } else if (scoringCategory.scoringOptionSelection !== ScoringOptionSelection.None) {
        counts.total++;
        if (scoringOptions.some((so) => this.isSelected(scoringCategory.id, so.id))) {
          counts.answered++;
        }
      }
    });
    return counts;
  }

  // the first later move that has questions, for the empty move message
  getNextQuestionMove(): string {
    const displayedMoveNumber = this.getResolvedDisplayedMoveNumber();
    if (
      displayedMoveNumber === null ||
      !this.selectedScoringModel.displayScoringModelByMoveNumber ||
      !this.selectedScoringModel.scoringCategories
    ) {
      return '';
    }
    const nextMoveNumbers = this.selectedScoringModel.scoringCategories
      .map((sc) => +sc.moveNumberFirstDisplay)
      .filter((moveNumber) => moveNumber > displayedMoveNumber);
    if (nextMoveNumbers.length === 0) {
      return '';
    }
    const nextMoveNumber = Math.min(...nextMoveNumbers);
    const nextMove = this.moveQuery.getAll().find((m) => +m.moveNumber === nextMoveNumber);
    return nextMove?.description || 'Move ' + nextMoveNumber;
  }

  deleteComment(submissionComment: SubmissionComment) {
    this.dialogService
      .confirm({
        title: 'Delete this comment?',
        message: submissionComment.comment,
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.submissionDataService.removeSubmissionComment(
            this.displayedSubmission.id,
            submissionComment.id
          );
        }
      });
  }

  optionComments(scoringCategoryId: string, scoringOptionId: string) {
    if (
      !this.displayedSubmission ||
      !this.displayedSubmission.submissionCategories ||
      !scoringCategoryId ||
      !scoringOptionId
    ) {
      return [];
    }
    const submissionCategory =
      this.displayedSubmission.submissionCategories.find(
        (sc) => sc.scoringCategoryId === scoringCategoryId
      );
    if (submissionCategory) {
      const submissionOption = submissionCategory.submissionOptions.find(
        (so) => so.scoringOptionId === scoringOptionId
      );
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
      const sc = submissionCategories.find(
        (subCat) => subCat.scoringCategoryId === scoringCategoryId
      );
      if (sc) {
        const so = sc.submissionOptions.find(
          (subOpt) => subOpt.scoringOptionId === scoringOptionId
        );
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
    const theUser = this.evaluationUsers?.find((u) => u.id === id);
    return theUser ? theUser.name : '';
  }

  getSubmissionStatusText() {
    return this.displayedSubmission.status === ItemStatus.Complete
      ? 'Submitted'
      : 'Unsubmitted';
  }

  completeSubmission() {
    // if not the curret move, score cannot be reopened, so ask for confirmation
    if (+this.displayedMoveNumber < +this.currentMoveNumber) {
      this.dialogService
        .confirm({
          title: 'WARNING:  You will not be able to reopen this response!',
          message: 'Move ' +
            this.displayedMoveNumber +
            ' has ended. You will not be able to reopen this response. Are you sure that you wish to submit?',
        })
        .afterClosed()
        .subscribe((confirmed) => {
          if (confirmed) {
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
      this.dialogService
        .confirm({
          title: 'Submit this response?',
          message:
            errorMessage +
            '    Are you sure that you want to submit this response?',
        })
        .afterClosed()
        .subscribe((confirmed) => {
          if (confirmed) {
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
    this.displayedSubmission.submissionCategories.forEach((sc) => {
      const scoringCategory = this.selectedScoringModel.scoringCategories.find(
        (x) => x.id === sc.scoringCategoryId
      );
      if (
        scoringCategory.scoringOptionSelection !==
          ScoringOptionSelection.None &&
        +scoringCategory.moveNumberFirstDisplay <=
          +this.displayedSubmission.moveNumber &&
        +scoringCategory.moveNumberLastDisplay >=
          +this.displayedSubmission.moveNumber
      ) {
        const scoringOptions = scoringCategory.scoringOptions;
        const optionIds = scoringOptions
          .filter((x) => !x.isModifier)
          .map(function (x) {
            return x.id;
          });
        const modifierIds = scoringOptions
          .filter((x) => x.isModifier)
          .map(function (x) {
            return x.id;
          });
        const optionSelected = sc.submissionOptions
          .filter((so) => optionIds.includes(so.scoringOptionId))
          .some((so) => so.isSelected);
        if (!optionSelected) {
          noCategoryOption.push(scoringCategory.displayOrder);
        }
        if (modifierIds.length > 1) {
          const modifierSelected = sc.submissionOptions
            .filter((so) => modifierIds.includes(so.scoringOptionId))
            .some((so) => so.isSelected);
          if (!modifierSelected) {
            noCategoryModifier.push(scoringCategory.displayOrder);
          }
        }
      }
    });
    let errorMessage = '';
    if (noCategoryOption.length > 0) {
      errorMessage =
        'No options selected for categories (' +
        noCategoryOption.sort((a, b) => a - b).toString() +
        ').    ';
    }
    if (noCategoryModifier.length > 0) {
      errorMessage =
        errorMessage +
        'No modifier selected for categories (' +
        noCategoryModifier.sort((a, b) => a - b).toString() +
        ').    ';
    }
    return errorMessage;
  }

  activateSubmission() {
    const submission = { ...this.displayedSubmission };
    submission.status = ItemStatus.Active;
    this.submissionDataService.updateSubmission(submission);
  }

  setFormatting() {
    // nothing is saved until the user picks a view, so fall back to what is shown
    this.displaying =
      this.uiDataService.getSubmissionType(this.selectedEvaluation.id) ||
      (this.displayedSubmission?.userId ? 'user' : 'team');
    // set proper permissions for this selection
    const canModify =
      this.displaying === 'user' ||
      this.permissionDataService.hasTeamPermission(this.activeTeamId, TeamPermission.EditTeamScore);
    const canSubmit =
      this.displaying === 'user' ||
      this.permissionDataService.hasTeamPermission(this.activeTeamId, TeamPermission.SubmitTeamScore);
    this.showReopenButton =
      this.displayedSubmission &&
      canSubmit &&
      !this.displayedSubmission.scoreIsAnAverage &&
      this.displayedSubmission.status === ItemStatus.Complete &&
      +this.displayedSubmission.moveNumber === +this.currentMoveNumber;
    this.showSubmitButton =
      this.displayedSubmission &&
      canSubmit &&
      !this.displayedSubmission.scoreIsAnAverage &&
      this.displayedSubmission.status === ItemStatus.Active;
    this.showModifyControls =
      this.displayedSubmission &&
      canModify &&
      !this.displayedSubmission.scoreIsAnAverage &&
      this.displayedSubmission.status === ItemStatus.Active;
    // this.tableClass = this.displaying + '-background';
  }

  private getResolvedDisplayedMoveNumber(): number | null {
    if (Number.isFinite(this.displayedMoveNumber)) {
      return this.displayedMoveNumber;
    }
    if (Number.isFinite(this.currentMoveNumber)) {
      return this.currentMoveNumber;
    }
    return null;
  }

  private updateDisplayedSubmissionFlags() {
    const displayedMoveNumber = this.getResolvedDisplayedMoveNumber();
    if (displayedMoveNumber === null) {
      this.showGroupAvgScore = false;
      this.showOfficialScore = false;
      return;
    }

    this.showGroupAvgScore = this.submissionList.some(
      (s) =>
        +s.moveNumber === displayedMoveNumber &&
        !s.userId &&
        !s.teamId &&
        s.groupId &&
        s.scoreIsAnAverage
    );
    this.showOfficialScore = this.submissionList.some(
      (s) =>
        +s.moveNumber === displayedMoveNumber &&
        !s.userId &&
        !s.teamId &&
        !s.groupId
    );
  }

  getDisplayedScoringCategories(): ScoringCategory[] {
    const displayedScoringCategories: ScoringCategory[] = [];
    const displayedMoveNumber = this.getResolvedDisplayedMoveNumber();
    (this.selectedScoringModel.scoringCategories || []).forEach((scoringCategory) => {
      let hideIt = false;
      if (
        this.selectedScoringModel.displayScoringModelByMoveNumber &&
        displayedMoveNumber !== null
      ) {
        if (
          displayedMoveNumber < +scoringCategory.moveNumberFirstDisplay ||
          displayedMoveNumber > +scoringCategory.moveNumberLastDisplay
        ) {
          hideIt = true;
        }
      }
      if (!hideIt) {
        displayedScoringCategories.push(scoringCategory);
      }
    });
    this.haveSomeScoringCategories = displayedScoringCategories.length > 0;
    return displayedScoringCategories;
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
