// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminEvaluationTeamsComponent } from './admin-evaluation-teams.component';

describe('AdminEvaluationTeamsComponent', () => {
  let component: AdminEvaluationTeamsComponent;
  let fixture: ComponentFixture<AdminEvaluationTeamsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AdminEvaluationTeamsComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminEvaluationTeamsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
