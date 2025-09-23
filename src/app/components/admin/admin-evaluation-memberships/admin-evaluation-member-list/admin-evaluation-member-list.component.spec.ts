/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminEvaluationMemberListComponent } from './admin-evaluation-member-list.component';

describe('AdminEvaluationMemberListComponent', () => {
  let component: AdminEvaluationMemberListComponent;
  let fixture: ComponentFixture<AdminEvaluationMemberListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminEvaluationMemberListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminEvaluationMemberListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
