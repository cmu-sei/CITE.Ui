// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { UnreadArticlesStore } from './unread-articles.store';
import { Injectable, inject } from '@angular/core';
import { UnreadArticles } from './unread-articles';
import { GalleryService } from 'src/app/generated/cite.api';
import { take, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { EvaluationQuery } from 'src/app/data/evaluation/evaluation.query';

@Injectable({
  providedIn: 'root',
})
export class UnreadArticlesDataService {
  private unreadArticlesStore = inject(UnreadArticlesStore);
  private galleryService = inject(GalleryService);
  private evaluationQuery = inject(EvaluationQuery);

  readonly unreadArticlesList: Observable<UnreadArticles[]>;

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
