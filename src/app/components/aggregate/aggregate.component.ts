// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { combineLatest, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { ScoringModelQuery } from 'src/app/data/scoring-model/scoring-model.query';
import { TeamQuery } from 'src/app/data/team/team.query';
import { CurrentUserQuery } from 'src/app/data/user/user.query';
import { ItemStatus,
  Evaluation,
  Move,
  ScoringCategory,
  ScoringModel,
  Submission,
  Team,
  User
} from 'src/app/generated/cite.api/model/models';
import { SubmissionService } from 'src/app/generated/cite.api';
import { TeamService } from 'src/app/generated/cite.api';
import { PopulatedSubmission, SubmissionType } from 'src/app/data/submission/submission.models';
import { Title } from '@angular/platform-browser';
import { UIDataService } from 'src/app/data/ui/ui-data.service';

@Component({
  selector: 'app-aggregate',
  templateUrl: './aggregate.component.html',
  styleUrls: ['./aggregate.component.scss'],
  standalone: false
})
export class AggregateComponent implements OnInit, OnDestroy {
  @Input() selectedEvaluation: Evaluation;
  @Input() selectedScoringModel: ScoringModel;
  @Input() moveList: Move[];
  loggedInUserId = '';
  userId = '';
  teamList$: Observable<Team[]>;
  teamList: Team[] = [];
  userList: User[];
  currentMoveNumber = -1;
  displayedMoveNumber = -1;
  displayedSubmissionList: PopulatedSubmission[] = [];
  submissionList$: Observable<Submission[]>;
  submissionList: PopulatedSubmission[] = [];
  teamSubmissionList: PopulatedSubmission[] = [];
  userSubmissionList: PopulatedSubmission[] = [];
  displayedScoreClass = 'white';
  displayedScoreHover = 'Level 0 - Baseline';
  displaying = '';
  displayedScoringCategories: ScoringCategory[] = [];
  isLoading = false;
  tableClass = 'user-text';
  buttonClass = 'mat-user';
  private unsubscribe$ = new Subject();

  constructor(
    private submissionService: SubmissionService,
    private currentUserQuery: CurrentUserQuery,
    private teamService: TeamService,
    private teamQuery: TeamQuery,
    public matDialog: MatDialog,
    private titleService: Title,
    private uiDataService: UIDataService

  ) {
    this.titleService.setTitle('CITE Report');
    // observe the logged in user ID
    this.currentUserQuery.select()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((user) => {
        if (user && user.id !== this.loggedInUserId) {
          this.loggedInUserId = user.id;
          this.userId = this.loggedInUserId;
        }
      });
  }

