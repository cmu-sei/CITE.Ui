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
import { combineLatest, forkJoin, Observable, of } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import { ScoringModelQuery } from 'src/app/data/scoring-model/scoring-model.query';
import { ScoringModelMembershipDataService } from 'src/app/data/scoring-model/scoring-model-membership-data.service';
import { ScoringModelRoleDataService } from 'src/app/data/scoring-model/scoring-model-role-data.service';
import { UserQuery } from 'src/app/data/user/user.query';
import { UserDataService } from 'src/app/data/user/user-data.service';
import {
  ScoringModelMembership,
  ScoringModel,
} from 'src/app/generated/cite.api';
import { GroupDataService } from 'src/app/data/group/group-data.service';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-admin-scoring-model-memberships',
  templateUrl: './admin-scoring-model-memberships.component.html',
  styleUrls: ['./admin-scoring-model-memberships.component.scss'],
  standalone: false
})
export class AdminScoringModelMembershipsComponent implements OnInit, OnChanges {
  @Input() embedded: boolean;
  @Input() scoringModelId: string;
  @Output() goBack = new EventEmitter();

  scoringModel$: Observable<ScoringModel>;

  memberships$ =
    this.scoringModelMembershipDataService.scoringModelMemberships$;
  roles$ = this.scoringModelRolesDataService.scoringModelRoles$;

  // All users that are not already members of the scoringModel
  nonMembers$ = this.selectUsers(false);
  members$ = this.selectUsers(true);

  groupNonMembers$ = this.selectGroups(false);
  groupMembers$ = this.selectGroups(true);

  canEdit$: Observable<boolean>;

  constructor(
    private scoringModelQuery: ScoringModelQuery,
    private scoringModelMembershipDataService: ScoringModelMembershipDataService,
    private scoringModelRolesDataService: ScoringModelRoleDataService,
    private userDataService: UserDataService,
    private userQuery: UserQuery,
    private groupDataService: GroupDataService,
    private permissionDataService: PermissionDataService,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    forkJoin([
      this.scoringModelMembershipDataService.loadMemberships(
        this.scoringModelId
      ),
      this.userDataService.load(),
      this.scoringModelRolesDataService.loadRoles(),
      this.groupDataService.load(),
    ]).subscribe();
    this.permissionDataService
      .loadScoringModelPermissions(this.scoringModelId)
      .subscribe((x) =>
        this.canEdit$ = of(this.permissionDataService.canEditScoringModel(this.scoringModelId)));
  }

  ngOnChanges(changes: SimpleChanges) {
    this.scoringModel$ = this.scoringModelQuery
      .selectEntity(this.scoringModelId)
      .pipe(
        filter((x) => x != null),
        tap(
          (x) => {
            this.canEdit$ = of(this.permissionDataService.canEditScoringModel(this.scoringModelId));
          })
      );
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

  createMembership(scoringModelMembership: ScoringModelMembership) {
    scoringModelMembership.scoringModelId = this.scoringModelId;
    this.scoringModelMembershipDataService
      .createMembership(this.scoringModelId, scoringModelMembership)
      .subscribe();
  }

  deleteMembership(id: string) {
    this.scoringModelMembershipDataService.deleteMembership(id).subscribe();
  }

  editMembership(scoringModelMembership: ScoringModelMembership) {
    this.scoringModelMembershipDataService
      .editMembership(scoringModelMembership)
      .subscribe();
  }
}
