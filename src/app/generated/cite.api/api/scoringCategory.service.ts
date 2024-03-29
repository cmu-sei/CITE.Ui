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
/* tslint:disable:no-unused-variable member-ordering */

import { Inject, Injectable, Optional }                      from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams,
         HttpResponse, HttpEvent }                           from '@angular/common/http';
import { CustomHttpUrlEncodingCodec }                        from '../encoder';

import { Observable }                                        from 'rxjs';

import { ProblemDetails } from '../model/problemDetails';
import { ScoringCategory } from '../model/scoringCategory';

import { BASE_PATH, COLLECTION_FORMATS }                     from '../variables';
import { Configuration }                                     from '../configuration';


@Injectable({
  providedIn: 'root'
})
export class ScoringCategoryService {

    protected basePath = 'http://localhost';
    public defaultHeaders = new HttpHeaders();
    public configuration = new Configuration();

    constructor(protected httpClient: HttpClient, @Optional()@Inject(BASE_PATH) basePath: string, @Optional() configuration: Configuration) {

        if (configuration) {
            this.configuration = configuration;
            this.configuration.basePath = configuration.basePath || basePath || this.basePath;

        } else {
            this.configuration.basePath = basePath || this.basePath;
        }
    }

    /**
     * @param consumes string[] mime-types
     * @return true: consumes contains 'multipart/form-data', false: otherwise
     */
    private canConsumeForm(consumes: string[]): boolean {
        const form = 'multipart/form-data';
        for (const consume of consumes) {
            if (form === consume) {
                return true;
            }
        }
        return false;
    }


    /**
     * Creates a new ScoringCategory
     * Creates a new ScoringCategory with the attributes specified  &lt;para /&gt;  Accessible only to a ContentDeveloper or an Administrator
     * @param ScoringCategory The data used to create the ScoringCategory
     * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
     * @param reportProgress flag to report request and response progress.
     */
    public createScoringCategory(ScoringCategory?: ScoringCategory, observe?: 'body', reportProgress?: boolean): Observable<ScoringCategory>;
    public createScoringCategory(ScoringCategory?: ScoringCategory, observe?: 'response', reportProgress?: boolean): Observable<HttpResponse<ScoringCategory>>;
    public createScoringCategory(ScoringCategory?: ScoringCategory, observe?: 'events', reportProgress?: boolean): Observable<HttpEvent<ScoringCategory>>;
    public createScoringCategory(ScoringCategory?: ScoringCategory, observe: any = 'body', reportProgress: boolean = false ): Observable<any> {

        let headers = this.defaultHeaders;

        // authentication (oauth2) required
        if (this.configuration.accessToken) {
            const accessToken = typeof this.configuration.accessToken === 'function'
                ? this.configuration.accessToken()
                : this.configuration.accessToken;
            headers = headers.set('Authorization', 'Bearer ' + accessToken);
        }

        // to determine the Accept header
        let httpHeaderAccepts: string[] = [
            'text/plain',
            'application/json',
            'text/json'
        ];
        const httpHeaderAcceptSelected: string | undefined = this.configuration.selectHeaderAccept(httpHeaderAccepts);
        if (httpHeaderAcceptSelected !== undefined) {
            headers = headers.set('Accept', httpHeaderAcceptSelected);
        }

        // to determine the Content-Type header
        const consumes: string[] = [
            'application/json',
            'text/json',
            'application/_*+json'
        ];
        const httpContentTypeSelected: string | undefined = this.configuration.selectHeaderContentType(consumes);
        if (httpContentTypeSelected !== undefined) {
            headers = headers.set('Content-Type', httpContentTypeSelected);
        }

        return this.httpClient.post<ScoringCategory>(`${this.configuration.basePath}/api/scoringcategories`,
            ScoringCategory,
            {
                withCredentials: this.configuration.withCredentials,
                headers: headers,
                observe: observe,
                reportProgress: reportProgress
            }
        );
    }

    /**
     * Deletes a  ScoringCategory
     * Deletes a  ScoringCategory with the specified id  &lt;para /&gt;  Accessible only to a ContentDeveloper or an Administrator
     * @param id The id of the ScoringCategory to delete
     * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
     * @param reportProgress flag to report request and response progress.
     */
    public deleteScoringCategory(id: string, observe?: 'body', reportProgress?: boolean): Observable<any>;
    public deleteScoringCategory(id: string, observe?: 'response', reportProgress?: boolean): Observable<HttpResponse<any>>;
    public deleteScoringCategory(id: string, observe?: 'events', reportProgress?: boolean): Observable<HttpEvent<any>>;
    public deleteScoringCategory(id: string, observe: any = 'body', reportProgress: boolean = false ): Observable<any> {
        if (id === null || id === undefined) {
            throw new Error('Required parameter id was null or undefined when calling deleteScoringCategory.');
        }

        let headers = this.defaultHeaders;

        // authentication (oauth2) required
        if (this.configuration.accessToken) {
            const accessToken = typeof this.configuration.accessToken === 'function'
                ? this.configuration.accessToken()
                : this.configuration.accessToken;
            headers = headers.set('Authorization', 'Bearer ' + accessToken);
        }

        // to determine the Accept header
        let httpHeaderAccepts: string[] = [
            'application/json'
        ];
        const httpHeaderAcceptSelected: string | undefined = this.configuration.selectHeaderAccept(httpHeaderAccepts);
        if (httpHeaderAcceptSelected !== undefined) {
            headers = headers.set('Accept', httpHeaderAcceptSelected);
        }

        // to determine the Content-Type header
        const consumes: string[] = [
        ];

        return this.httpClient.delete<any>(`${this.configuration.basePath}/api/scoringcategories/${encodeURIComponent(String(id))}`,
            {
                withCredentials: this.configuration.withCredentials,
                headers: headers,
                observe: observe,
                reportProgress: reportProgress
            }
        );
    }

