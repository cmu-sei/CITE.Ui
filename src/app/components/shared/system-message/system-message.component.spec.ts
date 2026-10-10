// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import {
  MAT_BOTTOM_SHEET_DATA,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { bottomSheetRefStub } from '../../../test-utils/dialog-refs';
import { renderComponent } from '../../../test-utils/render-component';
import { SystemMessageComponent } from './system-message.component';

async function renderMessage() {
  const { sheetRef, dismiss } = bottomSheetRefStub<SystemMessageComponent>();
  const rendered = await renderComponent(SystemMessageComponent, {
    declarations: [SystemMessageComponent],
    imports: [MatButtonModule, MatIconModule],
    providers: [
      { provide: MatBottomSheetRef, useValue: sheetRef },
      {
        provide: MAT_BOTTOM_SHEET_DATA,
        useValue: { title: 'Offline', message: 'The API is unreachable.' },
      },
    ],
  });
  return { ...rendered, dismiss };
}

describe('SystemMessageComponent', () => {
  /**
   * Verifies: the sheet mounts with the default test providers and shows the title and message it was opened with.
   * Interacts with: MAT_BOTTOM_SHEET_DATA.
   * Data: title 'Offline', message 'The API is unreachable.'.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderMessage();

    expect(fixture.componentInstance).toBeInstanceOf(SystemMessageComponent);
    expect(
      screen.getByRole('heading', { name: 'Offline' }),
    ).toBeInTheDocument();
    expect(screen.getByText('The API is unreachable.')).toBeInTheDocument();
  });

  /**
   * Verifies: the close button dismisses the bottom sheet.
   * Interacts with: bottomSheetRefStub's dismiss spy.
   * Data: the default message.
   */
  it('dismisses the sheet from the close button', async () => {
    const user = userEvent.setup();
    const { dismiss } = await renderMessage();
    await user.click(screen.getByRole('button'));

    expect(dismiss).toHaveBeenCalledOnce();
  });
});
