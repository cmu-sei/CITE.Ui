/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminScoringModelMembershipListComponent } from './scoring-model-membership-list.component';

describe('ScoringModelMembershipUserListComponent', () => {
  let component: AdminScoringModelMembershipListComponent;
  let fixture: ComponentFixture<AdminScoringModelMembershipListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminScoringModelMembershipListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminScoringModelMembershipListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
