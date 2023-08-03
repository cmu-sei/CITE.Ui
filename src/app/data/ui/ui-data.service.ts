/*
 Copyright 2023 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the
 project root for license information.
*/

import { Injectable } from '@angular/core';

export class UIState {
  selectedTheme = '';
  selectedMselTab = '';
  expandedItems: string[] = [];
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
    this.uiState.selectedEvaluation = evaluationId;
    this.saveChanges();
  }

  getEvaluation(): string {
    return this.uiState.selectedEvaluation;
  }
  // end Evaluation selection

  //
  // section selection
  setSection(section: string) {
    this.uiState.selectedSection = section;
    this.saveChanges();
  }

  getSection(): string {
    return this.uiState.selectedSection;
  }
  // end section selection

  //
  // Team selection
  setTeam(team: string) {
    this.uiState.selectedTeam = team;
    this.saveChanges();
  }

  getTeam(): string {
    return this.uiState.selectedTeam;
  }
  // end Team selection

  //
  // Submission selection
  setSubmission(submission: string) {
    this.uiState.selectedSubmission = submission;
    this.saveChanges();
  }

  getSubmission(): string {
    return this.uiState.selectedSubmission;
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
