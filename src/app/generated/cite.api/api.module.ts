import { NgModule, ModuleWithProviders, SkipSelf, Optional } from '@angular/core';
import { Configuration } from './configuration';
import { HttpClient } from '@angular/common/http';


import { ActionService } from './api/action.service';
import { EvaluationService } from './api/evaluation.service';
import { EvaluationTeamService } from './api/evaluationTeam.service';
import { GalleryService } from './api/gallery.service';
import { GroupService } from './api/group.service';
import { GroupTeamService } from './api/groupTeam.service';
import { HealthCheckService } from './api/healthCheck.service';
import { MoveService } from './api/move.service';
import { PermissionService } from './api/permission.service';
import { RoleService } from './api/role.service';
import { ScoringCategoryService } from './api/scoringCategory.service';
import { ScoringModelService } from './api/scoringModel.service';
import { ScoringOptionService } from './api/scoringOption.service';
import { SubmissionService } from './api/submission.service';
import { SubmissionCategoryService } from './api/submissionCategory.service';
import { SubmissionCommentService } from './api/submissionComment.service';
import { SubmissionOptionService } from './api/submissionOption.service';
import { TeamService } from './api/team.service';
import { TeamTypeService } from './api/teamType.service';
import { TeamUserService } from './api/teamUser.service';
import { UserService } from './api/user.service';
import { UserPermissionService } from './api/userPermission.service';

@NgModule({
  imports:      [],
  declarations: [],
  exports:      [],
  providers: [
    ActionService,
    EvaluationService,
    EvaluationTeamService,
    GalleryService,
    GroupService,
    GroupTeamService,
    HealthCheckService,
    MoveService,
    PermissionService,
    RoleService,
    ScoringCategoryService,
    ScoringModelService,
    ScoringOptionService,
    SubmissionService,
    SubmissionCategoryService,
    SubmissionCommentService,
    SubmissionOptionService,
    TeamService,
    TeamTypeService,
    TeamUserService,
    UserService,
    UserPermissionService ]
})
export class ApiModule {
    public static forRoot(configurationFactory: () => Configuration): ModuleWithProviders<ApiModule> {
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
