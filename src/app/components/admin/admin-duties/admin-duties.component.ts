// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { AfterViewInit, Component, Input, OnDestroy, OnInit, inject, input, viewChild } from '@angular/core';
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
import { ComnSettingsService, CrucibleDialogService } from '@cmusei/crucible-common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSort, Sort, MatSortHeader } from '@angular/material/sort';
import { AdminDutyEditDialogComponent } from '../admin-duty-edit-dialog/admin-duty-edit-dialog.component';
import { UntypedFormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';

import { MatIconButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatInput, MatSuffix } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/autocomplete';
import { MatCard } from '@angular/material/card';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-admin-duties',
    templateUrl: './admin-duties.component.html',
    styleUrls: ['./admin-duties.component.scss'],
    imports: [MatIcon, MatIconButton, MatFormField, MatLabel, MatSelect, MatOption, MatInput, FormsModule, ReactiveFormsModule, MatSuffix, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow, MatCard, MatProgressSpinner]
})
export class AdminDutiesComponent implements OnDestroy, OnInit, AfterViewInit {
  private settingsService = inject(ComnSettingsService);
  private dutyDataService = inject(DutyDataService);
  private dutyQuery = inject(DutyQuery);
  private teamDataService = inject(TeamDataService);
  private teamQuery = inject(TeamQuery);
  private dialog = inject(MatDialog);
  dialogService = inject(CrucibleDialogService);
  matDialog = inject(MatDialog);
  private activatedRoute = inject(ActivatedRoute);

  @Input() selectedEvaluationId: string;
  readonly canEdit = input<boolean>(undefined);
  pageIndex: number = 0;
  pageSize: number = 10;
  isLoading = false;
  topbarColor = '#ef3a47';
  dutyList: Duty[] = [];
  displayedDuties: Duty[] = [];
  dataSource = new MatTableDataSource<Duty>();
  selectedTeamId = '';
  filterString = '';
  filterControl = new UntypedFormControl();
  teamList: Team[] = [];
  userList$: User[] = [];
  displayedColumns: string[] = ['name', 'teamId', 'users'];
  private unsubscribe$ = new Subject();
  readonly sort = viewChild(MatSort);

  constructor() {
    // the admin data group sends every evaluation's teams and duties into the stores, so keep this
    // evaluation's; adding to all teams would otherwise add to other evaluations' too
    this.teamQuery
      .selectAll()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((teams) => {
        this.teamList = teams.filter((t) => t.evaluationId === this.selectedEvaluationId);
      });
    this.dutyQuery
      .selectAll()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((duties) => {
        this.dutyList = duties.filter((d) => d.evaluationId === this.selectedEvaluationId);
        this.criteriaChanged();
      });
    this.filterControl.valueChanges
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((term) => {
        this.filterString = term ? term.toLowerCase() : '';
        this.criteriaChanged();
      });
    this.activatedRoute.queryParamMap
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((params) => {
        if (params.get('evaluation')) {
          this.selectedEvaluationId = params.get('evaluation');
        }
        this.selectedTeamId = params.get('team') || '';
      });
  }

  ngOnInit() {
    this.dutyDataService.loadByEvaluation(this.selectedEvaluationId);
    this.teamDataService.loadByEvaluationId(this.selectedEvaluationId);
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort();
    const initialSortState: Sort = {
      active: 'teamId',
      direction: 'asc'
    };
    this.sort().active = initialSortState.active;
    this.sort().direction = initialSortState.direction;
    this.sort().sortChange.emit(initialSortState);
  }

  selectTeam(teamId: string) {
    this.selectedTeamId = teamId;
    this.criteriaChanged();
  }

  clearFilter() {
    this.filterControl.setValue('');
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
      minWidth: '400px',
      maxWidth: '90vw',
      width: 'auto',
      data: {
        duty: duty,
        teamList: this.teamList,
        canEdit: this.canEdit()
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
      .confirm({
        title: 'Delete this duty?',
        message: 'Are you sure that you want to delete this duty?',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.dutyDataService.delete(duty.id);
        }
      });
  }

  criteriaChanged() {
    this.displayedDuties = this.dutyList.filter(
      (r) => (!this.selectedTeamId || r.teamId === this.selectedTeamId) &&
             (!this.filterString || r.name.toLowerCase().includes(this.filterString))
    );
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
