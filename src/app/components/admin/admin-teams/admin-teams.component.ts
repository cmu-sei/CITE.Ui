// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { Team, TeamType, User } from 'src/app/generated/cite.api/model/models';
import { TeamDataService } from 'src/app/data/team/team-data.service';
import { TeamQuery } from 'src/app/data/team/team.query';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { AdminTeamEditDialogComponent } from 'src/app/components/admin/admin-team-edit-dialog/admin-team-edit-dialog.component';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { TeamTypeQuery } from 'src/app/data/teamtype/team-type.query';

@Component({
  selector: 'app-admin-teams',
  templateUrl: './admin-teams.component.html',
  styleUrls: ['./admin-teams.component.scss'],
})
export class AdminTeamsComponent implements OnInit, OnDestroy {
  @Input() evaluationId: string;
  @Input() noChanges: boolean;
  filterControl = new UntypedFormControl();
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
  filteredTeamList: Team[];
  teamTypeList: TeamType[] = [];
  userList: User[] = [];
  sort: Sort = {active: 'shortName', direction: 'asc'};
  sortedTeams: Team[] = [];
  private unsubscribe$ = new Subject();

  constructor(
    private settingsService: ComnSettingsService,
    private dialog: MatDialog,
    public dialogService: DialogService,
    private teamDataService: TeamDataService,
    private teamQuery: TeamQuery,
    private teamTypeQuery: TeamTypeQuery,
    private userDataService: UserDataService
  ) {
    // subscribe to TeamTypes
    this.teamTypeQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(teamTypes => {
      this.teamTypeList = teamTypes.sort((a: TeamType, b: TeamType) => {
        return ( (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1) );
      });
    });
    this.teamQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(teams => {
      this.teamList = teams ? teams : [];
      this.sortedTeams = this.getSortedTeams(this.getFilteredTeams(this.teamList));
    });
    this.topbarColor = this.settingsService.settings.AppTopBarHexColor
      ? this.settingsService.settings.AppTopBarHexColor
      : this.topbarColor;
    this.userDataService.userList.pipe(takeUntil(this.unsubscribe$)).subscribe(users => {
      this.userList = users;
    });
    this.filterControl.valueChanges
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((term) => {
        this.filterString = term;
        this.sortedTeams = this.getSortedTeams(this.getFilteredTeams(this.teamList));
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
    this.sort = sort && sort.direction ? sort : {active: 'shortName', direction: 'asc'};
    this.sortedTeams = this.getSortedTeams(this.getFilteredTeams(this.teamList));
  }

  getFilteredTeams(teams: Team[]): Team[] {
    let filteredTeams: Team[] = [];
    if (teams) {
      teams.forEach(t => {
        if (t.evaluationId === this.evaluationId) {
          filteredTeams.push({... t});
        } else {
        }
      });
      if (filteredTeams && filteredTeams.length > 0 && this.filterString) {
        const filterString = this.filterString.toLowerCase();
        filteredTeams = filteredTeams
          .filter((a) =>
            a.shortName.toLowerCase().includes(filterString) ||
            a.name.toLowerCase().includes(filterString) ||
            this.getTeamTypeName(a.teamTypeId).toLowerCase().includes(filterString)
          );
      }
    }
    return filteredTeams;
  }

  getSortedTeams(teams: Team[]) {
    if (teams) {
      teams.sort((a, b) => this.sortTeams(a, b, this.sort.active, this.sort.direction));
    }
    return teams;
  }

  private sortTeams(
    a: Team,
    b: Team,
    column: string,
    direction: string
  ) {
    const isAsc = direction !== 'desc';
    switch (column) {
      case 'teamTypeId':
        const aVal = this.getTeamTypeName(a.teamTypeId);
        const bVal = this.getTeamTypeName(b.teamTypeId);
        if (aVal === bVal) {
          return ( (a.shortName.toLowerCase() < b.shortName.toLowerCase() ? -1 : 1) * (isAsc ? 1 : -1) );
        }
        return ( (aVal < bVal ? -1 : 1) * (isAsc ? 1 : -1) );
        break;
      case 'name':
        if (a.name.toLowerCase() === b.name.toLowerCase()) {
          return ( (a.shortName.toLowerCase() < b.shortName.toLowerCase() ? -1 : 1) * (isAsc ? 1 : -1) );
        }
        return ( (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1) * (isAsc ? 1 : -1) );
        break;
      default:
        return ( (a.shortName.toLowerCase() < b.shortName.toLowerCase() ? -1 : 1) * (isAsc ? 1 : -1) );
        break;
    }
  }

  getTeamTypeName(teamTypeId: string) {
    const teamType = this.teamTypeList.find(tt => tt.id === teamTypeId);
    return teamType ? teamType.name : ' ';
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
