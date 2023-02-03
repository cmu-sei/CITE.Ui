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
import { SubmissionCategory } from './submissionCategory';


export interface Submission { 
    dateCreated?: Date;
    dateModified?: Date;
    createdBy?: string;
    modifiedBy?: string;
    id?: string;
    score?: number;
    status?: ItemStatus;
    scoringModelId?: string;
    userId?: string;
    evaluationId?: string;
    teamId?: string;
    groupId?: string;
    moveNumber?: number;
    scoreIsAnAverage?: boolean;
    submissionCategories?: Array<SubmissionCategory>;
}
