// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminEvaluationTeamsDialogComponent } from './admin-evaluation-teams.component';

describe('AdminEvaluationTeamsComponent', () => {
  let component: AdminEvaluationTeamsDialogComponent;
  let fixture: ComponentFixture<AdminEvaluationTeamsDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AdminEvaluationTeamsDialogComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminEvaluationTeamsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
