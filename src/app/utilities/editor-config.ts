// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.
import { AngularEditorConfig } from '@kolkov/angular-editor';

const EDITOR_FONTS = [
  { class: 'arial', name: 'Arial' },
  { class: 'times-new-roman', name: 'Times New Roman' },
  { class: 'calibri', name: 'Calibri' },
  { class: 'comic-sans-ms', name: 'Comic Sans MS' },
];

/**
 * Standard angular-editor configuration for editing rich text.
 */
export const EDITOR_CONFIG: AngularEditorConfig = {
  editable: true,
  spellcheck: true,
  height: 'auto',
  minHeight: '0',
  maxHeight: 'auto',
  width: 'auto',
  minWidth: '0',
  translate: 'yes',
  enableToolbar: true,
  showToolbar: true,
  placeholder: 'Enter text here...',
  defaultParagraphSeparator: '',
  defaultFontName: '',
  defaultFontSize: '',
  fonts: EDITOR_FONTS,
  uploadUrl: '',
  uploadWithCredentials: false,
  sanitize: true,
  toolbarPosition: 'top',
  toolbarHiddenButtons: [['backgroundColor']],
};

/**
 * Standard angular-editor configuration for displaying read-only rich text.
 * Fills the width of its container and reserves a tall viewing area.
 */
export const VIEW_CONFIG: AngularEditorConfig = {
  editable: false,
  height: 'auto',
  minHeight: '1200px',
  width: '100%',
  minWidth: '0',
  translate: 'yes',
  enableToolbar: false,
  showToolbar: false,
  placeholder: '',
  defaultParagraphSeparator: '',
  defaultFontName: '',
  defaultFontSize: '',
  sanitize: true,
};

/**
 * Read-only configuration that sizes itself to its content up to a capped
 * height, scrolling beyond that, for display in a constrained container.
 */
export const VIEW_CONFIG_CAPPED_HEIGHT: AngularEditorConfig = {
  ...VIEW_CONFIG,
  minHeight: '0',
  maxHeight: '400px',
};
