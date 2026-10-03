// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { SystemMessageService } from './system-message.service';
import { SystemMessageComponent } from '../../components/shared/system-message/system-message.component';
import { getDefaultProviders } from '../../test-utils/default-test-providers';

describe('SystemMessageService', () => {
  /**
   * Verifies: displayMessage() opens the system message bottom sheet with the title and message.
   * Interacts with: MatBottomSheet.open stub.
   * Data: title 'API Error', message 'The API could not be reached.'.
   */
  it('opens the message sheet with the title and message', () => {
    const open = vi.fn();
    const sheet: Pick<MatBottomSheet, 'open'> = { open };
    TestBed.configureTestingModule({
      providers: getDefaultProviders([
        { provide: MatBottomSheet, useValue: sheet },
        SystemMessageService,
      ]),
    });
    TestBed.inject(SystemMessageService).displayMessage(
      'API Error',
      'The API could not be reached.',
    );
    expect(open).toHaveBeenCalledWith(SystemMessageComponent, {
      data: { title: 'API Error', message: 'The API could not be reached.' },
    });
  });
});
