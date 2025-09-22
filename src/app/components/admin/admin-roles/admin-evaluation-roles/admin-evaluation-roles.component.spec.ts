/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluationRolesComponent } from './evaluation-roles.component';

describe('EvaluationRolesComponent', () => {
  let component: EvaluationRolesComponent;
  let fixture: ComponentFixture<EvaluationRolesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EvaluationRolesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EvaluationRolesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
