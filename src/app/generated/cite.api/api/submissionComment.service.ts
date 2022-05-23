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
import { SubmissionComment } from '../model/submissionComment';

import { BASE_PATH, COLLECTION_FORMATS }                     from '../variables';
import { Configuration }                                     from '../configuration';


@Injectable({
  providedIn: 'root'
})
export class SubmissionCommentService {

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
     * Creates a new SubmissionComment
     * Creates a new SubmissionComment with the attributes specified  &lt;para /&gt;  Accessible only to a ContentDeveloper or an Administrator
     * @param SubmissionComment The data used to create the SubmissionComment
     * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
     * @param reportProgress flag to report request and response progress.
     */
    public createSubmissionComment(SubmissionComment?: SubmissionComment, observe?: 'body', reportProgress?: boolean): Observable<SubmissionComment>;
    public createSubmissionComment(SubmissionComment?: SubmissionComment, observe?: 'response', reportProgress?: boolean): Observable<HttpResponse<SubmissionComment>>;
    public createSubmissionComment(SubmissionComment?: SubmissionComment, observe?: 'events', reportProgress?: boolean): Observable<HttpEvent<SubmissionComment>>;
    public createSubmissionComment(SubmissionComment?: SubmissionComment, observe: any = 'body', reportProgress: boolean = false ): Observable<any> {

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

        return this.httpClient.post<SubmissionComment>(`${this.configuration.basePath}/api/submissioncomments`,
            SubmissionComment,
            {
                withCredentials: this.configuration.withCredentials,
                headers: headers,
                observe: observe,
                reportProgress: reportProgress
            }
        );
    }

