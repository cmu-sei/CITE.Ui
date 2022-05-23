// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { Observable } from 'rxjs';
import { MatBottomSheetRef, MatBottomSheet, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { Injectable } from '@angular/core';
import { SystemMessageComponent } from 'src/app/components/shared/system-message/system-message.component';


@Injectable()
export class SystemMessageService {

    constructor(
        private messageSheet: MatBottomSheet
    ) { }

    public displayMessage(title: string, message: string) {
        this.messageSheet.open(SystemMessageComponent, {data: {title: title, message: message} });
    }
}



