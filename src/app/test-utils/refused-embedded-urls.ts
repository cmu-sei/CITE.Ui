// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

// URLs a scoring model's embedded frame must never load: script-bearing
// schemes, other schemes, relative URLs, and http(s) URLs without // or a host,
// which a frame resolves against CITE's own address, so it frames CITE itself
export const REFUSED_EMBEDDED_URLS = [
  'javascript:alert(document.domain)',
  'JavaScript:alert(1)',
  ' javascript:alert(1)',
  'java\tscript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'vbscript:msgbox(1)',
  'blob:https://cite.test/0b1e',
  'file:///etc/passwd',
  'ftp://files.example.com/',
  'about:blank',
  '/api/scoringModels',
  '//evil.example.com/',
  'example.com/dashboard',
  'https:dashboard.example.com/panel',
  'http:/dashboard.example.com',
  'https:\\dashboard.example.com',
  'http://',
  'https:///dashboard.example.com',
  'https://\\dashboard.example.com',
  'https:// ',
  ' ',
];
