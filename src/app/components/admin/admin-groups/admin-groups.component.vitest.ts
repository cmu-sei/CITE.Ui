// Copyright 2024 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/angular';
import { of, BehaviorSubject } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { AdminGroupsComponent } from './admin-groups.component';
import { renderComponent } from 'src/app/test-utils/render-component';
import { GroupDataService } from 'src/app/data/group/group-data.service';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { SystemPermission } from 'src/app/generated/cite.api';

async function renderAdminGroups(
  overrides: {
    groups?: any[];
    permissions?: SystemPermission[];
  } = {},
) {
  const { groups = [], permissions = [] } = overrides;

  const mockPermissionDataService = {
    load: () => of([]),
    permissions: permissions,
    hasPermission: (p: SystemPermission) => permissions.includes(p),
  };

  return renderComponent(AdminGroupsComponent, {
    declarations: [AdminGroupsComponent],
    imports: [MatTableModule, MatSortModule, MatPaginatorModule],
    providers: [
      {
        provide: GroupDataService,
        useValue: {
          load: () => of([]),
          groups$: of(groups),
        },
      },
      {
        provide: UserDataService,
        useValue: {
          load: () => of([]),
        },
      },
      { provide: PermissionDataService, useValue: mockPermissionDataService },
    ],
  });
}

describe('AdminGroupsComponent', () => {
  it('should create', async () => {
    const { fixture } = await renderAdminGroups();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display groups table with header', async () => {
    await renderAdminGroups();
    expect(screen.getByText('Group Name')).toBeInTheDocument();
  });

  it('should show search input', async () => {
    await renderAdminGroups();
    expect(screen.getByPlaceholderText('Search Groups')).toBeInTheDocument();
  });

  it('should enable Add Group button when canEdit', async () => {
    const { fixture } = await renderAdminGroups({
      permissions: [SystemPermission.ManageGroups],
    });
    // The add button is the first icon button in the header with mdi-plus-circle
    const addButton = fixture.nativeElement.querySelector(
      'button[mattooltip="Add New Group"]',
    );
    expect(addButton).toBeTruthy();
    expect(addButton.disabled).toBe(false);
  });

  it('should disable Add Group button when cannot edit', async () => {
    const { fixture } = await renderAdminGroups({ permissions: [] });
    const addButton = fixture.nativeElement.querySelector(
      'button[mattooltip="Add New Group"]',
    );
    expect(addButton).toBeTruthy();
    expect(addButton.disabled).toBe(true);
  });

  it('should display group names in table', async () => {
    await renderAdminGroups({
      groups: [
        { id: 'g1', name: 'Alpha Group' },
        { id: 'g2', name: 'Beta Group' },
      ],
    });
    expect(screen.getByText('Alpha Group')).toBeInTheDocument();
    expect(screen.getByText('Beta Group')).toBeInTheDocument();
  });

  it('should filter groups when search text entered', async () => {
    const { fixture } = await renderAdminGroups({
      groups: [
        { id: 'g1', name: 'Alpha Group' },
        { id: 'g2', name: 'Beta Group' },
      ],
    });
    fixture.componentInstance.applyFilter('Alpha');
    fixture.detectChanges();
    expect(fixture.componentInstance.dataSource.filter).toBe('alpha');
  });

  it('should clear filter when clearFilter called', async () => {
    const { fixture } = await renderAdminGroups({
      groups: [
        { id: 'g1', name: 'Alpha Group' },
        { id: 'g2', name: 'Beta Group' },
      ],
    });
    fixture.componentInstance.applyFilter('Alpha');
    fixture.componentInstance.clearFilter();
    fixture.detectChanges();
    expect(fixture.componentInstance.filterString).toBe('');
    expect(fixture.componentInstance.dataSource.filter).toBe('');
  });

  it('should set canEdit to false when ManageGroups permission absent', async () => {
    const { fixture } = await renderAdminGroups({
      groups: [{ id: 'g1', name: 'Test Group' }],
      permissions: [],
    });
    expect(fixture.componentInstance.canEdit).toBe(false);
  });

  it('should set canEdit to true when ManageGroups permission present', async () => {
    const { fixture } = await renderAdminGroups({
      groups: [{ id: 'g1', name: 'Test Group' }],
      permissions: [SystemPermission.ManageGroups],
    });
    expect(fixture.componentInstance.canEdit).toBe(true);
  });

  it('should render action buttons in each group row', async () => {
    const { fixture } = await renderAdminGroups({
      groups: [{ id: 'g1', name: 'Test Group' }],
      permissions: [SystemPermission.ManageGroups],
    });
    fixture.detectChanges();
    // The row contains delete and rename icon buttons
    const rows = fixture.nativeElement.querySelectorAll('tr.element-row');
    expect(rows.length).toBe(1);
  });

  it('should toggle expansion when toggleExpand called', async () => {
    const { fixture } = await renderAdminGroups({
      groups: [{ id: 'g1', name: 'Test Group' }],
    });
    fixture.componentInstance.toggleExpand('g1');
    expect(fixture.componentInstance.expandedGroupId).toBe('g1');
    fixture.componentInstance.toggleExpand('g1');
    expect(fixture.componentInstance.expandedGroupId).toBeNull();
  });
});
