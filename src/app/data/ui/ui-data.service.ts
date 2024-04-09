/*
 Copyright 2023 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the
 project root for license information.
*/

import { Injectable } from '@angular/core';

export class UIState {
  // global items
  selectedTheme = '';
  selectedEvaluation = '';
  expandedItems: string[] = [];
  // per evaluation items
  evaluationMoveNumber: {[ key: string ]: number} = {};
  evaluationSection: {[ key: string ]: string} = {};
  evaluationSubmissionType: {[ key: string ]: string} = {};
  evaluationTeam: {[ key: string ]: string} = {};
}

@Injectable({
  providedIn: 'root',
})
export class UIDataService {
  private uiState = JSON.parse(localStorage.getItem('uiState')) || new UIState();

  constructor() {}

  //
  // Item Expansion
  isItemExpanded(id: string): boolean {
    return this.uiState.expandedItems.some(ei => ei === id);
  }

  setItemExpanded(id: string) {
    this.uiState.expandedItems.push(id);
    this.saveChanges();
  }

  setItemCollapsed(id: string) {
    const index = this.uiState.expandedItems.indexOf(id, 0);
    this.uiState.expandedItems.splice(index, 1);
    this.saveChanges();
  }
  // end item expansion

  //
  // Evaluation selection
  setEvaluation(evaluationId: string) {
    evaluationId = evaluationId ? evaluationId : 'blank';
    this.uiState.selectedEvaluation = evaluationId;
    this.saveChanges();
  }

  getEvaluation(): string {
    return this.uiState.selectedEvaluation;
  }
  // end Evaluation selection

  //
  // Move selection
  setMoveNumber(evaluationId: string, selectedMoveNumber: number) {
    evaluationId = evaluationId ? evaluationId : 'blank';
    this.uiState.evaluationMoveNumber[evaluationId] = selectedMoveNumber;
    this.saveChanges();
  }

  getMoveNumber(evaluationId: string): number {
    return this.uiState.evaluationMoveNumber[evaluationId];
  }
  // end Move selection

  //
  // section selection
  setSection(evaluationId: string, section: string) {
    this.uiState.evaluationSection[evaluationId] = section;
    this.saveChanges();
  }

  getSection(evaluationId: string): string {
    evaluationId = evaluationId ? evaluationId : 'blank';
    return this.uiState.evaluationSection[evaluationId];
  }
  // end section selection

  //
  // Team selection
  setTeam(evaluationId: string, team: string) {
    this.uiState.evaluationTeam[evaluationId] = team;
    this.saveChanges();
  }

  getTeam(evaluationId: string): string {
    return this.uiState.evaluationTeam[evaluationId];
  }
  // end Team selection

  //
  // SubmissionType selection
  setSubmissionType(evaluationId: string, submissionType: string) {
    this.uiState.evaluationSubmissionType[evaluationId] = submissionType;
    this.saveChanges();
  }

  getSubmissionType(evaluationId: string): string {
    return this.uiState.evaluationSubmissionType[evaluationId];
  }
  // end Submission selection

  //
  // theme section
  setTheme(theme: string) {
    this.uiState.selectedTheme = theme;
    this.saveChanges();
  }

  getTheme(): string {
    return this.uiState.selectedTheme;
  }
  // end theme

  saveChanges() {
    localStorage.setItem('uiState', JSON.stringify(this.uiState));
  }
}
