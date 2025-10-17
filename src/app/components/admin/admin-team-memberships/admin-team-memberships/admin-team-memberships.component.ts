/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { combineLatest, forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TeamMembershipDataService } from 'src/app/data/team/team-membership-data.service';
import { TeamRoleDataService } from 'src/app/data/team/team-role-data.service';
import { UserQuery } from 'src/app/data/user/user.query';
import { UserDataService } from 'src/app/data/user/user-data.service';
import {
  TeamMembership,
  Team,
} from 'src/app/generated/cite.api';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';

@Component({
  selector: 'app-admin-team-memberships',
  templateUrl: './admin-team-memberships.component.html',
  styleUrls: ['./admin-team-memberships.component.scss'],
  standalone: false
})
export class AdminTeamMembershipsComponent implements OnInit, OnChanges {
  @Input() embedded: boolean;
  @Input() teamId: string;
  @Output() goBack = new EventEmitter();

  team$: Observable<Team>;

  memberships$ = this.teamMembershipDataService.teamMemberships$;
  roles$ = this.teamRolesDataService.teamRoles$;

  // All users that are not already members of the team
  nonMembers$ = this.selectUsers(false);
  members$ = this.selectUsers(true);

  canEdit: boolean;

  constructor(
    private teamMembershipDataService: TeamMembershipDataService,
    private teamRolesDataService: TeamRoleDataService,
    private userDataService: UserDataService,
    private userQuery: UserQuery,
    private permissionDataService: PermissionDataService
  ) {}

  ngOnInit(): void {
    forkJoin([
      this.teamMembershipDataService.loadMemberships(this.teamId),
      this.userDataService.load(),
      this.teamRolesDataService.loadRoles(),
    ]).subscribe();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.canEdit = this.permissionDataService.canEditEvaluation(this.teamId);
  }

  selectUsers(members: boolean) {
    return combineLatest([this.userQuery.selectAll(), this.memberships$]).pipe(
      map(([users, memberships]) => {
        return users.filter((user) => {
          if (members) {
            return (
              memberships.length > 0 &&
              memberships.some((y) => y.userId == user.id)
            );
          } else {
            return (
              memberships.length === 0 ||
              !memberships.some((y) => y.userId == user.id)
            );
          }
        });
      })
    );
  }

  createMembership(teamMembership: TeamMembership) {
    teamMembership.teamId = this.teamId;
    this.teamMembershipDataService
      .createMembership(this.teamId, teamMembership)
      .subscribe();
  }

  deleteMembership(id: string) {
    this.teamMembershipDataService.deleteMembership(id).subscribe();
  }

  editMembership(teamMembership: TeamMembership) {
    this.teamMembershipDataService
      .editMembership(teamMembership)
      .subscribe();
  }
}
