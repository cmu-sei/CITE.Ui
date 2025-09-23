/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminEvaluationMembershipListComponent } from './admin-evaluation-membership-list.component';

describe('EvaluationMembershipUserListComponent', () => {
  let component: AdminEvaluationMembershipListComponent;
  let fixture: ComponentFixture<AdminEvaluationMembershipListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminEvaluationMembershipListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminEvaluationMembershipListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
