// Copyright 2024 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/angular';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { AdminGroupsMemberListComponent } from './admin-groups-member-list.component';
import { renderComponent } from 'src/app/test-utils/render-component';

async function renderMemberList(overrides: {
  memberships?: any[];
  users?: any[];
  canEdit?: boolean;
} = {}) {
  const {
    memberships = [],
    users = [],
    canEdit = false,
  } = overrides;

  return renderComponent(AdminGroupsMemberListComponent, {
    declarations: [AdminGroupsMemberListComponent],
    imports: [MatTableModule, MatSortModule, MatPaginatorModule],
    componentProperties: { memberships, users, canEdit },
  });
}

describe('AdminGroupsMemberListComponent', () => {
  it('should create', async () => {
    const { fixture } = await renderMemberList();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display Group Members header', async () => {
    await renderMemberList();
    expect(screen.getByText('Group Members')).toBeInTheDocument();
  });

  it('should show no members message when empty', async () => {
    await renderMemberList({ memberships: [], users: [] });
    expect(screen.getByText('This Group currently has no members')).toBeInTheDocument();
  });

  it('should show actions column when canEdit is true', async () => {
    const { fixture } = await renderMemberList({ canEdit: true });
    fixture.detectChanges();
    expect(fixture.componentInstance.displayedColumns).toContain('actions');
  });
});