  ngOnInit() {
    this.currentMoveNumber = this.selectedEvaluation.currentMoveNumber;
    this.displaying = this.uiDataService.getSubmissionType(this.selectedEvaluation.id)?.toLowerCase();
    this.displaying = this.displaying && this.displaying === 'team' ? 'team' : 'user';
    this.teamList$ = this.teamService.getEvaluationTeams(this.selectedEvaluation.id);
    this.submissionList$ = this.submissionService.getByEvaluation(this.selectedEvaluation.id);
    // observe the vital information and process it when it is all present
    combineLatest([this.teamList$, this.submissionList$])
      .pipe(takeUntil(this.unsubscribe$)).subscribe(([teams, submissions]) => {
        this.teamList = teams.length > 0 ? teams.sort((a, b) => a.shortName < b.shortName ? -1 : 1) : [];
        this.userList = teams.length > 0 ? this.getUserListFromTeams(teams) : [];
        this.getPopulatedSubmissions(submissions);
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
        const scoringCategory = this.selectedScoringModel?.scoringCategories?.find(subCat => subCat.id === scoringCategoryId);
        const scoringOption = scoringCategory?.scoringOptions?.find(so => so.id === scoringOptionId);
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

  getTeamShortName(id: string) {
    const theTeam = this.teamList?.find(tu => tu.id === id);
    return theTeam ? theTeam.shortName : '';
  }

  getUserName(id: string) {
    const theUser = this.userList?.find(tu => tu.id === id);
    return theUser ? theUser.name : '';
  }

  getUserListFromTeams(teams: Team[]): User[] {
    const users: User[] = [];
    teams.forEach(team => {
      team.users.forEach(user => {
        users.push(user);
      });
    });
    return users.sort((a, b) => a.name < b.name ? -1 : 1);
  }

  getSubmissionStatusText(submission: PopulatedSubmission) {
    return submission.status === ItemStatus.Complete ? 'Submitted' : 'Unsubmitted';
  }

  getDisplayedScoringCategories(moveNumber: number): ScoringCategory[] {
    const displayedScoringCategories: ScoringCategory[] = [];
    this.selectedScoringModel?.scoringCategories.forEach(scoringCategory => {
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

  getPopulatedSubmissions(submissions: Submission[]) {
    const allSubmissions: PopulatedSubmission[] = [];
    const userSubmissions: PopulatedSubmission[] = [];
    const teamSubmissions: PopulatedSubmission[] = [];
    submissions.forEach((submission) => {
      if (this.hasScoresAndValidMove(submission)) {
        if (submission.userId) {
          // user submission
          const populatedSubmission = {
            ...submission,
          } as PopulatedSubmission;
          const user = this.userList.find((x) => x.id === submission.userId);
          if (user) {
            populatedSubmission.name = user.name;
          } else {
            populatedSubmission.name = submission.userId;
          }
          populatedSubmission.submissionType = SubmissionType.user;
          allSubmissions.push(submission);
          userSubmissions.push(populatedSubmission);
        } else if (submission.teamId) {
          if (!submission.scoreIsAnAverage) {
            // team submission
            const populatedSubmission = {
              ...submission,
            } as PopulatedSubmission;
            const team = this.teamList.find((x) => x.id === submission.teamId);
            if (team) {
              populatedSubmission.name = team.name;
            } else {
              populatedSubmission.name = submission.teamId;
            }
            populatedSubmission.submissionType = SubmissionType.team;
            allSubmissions.push(submission);
            teamSubmissions.push(populatedSubmission);
            }
        }
      }
    });
    this.submissionList = allSubmissions.sort((a, b) => +a.moveNumber < +b.moveNumber ? -1 : 1);
    this.teamSubmissionList = teamSubmissions.sort((a, b) => +a.moveNumber < +b.moveNumber ? -1 : 1);
    this.userSubmissionList = userSubmissions.sort((a, b) => +a.moveNumber < +b.moveNumber ? -1 : 1);
    this.displayedSubmissionList = this.displaying === 'team' ? this.teamSubmissionList : this.userSubmissionList;
  }

  getSortedMoveList(): Move[] {
    const moveList = [];
    this.moveList.forEach(move => {
      const addIt = (+move.moveNumber <= +this.selectedEvaluation.currentMoveNumber) && this.getDisplayedScoringCategories(move.moveNumber).length > 0;
      if (addIt) {
        moveList.push(move);
      }
    });
    return moveList.sort((a, b) => +a.moveNumber < +b.moveNumber ? -1 : 1);
  }

  hasScoresAndValidMove(vs: PopulatedSubmission): boolean {
    const hasScores = !this.selectedScoringModel.displayScoringModelByMoveNumber ||
      this.selectedScoringModel?.scoringCategories.some(
        sc => +vs.moveNumber >= +sc.moveNumberFirstDisplay && +vs.moveNumber <= +sc.moveNumberLastDisplay);
    const hasValidMove = +vs.moveNumber <= +this.selectedEvaluation.currentMoveNumber;
    return hasScores && hasValidMove;
  }

  toggleDisplaying() {
    if (this.displaying === 'team') {
      this.displaying = 'user';
      this.displayedSubmissionList = this.userSubmissionList;
    } else {
      this.displaying = 'team';
      this.displayedSubmissionList = this.teamSubmissionList;
    }
  }

  printpage()
  {
     var printContents= document.getElementById('printable-area').innerHTML;
     document.body.innerHTML = printContents;
     window.print();
     location.reload();
  }

  getMoveSubmissions(move: Move): PopulatedSubmission[] {
    return this.displayedSubmissionList.filter(m => +m.moveNumber === +move.moveNumber);
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
