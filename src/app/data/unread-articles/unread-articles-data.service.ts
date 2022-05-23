// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { UnreadArticlesStore } from './unread-articles.store';
import { UnreadArticlesQuery } from './unread-articles.query';
import { Injectable } from '@angular/core';
import { FormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { Router, ActivatedRoute } from '@angular/router';
import { UnreadArticles } from './unread-articles';
import { GalleryService } from 'src/app/generated/cite.api'
import { map, take, tap } from 'rxjs/operators';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';

@Injectable({
  providedIn: 'root',
})
export class UnreadArticlesDataService {
  readonly unreadArticlesList: Observable<UnreadArticles[]>;

  constructor(
    private unreadArticlesStore: UnreadArticlesStore,
    private unreadArticlesQuery: UnreadArticlesQuery,
    private galleryService: GalleryService,
    private evaluationQuery: EvaluationQuery,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  loadById(evaluationId: string) {
    this.unreadArticlesStore.setLoading(true);
    return this.galleryService
      .getEvaluationUnreadArticleCount(evaluationId)
      .pipe(
        tap(() => {
          this.unreadArticlesStore.setLoading(false);
        }),
        take(1)
      )
      .subscribe((ua) => {
        const unreadArticles = { ...ua} as UnreadArticles;
        unreadArticles.id = evaluationId;
        this.unreadArticlesStore.upsert(evaluationId, unreadArticles);
        this.setActive(evaluationId);
      });
  }

  setActive(id: string) {
    this.unreadArticlesStore.setActive(id);
  }

  updateStore(unreadArticles: UnreadArticles) {
    const evaluationList = this.evaluationQuery.getAll().filter(e => e.galleryExhibitId === unreadArticles.exhibitId);
    evaluationList.forEach(e => {
      const updatedUnreadArticles = { ...unreadArticles };
      updatedUnreadArticles.id = e.id;
      this.unreadArticlesStore.upsert(e.id, updatedUnreadArticles);
    });
  }

  deleteFromStore(id: string) {
    this.unreadArticlesStore.remove(id);
  }
}
