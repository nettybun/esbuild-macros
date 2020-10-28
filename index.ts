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

(build as (options: BuildOptions) => Promise<BuildResult>)({
  // TODO: Process.argv
  entryPoints: ['macros/styletakeout.macro/example.ts'],
  outfile: 'dist/styletakeout-example.js',
  bundle: true,
  format: 'esm',
  plugins: [
    macroPlugin,
  ],
  // macros: [
  //   'styletakeout.macro',
  // ],
  jsxFactory: 'h',
  jsxFragment: 'h',
})
  .then(() => {
    console.log(macroSnippets);
    console.log(macroSnippetsLookup);
  })
  .catch(() => process.exit(1));
