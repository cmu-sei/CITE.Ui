/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminScoringModelMemberListComponent } from './scoring-model-member-list.component';

describe('AdminScoringModelMemberListComponent', () => {
  let component: AdminScoringModelMemberListComponent;
  let fixture: ComponentFixture<AdminScoringModelMemberListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminScoringModelMemberListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminScoringModelMemberListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
