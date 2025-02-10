// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { ScoringModelQuery } from 'src/app/data/scoring-model/scoring-model.query';
import { SubmissionDataService } from 'src/app/data/submission/submission-data.service';
import { SubmissionQuery } from 'src/app/data/submission/submission.query';
import { TeamQuery } from 'src/app/data/team/team.query';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { ItemStatus,
  Evaluation,
  ScoringModel,
  Team,
  User,
  ScoringCategory
} from 'src/app/generated/cite.api/model/models';
import { PopulatedSubmission } from 'src/app/data/submission/submission.models';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { Title} from '@angular/platform-browser';
import { UIDataService } from 'src/app/data/ui/ui-data.service';

@Component({
    selector: 'app-report',
    templateUrl: './report.component.html',
    styleUrls: ['./report.component.scss'],
    standalone: false
})
export class ReportComponent implements OnDestroy {
  @Input() myTeamId: string;
  @Input() userOnly: boolean;
  loggedInUserId = '';
  userId = '';
  activeTeamId = '';
  teamUsers: User[];
  currentMoveNumber = -1;
  displayedMoveNumber = -1;
  selectedEvaluation: Evaluation = {};
  selectedScoringModel: ScoringModel = {};
  displayedSubmissionList: PopulatedSubmission[] = [];
  submissionList: PopulatedSubmission[] = [];
  displayedScoreClass = 'white';
  displayedScoreHover = 'Level 0 - Baseline';
  displaying = '';
  displayedScoringCategories: ScoringCategory[] = [];
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
    private titleService: Title,
    private uiDataService: UIDataService

  ) {
    this.titleService.setTitle('CITE Report');
    // observe the selected evaluation
    (this.evaluationQuery.selectActive() as Observable<Evaluation>).pipe(takeUntil(this.unsubscribe$)).subscribe(active => {
      if (active) {
        this.selectedEvaluation = active;
        this.currentMoveNumber = active.currentMoveNumber;
        this.displaying = this.uiDataService.getSubmissionType(active.id).toLowerCase();      }
    });
    // observe the selected scoring model
    (this.scoringModelQuery.selectActive() as Observable<ScoringModel>).pipe(takeUntil(this.unsubscribe$)).subscribe(active => {
      if (active) {
        this.selectedScoringModel = active;
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
    this.submissionQuery.selectAllPopulated().pipe(takeUntil(this.unsubscribe$)).subscribe(submissions => {
      this.submissionList = submissions;
      this.showGroupAvgScore = this.submissionList.some(
        s => +s.moveNumber === +this.displayedMoveNumber && !s.userId && !s.teamId && s.groupId && s.scoreIsAnAverage);
      this.showOfficialScore = this.submissionList.some(
        s => +s.moveNumber === +this.displayedMoveNumber && !s.userId && !s.teamId && !s.groupId);
      this.selectDisplayedSubmissions();
    });
  }

  categoryScore(submission: PopulatedSubmission, scoringCategoryId: string) {
    const submissionCategories = submission.submissionCategories;
    if (!submissionCategories || submissionCategories.length === 0) {
      return 0;
    } else {
      const submissionCategory = submissionCategories.find(sc => sc.scoringCategoryId === scoringCategoryId);
      return submissionCategory ? submissionCategory.score : 0;
    }
  }

  isSelected(submission: PopulatedSubmission, scoringCategoryId: string, scoringOptionId: string) {
    let isSelected = false;
    const submissionCategories = submission.submissionCategories;
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

  selectedCount(submission: PopulatedSubmission, scoringCategoryId: string, scoringOptionId: string) {
    let selectedCount = 0;
    const submissionCategories = submission.submissionCategories;
    if (submissionCategories && submissionCategories.length > 0) {
      const sc = submissionCategories.find(subCat => subCat.scoringCategoryId === scoringCategoryId);
      if (sc) {
        const so = sc.submissionOptions.find(subOpt => subOpt.scoringOptionId === scoringOptionId);
        selectedCount = so ? so.selectedCount : 0;
      }
    }
    return selectedCount > 0 ? selectedCount.toString() : '   ';
  }

  optionComments(submission: PopulatedSubmission, scoringCategoryId: string, scoringOptionId: string) {
    if (!submission ||
        !submission.submissionCategories ||
        !scoringCategoryId ||
        !scoringOptionId) {
      return [];
    }
    const submissionCategory = submission.submissionCategories
      .find(sc => sc.scoringCategoryId === scoringCategoryId);
    if (submissionCategory) {
      const submissionOption = submissionCategory.submissionOptions.find(so => so.scoringOptionId === scoringOptionId);
      if (submissionOption) {
        return submissionOption.submissionComments;
      }
    }
    return [];
  }

  selectedBy(submission: PopulatedSubmission, scoringCategoryId: string, scoringOptionId: string) {
    if (this.displaying !== 'team') {
      return;
    }
    let selectedBy = null;
    let isSelected = null;
    const submissionCategories = submission.submissionCategories;
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

  getSubmissionStatusText(submission: PopulatedSubmission) {
    return submission.status === ItemStatus.Complete ? 'Submitted' : 'Unsubmitted';
  }

  getDisplayedScoringCategories(moveNumber: number): ScoringCategory[] {
    const displayedScoringCategories: ScoringCategory[] = [];
    this.selectedScoringModel.scoringCategories.forEach(scoringCategory => {
      let hideIt = false;
      if (this.selectedScoringModel.displayScoringModelByMoveNumber &&
          (+moveNumber < +scoringCategory.moveNumberFirstDisplay ||
          +moveNumber > +scoringCategory.moveNumberLastDisplay)) {
        hideIt = true
      }
    if (!hideIt) {
        displayedScoringCategories.push(scoringCategory);
      }
    });
    return displayedScoringCategories;
  }

  selectDisplayedSubmissions() {
    let validSubmissions = Object.assign([], this.submissionList) as PopulatedSubmission[];
    validSubmissions = validSubmissions.filter(vs => vs.submissionType.toLowerCase() === this.displaying);
    let displayedSubmissions: PopulatedSubmission[] = [];
    validSubmissions.forEach(vs => {
      const hasScores = !this.selectedScoringModel.displayScoringModelByMoveNumber ||
        this.selectedScoringModel.scoringCategories.some(
          sc => +vs.moveNumber >= +sc.moveNumberFirstDisplay && +vs.moveNumber <= +sc.moveNumberLastDisplay);
        if (hasScores && +vs.moveNumber <= +this.selectedEvaluation.currentMoveNumber) {
          displayedSubmissions.push(vs);
        }
    });
    displayedSubmissions = displayedSubmissions.sort((a, b) => +a.moveNumber < +b.moveNumber ? -1 : 1);
    this.displayedSubmissionList = displayedSubmissions;
  }

  printpage()
  {
     var printContents= document.getElementById('printable-area').innerHTML;
     document.body.innerHTML = printContents;
     window.print();
     location.reload();
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
