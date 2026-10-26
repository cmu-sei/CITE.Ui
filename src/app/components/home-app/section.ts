// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

// Its own file: HomeAppComponent imports EvaluationInfoComponent, which uses this, so
// defining it in home-app.component.ts made an import cycle that left one side undefined.
export enum Section {
  dashboard = 'dashboard',
  scoresheet = 'scoresheet',
  report = 'report',
  aggregate = 'aggregate'
}
