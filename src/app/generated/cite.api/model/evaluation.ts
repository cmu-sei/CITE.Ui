/*
Copyright 2022 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the
// project root for license information.
*/

/**
 * Cite API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * OpenAPI spec version: v1
 *
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */
import { ItemStatus } from './itemStatus';
import { Move } from './move';
import { RightSideDisplay } from './rightSideDisplay';
import { ScoringModel } from './scoringModel';
import { Submission } from './submission';
import { Team } from './team';


export interface Evaluation {
    dateCreated?: Date;
    dateModified?: Date;
    createdBy?: string;
    modifiedBy?: string;
    id?: string;
    description?: string;
    status?: ItemStatus;
    currentMoveNumber?: number;
    situationTime?: Date;
    situationDescription?: string;
    scoringModelId?: string;
    scoringModel?: ScoringModel;
    galleryExhibitId?: string;
    hideScoresOnScoreSheet?: boolean;
    showPastSituationDescriptions?: boolean;
    displayCommentTextBoxes?: boolean;
    rightSideDisplay?: RightSideDisplay;
    teams?: Array<Team>;
    moves?: Array<Move>;
    submissions?: Array<Submission>;
}
