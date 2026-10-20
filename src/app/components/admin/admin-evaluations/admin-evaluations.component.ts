// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, ElementRef, Input, OnInit, OnDestroy, inject, viewChild } from '@angular/core';
import { UntypedFormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { Sort, MatSort, MatSortHeader } from '@angular/material/sort';
import {
  Evaluation,
  ItemStatus,
  Move,
  User,
} from 'src/app/generated/cite.api/model/models';
import { EvaluationDataService } from 'src/app/data/evaluation/evaluation-data.service';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';
import { ScoringModelDataService } from 'src/app/data/scoring-model/scoring-model-data.service';
import { ScoringModelQuery } from 'src/app/data/scoring-model/scoring-model.query';
import { ComnSettingsService, CrucibleDialogService } from '@cmusei/crucible-common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { AdminEvaluationEditDialogComponent } from '../admin-evaluation-edit-dialog/admin-evaluation-edit-dialog.component';
import { UserQuery } from 'src/app/data/user/user.query';
import { TeamMembershipDataService } from 'src/app/data/team/team-membership-data.service';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { MatIcon } from '@angular/material/icon';
import { DatePipe } from '@angular/common';
import { MatFormField, MatInput, MatSuffix, MatLabel } from '@angular/material/input';
import { MatIconButton } from '@angular/material/button';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/autocomplete';
import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { MatExpansionPanel, MatExpansionPanelHeader } from '@angular/material/expansion';
import { AdminMovesComponent } from '../admin-moves/admin-moves.component';
import { AdminTeamsComponent } from '../admin-teams/admin-teams.component';
import { AdminActionsComponent } from '../admin-actions/admin-actions.component';
import { AdminDutiesComponent } from '../admin-duties/admin-duties.component';
import { AdminEvaluationMembershipsComponent } from '../admin-evaluation-memberships/admin-evaluation-memberships/admin-evaluation-memberships.component';
import { MatCard } from '@angular/material/card';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-admin-evaluations',
    templateUrl: './admin-evaluations.component.html',
    styleUrls: ['./admin-evaluations.component.scss'],
    animations: [
        trigger('detailExpand', [
            state('collapsed', style({ height: '0px', minHeight: '0' })),
            state('expanded', style({ height: '*' })),
            transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
        ]),
    ],
    imports: [
    MatIcon,
    MatFormField,
    MatInput,
    FormsModule,
    ReactiveFormsModule,
    MatIconButton,
    MatSuffix,
    MatLabel,
    MatSelect,
    MatOption,
    MatPaginator,
    MatTable,
    MatSort,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    MatSortHeader,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    AdminMovesComponent,
    AdminTeamsComponent,
    AdminActionsComponent,
    AdminDutiesComponent,
    AdminEvaluationMembershipsComponent,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatCard,
    MatProgressSpinner,
    DatePipe
],
})

export class AdminEvaluationsComponent implements OnInit, OnDestroy {
  private settingsService = inject(ComnSettingsService);
  private evaluationDataService = inject(EvaluationDataService);
  private evaluationQuery = inject(EvaluationQuery);
  private permissionDataService = inject(PermissionDataService);
  private scoringModelDataService = inject(ScoringModelDataService);
  private scoringModelQuery = inject(ScoringModelQuery);
  private teamMembershipDataService = inject(TeamMembershipDataService);
  private userQuery = inject(UserQuery);
  private dialog = inject(MatDialog);
  dialogService = inject(CrucibleDialogService);

  @Input() evaluationList: Evaluation[];
  pageIndex: number = 0;
  pageSize: number = 10;
  filterControl = new UntypedFormControl();
  filterString = '';
  newEvaluation: Evaluation = { id: '', description: '' };
  isLoading = false;
  topbarColor = '#ef3a47';
  addingNewEvaluation = false;
  newEvaluationDescription = '';
  editEvaluation: Evaluation = {};
  displayedColumns = ['actions', 'description', 'currentMoveNumber', 'status', 'createdBy', 'dateCreated'];
  scoringModels = [];
  selectedScoringModelId = '';
  filteredEvaluationList: Evaluation[] = [];
  displayedEvaluations: Evaluation[] = [];
  itemStatuses = [
    ItemStatus.Pending,
    ItemStatus.Active,
    ItemStatus.Cancelled,
    ItemStatus.Complete,
    ItemStatus.Archived
  ];
  selectedStatuses = [ ItemStatus.Pending, ItemStatus.Active, ItemStatus.Complete ];
  private unsubscribe$ = new Subject();
  sort: Sort = {
    active: 'description',
    direction: 'asc'
  };
  userList: User[] = [];
  isBusy = false;
  uploadProgress = 0;
  canCreateEvaluations = this.permissionDataService.canCreateEvaluations();
  readonly jsonInput = viewChild<ElementRef<HTMLInputElement>>('jsonInput');

