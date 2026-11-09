'use strict';

const gulp = require('gulp');
const build = require('@microsoft/sp-build-web');

build.addSuppression(`Warning - [sass] The local CSS class 'ms-Grid' is not camelCase and will not be type-safe.`);

// ---------------------------------------------------------------------------
// TypeScript überschreiben
// SPFx 1.4.1 bringt TypeScript 2.4 mit. Fluent UI 8 und @types/react 16
// benötigen TypeScript 4.x. Die Version kommt aus package.json ("typescript").
// ---------------------------------------------------------------------------
build.TypeScriptConfiguration.setTypescriptCompiler(require('typescript'));

// ---------------------------------------------------------------------------
// React 16 ins Bundle aufnehmen
// SPFx 1.4.1 behandelt react/react-dom als Framework-Komponenten und lädt zur
// Laufzeit die React-Version von SharePoint (SP2019: React 15.6 → Hooks
// funktionieren nicht). Mit linkedExternalsToBundle wird React 16 aus
// node_modules fest in das Webpart-Bundle eingebaut.
// ---------------------------------------------------------------------------
build.configureWebpack.mergeConfig({
  linkedExternalsToBundle: ['react', 'react-dom']
});

// Das tslint aus SPFx 1.4.1 ist nicht mit TypeScript 4.x kompatibel
// ("Invalid source file …"). Typprüfung übernimmt der Compiler (strict).
build.tslint.enabled = false;

build.initialize(gulp);
