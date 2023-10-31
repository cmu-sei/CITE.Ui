// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { LegacyPageEvent as PageEvent } from '@angular/material/legacy-paginator';
import { Sort } from '@angular/material/sort';
import {
  TeamType,
} from 'src/app/generated/cite.api/model/models';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { TeamTypeDataService } from 'src/app/data/teamtype/team-type-data.service';
import { TeamTypeQuery } from 'src/app/data/teamtype/team-type.query';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-teamtypes',
  templateUrl: './admin-teamtypes.component.html',
  styleUrls: ['./admin-teamtypes.component.scss'],
})
export class AdminTeamTypesComponent implements OnInit, OnDestroy {
  @Input() pageSize: number;
  @Input() pageIndex: number;
  @Output() pageChange = new EventEmitter<PageEvent>();
  teamTypeList: TeamType[] = [];
  filteredTeamTypeList: TeamType[] = [];
  sortedTeamTypeList: TeamType[] = [];
  filterControl = this.teamTypeDataService.filterControl;
  filterString = '';
  sort: Sort = {active: 'name', direction: 'asc'};
  addingNewTeamType = false;
  newTeamType: TeamType = {};
  isLoading = false;
  topbarColor = '#ef3a47';
  private unsubscribe$ = new Subject<void>();

  constructor(
    public dialogService: DialogService,
    private teamTypeDataService: TeamTypeDataService,
    private teamTypeQuery: TeamTypeQuery,
    private settingsService: ComnSettingsService
  ) {
    this.topbarColor = this.settingsService.settings.AppTopBarHexColor
      ? this.settingsService.settings.AppTopBarHexColor
      : this.topbarColor;
    // load and subscribe to TeamTypes
    this.teamTypeDataService.load();
    this.teamTypeQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(teamTypes => {
      const newTeamTypes = new Array<TeamType>();
      teamTypes.forEach(tt => {
        newTeamTypes.push(Object.assign(tt));
      });
      this.teamTypeList = newTeamTypes;
      this.sortChanged(this.sort);
    });
  }

  ngOnInit() {
    this.filterControl.setValue('');
  }

  addTeamTypeRequest(isAdd: boolean) {
    if (isAdd) {
      if (this.newTeamType.id) {
        this.teamTypeDataService.updateTeamType(this.newTeamType);
      } else {
        this.teamTypeDataService.add(this.newTeamType);
      }
    }
    this.newTeamType = {};
    this.addingNewTeamType = false;
  }

  editTeamType(teamType: TeamType) {
    this.newTeamType = Object.assign(teamType);
    this.addingNewTeamType = true;
  }

  deleteTeamTypeRequest(teamType: TeamType) {
    this.dialogService
      .confirm(
        'Delete TeamType',
        'Are you sure that you want to delete ' + teamType.name + '?'
      )
      .subscribe((result) => {
        if (result['confirm']) {
          this.teamTypeDataService.delete(teamType.id);
        }
      });
  }

  applyFilter(filterValue: string) {
    this.filterControl.setValue(filterValue);
  }

  sortChanged(sort: Sort) {
    this.sort = sort && sort.direction ? sort : {active: 'name', direction: 'asc'};
    this.sortedTeamTypeList = this.getSortedTeamTypes(this.getFilteredTeamTypes(this.teamTypeList));
  }

  getFilteredTeamTypes(teamTypes: TeamType[]): TeamType[] {
    let filteredTeamTypes: TeamType[] = [];
    if (teamTypes) {
      teamTypes.forEach(t => {
        filteredTeamTypes.push({... t});
      });
      if (filteredTeamTypes && filteredTeamTypes.length > 0 && this.filterString) {
        const filterString = this.filterString.toLowerCase();
        filteredTeamTypes = filteredTeamTypes
          .filter((a) =>
            a.name.toLowerCase().includes(filterString)
          );
      }
    }
    return filteredTeamTypes;
  }

  getSortedTeamTypes(teamTypes: TeamType[]) {
    if (teamTypes) {
      teamTypes.sort((a, b) => this.sortTeams(a, b, this.sort.active, this.sort.direction));
    }
    return teamTypes;
  }

  private sortTeams(
    a: TeamType,
    b: TeamType,
    column: string,
    direction: string
  ) {
    const isAsc = direction !== 'desc';
    switch (column) {
      case 'showTeamTypeAverage':
        return ( (a.showTeamTypeAverage < b.showTeamTypeAverage ? -1 : 1) * (isAsc ? 1 : -1) );
        break;
      case 'isOfficialScoreContributor':
        return ( (a.isOfficialScoreContributor < b.isOfficialScoreContributor ? -1 : 1) * (isAsc ? 1 : -1) );
        break;
      default:
        return ( (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1) * (isAsc ? 1 : -1) );
        break;
    }
  }

  paginatorEvent(page: PageEvent) {
    this.pageChange.emit(page);
  }

  paginateTeamtypes() {
    const startIndex = this.pageIndex * this.pageSize;
    const copy = this.sortedTeamTypeList.slice();
    return copy.splice(startIndex, this.pageSize);
  }

  toggleIsOfficialScoreContributor(teamType: TeamType) {
    teamType.isOfficialScoreContributor = ! teamType.isOfficialScoreContributor;
    this.teamTypeDataService.updateTeamType(teamType);
  }

  toggleShowTeamTypeAverage(teamType: TeamType) {
    teamType.showTeamTypeAverage = ! teamType.showTeamTypeAverage;
    this.teamTypeDataService.updateTeamType(teamType);
  }

  updateTeamType(teamType: TeamType) {
    this.teamTypeDataService.updateTeamType(teamType);
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
