'use strict';

// Build customizations for SPFx 1.4.1. Runs on Node 8 - keep the syntax ES2017.
const os = require('os');
const path = require('path');
const gulp = require('gulp');
const build = require('@microsoft/sp-build-web');

const LIB_DIR = path.resolve(__dirname, 'lib');
const PNP_DIR = path.resolve(__dirname, 'node_modules', '@pnp');

build.addSuppression(`Warning - [sass] The local CSS class 'ms-Grid' is not camelCase and will not be type-safe.`);

// Compiler and linter

// SPFx 1.4.1 ships with TypeScript 2.4. Fluent UI 8 and @types/react 16
// require TypeScript 4.x. The version comes from package.json ("typescript").
build.TypeScriptConfiguration.setTypescriptCompiler(require('typescript'));

// The tslint from SPFx 1.4.1 is not compatible with TypeScript 4.x
// ("Invalid source file ..."). Linting is done by ESLint (npm run lint).
build.tslint.enabled = false;

// package.json overrides @microsoft/gulp-core-build-sass with a version based
// on Dart Sass, because the node-sass 4 of SPFx 1.4.1 has no binary for current Node.
build.sass.enabled = true;

// Webpack

/** Returns the resolved path of an optional dev dependency, or undefined if it is not installed. */
function resolveOptional(moduleName) {
  try {
    return require.resolve(moduleName);
  } catch (e) {
    return undefined;
  }
}

/** `@src/...` imports point to the compiled output (tsconfig.json maps the same alias to src/). */
function addSrcAlias(config) {
  config.resolve = config.resolve || {};
  config.resolve.alias = config.resolve.alias || {};
  config.resolve.alias['@src'] = LIB_DIR;
}

/**
 * Replaces the UglifyJS plugin of SPFx 1.4.1 (ES5 only) with Terser, so that
 * dependencies shipping ES2015+ code can be minified.
 * Only active if "terser-webpack-plugin-legacy" is installed.
 */
function useTerser(config) {
  const terserPath = resolveOptional('terser-webpack-plugin-legacy');
  if (!terserPath || !Array.isArray(config.plugins)) {
    return;
  }

  const TerserPlugin = require(terserPath);
  const isUglify = (plugin) => Boolean(plugin && plugin.options && plugin.options.mangle !== undefined);

  config.plugins = config.plugins.map((plugin) => !isUglify(plugin) ? plugin : new TerserPlugin({
    parallel: Math.max(os.cpus().length - 1, 1),
    extractComments: false,
    cache: true,
    sourceMap: true,
    terserOptions: {
      compress: { drop_console: false },
      output: { comments: false }
    }
  }));
}

/**
 * Transpiles `*.esm.js` files of dependencies, which webpack 3 cannot parse otherwise.
 * Only active if "esbuild-loader" is installed.
 */
function transpileEsmDependencies(config) {
  const loader = resolveOptional('esbuild-loader');
  if (!loader) {
    return;
  }

  config.module = config.module || {};
  config.module.rules = config.module.rules || [];

  const hasEsmRule = config.module.rules.some((rule) => rule.test && rule.test.toString().includes('esm\\.js'));
  if (!hasEsmRule) {
    config.module.rules.push({ test: /esm\.js$/, use: { loader, options: { target: 'es2015' } } });
  }
}

/**
 * Limits source-map-loader to our own output and @pnp. Without this, packages whose
 * source maps reference files that are not published break the build
 * ("Cannot find source file '../../packages/sp/telemetry.ts'").
 */
function restrictSourceMapLoader(config) {
  const rules = (config.module && config.module.rules) || [];

  rules
    .filter((rule) => typeof rule.use === 'string' && rule.use.includes('source-map-loader'))
    .forEach((rule) => { rule.include = [LIB_DIR, PNP_DIR]; });
}

build.configureWebpack.mergeConfig({
  // SPFx 1.4.1 treats react/react-dom as framework components and loads
  // SharePoint's React version at runtime (SP2019: React 15.6 -> hooks do not
  // work). This builds React 16 from node_modules into the web part bundle.
  linkedExternalsToBundle: ['react', 'react-dom'],

  additionalConfiguration: (config) => {
    addSrcAlias(config);
    useTerser(config);
    transpileEsmDependencies(config);
    restrictSourceMapLoader(config);
    return config;
  }
});

build.initialize(gulp);
