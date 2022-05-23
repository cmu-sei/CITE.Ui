// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, Inject, OnInit } from '@angular/core';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA,
} from '@angular/material/bottom-sheet';

@Component({
  selector: 'app-system-message',
  templateUrl: './system-message.component.html',
  styleUrls: ['./system-message.component.scss'],
})
export class SystemMessageComponent implements OnInit {
  public displayTitle: string;
  public displayMessage: string;

  constructor(
    public messageSheet: MatBottomSheetRef<SystemMessageComponent>,
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: any
  ) {
    this.displayTitle = data.title;
    this.displayMessage = data.message;
  }

  ngOnInit() {}

  close() {
    this.messageSheet.dismiss();
  }
}
