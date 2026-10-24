// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { Injectable, inject } from '@angular/core';
import { SystemMessageComponent } from 'src/app/components/shared/system-message/system-message.component';


@Injectable()
export class SystemMessageService {
  private messageSheet = inject(MatBottomSheet);


  public displayMessage(title: string, message: string) {
    this.messageSheet.open(SystemMessageComponent, {data: {title: title, message: message} });
  }
}



