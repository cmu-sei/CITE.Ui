// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { TestBed, inject } from '@angular/core/testing';
import { SystemMessageService } from './system-message.service';

describe('SystemMessageService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SystemMessageService]
    });
  });

  it('should be created', inject([SystemMessageService], (service: SystemMessageService) => {
    expect(service).toBeTruthy();
  }));
});

