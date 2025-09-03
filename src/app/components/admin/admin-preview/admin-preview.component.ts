// Copyright 2025 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import {
  ScoringModel,
  ScoringCategory,
} from 'src/app/generated/cite.api/model/models';
import { Title } from '@angular/platform-browser';
import { ScoringModelDataService } from 'src/app/data/scoring-model/scoring-model-data.service';
import { ScoringModelQuery } from 'src/app/data/scoring-model/scoring-model.query';
import { takeUntil } from 'rxjs';

@Component({
  selector: 'app-admin-preview',
  templateUrl: './admin-preview.component.html',
  styleUrl: './admin-preview.component.scss',
  standalone: false
})
export class AdminPreviewComponent implements OnDestroy, OnInit {
  @Input() scoringModelId: string;
  @Output() closeMe = new EventEmitter<boolean>();
  scoringModel: ScoringModel;
  moveNumberList: number[] = [];
  loggedInUserId = '';
  loggedInUserName = '';
  displayedScoringCategories: ScoringCategory[] = [];
  isLoading = false;
  buttonClass = 'mat-user';
  private unsubscribe$ = new Subject();

  constructor(
    public matDialog: MatDialog,
    private titleService: Title,
    private scoringModelDataService: ScoringModelDataService,
    private scoringModelQuery: ScoringModelQuery
  ) {
    this.titleService.setTitle('CITE Preview');
    this.scoringModelQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(smList => {
      this.scoringModel = smList.find(m => m.id === this.scoringModelId);
      if (this.scoringModel && this.scoringModel.scoringCategories.length > 0) {
        let maxValues = this.scoringModel.scoringCategories.map(m => m.moveNumberLastDisplay);
        let maxMoveNumber = maxValues.length > 0 ? Math.max(...maxValues) : 0;
        this.moveNumberList = !this.scoringModel.displayScoringModelByMoveNumber ? [0] : Array.from({ length: maxMoveNumber + 1 }, (_, i) => i);
      }
    });
  }

  ngOnInit() {
    this.scoringModelDataService.loadById(this.scoringModelId);
  }

  getDisplayedScoringCategories(moveNumber: number): ScoringCategory[] {
    const displayedScoringCategories: ScoringCategory[] = [];
    this.scoringModel.scoringCategories.forEach((scoringCategory) => {
      let hideIt = false;
      if (
        this.scoringModel.displayScoringModelByMoveNumber &&
        (+moveNumber < +scoringCategory.moveNumberFirstDisplay ||
          +moveNumber > +scoringCategory.moveNumberLastDisplay)
      ) {
        hideIt = true;
      }
      if (!hideIt) {
        displayedScoringCategories.push(scoringCategory);
      }
    });
    return displayedScoringCategories;
  }

  printpage() {
    var printContents = document.getElementById('printable-area').innerHTML;
    document.body.innerHTML = printContents;
    window.print();
    location.reload();
  }

  closePreview() {
    this.closeMe.emit(true);
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
