// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the
// project root for license information or contact permission@sei.cmu.edu for full terms.

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable()
export class FaviconService {
  private svgContent: string | null = null;
  private isLoading = false;
  private pendingColor: string | null = null;

  constructor(private http: HttpClient) {
    // Load SVG immediately without blocking
    this.loadSvgIcon();
  }

  /**
   * Load SVG icon content
   */
  private loadSvgIcon(): void {
    if (this.isLoading || this.svgContent) {
      return;
    }

    this.isLoading = true;
    this.http
      .get('assets/svg-icons/crucible-icon-cite.svg', { responseType: 'text' })
      .subscribe({
        next: (svg) => {
          this.svgContent = svg.trim();
          this.isLoading = false;

          // If there was a pending color update, apply it now
          if (this.pendingColor) {
            this.updateFavicon(this.pendingColor);
            this.pendingColor = null;
          }
        },
        error: (err) => {
          this.isLoading = false;
          console.error('FaviconService: Failed to load SVG', err);
        }
      });
  }

  /**
   * Update favicon with the given hex color
   * @param hexColor The hex color to apply to the favicon (e.g., '#E81717')
   */
  updateFavicon(hexColor: string): void {
    if (!this.svgContent) {
      this.pendingColor = hexColor;
      return;
    }

    // Inject color into cls-2 style (CITE uses cls-2 for the background)
    const coloredSvg = this.svgContent.replace(
      '.cls-2{}',
      `.cls-2{fill:${hexColor};}`
    );

    // Convert to data URI using URL encoding (more reliable than Base64 for SVGs)
    const encodedSvg = encodeURIComponent(coloredSvg);
    const dataUri = `data:image/svg+xml,${encodedSvg}`;

    // Update or create favicon link element
    let faviconLink = document.querySelector<HTMLLinkElement>(
      "link[rel*='icon']"
    );
    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.rel = 'icon';
      document.head.appendChild(faviconLink);
    }
    faviconLink.href = dataUri;
  }
}
