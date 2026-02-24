// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import {
  AfterViewInit,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  Duty,
  Team,
  User,
} from 'src/app/generated/cite.api/model/models';
import { DutyDataService } from 'src/app/data/duty/duty-data.service';
import { DutyQuery } from 'src/app/data/duty/duty.query';
import { TeamDataService } from 'src/app/data/team/team-data.service';
import { TeamQuery } from 'src/app/data/team/team.query';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSort, Sort } from '@angular/material/sort';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { AdminDutyEditDialogComponent } from '../admin-duty-edit-dialog/admin-duty-edit-dialog.component';

@Component({
    selector: 'app-admin-duties',
    templateUrl: './admin-duties.component.html',
    styleUrls: ['./admin-duties.component.scss'],
    standalone: false
})
export class AdminDutiesComponent implements OnDestroy, OnInit, AfterViewInit {
  @Input() selectedEvaluationId: string;
  @Input() canEdit: boolean;
  pageIndex: number = 0;
  pageSize: number = 10;
  isLoading = false;
  topbarColor = '#ef3a47';
  dutyList: Duty[] = [];
  displayedDuties: Duty[] = [];
  dataSource = new MatTableDataSource<Duty>();
  selectedTeamId = '';
  teamList: Team[] = [];
  userList$: User[] = [];
  displayedColumns: string[] = ['name', 'teamId', 'users'];
  private unsubscribe$ = new Subject();
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private settingsService: ComnSettingsService,
    private dutyDataService: DutyDataService,
    private dutyQuery: DutyQuery,
    private teamDataService: TeamDataService,
    private teamQuery: TeamQuery,
    private dialog: MatDialog,
    public dialogService: DialogService,
    public matDialog: MatDialog,
    private activatedRoute: ActivatedRoute
  ) {
    this.teamQuery
      .selectAll()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((teams) => {
        this.teamList = teams;
      });
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
    this.dutyDataService.loadByEvaluation(this.selectedEvaluationId);
    this.teamDataService.loadByEvaluationId(this.selectedEvaluationId);
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    const initialSortState: Sort = {
      active: 'teamId',
      direction: 'asc'
    };
    this.sort.active = initialSortState.active;
    this.sort.direction = initialSortState.direction;
    this.sort.sortChange.emit(initialSortState);
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
      maxWidth: '90vw',
      width: 'auto',
      data: {
        duty: duty,
        teamList: this.teamList,
        canEdit: this.canEdit
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
      this.displayedDuties = this.dutyList.filter(
        (r) => r.teamId === this.selectedTeamId
      );
    } else {
      this.displayedDuties = this.dutyList;
    }
    this.dataSource.data = this.displayedDuties;
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

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
