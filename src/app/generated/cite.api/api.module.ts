import { NgModule, ModuleWithProviders, SkipSelf, Optional } from '@angular/core';
import { Configuration } from './configuration';
import { HttpClient } from '@angular/common/http';


import { ActionService } from './api/action.service';
import { DutyService } from './api/duty.service';
import { EvaluationService } from './api/evaluation.service';
import { EvaluationMembershipsService } from './api/evaluationMemberships.service';
import { EvaluationPermissionsService } from './api/evaluationPermissions.service';
import { EvaluationRolesService } from './api/evaluationRoles.service';
import { GalleryService } from './api/gallery.service';
import { GroupService } from './api/group.service';
import { HealthCheckService } from './api/healthCheck.service';
import { MoveService } from './api/move.service';
import { ScoringCategoryService } from './api/scoringCategory.service';
import { ScoringModelService } from './api/scoringModel.service';
import { ScoringModelMembershipsService } from './api/scoringModelMemberships.service';
import { ScoringModelPermissionsService } from './api/scoringModelPermissions.service';
import { ScoringModelRolesService } from './api/scoringModelRoles.service';
import { ScoringOptionService } from './api/scoringOption.service';
import { SubmissionService } from './api/submission.service';
import { SubmissionCategoryService } from './api/submissionCategory.service';
import { SubmissionCommentService } from './api/submissionComment.service';
import { SubmissionOptionService } from './api/submissionOption.service';
import { SystemPermissionsService } from './api/systemPermissions.service';
import { SystemRolesService } from './api/systemRoles.service';
import { TeamService } from './api/team.service';
import { TeamMembershipsService } from './api/teamMemberships.service';
import { TeamPermissionsService } from './api/teamPermissions.service';
import { TeamTypeService } from './api/teamType.service';
import { UserService } from './api/user.service';

@NgModule({
  imports:      [],
  declarations: [],
  exports:      [],
  providers: [
    ActionService,
    DutyService,
    EvaluationService,
    EvaluationMembershipsService,
    EvaluationPermissionsService,
    EvaluationRolesService,
    GalleryService,
    GroupService,
    HealthCheckService,
    MoveService,
    ScoringCategoryService,
    ScoringModelService,
    ScoringModelMembershipsService,
    ScoringModelPermissionsService,
    ScoringModelRolesService,
    ScoringOptionService,
    SubmissionService,
    SubmissionCategoryService,
    SubmissionCommentService,
    SubmissionOptionService,
    SystemPermissionsService,
    SystemRolesService,
    TeamService,
    TeamMembershipsService,
    TeamPermissionsService,
    TeamTypeService,
    UserService ]
})
export class ApiModule {
    public static forRoot(configurationFactory: () => Configuration): ModuleWithProviders {
        return {
            ngModule: ApiModule,
            providers: [ { provide: Configuration, useFactory: configurationFactory } ]
        };
    }

    constructor( @Optional() @SkipSelf() parentModule: ApiModule,
                 @Optional() http: HttpClient) {
        if (parentModule) {
            throw new Error('ApiModule is already loaded. Import in your base AppModule only.');
        }
        if (!http) {
            throw new Error('You need to import the HttpClientModule in your AppModule! \n' +
            'See also https://github.com/angular/angular/issues/20575');
        }
    }
}
