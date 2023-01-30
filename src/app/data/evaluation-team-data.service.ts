// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.
import { Injectable, OnDestroy } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ComnAuthQuery, ComnAuthService } from '@cmusei/crucible-common';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { filter, map, take, takeUntil } from 'rxjs/operators';
import { EvaluationTeamService } from 'src/app/generated/cite.api/api/api';
import { EvaluationTeam, Team } from 'src/app/generated/cite.api/model/models';

@Injectable({
  providedIn: 'root',
})
export class EvaluationTeamDataService implements OnDestroy {
  private _evaluationTeams: EvaluationTeam[] = [];
  readonly evaluationTeams = new BehaviorSubject<EvaluationTeam[]>(this._evaluationTeams);
  readonly filterControl = new UntypedFormControl();
  private filterTerm: Observable<string>;
  private sortColumn: Observable<string>;
  private sortIsAscending: Observable<boolean>;
  private pageSize: Observable<number>;
  private pageIndex: Observable<number>;
  unsubscribe$: Subject<null> = new Subject<null>();

  constructor(
    private evaluationTeamService: EvaluationTeamService,
    private authQuery: ComnAuthQuery,
    private authService: ComnAuthService,
    private router: Router,
    activatedRoute: ActivatedRoute
  ) {}

  private updateEvaluationTeams(evaluationTeams: EvaluationTeam[]) {
    this._evaluationTeams = Object.assign([], evaluationTeams);
    this.evaluationTeams.next(this._evaluationTeams);
  }

  getEvaluationTeamsFromApi() {
    return this.evaluationTeamService
      .getEvaluationTeams()
      .pipe(take(1))
      .subscribe(
        (teams) => {
          this.updateEvaluationTeams(teams);
        },
        (error) => {
          this.updateEvaluationTeams([]);
        }
      );
  }

  addTeamToEvaluation(evaluationId: string, team: Team) {
    this.evaluationTeamService.createEvaluationTeam({evaluationId: evaluationId, teamId: team.id}).subscribe(
      (et) => {
        this._evaluationTeams.unshift(et);
        this.updateEvaluationTeams(this._evaluationTeams);
      }
    );
  }

  removeEvaluationTeam(evaluationId: string, teamId: string) {
    this.evaluationTeamService.deleteEvaluationTeamByIds(evaluationId, teamId).subscribe(
      (response) => {
        this._evaluationTeams = this._evaluationTeams.filter((u) => u.teamId !== teamId);
        this.updateEvaluationTeams(this._evaluationTeams);
      }
    );
  }

  updateStore(evaluationTeam: EvaluationTeam) {
    const updatedEvaluationTeams = this._evaluationTeams.filter(tu => tu.id !== evaluationTeam.id);
    updatedEvaluationTeams.unshift(evaluationTeam);
    this.updateEvaluationTeams(updatedEvaluationTeams);
  }

  deleteFromStore(id: string) {
    const updatedEvaluationTeams = this._evaluationTeams.filter(tu => tu.id !== id);
    this.updateEvaluationTeams(updatedEvaluationTeams);
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
