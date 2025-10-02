/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminTeamMemberListComponent } from './admin-team-member-list.component';

describe('AdminTeamMemberListComponent', () => {
  let component: AdminTeamMemberListComponent;
  let fixture: ComponentFixture<AdminTeamMemberListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminTeamMemberListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminTeamMemberListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
