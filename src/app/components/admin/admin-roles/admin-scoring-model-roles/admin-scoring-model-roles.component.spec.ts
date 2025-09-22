/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScoringModelRolesComponent } from './scoring-model-roles.component';

describe('ScoringModelRolesComponent', () => {
  let component: ScoringModelRolesComponent;
  let fixture: ComponentFixture<ScoringModelRolesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ScoringModelRolesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ScoringModelRolesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
