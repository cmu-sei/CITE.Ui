/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminScoringModelMembershipsComponent } from './admin-scoring-model-memberships.component';

describe('AdminScoringModelMembershipsComponent', () => {
  let component: AdminScoringModelMembershipsComponent;
  let fixture: ComponentFixture<AdminScoringModelMembershipsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminScoringModelMembershipsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminScoringModelMembershipsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
