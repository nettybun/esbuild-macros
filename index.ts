// Ironically esbuild doesn't support native ESM?
// There has to be a better way to do this...
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-var-requires
const { build } = require('esbuild');

import { BuildOptions, BuildResult } from 'esbuild';

import {
  macroPlugin,
  macroSnippets,
  macroSnippetsLookup
} from './macroPlugin.js';

// import styletakeoutMacro from 'esbuild-macros/styletakeout.macro';
// import prevalMacro from 'esbuild-macros/preval.macro';
// import stripIndentMacro from 'esbuild-macros/stripIndent.macro';
// import msMacro from 'esbuild-macros/ms.macro';
// import sqlMacro from 'esbuild-macros/sql.macro';
// import jsonMacro from 'esbuild-macros/json.macro';
// import yamlMacro from 'esbuild-macros/yaml.macro';

(build as (options: BuildOptions) => Promise<BuildResult>)({
  // TODO: Process.argv
  entryPoints: ['macros/styletakeout.macro/example.ts'],
  outfile: 'dist/styletakeout-example.js',
  bundle: true,
  format: 'esm',
  plugins: [
    macroPlugin,
  ],
  // macros: {
  //   'styletakeout.macro': styletakeoutMacro({
  //     importFile: './example/styletakeout.macro.ts',
  //     outputFile: './dist/takeout.css',
  //     verbose: true,
  //     beautify: true,
  //   }),
  //   'preval.macro': prevalMacro({
  //     verbose: true,
  //   }),
  //   'stripIndent.macro': stripIndentMacro(),
  //   'ms.macro': msMacro(),
  //   'sql.macro': sqlMacro(),
  //   // I know esbuild has loaders for this, but not for subsets of JSON such
  //   // as calling via `json('../huge.json', o => o.path.slice(0, 100);`
  //   'json.macro': jsonMacro({
  //     verbose: true,
  //   }),
  //   'yaml.macro': yamlMacro(),
  // },
  jsxFactory: 'h',
  jsxFragment: 'h',
})
  .then(() => {
    console.log(macroSnippets);
    console.log(macroSnippetsLookup);
  })
  .catch(() => process.exit(1));
