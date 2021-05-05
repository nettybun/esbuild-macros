/* eslint-disable no-unused-vars */
import esbuild from 'esbuild';
import { writeFileSync, readFileSync } from 'fs';

import { replaceMacros } from './packages/acorn-macros';

import {
  styletakeoutMacro,
  // Alias so VSCode does syntax highlighting
  cssImpl as css,
  injectGlobalImpl as injectGlobal
} from './packages/styletakeout.macro/implementation';

async function build() {
  const buildResult = await esbuild.build({
    entryPoints: ['...'],
    // Pass to buildResult instead
    write: false,
    format: 'esm',
    // XXX: Since I'm steering this into a generic acorn project not tied to
    // esbuild, I shouldn't provide this plugin built in. They can write it.
    plugins: [
      {
        name: 'skip-macros',
        setup(build) {
          build.onLoad({ filter: /\.macro$/ }, args => {
            return { path: args.path, external: true };
          });
        },
      },
    ],
    bundle: true,
    minify: true,
  });
  const [result] = buildResult.outputFiles;
  const bundleA = (new TextDecoder()).decode(result.contents);
  // XXX: Should this be like acorn-globals are accept either a string or ast?
  // Unfortunately developers often favour simplicity over explicitness...

  // XXX: Similarly, I think it'd be handy to return a list of replacement
  // objects (diffs) in order, rather than perform them all and return a string
  // but I think I'd be the only person to appreciate that! ;n;

  // XXX: It makes sense for replaceMacros() to handle template string
  // simplification for _all_ macros instead of doing it in only styletakeout
  const bundleB = replaceMacros(bundleA, [
    styletakeoutMacro({
      importEvals: {
        value: 2021,
        decl: {
          textBackground: 'textBackground',
          textColour: 'textColour',
        },
        colours: {
          grey: '#888',
          black: '#000',
        },
        classes: {
          center: css`text-align: center;`,
        },
      },
      outputFile: './dist/out.css',
      verbose: true,
      beautify: true,
    }),
    // sqlInjectionMacro({ ... }),
    // msMacro({ ... }),
  ]);
  writeFileSync('./dist/out.js');
}
