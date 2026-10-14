// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { AdminEvaluationEditDialogComponent } from './admin-evaluation-edit-dialog.component';

describe('AdminEvaluationEditDialogComponent', () => {
  // only getUserTimezone is used, so skip the dialog's injected services
  const dialog = {
    getUserTimezone: () => 'America/New_York',
  } as unknown as AdminEvaluationEditDialogComponent;
  const getTimezoneAbbr = (value?: Date | string) =>
    AdminEvaluationEditDialogComponent.prototype.getTimezoneAbbr.call(dialog, value);

  it('should label a date by its own side of a DST change', () => {
    expect(getTimezoneAbbr(new Date('2026-10-12T16:00:00Z'))).toBe('EDT');
    expect(getTimezoneAbbr(new Date('2026-11-12T16:00:00Z'))).toBe('EST');
  });

  it('should accept the ISO string a form control can hold', () => {
    expect(getTimezoneAbbr('2026-11-12T16:00:00Z')).toBe('EST');
  });
});