  constructor() {
      // observe the scoring models
    this.scoringModelQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(scoringModels => {
      this.scoringModels = scoringModels;
      this.selectedScoringModelId = '';
    });
    this.scoringModelDataService.load();
    // oberve the users
    this.userQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(users => {
      this.userList = users;
    });
    // subscribe to evaluations loading
    this.evaluationQuery.selectLoading().pipe(takeUntil(this.unsubscribe$)).subscribe((isLoading) => {
      this.isBusy = isLoading;
    });

    this.filterControl.valueChanges
      .pipe(
        takeUntil(this.unsubscribe$)
      )
      .subscribe((term) => {
        this.filterString = term.trim().toLowerCase();
        this.applyFilter();
      });
  }

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.evaluationQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(evaluations => {
      this.evaluationList = Array.from(evaluations);
      this.applyFilter();
    });
  }

  addOrEditEvaluation(evaluation: Evaluation) {
    if (!evaluation) {
      evaluation = {
        description: '',
        currentMoveNumber: 0,
        status: ItemStatus.Pending,
        scoringModelId: this.selectedScoringModelId,
        situationDescription: '',
        situationTime: new Date()
      };
    } else {
      evaluation = { ...evaluation };
    }
    const dialogRef = this.dialog.open(AdminEvaluationEditDialogComponent, {
      maxWidth: '90vw',
      width: 'auto',
      minWidth: '900px',
      data: {
        evaluation: evaluation,
        scoringModels: this.scoringModels.filter(sm => !sm.evaluationId || sm.evaluationId === evaluation.id),
        itemStatuses: this.itemStatuses,
        isExisting: !!evaluation.dateCreated,
        canEdit: this.permissionDataService.canEditEvaluation(evaluation.id)
      },
    });
    dialogRef.componentInstance.editComplete.subscribe((result) => {
      if (result.saveChanges && result.evaluation) {
        this.saveEvaluation(result.evaluation);
      }
      dialogRef.close();
    });
  }

  togglePanel(evaluation: Evaluation) {
    this.editEvaluation = this.editEvaluation.id === evaluation.id ? this.editEvaluation = {} : this.editEvaluation = { ...evaluation};
    this.evaluationDataService.setActive(this.editEvaluation.id);
    // if an evaluation has been selected, load the evaluation, so that we have its details
    if (this.editEvaluation.id) {
      this.evaluationDataService.loadById(this.editEvaluation.id);
      this.teamMembershipDataService.loadMemberships(this.editEvaluation.id);
    }
  }

  canManageEvaluation(id: string): boolean {
    return this.permissionDataService.canManageEvaluation(id);
  }

  canEdit(evaluation: Evaluation) {
    return (evaluation.status === ItemStatus.Pending || evaluation.status === ItemStatus.Active) && this.permissionDataService.canEditEvaluation(evaluation.id);
  }

  saveEvaluation(evaluation: Evaluation) {
    if (evaluation.id) {
      this.evaluationDataService.updateEvaluation(evaluation);
    } else {
      this.evaluationDataService.add(evaluation);
    }
  }

  getLowestMoveNumber(evaluation: Evaluation) {
    let lowestMoveNumber = evaluation && evaluation.moves && evaluation.moves.length > 0 ? Number.MAX_SAFE_INTEGER : 0;
    evaluation.moves.forEach(m => {
      if (m.moveNumber < lowestMoveNumber) {
        lowestMoveNumber = m.moveNumber;
      }
    });

    return lowestMoveNumber;
  }

  getHighestMoveNumber(evaluation: Evaluation) {
    let highestMoveNumber = evaluation && evaluation.moves && evaluation.moves.length > 0 ? Number.MIN_SAFE_INTEGER : 0;
    evaluation.moves.forEach(m => {
      if (m.moveNumber > highestMoveNumber) {
        highestMoveNumber = m.moveNumber;
      }
    });

    return highestMoveNumber;
  }

  incrementCurrentMoveNumber(evaluation: Evaluation) {
    let nextHighestMove = {moveNumber: Number.MAX_SAFE_INTEGER} as Move;
    evaluation.moves.forEach(m => {
      if (m.moveNumber > evaluation.currentMoveNumber && m.moveNumber < nextHighestMove.moveNumber) {
        nextHighestMove = m;
      }
    });
    if (+evaluation.currentMoveNumber !== +nextHighestMove.moveNumber) {
      const updateEvaluation = { ...evaluation };
      updateEvaluation.currentMoveNumber = nextHighestMove.moveNumber;
      this.evaluationDataService.changeCurrentMove(updateEvaluation);
    }
  }

  decrementCurrentMoveNumber(evaluation: Evaluation) {
    let nextLowestMove = {moveNumber: Number.MIN_SAFE_INTEGER} as Move;
    evaluation.moves.forEach(m => {
      if (m.moveNumber < evaluation.currentMoveNumber && m.moveNumber > nextLowestMove.moveNumber) {
        nextLowestMove = m;
      }
    });
    if (+evaluation.currentMoveNumber !== +nextLowestMove.moveNumber) {
      const updateEvaluation = { ...evaluation };
      updateEvaluation.currentMoveNumber = nextLowestMove.moveNumber;
      this.evaluationDataService.changeCurrentMove(updateEvaluation);
    }
  }

  deleteEvaluationRequest(evaluation: Evaluation) {
    this.dialogService
      .confirm({
        title: 'Delete this evaluation?',
        message: 'Are you sure that you want to delete ' + evaluation.description + '?',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.evaluationDataService.delete(evaluation.id);
        }
      });
  }

  applyFilter() {
    this.filteredEvaluationList = this.evaluationList.filter(evaluation =>
      (
        !this.filterString ||
        evaluation.description.toLowerCase().includes(this.filterString)
      ) &&
      this.selectedStatuses.some(status => status === evaluation.status)
    );
    this.sortList(this.sort);
  }

  clearFilter() {
    this.filterControl.setValue('');
  }

  sortList(sort: Sort) {
    this.sort = sort;
    this.filteredEvaluationList.sort((a, b) => this.sortEvaluations(a, b, sort.active, sort.direction));
    this.applyPagination();
  }

  private sortEvaluations(a: Evaluation, b: Evaluation, column: string, direction: string)
  {
    const isAsc = direction !== 'desc';
    switch (column) {
      case 'description':
        return (
          (a.description.toLowerCase() < b.description.toLowerCase() ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      case 'currentMoveNumber':
        return (
          (a.currentMoveNumber < b.currentMoveNumber ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      case 'createdBy':
        return (
          (a.createdBy.toLowerCase() < b.createdBy.toLowerCase() ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      case 'status':
        return (
          (a.status.toLowerCase() < b.status.toLowerCase() ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      case 'dateCreated':
        return (
          (a.dateCreated < b.dateCreated ? -1 : 1) *
          (isAsc ? 1 : -1)
        );
      default:
        return 0;
    }
  }

  getUserName(id: string) {
    const user = this.userList.find(u => u.id === id);
    return user ? user.name : '?';
  }

  copyEvaluation(id: string): void {
    this.evaluationDataService.copy(id);
  }

  downloadEvaluation(evaluation: Evaluation) {
    this.isBusy = true;
    this.evaluationDataService.downloadJson(evaluation.id).subscribe(
      (data) => {
        const url = window.URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.download = evaluation.description + '-evaluation.json';
        link.click();
        this.isBusy = false;
      },
      (err) => {
        this.isBusy = false;
        window.alert('Error downloading file');
      },
      () => {
        this.isBusy = false;
      }
    );
  }

  uploadFile(fileType: string, mselId: string, teamId: string) {
    this.isBusy = true;
  }

  /**
   * Selects the file(s) to be uploaded. Called when file selection is changed
   */
  selectFile(e) {
    const file = e.target.files[0];
    if (!file) {
      this.isBusy = false;
      return;
    }
    this.uploadProgress = 0;
    this.isBusy = true;
    this.evaluationDataService.uploadJson(file, 'events', true);
    this.jsonInput().nativeElement.value = null;
  }

  paginatorEvent(page: PageEvent) {
    this.pageIndex = page.pageIndex;
    this.pageSize = page.pageSize;
    this.applyPagination();
  }

  applyPagination() {
    const startIndex = this.pageIndex * this.pageSize;
    this.displayedEvaluations = this.filteredEvaluationList.slice(startIndex, startIndex + this.pageSize);
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
