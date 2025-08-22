// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { Injectable, Injector, ErrorHandler } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { SystemMessageService } from '../system-message/system-message.service';

@Injectable({
  providedIn: 'root',
})
export class ErrorService implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(err: any) {
    const messageService = this.injector.get(SystemMessageService);
    // Http failure response for (unknown url): 0 Unknown Error
    if (err instanceof HttpErrorResponse) {
      if (
        err.message.startsWith('Http failure response for') &&
        err.message.endsWith('0 Unknown Error')
      ) {
        messageService.displayMessage(
          'API Error',
          'The API could not be reached.'
        );
        console.log('API Error', 'The API could not be reached.');
      } else if (err.error && err.error.title) {
        messageService.displayMessage(err.statusText, err.error.title);
        console.log(err.statusText + ' ==> ' + err.error.title);
      } else {
        messageService.displayMessage(err.statusText, err.message);
        console.log(err.statusText + ' ==> ' + err.message);
      }
    } else if (err.message.startsWith('Uncaught (in promise)')) {
      if (err.rejection.statusCode === 401) {
        // nothing to do here, the signalR reconnect handles the situation.
      } else if (err.rejection.message === 'Network Error') {
        messageService.displayMessage(
          'Identity Server Error',
          'The Identity Server could not be reached for user authentication.'
        );
        console.log(
          'Identity Server Error',
          'The Identity Server could not be reached for user authentication.'
        );
      } else if (err.rejection.message.endsWith('Failed to fetch')) {
        console.log('SignalR error reaching the Gallery API:  ' + err.rejection.message);
      } else {
        messageService.displayMessage('Error', err.rejection.message);
        console.log(err.rejection.message);
      }
    }
  }
}
