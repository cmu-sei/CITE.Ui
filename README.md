# CiteUi

This project uses [Angular CLI](https://github.com/angular/angular-cli) version 21 (Angular 21.2). Node `^20.19.0 || ^22.12.0 || >=24.0.0` is required.

## Documentation

[CITE Documentation](https://cmu-sei.github.io/crucible/cite/)

## Color Theming

CITE uses a monochrome gray Material 3 SCSS palette (`src/styles/_theme-colors.scss`, `src/styles/_dark-theme-colors.scss`) with runtime top bar and primary color overrides from the settings. Light mode paints the surface white (`src/styles/styles.scss`), because `#E81717` only reaches 4.5:1 as text on white.

### Changing the top bar and primary colors

| File | Field / Value | Purpose |
|------|---------------|---------|
| `src/assets/config/settings.json` | `"AppTopBarHexColor": "#E81717"` | Runtime config -- top bar background color |
| `src/assets/config/settings.json` | `"AppTopBarHexTextColor": "#FFFFFF"` | Runtime config -- top bar text color |
| `src/assets/config/settings.json` | `"AppLightModePrimaryHexColor": "#E81717"` / `"AppLightModePrimaryHexTextColor": "#FFFFFF"` | Runtime config -- primary color and its text color in light mode |
| `src/assets/config/settings.json` | `"AppDarkModePrimaryHexColor": "#F48B8B"` / `"AppDarkModePrimaryHexTextColor": "#000000"` | Runtime config -- primary color and its text color in dark mode (falls back to the light-mode value) |
| `src/app/app.module.ts` | `provideCrucibleTheme({ brand: { color: '#E81717', text: '#FFFFFF' } })` | Fallbacks when a top bar or light-mode key is not set |

The app loads `settings.json`, then `settings.shared.json` and `settings.env.json` from `src/assets/config/` when they exist, and merges them in that order, so later files override earlier ones. To change the colors for a deployment, set these keys in `settings.env.json`. Overriding colors moves accessibility responsibility to the operator, and rebranding usually means setting the top bar, light-mode and dark-mode keys together.

## Development server

Run `npm start` (`ng serve`) for a dev server. Navigate to `http://localhost:4721/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `npm run build` (`ng build`) to build the project. The build artifacts will be stored in the `dist/browser` directory. Without a configuration, `ng build` uses the base options in `angular.json` (no optimization); use `--configuration production` for a production build.

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

End-to-end tests for CITE are in the Playwright suite in [crucible-tests](https://github.com/cmu-sei/crucible-tests) (`cite/`), which runs against a running Crucible stack.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
