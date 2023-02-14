// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { LegacyPageEvent as PageEvent } from '@angular/material/legacy-paginator';
import { Sort } from '@angular/material/sort';
import { Team, TeamType, User } from 'src/app/generated/cite.api/model/models';
import { TeamDataService } from 'src/app/data/team/team-data.service';
import { TeamQuery } from 'src/app/data/team/team.query';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { AdminTeamEditDialogComponent } from 'src/app/components/admin/admin-team-edit-dialog/admin-team-edit-dialog.component';
import { DialogService } from 'src/app/services/dialog/dialog.service';

@Component({
  selector: 'app-admin-teams',
  templateUrl: './admin-teams.component.html',
  styleUrls: ['./admin-teams.component.scss'],
})
export class AdminTeamsComponent implements OnInit, OnDestroy {
  @Input() evaluationId: string;
  filterControl: UntypedFormControl = this.teamDataService.filterControl;
  filterString = '';
  newTeam: Team = { id: '', name: '' };
  isLoading = false;
  topbarColor = '#ef3a47';
  addingNewTeam = false;
  newTeamName = '';
  editTeam: Team = {};
  originalTeamName = '';
  originalTeamShortName = '';
  defaultScoringModelId = this.settingsService.settings.DefaultScoringModelId;
  teamList: Team[];
  teamTypeList: TeamType[] = [];
  userList: User[] = [];
  private unsubscribe$ = new Subject();

  constructor(
    private settingsService: ComnSettingsService,
    private dialog: MatDialog,
    public dialogService: DialogService,
    private teamDataService: TeamDataService,
    private teamQuery: TeamQuery,
    private userDataService: UserDataService
  ) {
    this.teamDataService.teamTypes.pipe(takeUntil(this.unsubscribe$)).subscribe(teamTypes => {
      this.teamTypeList = teamTypes ? teamTypes : [];
    });
    this.teamQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(teams => {
      this.teamList = teams ? teams : [];
    });
    this.teamDataService.loadTeamTypes();
    this.topbarColor = this.settingsService.settings.AppTopBarHexColor
      ? this.settingsService.settings.AppTopBarHexColor
      : this.topbarColor;
    this.userDataService.userList.pipe(takeUntil(this.unsubscribe$)).subscribe(users => {
      this.userList = users;
    });
  }

  ngOnInit() {
    this.filterControl.setValue(this.filterString);
    this.teamDataService.loadByEvaluationId(this.evaluationId);
  }

  addOrEditTeam(team: Team) {
    if (!team) {
      team = {
        name: '',
        shortName: '',
        teamTypeId: '',
        evaluationId: this.evaluationId
      };
    } else {
      team = {... team};
    }
    const dialogRef = this.dialog.open(AdminTeamEditDialogComponent, {
      width: '800px',
      data: {
        team: team,
        teamTypeList: this.teamTypeList,
        userList: this.userList
      },
    });
    dialogRef.componentInstance.editComplete.subscribe((result) => {
      if (result.saveChanges && result.team) {
        this.saveTeam(result.team);
      }
      dialogRef.close();
    });
  }

  togglePanel(team: Team) {
    this.editTeam = this.editTeam.id === team.id ? this.editTeam = {} : this.editTeam = { ...team};
  }

  selectTeam(team: Team) {
    this.editTeam = { ...team };
    this.originalTeamName = team.name;
    this.originalTeamShortName = team.shortName;
    return false;
  }

  saveTeam(team: Team) {
    if (team.id) {
      this.teamDataService.updateTeam(team);
    } else {
      this.teamDataService.add(team);
    }
  }

  deleteTeam(team: Team): void {
    this.dialogService
      .confirm(
        'Delete Team',
        'Are you sure that you want to delete ' + team.name + '?'
      )
      .subscribe((result) => {
        if (result['confirm']) {
          this.teamDataService.delete(team.id);
        }
      });
  }

  applyFilter(filterValue: string) {
    this.filterControl.setValue(filterValue);
  }

  sortChanged(sort: Sort) {
    // TODO: fix sort
    // this.sortChange.emit(sort);
  }

  getTeamTypeName(teamTypeId: string) {
    const teamType = this.teamTypeList.find(tt => tt.id === teamTypeId);
    return teamType ? teamType.name : ' ';
  }

  paginatorEvent(page: PageEvent) {
    // TODO: fix paging
    // this.pageChange.emit(page);
  }

  paginateTeams(teams: Team[], pageIndex: number, pageSize: number) {
    if (!teams) {
      return [];
    }
    const startIndex = pageIndex * pageSize;
    const copy = teams.slice();
    return copy.splice(startIndex, pageSize);
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
