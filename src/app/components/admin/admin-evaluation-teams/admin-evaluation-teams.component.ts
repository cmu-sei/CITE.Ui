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
import { LegacyPageEvent as PageEvent, MatLegacyPaginator as MatPaginator } from '@angular/material/legacy-paginator';
import { MatSort, MatSortable } from '@angular/material/sort';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { Team, Evaluation } from 'src/app/generated/cite.api';
import { EvaluationTeamDataService } from 'src/app/data/evaluation-team-data.service';
import { TeamDataService } from 'src/app/data/team/team-data.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-evaluation-teams',
  templateUrl: './admin-evaluation-teams.component.html',
  styleUrls: ['./admin-evaluation-teams.component.scss'],
})

export class AdminEvaluationTeamsComponent implements OnDestroy, OnInit {
  @Input() evaluationId: string;
  @Input() teamList: Team[];
  teams: Team[];
  evaluationTeams: Team[];

  displayedTeamColumns: string[] = ['name', 'id'];
  displayedEvaluationColumns: string[] = ['name', 'team'];
  teamDataSource = new MatTableDataSource<Team>(new Array<Team>());
  evaluationTeamDataSource = new MatTableDataSource<Team>(new Array<Team>());
  filterString = '';
  defaultPageSize = 100;
  pageEvent: PageEvent;
  private unsubscribe$ = new Subject();

  @ViewChild('teamsInput') teamsInput: ElementRef<HTMLInputElement>;
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  constructor(
    private evaluationTeamDataService: EvaluationTeamDataService,
    private teamDataService: TeamDataService
  ) {}

  ngOnInit() {
    this.sort.sort(<MatSortable>{ id: 'name', start: 'asc' });
    this.teamDataSource.sort = this.sort;
    this.pageEvent = new PageEvent();
    this.pageEvent.pageIndex = 0;
    this.pageEvent.pageSize = this.defaultPageSize;
    this.evaluationTeamDataService.evaluationTeams.pipe(takeUntil(this.unsubscribe$)).subscribe(evaluationTeams => {
      const teams: Team[] = [];
      evaluationTeams.filter(et => et.evaluationId === this.evaluationId).forEach(et => {
        teams.push(this.teamList.find(t => t.id === et.teamId));
      })
      this.setDataSources(teams);
    });
    this.evaluationTeamDataService.getEvaluationTeamsFromApi();
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

  setDataSources(evaluationTeams: Team[]) {
    // Now that all of the observables are returned, process accordingly.
    this.evaluationTeamDataSource.data = !evaluationTeams ? new Array<Team>() : evaluationTeams.sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      } else if (a.name > b.name) {
          return 1;
      } else {
          return 0;
      }
    });
    const newAllTeams = !this.teamList ? new Array<Team>() : this.teamList.slice(0);
    this.evaluationTeamDataSource.data.forEach((et) => {
      const index = newAllTeams.findIndex((u) => u.id === et.id);
      newAllTeams.splice(index, 1);
    });
    this.teamDataSource = new MatTableDataSource(newAllTeams);
    this.teamDataSource.sort = this.sort;
    this.teamDataSource.paginator = this.paginator;
  }


  addTeamToEvaluation(team: Team): void {
    const index = this.evaluationTeamDataSource.data.findIndex(
      (tu) => tu.id === team.id
    );
    if (index === -1) {
      this.evaluationTeamDataService.addTeamToEvaluation(this.evaluationId, team);
    }
  }

  /**
   * Removes a team from the current evaluation
   * @param team The team to remove from evaluation
   */
  removeTeamFromEvaluation(team: Team): void {
    const index = this.evaluationTeamDataSource.data.findIndex(
      (et) => et.id === team.id
    );
    if (index !== -1) {
      this.evaluationTeamDataService.removeEvaluationTeam(this.evaluationId, team.id);
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
