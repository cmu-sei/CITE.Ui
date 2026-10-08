// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { EventEmitter } from '@angular/core';
import { Mock, vi } from 'vitest';
import { EMPTY, Observable, of } from 'rxjs';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';

/**
 * cite.ui-specific fake of `MatDialog.open` for the admin pages. They open an
 * edit dialog, subscribe to its `editComplete` output through
 * `dialogRef.componentInstance`, and close the ref themselves; the name
 * dialogs set `componentInstance.title`/`message` and read `afterClosed()`.
 * The shared `dialogRefStub()` has no `componentInstance`, so this stub
 * carries one with a real `editComplete` emitter.
 *
 * `complete(result)` plays the dialog's Save/Cancel (`editComplete.emit`).
 * `config()` returns the `MatDialogConfig` of the last `open` call, so a spec
 * can assert the `data` (for example the `canEdit` flag) the page handed over.
 */
export function matDialogStub<R = unknown>(afterClosedResult?: R) {
  const editComplete = new EventEmitter<unknown>();
  const close = vi.fn();
  const componentInstance: Record<string, unknown> & {
    editComplete: EventEmitter<unknown>;
  } = { editComplete };
  const afterClosed = (): Observable<R | undefined> =>
    afterClosedResult === undefined ? EMPTY : of(afterClosedResult);
  const open: Mock<(component: unknown, config?: MatDialogConfig) => unknown> =
    vi.fn(() => ({ componentInstance, close, afterClosed }));
  return {
    // MatDialog.open is generic and overloaded; the fake returns a plain
    // object with the members the pages touch, so it is cast once here.
    dialog: { open } as unknown as Pick<MatDialog, 'open'>,
    open,
    close,
    componentInstance,
    complete: (result: unknown) => editComplete.emit(result),
    config: () => open.mock.lastCall?.[1],
  };
}
