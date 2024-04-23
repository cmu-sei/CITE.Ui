// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { LegacyPageEvent as PageEvent } from '@angular/material/legacy-paginator';
import { Sort } from '@angular/material/sort';
import {
  TeamType,
} from 'src/app/generated/cite.api/model/models';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { MatLegacyPaginator as MatPaginator} from '@angular/material/legacy-paginator';
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
  pageIndex: number = 0;
  pageSize: number = 10;
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
  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(
    public dialogService: DialogService,
    private teamTypeDataService: TeamTypeDataService,
    private teamTypeQuery: TeamTypeQuery,
    private settingsService: ComnSettingsService
  ) {
    this.topbarColor = this.settingsService.settings.AppTopBarHexColor
      ? this.settingsService.settings.AppTopBarHexColor
      : this.topbarColor;
    // subscribe to TeamTypes
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
    this.filterControl.valueChanges.pipe(
      takeUntil(this.unsubscribe$)
    ).subscribe(newValue => {
      this.applyFilter(newValue);
  });
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
    this.filterString = filterValue.toLowerCase(); 
    this.updateFilteredData(); 
  }

  clearFilter() {
    this.filterString = '';
    this.filterControl.setValue('');
  }

  updateFilteredData() {
    this.filteredTeamTypeList = this.getFilteredTeamTypes(this.teamTypeList);
    this.sortedTeamTypeList = this.getSortedTeamTypes(this.filteredTeamTypeList);
    this.paginator.length = this.sortedTeamTypeList.length; 
    this.pageIndex = 0; 
    this.paginator.pageIndex = 0; 
    this.paginateTeamtypes();
  }


  sortChanged(sort: Sort) {
    this.sort = sort && sort.direction ? sort : {active: 'name', direction: 'asc'};
    this.sortedTeamTypeList = this.getSortedTeamTypes(this.getFilteredTeamTypes(this.teamTypeList));
  }

  getFilteredTeamTypes(teamTypes: TeamType[]): TeamType[] {
    if (!teamTypes) return [];

    return teamTypes.filter(t => t.name.toLowerCase().includes(this.filterString));
  }


  getSortedTeamTypes(teamTypes: TeamType[]) {
    if (teamTypes) {
      teamTypes.sort((a, b) => this.sortTeamTypes(a, b, this.sort.active, this.sort.direction));
    }
    return teamTypes;
  }

  private sortTeamTypes(
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


  paginatorEvent(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.paginateTeamtypes();
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
