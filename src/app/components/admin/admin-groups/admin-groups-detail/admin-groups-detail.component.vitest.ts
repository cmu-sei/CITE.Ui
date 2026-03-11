// Copyright 2024 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { of } from 'rxjs';
import { AdminGroupsDetailComponent } from './admin-groups-detail.component';
import { renderComponent } from 'src/app/test-utils/render-component';
import { GroupMembershipDataService } from 'src/app/data/group/group-membership.service';
import { UserQuery } from 'src/app/data/user/user.query';
import { SignalRService } from 'src/app/services/signalr.service';

async function renderDetail(overrides: {
  groupId?: string;
  canEdit?: boolean;
  users?: any[];
  memberships?: any[];
} = {}) {
  const {
    groupId = 'group-1',
    canEdit = false,
    users = [],
    memberships = [],
  } = overrides;

  return renderComponent(AdminGroupsDetailComponent, {
    declarations: [AdminGroupsDetailComponent],
    providers: [
      {
        provide: GroupMembershipDataService,
        useValue: {
          loadMemberships: () => of(memberships),
          selectMemberships: () => of(memberships),
          createMembership: () => of({}),
          deleteMembership: () => of({}),
        },
      },
      {
        provide: UserQuery,
        useValue: {
          selectAll: () => of(users),
          select: () => of(null),
          selectEntity: () => of(null),
          selectLoading: () => of(false),
          selectActive: () => of(null),
          selectActiveId: () => of(null),
          getAll: () => users,
          getEntity: () => null,
        },
      },
      {
        provide: SignalRService,
        useValue: {
          startConnection: () => Promise.resolve(),
          join: () => {},
          leave: () => {},
          leaveChannel: () => {},
        },
      },
    ],
    componentProperties: { groupId, canEdit },
  });
}

describe('AdminGroupsDetailComponent', () => {
  it('should create', async () => {
    const { fixture } = await renderDetail();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should set groupId from input', async () => {
    const { fixture } = await renderDetail({ groupId: 'test-group-123' });
    expect(fixture.componentInstance.groupId).toBe('test-group-123');
  });

  it('should set canEdit from input', async () => {
    const { fixture } = await renderDetail({ canEdit: true });
    expect(fixture.componentInstance.canEdit).toBe(true);
  });

  it('should compute members from users and memberships', async () => {
    const users = [
      { id: 'u1', name: 'Alice' },
      { id: 'u2', name: 'Bob' },
    ];
    const memberships = [{ id: 'm1', userId: 'u1', groupId: 'group-1' }];
    const { fixture } = await renderDetail({ users, memberships });
    fixture.detectChanges();

    let membersList: any[] = [];
    fixture.componentInstance.members$.subscribe((m) => (membersList = m));
    expect(membersList.length).toBe(1);
    expect(membersList[0].name).toBe('Alice');
  });
});
