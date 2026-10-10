// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component, EventEmitter, Input, Output, Type } from '@angular/core';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import {
  GroupMembership,
  GroupService,
  User,
} from '../../../../generated/cite.api';
import { UserStore } from '../../../../data/user/user.store';
import { ApiStub } from '../../../../test-utils/api-stub';
import { renderComponent } from '../../../../test-utils/render-component';
import { AdminGroupsDetailComponent } from './admin-groups-detail.component';

@Component({ selector: 'app-admin-groups-membership-list', template: '' })
class NonMemberListStubComponent {
  @Input() users!: User[];
  @Input() canEdit!: boolean;
  @Output() createMembership = new EventEmitter<string>();
}

@Component({ selector: 'app-admin-groups-member-list', template: '' })
class MemberListStubComponent {
  @Input() memberships!: GroupMembership[];
  @Input() users!: User[];
  @Input() canEdit!: boolean;
  @Output() deleteMembership = new EventEmitter<string>();
}

async function renderDetail(canEdit: boolean) {
  const groupApi = {
    getGroupMemberships: vi.fn(() =>
      of([{ id: 'gm1', groupId: 'g1', userId: 'u1' }]),
    ),
    createGroupMembership: vi.fn((groupId: string, m?: GroupMembership) =>
      of({ ...m, groupId, id: 'gm-new' }),
    ),
    deleteGroupMembership: vi.fn(() => of(null)),
  } satisfies ApiStub<GroupService>;

  const rendered = await renderComponent(AdminGroupsDetailComponent, {
    declarations: [AdminGroupsDetailComponent],
    imports: [NonMemberListStubComponent, MemberListStubComponent],
    componentInputs: { groupId: 'g1', canEdit },
    providers: [{ provide: GroupService, useValue: groupApi }],
    configureTestBed: (testBed) => {
      // The groups page loads the users; seed what it would store.
      testBed.inject(UserStore).set([
        { id: 'u1', name: 'Alice' },
        { id: 'u2', name: 'Bob' },
      ]);
    },
  });
  const child = <T>(type: Type<T>): T =>
    rendered.fixture.debugElement.query(By.directive(type))
      .componentInstance as T;
  const refresh = async () => {
    rendered.fixture.detectChanges();
    await rendered.fixture.whenStable();
  };
  await refresh();
  return {
    ...rendered,
    groupApi,
    nonMembers: () => child(NonMemberListStubComponent),
    members: () => child(MemberListStubComponent),
    refresh,
  };
}

const names = (users: User[]) => users.map((u) => u.name);

describe('AdminGroupsDetailComponent', () => {
  /**
   * Verifies: the group's memberships are loaded and users are split into members and non-members.
   * Interacts with: real GroupMembershipDataService and UserQuery over a stubbed GroupService.
   * Data: Alice is in g1, Bob is not.
   */
  it('splits users into group members and non-members', async () => {
    const { groupApi, members, nonMembers } = await renderDetail(true);

    expect(groupApi.getGroupMemberships).toHaveBeenCalledWith('g1');
    expect(names(members().users)).toEqual(['Alice']);
    expect(names(nonMembers().users)).toEqual(['Bob']);
  });

  /**
   * Verifies: with canEdit both lists may edit, and adding Bob creates his membership.
   * Interacts with: both list stubs' canEdit input, NonMemberList createMembership output, GroupService.createGroupMembership stub.
   * Data: canEdit true; Bob added to g1.
   */
  it('passes canEdit to both lists and adds a member', async () => {
    const { groupApi, members, nonMembers, refresh } = await renderDetail(true);
    expect(nonMembers().canEdit).toBe(true);
    expect(members().canEdit).toBe(true);

    nonMembers().createMembership.emit('u2');
    await refresh();
    expect(groupApi.createGroupMembership).toHaveBeenCalledWith('g1', {
      groupId: 'g1',
      userId: 'u2',
    });
    expect(names(members().users)).toEqual(['Alice', 'Bob']);
  });

  /**
   * Verifies: without canEdit both lists are read-only.
   * Interacts with: both list stubs' canEdit input.
   * Data: canEdit false.
   */
  it('passes canEdit false to both lists', async () => {
    const { members, nonMembers } = await renderDetail(false);

    expect(nonMembers().canEdit).toBe(false);
    expect(members().canEdit).toBe(false);
  });

  /**
   * Verifies: removing a member deletes the membership and returns the user to the non-member list.
   * Interacts with: MemberList deleteMembership output, GroupService.deleteGroupMembership stub.
   * Data: gm1 deleted.
   */
  it('removes a member', async () => {
    const { groupApi, members, nonMembers, refresh } = await renderDetail(true);
    members().deleteMembership.emit('gm1');
    await refresh();

    expect(groupApi.deleteGroupMembership).toHaveBeenCalledWith('gm1');
    expect(names(nonMembers().users)).toEqual(['Alice', 'Bob']);
  });
});
