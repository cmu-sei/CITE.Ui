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

// An unhandled promise rejection as Angular's zone hands it to the ErrorHandler:
// an Error whose message starts 'Uncaught (in promise)', carrying the reason.
function rejection(reason: unknown, text = String(reason)) {
  return Object.assign(new Error(`Uncaught (in promise): ${text}`), {
    rejection: reason,
  });
}

describe('ErrorService', () => {
  let warnings: unknown[][];

  beforeEach(() => {
    // The service writes one console.warn line per error it shows; record them.
    warnings = [];
    vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
      warnings.push(args);
    });
  });

  /**
   * Verifies: an HTTP status-0 failure is reported as the API being unreachable, with one console line.
   * Interacts with: SystemMessageService.displayMessage stub, console.warn spy.
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
    expect(displayMessage.mock.calls).toEqual([
      ['API Error', 'The API could not be reached.'],
    ]);
    expect(warnings).toEqual([['API Error: The API could not be reached.']]);
  });

  /**
   * Verifies: an HTTP error with a ProblemDetails body shows its title under the status text, with one console line.
   * Interacts with: SystemMessageService.displayMessage stub, console.warn spy.
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
    expect(displayMessage.mock.calls).toEqual([
      ['Forbidden', 'You do not have permission to score this team.'],
    ]);
    expect(warnings).toEqual([
      ['Forbidden: You do not have permission to score this team.'],
    ]);
  });

  /**
   * Verifies: an HTTP error without a body title falls back to the response message, with one console line.
   * Interacts with: SystemMessageService.displayMessage stub, console.warn spy.
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
    expect(displayMessage.mock.calls).toEqual([['Server Error', err.message]]);
    expect(warnings).toEqual([[`Server Error: ${err.message}`]]);
  });

  /**
   * Verifies: unhandled rejections are triaged: 401 silent, network errors as identity-server errors,
   * SignalR fetch failures only warned, anything else shown as-is (a reason that is not an Error as its text).
   * Interacts with: SystemMessageService.displayMessage stub, console.warn spy.
   * Data: per row, one rejection reason, the messages it shows and the console.warn lines it writes.
   */
  it.each<{
    kind: string;
    reason: unknown;
    shown: string[][];
    warned: string[][];
  }>([
    {
      kind: 'a 401',
      reason: { statusCode: 401, message: 'Unauthorized' },
      shown: [],
      warned: [],
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
      warned: [
        [
          'Identity Server Error: The Identity Server could not be reached for user authentication.',
        ],
      ],
    },
    {
      kind: 'a SignalR fetch failure',
      reason: { message: 'TypeError: Failed to fetch' },
      shown: [],
      warned: [['TypeError: Failed to fetch']],
    },
    {
      kind: 'any other rejection',
      reason: { message: 'Something odd' },
      shown: [['Error', 'Something odd']],
      warned: [['Error: Something odd']],
    },
    {
      kind: 'a rejection that is not an Error',
      reason: 'token expired',
      shown: [['Error', 'token expired']],
      warned: [['Error: token expired']],
    },
    {
      kind: 'a rejection with no reason',
      reason: undefined,
      shown: [['Error', 'undefined']],
      warned: [['Error: undefined']],
    },
  ])('handles $kind', ({ reason, shown, warned }) => {
    const { service, displayMessage } = setup();
    service.handleError(rejection(reason));
    expect(displayMessage.mock.calls).toEqual(shown);
    expect(warnings).toEqual(warned);
  });

  /**
   * Verifies: an ordinary runtime error is logged with console.error, keeping the error itself, and not shown.
   * Interacts with: SystemMessageService.displayMessage stub, console.error and console.warn spies.
   * Data: a plain TypeError from component code.
   */
  it('logs errors that are neither HTTP errors nor rejections without showing them', () => {
    const errorLog = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const { service, displayMessage } = setup();
    const err = new TypeError(
      "Cannot read properties of undefined (reading 'id')",
    );
    service.handleError(err);
    expect(errorLog.mock.calls).toEqual([[err]]);
    expect(displayMessage).not.toHaveBeenCalled();
    expect(warnings).toEqual([]);
  });

  /**
   * Verifies: a thrown value that is not an Error is logged with console.error, not shown, and the handler does not throw.
   * Interacts with: SystemMessageService.displayMessage stub, console.error and console.warn spies.
   * Data: per row, a thrown value with no message property.
   */
  it.each([
    { kind: 'a string', value: 'boom' },
    { kind: 'null', value: null },
    { kind: 'an object without a message', value: { code: 42 } },
  ])('logs a thrown $kind without showing it', ({ value }) => {
    const errorLog = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const { service, displayMessage } = setup();
    expect(() => service.handleError(value)).not.toThrow();
    expect(errorLog.mock.calls).toEqual([[value]]);
    expect(displayMessage).not.toHaveBeenCalled();
    expect(warnings).toEqual([]);
  });
});
