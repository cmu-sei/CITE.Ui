// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import {
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { ActivatedRoute } from '@angular/router';
import { Sort } from '@angular/material/sort';
import {
  Evaluation,
  Duty,
  Team,
  User,
} from 'src/app/generated/cite.api/model/models';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { DutyDataService } from 'src/app/data/duty/duty-data.service';
import { DutyQuery } from 'src/app/data/duty/duty.query';
import { TeamDataService } from 'src/app/data/team/team-data.service';
import { TeamQuery } from 'src/app/data/team/team.query';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { AdminDutyEditDialogComponent } from '../admin-duty-edit-dialog/admin-duty-edit-dialog.component';

@Component({
    selector: 'app-admin-duties',
    templateUrl: './admin-duties.component.html',
    styleUrls: ['./admin-duties.component.scss'],
    standalone: false
})
export class AdminDutiesComponent implements OnDestroy, OnInit {
  @Input() showSelectionControls: boolean;
  pageIndex: number = 0;
  pageSize: number = 10;
  isLoading = false;
  topbarColor = '#ef3a47';
  dutyList: Duty[] = [];
  displayedDuties: Duty[] = [];
  filteredDutyList: Duty[] = [];
  dataSource = new MatTableDataSource<Duty>();
  selectedEvaluationId = '';
  evaluationList: Evaluation[] = [];
  selectedTeamId = '';
  teamList: Team[] = [];
  userList$: User[] = [];
  sort: Sort = {
    active: 'name',
    direction: 'asc',
  };
  displayedColumns: string[] = ['name', 'teamId', 'users'];
  private unsubscribe$ = new Subject();

  constructor(
    private settingsService: ComnSettingsService,
    private evaluationQuery: EvaluationQuery,
    private dutyDataService: DutyDataService,
    private dutyQuery: DutyQuery,
    private teamDataService: TeamDataService,
    private teamQuery: TeamQuery,
    private dialog: MatDialog,
    public dialogService: DialogService,
    public matDialog: MatDialog,
    private activatedRoute: ActivatedRoute
  ) {
    this.topbarColor = this.settingsService.settings.AppTopBarHexColor
      ? this.settingsService.settings.AppTopBarHexColor
      : this.topbarColor;
    this.evaluationQuery
      .selectAll()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((evaluations) => {
        this.evaluationList = evaluations;
        if (!evaluations.some((e) => e.id === this.selectedEvaluationId)) {
          this.selectedEvaluationId = '';
          this.selectedTeamId = '';
          this.teamList = [];
          this.dutyList = [];
          this.criteriaChanged();
        }
      });
    this.teamQuery
      .selectAll()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((teams) => {
        this.teamList = teams;
      });
    this.dutyDataService.unload();
    this.dutyQuery
      .selectAll()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((duties) => {
        this.dutyList = duties;
        this.criteriaChanged();
      });
    this.activatedRoute.queryParamMap
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((params) => {
        this.selectedEvaluationId = params.get('evaluation');
        this.selectedTeamId = params.get('team');
      });
  }

  ngOnInit() {
    if (
      !this.showSelectionControls &&
      this.selectedEvaluationId &&
      this.selectedTeamId
    ) {
      this.dutyDataService.loadByEvaluationTeam(
        this.selectedEvaluationId,
        this.selectedTeamId
      );
      this.teamDataService.loadByEvaluationId(this.selectedEvaluationId);
    } else if (this.showSelectionControls && this.selectedEvaluationId) {
      this.selectEvaluation(this.selectedEvaluationId);
    }
  }

  selectEvaluation(evaluationId: string) {
    this.selectedEvaluationId = evaluationId;
    this.selectedTeamId = '';
    this.dutyDataService.unload();
    this.teamDataService.loadByEvaluationId(evaluationId);
    this.dutyDataService.loadByEvaluation(this.selectedEvaluationId);
  }

  selectTeam(teamId: string) {
    this.selectedTeamId = teamId;
    this.criteriaChanged();
  }

  addOrEditDuty(duty: Duty) {
    if (!duty) {
      duty = {
        name: '',
        evaluationId: this.selectedEvaluationId,
        teamId: this.selectedTeamId,
      };
    } else {
      duty = { ...duty };
    }
    const dialogRef = this.dialog.open(AdminDutyEditDialogComponent, {
      width: '800px',
      data: {
        duty: duty,
        teamList: this.teamList,
      },
    });
    dialogRef.componentInstance.editComplete.subscribe((result) => {
      if (result.saveChanges && result.duty) {
        this.saveDuty(result.duty);
      }
      dialogRef.close();
    });
  }

  saveDuty(duty: Duty) {
    if (duty.id) {
      this.dutyDataService.updateDuty(duty);
    } else {
      if (duty.teamId) {
        this.dutyDataService.add(duty);
      } else {
        this.teamList.forEach((team) => {
          duty.teamId = team.id;
          this.dutyDataService.add(duty);
        });
      }
    }
  }

  deleteDutyRequest(duty: Duty) {
    this.dialogService
      .confirm(
        'Delete this duty?',
        'Are you sure that you want to delete this duty?'
      )
      .subscribe((result) => {
        if (result['confirm']) {
          this.dutyDataService.delete(duty.id);
        }
      });
  }

  criteriaChanged() {
    if (this.selectedTeamId && this.dutyList && this.dutyList.length > 0) {
      this.filteredDutyList = this.dutyList.filter(
        (r) => r.teamId === this.selectedTeamId
      );
    } else {
      this.filteredDutyList = this.dutyList;
    }
    this.applyPagination();
  }

  sortChanged(sort: Sort) {
    this.sort = sort;
    this.filteredDutyList.sort((a, b) =>
      this.sortDuties(a, b, sort.active, sort.direction)
    );
    this.applyPagination();
  }

  private sortDuties(a: Duty, b: Duty, column: string, direction: string) {
    const isAsc = direction !== 'desc';
    switch (column) {
      case 'name':
        return (
          (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      case 'teamId':
        return (
          (this.getTeamName(a.teamId) < this.getTeamName(b.teamId) ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      case 'users':
        return (a.users < b.users ? -1 : 1) * (isAsc ? 1 : -1);
      default:
        return 0;
    }
  }

  getTeamName(teamId: string) {
    let teamName = '';
    if (teamId) {
      const team = this.teamList.find((t) => t.id === teamId);
      if (team) {
        teamName = team.name;
      }
    }
    return teamName;
  }

  paginatorEvent(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.applyPagination();
  }

  applyPagination() {
    const startIndex = this.pageIndex * this.pageSize;
    this.displayedDuties = this.filteredDutyList.slice(
      startIndex,
      startIndex + this.pageSize
    );
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
