// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Injectable, Injector, ErrorHandler, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { SystemMessageService } from '../system-message/system-message.service';

@Injectable({
  providedIn: 'root',
})
export class ErrorService implements ErrorHandler {
  private injector = inject(Injector);


  handleError(err: any) {
    // Http failure response for (unknown url): 0 Unknown Error
    if (err instanceof HttpErrorResponse) {
      if (
        err.message.startsWith('Http failure response for') &&
        err.message.endsWith('0 Unknown Error')
      ) {
        this.report('API Error', 'The API could not be reached.');
      } else if (err.error && err.error.title) {
        this.report(err.statusText, err.error.title);
      } else {
        this.report(err.statusText, err.message);
      }
    } else if (err?.message?.startsWith('Uncaught (in promise)')) {
      const rejection = err.rejection;
      if (rejection?.statusCode === 401) {
        // nothing to do here, the signalR reconnect handles the situation.
      } else if (rejection?.message === 'Network Error') {
        this.report(
          'Identity Server Error',
          'The Identity Server could not be reached for user authentication.'
        );
      } else if (rejection?.message?.endsWith('Failed to fetch')) {
        // a SignalR hub start that its service didn't catch; it reports its own failures.
        console.warn(rejection.message);
      } else {
        this.report('Error', rejection?.message ?? String(rejection));
      }
    } else {
      // not an error we know how to explain to the user; keep the stack for debugging
      console.error(err);
    }
  }

  private report(title: string, message: string) {
    console.warn(title + ': ' + message);
    this.injector.get(SystemMessageService).displayMessage(title, message);
  }
}
