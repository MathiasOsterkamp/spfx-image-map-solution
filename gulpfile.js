'use strict';

const gulp = require('gulp');
const build = require('@microsoft/sp-build-web');

build.addSuppression(`Warning - [sass] The local CSS class 'ms-Grid' is not camelCase and will not be type-safe.`);

// ---------------------------------------------------------------------------
// Override TypeScript
// SPFx 1.4.1 ships with TypeScript 2.4. Fluent UI 8 and @types/react 16
// require TypeScript 4.x. The version comes from package.json ("typescript").
// ---------------------------------------------------------------------------
build.TypeScriptConfiguration.setTypescriptCompiler(require('typescript'));

// ---------------------------------------------------------------------------
// Include React 16 in the bundle
// SPFx 1.4.1 treats react/react-dom as framework components and loads
// SharePoint's React version at runtime (SP2019: React 15.6 → hooks
// do not work). With linkedExternalsToBundle, React 16 from
// node_modules is built directly into the web part bundle.
// ---------------------------------------------------------------------------
build.configureWebpack.mergeConfig({
  linkedExternalsToBundle: ['react', 'react-dom']
});

// The tslint from SPFx 1.4.1 is not compatible with TypeScript 4.x
// ("Invalid source file …"). Type checking is done by the compiler (strict).
build.tslint.enabled = false;

build.initialize(gulp);
