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

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
