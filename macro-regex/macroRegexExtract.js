// Trying to hash out esbuild macros

// To handle esbuild minification I can map import aliases and look for t`...`
// instead of css`...`. Was hoping to use esbuild's `define` config to leverage
// its internal AST to replace the import with something very unique and regex
// searchable, i.e `css` to `$@css@$`, since that'd be the one chance to ask
// esbuild to do AST work on a macro's behave... Unfortunately `define` doesn't
// operate on imports ://

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

// eslint-disable-next-line no-unused-vars
import * as styletakeoutmacro from './macros/styletakeout.macro.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

esbuild.build({
  entryPoints: [path.join(__dirname, 'index.tsx')],
  write: false,
  format: 'esm',
  external: [
    '../src',
    '../src/w',
    'styletakeout.macro',
  ],
  bundle: true,
  minify: true,
}).then(buildResult => {
  const [result] = buildResult.outputFiles;
  let bundle = result.text;
  // Don't need to be ambiguous with '" and ;? because esbuild will normalize it
  const importMatch = bundle.match(/import{(.+?)}from"styletakeout.macro";/);
  if (!importMatch) {
    console.log('No macro to replace');
    console.log(bundle);
    return;
  }
  const [full, capture] = importMatch;
  const idxStart = importMatch.index;
  const idxEnd = idxStart + full.length;
  // Remove import statement
  bundle = bundle.slice(0, idxStart) + bundle.slice(idxEnd);
  const names = {};
  for (const importExpr of capture.split(',')) {
    // Safe even if not aliased/minified
    const [exportN, aliasN = exportN] = importExpr.split(' as ');
    names[exportN] = aliasN;
  }
  // There are 3 imports; decl, css, and injectGlobal. I don't actually need to
  // touch the decl import for ${} in css and injectGlobal because eval could
  // handle it, but I need to handle it for global variable declaration? So.
  // I'll regex out its object chain...
  const regexMemberExpr = head => `([^\\w.])${head}\\.((?:\\w+\\.?)+)`;
  const regexTagTemplateExpr = head => `([^\\w.])${head}\`((?:[^\`\\\\]|\\\\.)*)\``;

  const macros = ['decl', 'css', 'injectGlobal'];

  const macroRegexTypes = {
    decl: regexMemberExpr,
    css: regexTagTemplateExpr,
    injectGlobal: regexTagTemplateExpr,
  };

  // XXX: Using eval() feels wrong - this is the first time in my life doing it
  const macroHandlers = {
    decl: s => eval(`styletakeoutmacro.decl.${s}`),
    css: s => eval(`styletakeoutmacro.css\`${s}\``),
    injectGlobal: s => eval(`styletakeoutmacro.injectGlobal\`${s}\``),
  };

  for (const name of macros.filter(x => x in names)) {
    const alias = names[name];
    // This has state; exec keeps moving forward in while(); also 'g' is needed
    const regex = new RegExp(macroRegexTypes[name](alias), 'g');
    console.log(name, regex);
    bundle = bundle.replace(
      regex,
      (match, groupDelimeter, groupContent, index) => {
        console.log({
          name,
          match,
          index,
          indexNext: regex.lastIndex,
          groupDelimeter,
          groupContent,
        });
        const macroResponse = macroHandlers[name](groupContent);
        if (typeof macroResponse !== 'string') {
          throw new Error(`Macro handler "${name}" returned "${macroResponse}" `
            + `when given "${groupContent}" which isn't a string.`);
        }
        // TODO: Macros won't always return a string, i.e ms.macro
        // The above error was written because decl might return an object, but
        // that should be handled there? Proxy object? No...
        // Oh.
        // I mean, ok, I could literally just return the whole thing? Is that
        // what they want? It's eval afterall. `const x = decl.colours` might be
        // useful in ways the Babel styletakeout.macro couldn't be
        return groupDelimeter + `"${macroResponse}"`;
      });
  }
  console.log(bundle);
  return fs.writeFile(path.join(__dirname, 'out.css'), '');
}).catch(err => {
  console.error(err);
  process.exit(1);
});
