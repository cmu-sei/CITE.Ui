// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { ApplicationRef, NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { screen, within } from '@testing-library/angular';
import { SystemMessageService } from './system-message.service';
import { getDefaultProviders } from '../../test-utils/default-test-providers';

// The real service over the real MatBottomSheet: what renders is what the
// user sees. The app calls it from inside Angular's zone, so the test does too.
async function display(title: string, message: string) {
  TestBed.configureTestingModule({
    providers: getDefaultProviders([
      provideNoopAnimations(),
      SystemMessageService,
    ]),
  });
  const service = TestBed.inject(SystemMessageService);
  TestBed.inject(NgZone).run(() => service.displayMessage(title, message));
  await TestBed.inject(ApplicationRef).whenStable();
  return screen.findByRole('dialog');
}

describe('SystemMessageService', () => {
  /**
   * Verifies: displayMessage() opens the system message bottom sheet showing the title and message.
   * Interacts with: the real MatBottomSheet and SystemMessageComponent, NgZone.
   * Data: title 'API Error', message 'The API could not be reached.'.
   */
  it('opens the message sheet with the title and message', async () => {
    const sheet = await display('API Error', 'The API could not be reached.');

    expect(
      within(sheet).getByRole('heading', { name: 'API Error' }),
    ).toBeInTheDocument();
    expect(
      within(sheet).getByText('The API could not be reached.'),
    ).toBeInTheDocument();
  });
});