    /**
     * Deletes a  SubmissionComment
     * Deletes a  SubmissionComment with the specified id  &lt;para /&gt;  Accessible only to a ContentDeveloper or an Administrator
     * @param id The id of the SubmissionComment to delete
     * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
     * @param reportProgress flag to report request and response progress.
     */
    public deleteSubmissionComment(id: string, observe?: 'body', reportProgress?: boolean): Observable<any>;
    public deleteSubmissionComment(id: string, observe?: 'response', reportProgress?: boolean): Observable<HttpResponse<any>>;
    public deleteSubmissionComment(id: string, observe?: 'events', reportProgress?: boolean): Observable<HttpEvent<any>>;
    public deleteSubmissionComment(id: string, observe: any = 'body', reportProgress: boolean = false ): Observable<any> {
        if (id === null || id === undefined) {
            throw new Error('Required parameter id was null or undefined when calling deleteSubmissionComment.');
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

        return this.httpClient.delete<any>(`${this.configuration.basePath}/api/submissioncomments/${encodeURIComponent(String(id))}`,
            {
                withCredentials: this.configuration.withCredentials,
                headers: headers,
                observe: observe,
                reportProgress: reportProgress
            }
        );
    }

    /**
     * Gets a specific SubmissionComment by id
     * Returns the SubmissionComment with the id specified
     * @param id The id of the SubmissionComment
     * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
     * @param reportProgress flag to report request and response progress.
     */
    public getSubmissionComment(id: string, observe?: 'body', reportProgress?: boolean): Observable<SubmissionComment>;
    public getSubmissionComment(id: string, observe?: 'response', reportProgress?: boolean): Observable<HttpResponse<SubmissionComment>>;
    public getSubmissionComment(id: string, observe?: 'events', reportProgress?: boolean): Observable<HttpEvent<SubmissionComment>>;
    public getSubmissionComment(id: string, observe: any = 'body', reportProgress: boolean = false ): Observable<any> {
        if (id === null || id === undefined) {
            throw new Error('Required parameter id was null or undefined when calling getSubmissionComment.');
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

        return this.httpClient.get<SubmissionComment>(`${this.configuration.basePath}/api/submissioncomments/${encodeURIComponent(String(id))}`,
            {
                withCredentials: this.configuration.withCredentials,
                headers: headers,
                observe: observe,
                reportProgress: reportProgress
            }
        );
    }

    /**
     * Gets SubmissionComments
     * Returns a list of SubmissionComments.
     * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
     * @param reportProgress flag to report request and response progress.
     */
    public getSubmissionComments(observe?: 'body', reportProgress?: boolean): Observable<Array<SubmissionComment>>;
    public getSubmissionComments(observe?: 'response', reportProgress?: boolean): Observable<HttpResponse<Array<SubmissionComment>>>;
    public getSubmissionComments(observe?: 'events', reportProgress?: boolean): Observable<HttpEvent<Array<SubmissionComment>>>;
    public getSubmissionComments(observe: any = 'body', reportProgress: boolean = false ): Observable<any> {

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

        return this.httpClient.get<Array<SubmissionComment>>(`${this.configuration.basePath}/api/submissioncomments`,
            {
                withCredentials: this.configuration.withCredentials,
                headers: headers,
                observe: observe,
                reportProgress: reportProgress
            }
        );
    }

    /**
     * Gets SubmissionComments for the designated SubmissionOption
     * Returns a list of SubmissionComments for the SubmissionOption.
     * @param submissionOptionId The ID of the SubmissionOption
     * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
     * @param reportProgress flag to report request and response progress.
     */
    public getSubmissionCommentsBySubmissionOptionId(submissionOptionId: string, observe?: 'body', reportProgress?: boolean): Observable<Array<SubmissionComment>>;
    public getSubmissionCommentsBySubmissionOptionId(submissionOptionId: string, observe?: 'response', reportProgress?: boolean): Observable<HttpResponse<Array<SubmissionComment>>>;
    public getSubmissionCommentsBySubmissionOptionId(submissionOptionId: string, observe?: 'events', reportProgress?: boolean): Observable<HttpEvent<Array<SubmissionComment>>>;
    public getSubmissionCommentsBySubmissionOptionId(submissionOptionId: string, observe: any = 'body', reportProgress: boolean = false ): Observable<any> {
        if (submissionOptionId === null || submissionOptionId === undefined) {
            throw new Error('Required parameter submissionOptionId was null or undefined when calling getSubmissionCommentsBySubmissionOptionId.');
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

        return this.httpClient.get<Array<SubmissionComment>>(`${this.configuration.basePath}/api/submissionoption/${encodeURIComponent(String(submissionOptionId))}/submissioncomments`,
            {
                withCredentials: this.configuration.withCredentials,
                headers: headers,
                observe: observe,
                reportProgress: reportProgress
            }
        );
    }

    /**
     * Updates a  SubmissionComment
     * Updates a SubmissionComment with the attributes specified.  The ID from the route MUST MATCH the ID contained in the submissionComment parameter  &lt;para /&gt;  Accessible only to a ContentDeveloper or an Administrator
     * @param id The Id of the SubmissionComment to update
     * @param SubmissionComment The updated SubmissionComment values
     * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
     * @param reportProgress flag to report request and response progress.
     */
    public updateSubmissionComment(id: string, SubmissionComment?: SubmissionComment, observe?: 'body', reportProgress?: boolean): Observable<SubmissionComment>;
    public updateSubmissionComment(id: string, SubmissionComment?: SubmissionComment, observe?: 'response', reportProgress?: boolean): Observable<HttpResponse<SubmissionComment>>;
    public updateSubmissionComment(id: string, SubmissionComment?: SubmissionComment, observe?: 'events', reportProgress?: boolean): Observable<HttpEvent<SubmissionComment>>;
    public updateSubmissionComment(id: string, SubmissionComment?: SubmissionComment, observe: any = 'body', reportProgress: boolean = false ): Observable<any> {
        if (id === null || id === undefined) {
            throw new Error('Required parameter id was null or undefined when calling updateSubmissionComment.');
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

        return this.httpClient.put<SubmissionComment>(`${this.configuration.basePath}/api/submissioncomments/${encodeURIComponent(String(id))}`,
            SubmissionComment,
            {
                withCredentials: this.configuration.withCredentials,
                headers: headers,
                observe: observe,
                reportProgress: reportProgress
            }
        );
    }

}
