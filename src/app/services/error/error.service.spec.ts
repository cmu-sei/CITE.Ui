// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorService } from './error.service';
import { SystemMessageService } from '../system-message/system-message.service';
import { getDefaultProviders } from '../../test-utils/default-test-providers';

function setup() {
  const displayMessage = vi.fn();
  const messages: Pick<SystemMessageService, 'displayMessage'> = {
    displayMessage,
  };
  TestBed.configureTestingModule({
    providers: getDefaultProviders([
      { provide: SystemMessageService, useValue: messages },
      ErrorService,
    ]),
  });
  return { service: TestBed.inject(ErrorService), displayMessage };
}

// An unhandled promise rejection as Angular's zone hands it to the ErrorHandler.
function rejection(rejection: { statusCode?: number; message: string }) {
  return Object.assign(
    new Error(`Uncaught (in promise): ${rejection.message}`),
    {
      rejection,
    },
  );
}

describe('ErrorService', () => {
  beforeEach(() => {
    // The service echoes every message to the console; keep test output clean.
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  /**
   * Verifies: an HTTP status-0 failure is reported as the API being unreachable.
   * Interacts with: SystemMessageService.displayMessage stub.
   * Data: HttpErrorResponse with status 0 for https://cite.test/api/evaluations.
   */
  it('reports an unreachable API', () => {
    const { service, displayMessage } = setup();
    service.handleError(
      new HttpErrorResponse({
        status: 0,
        statusText: 'Unknown Error',
        url: 'https://cite.test/api/evaluations',
      }),
    );
    expect(displayMessage).toHaveBeenCalledWith(
      'API Error',
      'The API could not be reached.',
    );
  });

  /**
   * Verifies: an HTTP error with a ProblemDetails body shows its title under the status text.
   * Interacts with: SystemMessageService.displayMessage stub.
   * Data: a 403 Forbidden whose body title explains the denial.
   */
  it('shows the ProblemDetails title for API errors', () => {
    const { service, displayMessage } = setup();
    service.handleError(
      new HttpErrorResponse({
        status: 403,
        statusText: 'Forbidden',
        error: { title: 'You do not have permission to score this team.' },
      }),
    );
    expect(displayMessage).toHaveBeenCalledWith(
      'Forbidden',
      'You do not have permission to score this team.',
    );
  });

  /**
   * Verifies: an HTTP error without a body title falls back to the response message.
   * Interacts with: SystemMessageService.displayMessage stub.
   * Data: a 500 with no body.
   */
  it('falls back to the HTTP message', () => {
    const { service, displayMessage } = setup();
    const err = new HttpErrorResponse({
      status: 500,
      statusText: 'Server Error',
      url: '/api/x',
    });
    service.handleError(err);
    expect(displayMessage).toHaveBeenCalledWith('Server Error', err.message);
  });

  /**
   * Verifies: unhandled rejections are triaged: 401 silent, network errors as identity-server errors,
   * Gallery fetch failures only logged, anything else shown as-is.
   * Interacts with: SystemMessageService.displayMessage stub, console.log spy.
   * Data: per row, one rejection shape and the message it shows (none for the silent ones).
   */
  it.each([
    {
      kind: 'a 401',
      reason: { statusCode: 401, message: 'Unauthorized' },
      shown: [],
    },
    {
      kind: 'a network error',
      reason: { message: 'Network Error' },
      shown: [
        [
          'Identity Server Error',
          'The Identity Server could not be reached for user authentication.',
        ],
      ],
    },
    {
      kind: 'a Gallery fetch failure',
      reason: { message: 'TypeError: Failed to fetch' },
      shown: [],
    },
    {
      kind: 'any other rejection',
      reason: { message: 'Something odd' },
      shown: [['Error', 'Something odd']],
    },
  ])('handles $kind', ({ reason, shown }) => {
    const { service, displayMessage } = setup();
    service.handleError(rejection(reason));
    expect(displayMessage.mock.calls).toEqual(shown);
  });

  /**
   * Verifies: an ordinary runtime error is neither displayed nor logged.
   * Interacts with: SystemMessageService.displayMessage stub, console.log and console.error spies.
   * Data: a plain TypeError from component code.
   */
  it('drops errors that are neither HTTP errors nor rejections', () => {
    const errorLog = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const { service, displayMessage } = setup();
    service.handleError(
      new TypeError("Cannot read properties of undefined (reading 'id')"),
    );
    expect(displayMessage).not.toHaveBeenCalled();
    expect(errorLog.mock.calls).toEqual([]);
    expect(vi.mocked(console.log)).not.toHaveBeenCalled();
  });

  /**
   * Verifies: a thrown non-Error value makes the handler itself throw.
   * Interacts with: ErrorService.handleError.
   * Data: the string 'boom'.
   */
  it('throws on a thrown value that is not an Error', () => {
    const { service } = setup();
    expect(() => service.handleError('boom')).toThrow(TypeError);
  });
});
