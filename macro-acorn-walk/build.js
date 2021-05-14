/* eslint-disable no-unused-vars */
import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { replaceMacros } from './packages/acorn-macros';
import {
  styletakeoutMacro,
  // Alias so VSCode does syntax highlighting
  cssImpl as css,
  injectGlobalImpl as injectGlobal
} from './packages/styletakeout.macro/implementation';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

injectGlobal`
  body {
    background-color: fuchsia;
  }
`;

async function build() {
  const buildResult = await esbuild.build({
    entryPoints: [
      path.join(__dirname, '../macros/styletakeout.macro/example.ts'),
    ],
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
  // XXX: It makes sense for replaceMacros() to handle template string
  // simplification for _all_ macros instead of doing it in only styletakeout
  const bundleB = replaceMacros(bundleA, [
    styletakeoutMacro({
      // TODO: Name pending... depends if AST walking defers for object member
      // expressions vs identifiers like "2021".
      importObjects: {
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
  fs.writeFileSync('./dist/out-original.js', bundleA);
  fs.writeFileSync('./dist/out-replaced-macros.js', bundleB);
}
