/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminTeamMembershipListComponent } from './admin-team-membership-list.component';

describe('TeamMembershipUserListComponent', () => {
  let component: AdminTeamMembershipListComponent;
  let fixture: ComponentFixture<AdminTeamMembershipListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminTeamMembershipListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminTeamMembershipListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
