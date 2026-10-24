// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Injectable, OnDestroy, inject } from '@angular/core';
import { ComnAuthService, ComnSettingsService } from '@cmusei/crucible-common';
import * as signalR from '@microsoft/signalr';
import { UnreadArticles } from 'src/app/data/unread-articles/unread-articles';
import { UnreadArticlesDataService } from 'src/app/data/unread-articles/unread-articles-data.service';
import { SystemMessageService } from 'src/app/services/system-message/system-message.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class GallerySignalRService implements OnDestroy {
  private authService = inject(ComnAuthService);
  private systemMessageService = inject(SystemMessageService);
  private settingsService = inject(ComnSettingsService);
  private unreadArticlesDataService = inject(UnreadArticlesDataService);

  private hubConnection: signalR.HubConnection;
  private connectionPromise: Promise<void>;
  private isJoined = false;
  private token = '';
  private unreachableReported = false;
  private unsubscribe$ = new Subject();

  constructor() {
    this.authService.user$.pipe(takeUntil(this.unsubscribe$)).subscribe(() => {
      this.reconnect();
    });
  }

  public startConnection(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    const accessToken = this.authService.getAuthorizationToken();
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.getHubUrlWithAuth())
      .withStatefulReconnect()
      .withAutomaticReconnect(new RetryPolicy(60, 0, 5))
      .build();

    this.hubConnection.onreconnected(() => {
      this.onConnected();
    });

    this.addHandlers();
    this.connectionPromise = this.hubConnection.start();
    this.connectionPromise
      .then(() => this.onConnected())
      .catch((err) => this.onStartFailed(err));

    return this.connectionPromise;
  }

  private getHubUrlWithAuth(): string {
    const accessToken = this.authService.getAuthorizationToken();
    if (accessToken !== this.token) {
      this.token = accessToken;
    }
    const hubUrl = `${this.settingsService.settings.GalleryApiUrl}/hubs/cite?bearer=${accessToken}`;
    return hubUrl;
  }

  private reconnect() {
    if (this.hubConnection != null) {
      this.hubConnection.stop().then(() => {
        this.hubConnection.baseUrl = this.getHubUrlWithAuth();
        this.connectionPromise = this.hubConnection.start();
        this.connectionPromise.then(() => {
          if (this.hubConnection.state !== signalR.HubConnectionState.Connected) {
            setTimeout(() => this.reconnect(), 500);
          } else {
            this.onConnected();
          }
        }).catch((err) => this.onStartFailed(err));
      });
    }
  }

  private onConnected() {
    this.unreachableReported = false;
    this.join();
  }

  // report once per outage, not on every retry
  private onStartFailed(err: any) {
    if (this.unreachableReported) {
      return;
    }
    this.unreachableReported = true;
    console.warn('Gallery hub unreachable: ' + (err?.message ?? err));
    this.systemMessageService.displayMessage(
      'Gallery Unavailable',
      'CITE could not connect to Gallery. The unread Gallery item count will not update until the connection is restored. Refresh the page to try again.'
    );
  }

  public join() {
    if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('Join');
    }
    this.isJoined = true;
  }

  public leave() {
    if (this.isJoined) {
      this.hubConnection.invoke('Leave');
    }
    this.isJoined = false;
  }

  private addHandlers() {
    this.hubConnection.on(
      'UnreadCountUpdated', (unreadArticles: UnreadArticles) => {
        this.unreadArticlesDataService.updateStore(unreadArticles);
      }
    );
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}

class RetryPolicy {
  constructor(
    private maxSeconds: number,
    private minJitterSeconds: number,
    private maxJitterSeconds: number
  ) {}

  nextRetryDelayInMilliseconds(
    retryContext: signalR.RetryContext
  ): number | null {
    let nextRetrySeconds = Math.pow(2, retryContext.previousRetryCount + 1);

    if (nextRetrySeconds > this.maxSeconds) {
      nextRetrySeconds = this.maxSeconds;
    }

    nextRetrySeconds +=
      Math.floor(
        Math.random() * (this.maxJitterSeconds - this.minJitterSeconds + 1)
      ) + this.minJitterSeconds; // Add Jitter

    return nextRetrySeconds * 1000;
  }
}
