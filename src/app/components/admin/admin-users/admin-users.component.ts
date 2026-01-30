// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, OnInit } from '@angular/core';
import { ErrorStateMatcher } from '@angular/material/core';
import { UntypedFormControl, FormGroupDirective, NgForm } from '@angular/forms';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { UserQuery } from 'src/app/data/user/user.query';
import { SystemPermission, User } from 'src/app/generated/cite.api';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { ComnSettingsService } from '@cmusei/crucible-common';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss'],
  standalone: false
})
export class AdminUsersComponent implements OnInit {
  matcher = new UserErrorStateMatcher();
  isLinear = false;
  users$: Observable<User[]>;
  isLoading$: Observable<boolean>;
  canEdit = this.permissionDataService.hasPermission(
    SystemPermission.ManageUsers
  );

  constructor(
    private userDataService: UserDataService,
    private userQuery: UserQuery,
    private settingsService: ComnSettingsService,
    private permissionDataService: PermissionDataService
  ) {}

  /**
   * Initialize component
   */
  ngOnInit() {
    this.users$ = this.userQuery.selectAll();
    this.isLoading$ = this.userQuery.selectLoading();
  }

  create(newUser: User) {
    this.userDataService.create(newUser).pipe(take(1)).subscribe();
  }

  deleteUser(userId: string) {
    this.userDataService.delete(userId).pipe(take(1)).subscribe();
  }
} // End Class

/** Error when invalid control is dirty, touched, or submitted. */
export class UserErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(
    control: UntypedFormControl | null,
    form: FormGroupDirective | NgForm | null
  ): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || isSubmitted));
  }
}
