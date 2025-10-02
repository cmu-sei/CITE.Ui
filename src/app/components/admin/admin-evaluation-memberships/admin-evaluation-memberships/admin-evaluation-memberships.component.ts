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
import { EvaluationMembershipDataService } from 'src/app/data/evaluation/evaluation-membership-data.service';
import { EvaluationRoleDataService } from 'src/app/data/evaluation/evaluation-role-data.service';
import { UserQuery } from 'src/app/data/user/user.query';
import { UserDataService } from 'src/app/data/user/user-data.service';
import {
  EvaluationMembership,
  Evaluation,
} from 'src/app/generated/cite.api';
import { GroupDataService } from 'src/app/data/group/group-data.service';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';

@Component({
  selector: 'app-admin-evaluation-memberships',
  templateUrl: './admin-evaluation-memberships.component.html',
  styleUrls: ['./admin-evaluation-memberships.component.scss'],
  standalone: false
})
export class AdminEvaluationMembershipsComponent implements OnInit, OnChanges {
  @Input() embedded: boolean;
  @Input() evaluationId: string;
  @Output() goBack = new EventEmitter();

  evaluation$: Observable<Evaluation>;

  memberships$ = this.evaluationMembershipDataService.evaluationMemberships$;
  roles$ = this.evaluationRolesDataService.evaluationRoles$;

  // All users that are not already members of the evaluation
  nonMembers$ = this.selectUsers(false);
  members$ = this.selectUsers(true);

  groupNonMembers$ = this.selectGroups(false);
  groupMembers$ = this.selectGroups(true);

  canEdit: boolean;

  constructor(
    private evaluationMembershipDataService: EvaluationMembershipDataService,
    private evaluationRolesDataService: EvaluationRoleDataService,
    private userDataService: UserDataService,
    private userQuery: UserQuery,
    private groupDataService: GroupDataService,
    private permissionDataService: PermissionDataService
  ) {}

  ngOnInit(): void {
    forkJoin([
      this.evaluationMembershipDataService.loadMemberships(this.evaluationId),
      this.userDataService.load(),
      this.evaluationRolesDataService.loadRoles(),
      this.groupDataService.load(),
    ]).subscribe();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.canEdit = this.permissionDataService.canEditEvaluation(this.evaluationId);
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

  selectGroups(members: boolean) {
    return combineLatest([
      this.groupDataService.groups$,
      this.memberships$,
    ]).pipe(
      map(([groups, memberships]) => {
        return groups.filter((group) => {
          if (members) {
            return (
              memberships.length > 0 &&
              memberships.some((y) => y.groupId == group.id)
            );
          } else {
            return (
              memberships.length === 0 ||
              !memberships.some((y) => y.groupId == group.id)
            );
          }
        });
      })
    );
  }

  createMembership(evaluationMembership: EvaluationMembership) {
    evaluationMembership.evaluationId = this.evaluationId;
    this.evaluationMembershipDataService
      .createMembership(this.evaluationId, evaluationMembership)
      .subscribe();
  }

  deleteMembership(id: string) {
    this.evaluationMembershipDataService.deleteMembership(id).subscribe();
  }

  editMembership(evaluationMembership: EvaluationMembership) {
    this.evaluationMembershipDataService
      .editMembership(evaluationMembership)
      .subscribe();
  }
}