    /**
     * Gets ScoringCategories
     * Returns a list of ScoringCategories.
     * @param Description Whether or not to return records only for descriptions containing the designated string
     * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
     * @param reportProgress flag to report request and response progress.
     */
    public getScoringCategories(Description?: string, observe?: 'body', reportProgress?: boolean): Observable<Array<ScoringCategory>>;
    public getScoringCategories(Description?: string, observe?: 'response', reportProgress?: boolean): Observable<HttpResponse<Array<ScoringCategory>>>;
    public getScoringCategories(Description?: string, observe?: 'events', reportProgress?: boolean): Observable<HttpEvent<Array<ScoringCategory>>>;
    public getScoringCategories(Description?: string, observe: any = 'body', reportProgress: boolean = false ): Observable<any> {

        let queryParameters = new HttpParams({encoder: new CustomHttpUrlEncodingCodec()});
        if (Description !== undefined && Description !== null) {
            queryParameters = queryParameters.set('Description', <any>Description);
        }

        let headers = this.defaultHeaders;

        // authentication (oauth2) required
        if (this.configuration.accessToken) {
            const accessToken = typeof this.configuration.accessToken === 'function'
                ? this.configuration.accessToken()
                : this.configuration.accessToken;
            headers = headers.set('Authorization', 'Bearer ' + accessToken);
        }

        // to determine the Accept header
        let httpHeaderAccepts: string[] = [
            'text/plain',
            'application/json',
            'text/json'
        ];
        const httpHeaderAcceptSelected: string | undefined = this.configuration.selectHeaderAccept(httpHeaderAccepts);
        if (httpHeaderAcceptSelected !== undefined) {
            headers = headers.set('Accept', httpHeaderAcceptSelected);
        }

        // to determine the Content-Type header
        const consumes: string[] = [
        ];

        return this.httpClient.get<Array<ScoringCategory>>(`${this.configuration.basePath}/api/scoringcategories`,
            {
                params: queryParameters,
                withCredentials: this.configuration.withCredentials,
                headers: headers,
                observe: observe,
                reportProgress: reportProgress
            }
        );
    }

    /**
     * Gets ScoringCategories for the designated ScoringModel
     * Returns a list of ScoringCategories for the ScoringModel.
     * @param scoringModelId The ID of the ScoringModel
     * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
     * @param reportProgress flag to report request and response progress.
     */
    public getScoringCategoriesByScoringModelId(scoringModelId: string, observe?: 'body', reportProgress?: boolean): Observable<Array<ScoringCategory>>;
    public getScoringCategoriesByScoringModelId(scoringModelId: string, observe?: 'response', reportProgress?: boolean): Observable<HttpResponse<Array<ScoringCategory>>>;
    public getScoringCategoriesByScoringModelId(scoringModelId: string, observe?: 'events', reportProgress?: boolean): Observable<HttpEvent<Array<ScoringCategory>>>;
    public getScoringCategoriesByScoringModelId(scoringModelId: string, observe: any = 'body', reportProgress: boolean = false ): Observable<any> {
        if (scoringModelId === null || scoringModelId === undefined) {
            throw new Error('Required parameter scoringModelId was null or undefined when calling getScoringCategoriesByScoringModelId.');
        }

        let headers = this.defaultHeaders;

        // authentication (oauth2) required
        if (this.configuration.accessToken) {
            const accessToken = typeof this.configuration.accessToken === 'function'
                ? this.configuration.accessToken()
                : this.configuration.accessToken;
            headers = headers.set('Authorization', 'Bearer ' + accessToken);
        }

        // to determine the Accept header
        let httpHeaderAccepts: string[] = [
            'text/plain',
            'application/json',
            'text/json'
        ];
        const httpHeaderAcceptSelected: string | undefined = this.configuration.selectHeaderAccept(httpHeaderAccepts);
        if (httpHeaderAcceptSelected !== undefined) {
            headers = headers.set('Accept', httpHeaderAcceptSelected);
        }

        // to determine the Content-Type header
        const consumes: string[] = [
        ];

        return this.httpClient.get<Array<ScoringCategory>>(`${this.configuration.basePath}/api/scoringmodel/${encodeURIComponent(String(scoringModelId))}/scoringcategories`,
            {
                withCredentials: this.configuration.withCredentials,
                headers: headers,
                observe: observe,
                reportProgress: reportProgress
            }
        );
    }

