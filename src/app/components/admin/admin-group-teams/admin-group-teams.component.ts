// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import {
  Component,
  OnDestroy,
  OnInit,
  Input,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortable } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Team, Group } from 'src/app/generated/cite.api';
import { GroupTeamDataService } from 'src/app/data/team/group-team-data.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
@Component({
  selector: 'app-admin-group-teams',
  templateUrl: './admin-group-teams.component.html',
  styleUrls: ['./admin-group-teams.component.scss'],
})
export class AdminGroupTeamsComponent implements OnDestroy, OnInit {
  @Input() groupId: string;
  @Input() teamList: Team[];
  teams: Team[];
  groupTeams: Team[];

  displayedTeamColumns: string[] = ['name', 'id'];
  displayedGroupColumns: string[] = ['name', 'team'];
  teamDataSource = new MatTableDataSource<Team>(new Array<Team>());
  groupTeamDataSource = new MatTableDataSource<Team>(new Array<Team>());
  filterString = '';
  defaultPageSize = 100;
  pageEvent: PageEvent;
  private unsubscribe$ = new Subject();

  @ViewChild('teamsInput') teamsInput: ElementRef<HTMLInputElement>;
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  constructor(
    private groupTeamDataService: GroupTeamDataService
  ) {}

  ngOnInit() {
    this.sort.sort(<MatSortable>{ id: 'name', start: 'asc' });
    this.teamDataSource.sort = this.sort;
    this.pageEvent = new PageEvent();
    this.pageEvent.pageIndex = 0;
    this.pageEvent.pageSize = this.defaultPageSize;
    this.groupTeamDataService.groupTeams.pipe(takeUntil(this.unsubscribe$)).subscribe(tTeams => {
      this.setDataSources(tTeams);
    });
    this.groupTeamDataService.getGroupTeamsFromApi(this.groupId);
  }

  applyFilter(filterValue: string) {
    this.filterString = filterValue;
    this.pageEvent.pageIndex = 0;
    filterValue = filterValue.toLowerCase(); // MatTableDataSource defaults to lowercase matches
    this.teamDataSource.filter = filterValue;
  }

  clearFilter() {
    this.applyFilter('');
  }

  setDataSources(tTeams: Team[]) {
    // Now that all of the observables are returned, process accordingly.
    this.groupTeamDataSource.data = !tTeams ? new Array<Team>() : tTeams.sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      } else if (a.name > b.name) {
          return 1;
      } else {
          return 0;
      }
    });
    const newAllTeams = !this.teamList ? new Array<Team>() : this.teamList.slice(0);
    this.groupTeamDataSource.data.forEach((tu) => {
      const index = newAllTeams.findIndex((u) => u.id === tu.id);
      newAllTeams.splice(index, 1);
    });
    this.teamDataSource = new MatTableDataSource(newAllTeams);
    this.teamDataSource.sort = this.sort;
    this.teamDataSource.paginator = this.paginator;
  }


  addTeamToGroup(team: Team): void {
    const index = this.groupTeamDataSource.data.findIndex(
      (tu) => tu.id === team.id
    );
    if (index === -1) {
      this.groupTeamDataService.addTeamToGroup(this.groupId, team);
    }
  }

  /**
   * Removes a team from the current group
   * @param team The team to remove from group
   */
  removeTeamFromGroup(team: Team): void {
    const index = this.groupTeamDataSource.data.findIndex(
      (tu) => tu.id === team.id
    );
    if (index !== -1) {
      this.groupTeamDataService.removeGroupTeam(this.groupId, team.id);
    }
  }

  compare(a: string, b: string, isAsc: boolean) {
    if (a === null || b === null) {
      return 0;
    } else {
      return (a.toLowerCase() < b.toLowerCase() ? -1 : 1) * (isAsc ? 1 : -1);
    }
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
