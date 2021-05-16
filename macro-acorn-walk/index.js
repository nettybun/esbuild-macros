/* eslint-disable no-unused-vars */
import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { replaceMacros } from './packages/acorn-macros/index.js';
import {
  styletakeoutMacro,
  // Alias so VSCode does syntax highlighting
  cssImpl as css,
  injectGlobalImpl as injectGlobal
} from './packages/styletakeout.macro/implementation/index.js';

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
          build.onLoad({ filter: /.+\.macro$/ }, args => {
            console.log('Skip as external:', args.path);
            return { path: args.path, external: true };
          });
        },
      },
    ],
    external: [
      'styletakeout.macro', // Node v16.1.0 doesn't like plugins above?
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
          pageBackground: 'pageBackground',
          textBackground: 'textBackground',
          textColour: 'textColour',
        },
        colours: {
          black: '#000',
        },
        classes: {
          center: css`text-align: center;`,
          text: {
            _0_xs: css`font-size: 0.75rem;`,
            _1_sm: css`font-size: 0.875rem;`,
          },
        },
        sizes: {
          _03: '30px',
          _04: '40px',
          _05: '50px',
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
build();
