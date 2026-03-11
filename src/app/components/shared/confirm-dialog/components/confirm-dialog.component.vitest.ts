// Copyright 2024 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { renderComponent } from 'src/app/test-utils/render-component';

async function renderConfirmDialog(overrides: {
  title?: string;
  message?: string;
  buttonTrueText?: string;
  buttonFalseText?: string;
  data?: any;
} = {}) {
  const {
    title = 'Confirm Action',
    message = 'Are you sure?',
    buttonTrueText,
    buttonFalseText,
    data = {},
  } = overrides;

  const dialogData = {
    buttonTrueText,
    buttonFalseText,
    ...data,
  };

  const closeFn = vi.fn();

  const result = await renderComponent(ConfirmDialogComponent, {
    declarations: [ConfirmDialogComponent],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: dialogData },
      { provide: MatDialogRef, useValue: { close: closeFn, disableClose: false } },
    ],
    componentProperties: {
      title,
      message,
    },
  });

  return { ...result, closeFn };
}

describe('ConfirmDialogComponent', () => {
  it('should create', async () => {
    const { fixture } = await renderConfirmDialog();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display the title', async () => {
    await renderConfirmDialog({ title: 'Delete Item?' });
    expect(screen.getByText('Delete Item?')).toBeInTheDocument();
  });

  it('should display the message', async () => {
    await renderConfirmDialog({ message: 'This action cannot be undone.' });
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('should use default button text when not provided', async () => {
    await renderConfirmDialog();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('should use custom button text when provided', async () => {
    await renderConfirmDialog({
      buttonTrueText: 'Delete',
      buttonFalseText: 'Keep',
    });
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Keep')).toBeInTheDocument();
  });

  it('should close dialog with confirm true when Yes clicked', async () => {
    const { closeFn } = await renderConfirmDialog();
    const user = userEvent.setup();
    await user.click(screen.getByText('Yes'));
    expect(closeFn).toHaveBeenCalled();
    const closeArg = closeFn.mock.calls[0][0];
    expect(closeArg.confirm).toBe(true);
    expect(closeArg.wasCancelled).toBe(false);
  });

  it('should close dialog with wasCancelled true when No clicked', async () => {
    const { closeFn } = await renderConfirmDialog();
    const user = userEvent.setup();
    await user.click(screen.getByText('No'));
    expect(closeFn).toHaveBeenCalled();
    const closeArg = closeFn.mock.calls[0][0];
    expect(closeArg.wasCancelled).toBe(true);
  });
});