    /**
     * Gets a specific ScoringCategory by id
     * Returns the ScoringCategory with the id specified
     * @param id The id of the ScoringCategory
     * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
     * @param reportProgress flag to report request and response progress.
     */
    public getScoringCategory(id: string, observe?: 'body', reportProgress?: boolean): Observable<ScoringCategory>;
    public getScoringCategory(id: string, observe?: 'response', reportProgress?: boolean): Observable<HttpResponse<ScoringCategory>>;
    public getScoringCategory(id: string, observe?: 'events', reportProgress?: boolean): Observable<HttpEvent<ScoringCategory>>;
    public getScoringCategory(id: string, observe: any = 'body', reportProgress: boolean = false ): Observable<any> {
        if (id === null || id === undefined) {
            throw new Error('Required parameter id was null or undefined when calling getScoringCategory.');
        }

        let headers = this.defaultHeaders;

        // authentication (oauth2) required
        if (this.configuration.accessToken) {
            const accessToken = typeof this.configuration.accessToken === 'function'
                ? this.configuration.accessToken()
                : this.configuration.accessToken;
            headers = headers.set('Authorization', 'Bearer ' + accessToken);
        }

        // to determine the Accept header
        let httpHeaderAccepts: string[] = [
            'text/plain',
            'application/json',
            'text/json'
        ];
        const httpHeaderAcceptSelected: string | undefined = this.configuration.selectHeaderAccept(httpHeaderAccepts);
        if (httpHeaderAcceptSelected !== undefined) {
            headers = headers.set('Accept', httpHeaderAcceptSelected);
        }

        // to determine the Content-Type header
        const consumes: string[] = [
        ];

        return this.httpClient.get<ScoringCategory>(`${this.configuration.basePath}/api/scoringcategories/${encodeURIComponent(String(id))}`,
            {
                withCredentials: this.configuration.withCredentials,
                headers: headers,
                observe: observe,
                reportProgress: reportProgress
            }
        );
    }

    /**
     * Updates a  ScoringCategory
     * Updates a ScoringCategory with the attributes specified.  The ID from the route MUST MATCH the ID contained in the scoringCategory parameter  &lt;para /&gt;  Accessible only to a ContentDeveloper or an Administrator
     * @param id The Id of the ScoringCategory to update
     * @param ScoringCategory The updated ScoringCategory values
     * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
     * @param reportProgress flag to report request and response progress.
     */
    public updateScoringCategory(id: string, ScoringCategory?: ScoringCategory, observe?: 'body', reportProgress?: boolean): Observable<ScoringCategory>;
    public updateScoringCategory(id: string, ScoringCategory?: ScoringCategory, observe?: 'response', reportProgress?: boolean): Observable<HttpResponse<ScoringCategory>>;
    public updateScoringCategory(id: string, ScoringCategory?: ScoringCategory, observe?: 'events', reportProgress?: boolean): Observable<HttpEvent<ScoringCategory>>;
    public updateScoringCategory(id: string, ScoringCategory?: ScoringCategory, observe: any = 'body', reportProgress: boolean = false ): Observable<any> {
        if (id === null || id === undefined) {
            throw new Error('Required parameter id was null or undefined when calling updateScoringCategory.');
        }

        let headers = this.defaultHeaders;

        // authentication (oauth2) required
        if (this.configuration.accessToken) {
            const accessToken = typeof this.configuration.accessToken === 'function'
                ? this.configuration.accessToken()
                : this.configuration.accessToken;
            headers = headers.set('Authorization', 'Bearer ' + accessToken);
        }

        // to determine the Accept header
        let httpHeaderAccepts: string[] = [
            'text/plain',
            'application/json',
            'text/json'
        ];
        const httpHeaderAcceptSelected: string | undefined = this.configuration.selectHeaderAccept(httpHeaderAccepts);
        if (httpHeaderAcceptSelected !== undefined) {
            headers = headers.set('Accept', httpHeaderAcceptSelected);
        }

        // to determine the Content-Type header
        const consumes: string[] = [
            'application/json',
            'text/json',
            'application/_*+json'
        ];
        const httpContentTypeSelected: string | undefined = this.configuration.selectHeaderContentType(consumes);
        if (httpContentTypeSelected !== undefined) {
            headers = headers.set('Content-Type', httpContentTypeSelected);
        }

        return this.httpClient.put<ScoringCategory>(`${this.configuration.basePath}/api/scoringcategories/${encodeURIComponent(String(id))}`,
            ScoringCategory,
            {
                withCredentials: this.configuration.withCredentials,
                headers: headers,
                observe: observe,
                reportProgress: reportProgress
            }
        );
    }

}
