// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnDestroy,
  OnInit,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { MatLegacyPaginator as MatPaginator, LegacyPageEvent as PageEvent } from '@angular/material/legacy-paginator';
import { ActivatedRoute } from '@angular/router';
import { MatSort, Sort } from '@angular/material/sort';
import { Evaluation, Role, Team, User } from 'src/app/generated/cite.api/model/models';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { RoleDataService } from 'src/app/data/role/role-data.service';
import { RoleQuery } from 'src/app/data/role/role.query';
import { TeamDataService } from 'src/app/data/team/team-data.service';
import { TeamQuery } from 'src/app/data/team/team.query';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { AdminRoleEditDialogComponent } from '../admin-role-edit-dialog/admin-role-edit-dialog.component';

@Component({
  selector: 'app-admin-roles',
  templateUrl: './admin-roles.component.html',
  styleUrls: ['./admin-roles.component.scss'],
})
export class AdminRolesComponent implements OnDestroy, OnInit, AfterViewInit {
  @Input() showSelectionControls: boolean;
  @Input() pageSize: number;
  @Input() pageIndex: number;
  @Output() sortChange = new EventEmitter<Sort>();
  @Output() pageChange = new EventEmitter<PageEvent>();

  isLoading = false;
  topbarColor = '#ef3a47';
  roleList: Role[] = [];
  dataSource = new MatTableDataSource<Role>();
  selectedEvaluationId = '';
  evaluationList: Evaluation[] = [];
  selectedTeamId = '';
  teamList: Team[] = [];
  userList$: User[] = [];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  displayedColumns: string[] = [
    'name',
    'teamId',
    'users'
  ];
  private unsubscribe$ = new Subject();

  constructor(
    private settingsService: ComnSettingsService,
    private evaluationQuery: EvaluationQuery,
    private roleDataService: RoleDataService,
    private roleQuery: RoleQuery,
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
    this.evaluationQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(evaluations => {
      this.evaluationList = evaluations;
      if (!evaluations.some(e => e.id === this.selectedEvaluationId)) {
        this.selectedEvaluationId = '';
        this.selectedTeamId = '';
        this.teamList = [];
        this.roleList = [];
        this.criteriaChanged();
      }
    });
    this.teamQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(teams => {
      this.teamList = teams;
    });
    this.roleDataService.unload();
    this.roleQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe((roles) => {
      this.roleList = roles;
      this.criteriaChanged();
    });
    this.activatedRoute.queryParamMap.pipe(takeUntil(this.unsubscribe$)).subscribe(params => {
      this.selectedEvaluationId = params.get('evaluation');
      this.selectedTeamId = params.get('team');
    });
  }

  ngOnInit() {
    if (!this.showSelectionControls && this.selectedEvaluationId && this.selectedTeamId) {
      this.roleDataService.loadByEvaluationTeam(this.selectedEvaluationId, this.selectedTeamId);
      this.teamDataService.loadMine();
    } else if (this.showSelectionControls && this.selectedEvaluationId) {
      this.selectEvaluation(this.selectedEvaluationId);
    }
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  selectEvaluation(evaluationId: string) {
    this.selectedEvaluationId = evaluationId;
    this.selectedTeamId = '';
    this.roleDataService.unload();
    this.teamDataService.loadByEvaluationId(evaluationId);
    this.roleDataService.loadByEvaluation(this.selectedEvaluationId);
  }

  selectTeam(teamId: string) {
    this.selectedTeamId = teamId;
    this.criteriaChanged();
  }

  addOrEditRole(role: Role) {
    if (!role) {
      role = {
        name: '',
        evaluationId: this.selectedEvaluationId,
        teamId: this.selectedTeamId
      };
    } else {
      role = {... role};
    }
    const dialogRef = this.dialog.open(AdminRoleEditDialogComponent, {
      width: '800px',
      data: {
        role: role,
        teamList: this.teamList
      },
    });
    dialogRef.componentInstance.editComplete.subscribe((result) => {
      if (result.saveChanges && result.role) {
        this.saveRole(result.role);
      }
      dialogRef.close();
    });
  }

  saveRole(role: Role) {
    if (role.id) {
      this.roleDataService.updateRole(role);
    } else {
      if (role.teamId) {
        this.roleDataService.add(role);
      } else {
        this.teamList.forEach(team => {
          role.teamId = team.id;
          this.roleDataService.add(role);
        });
      }
    }
  }

  deleteRoleRequest(role: Role) {
    this.dialogService.confirm(
      'Delete this role?',
      'Are you sure that you want to delete this role?'
    ).subscribe((result) => {
      if (result['confirm']) {
        this.roleDataService.delete(role.id);
      }
    });
  }

  criteriaChanged() {
    if (this.selectedTeamId && this.roleList && this.roleList.length > 0) {
      this.dataSource.data = this.roleList.filter(r => r.teamId === this.selectedTeamId);
    } else {
      this.dataSource.data = this.roleList;
    }
  }

  sortChanged(sort: Sort) {
    this.sortChange.emit(sort);
  }

  getTeamName(teamId: string) {
    let teamName = '';
    if (teamId) {
      const team = this.teamList.find(t => t.id === teamId);
      if (team) {
        teamName = team.name;
      }
    }
    return teamName;
  }

  paginatorEvent(page: PageEvent) {
    this.pageChange.emit(page);
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
