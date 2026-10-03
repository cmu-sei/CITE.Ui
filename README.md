# CiteUi

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 9.1.

## Documentation

[CITE Documentation](https://cmu-sei.github.io/crucible/cite/)

## Color Theming

Blueprint uses a monochrome gray Material 3 SCSS palette with runtime top-bar color overrides from `settings.json`.

### Changing the top bar color

| File | Field / Value | Purpose |
|------|---------------|---------|
| `src/assets/config/settings.json` | `"AppTopBarHexColor": "#E81717"` | Runtime config -- top bar background color |
| `src/assets/config/settings.json` | `"AppTopBarHexTextColor": "#FFFFFF"` | Runtime config -- top bar text color |
| `src/app/app.component.ts` | `'#C41230'` / `'#FFFFFF'` fallbacks in `setTheme()` | Runtime fallbacks when settings are not provided |

To change the top bar color for a deployment, update `AppTopBarHexColor` and `AppTopBarHexTextColor` in `settings.json`.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4721/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Unit tests run on Vitest (jsdom) through Angular's `@angular/build:unit-test` builder, with zone change detection like the app, and use Angular Testing Library.

```bash
npm test                 # run every spec once (ng test --watch=false)
npm run test:watch       # re-run on change (ng test)
npm run test:coverage    # run once with coverage and enforce the thresholds in angular.json
```

Run a subset with `npx ng test --watch=false --include='src/app/data/**/*.spec.ts'`.

Shared helpers live in [`src/app/test-utils/`](src/app/test-utils/): `renderComponent()`, `getDefaultProviders()`, `ApiStub` for the generated API services, `permissionDataProviders()` for permission gates, the fake SignalR hub and `recordEmissions()`. Akita stores and queries stay real in tests; the generated API services and SignalR are stubbed. `vitest.config.ts` applies the `patches/` files (ESM fixes for Akita and Material color utilities) before each run.

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
