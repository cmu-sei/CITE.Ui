/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminTeamMembershipsComponent } from './admin-team-memberships.component';

describe('AdminTeamMembershipsComponent', () => {
  let component: AdminTeamMembershipsComponent;
  let fixture: ComponentFixture<AdminTeamMembershipsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminTeamMembershipsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminTeamMembershipsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
