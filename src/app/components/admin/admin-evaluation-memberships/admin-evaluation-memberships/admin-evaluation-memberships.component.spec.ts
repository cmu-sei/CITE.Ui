/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminEvaluationMembershipsComponent } from './admin-evaluation-memberships.component';

describe('AdminEvaluationMembershipsComponent', () => {
  let component: AdminEvaluationMembershipsComponent;
  let fixture: ComponentFixture<AdminEvaluationMembershipsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminEvaluationMembershipsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminEvaluationMembershipsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
