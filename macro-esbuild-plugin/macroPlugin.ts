import * as fs from 'fs';
import type { Plugin } from 'esbuild';

type MacroSnippet = {
  macroPackage: string
  macroImport: string
  snipID: string
  snipContent: string
  filepath: string
  // TODO: Convert to a line and column by repeated `indexOf('\n', lastIndex)`
  offset: number
}

type MacroSnippetLookupTable = {
  [macroPackage in string]?: {
    [macroImport in string]?: MacroSnippet[]
  }
}

const snippets: MacroSnippet[] = [];
const snippetsLookup: MacroSnippetLookupTable = {};
const importRegex = /^import (.+) from ['"](.+(?:\.|\/)macro)['"];?$/mg;

const macroPlugin: Plugin = {
  name: 'macro-plugin',
  setup(build) {
    build.onLoad({ filter: /\.(ts|js)x?$/ }, args => {
      if (args.path.includes('node_modules')) {
        console.log(`${args.path}; library; skipping`);
        return;
      }
      let source = fs.readFileSync(args.path, 'utf-8');
      let match;
      const discovered = [];
      while ((match = importRegex.exec(source))) {
        const [ line, importText, name ] = match;
        const { index } = match;
        // Remove the import statement
        source = source.slice(0, index) + source.slice(index + line.length + 1);
        const macros = importText.replace(/(\s+|{|})/g, '').split(',');

        // Regex is /(a|b|c)([`(][\s\S]*?[`)]|(?:\.\w+)*)*/
        // It removes all tag`templates`, func(calls), even in object.dot.paths()
        const regex = new RegExp(
          `(${macros.join('|')})([\`(][\\s\\S]*?[\`)]|(?:\\.\\w+)*)*`, 'g'
        );

        // Why replace with SNIP_N and not do the real replacement now? Because I
        // want esbuild to be able to do all of this step in parallel in Go with
        // better extraction via the AST. The one (1) call to Node for macro
        // resolution should be after the build and bundling. No plugin needed.
        source = source.replace(
          regex,
          (match, macro: string, content: string, offset: number) => {
            const snip: MacroSnippet = {
              macroPackage: name,
              macroImport: macro,
              snipID: `SNIP_${snippets.length}`,
              snipContent: content,
              filepath: args.path,
              offset,
            };

            snippets.push(snip);
            // Bind the same snip object into the lookup table
            const lookupPackage = snippetsLookup[snip.macroPackage] ?? {};
            const lookupImport = lookupPackage[snip.macroImport] ?? [];
            lookupImport.push(snip);
            lookupPackage[snip.macroImport] = lookupImport;
            snippetsLookup[snip.macroPackage] = lookupPackage;

            return snip.snipID;
          });
        discovered.push(`${name}: ${macros.join(',')}`);
      }
      if (discovered.length === 0) {
        console.log(`${args.path}; no macros; skipping`);
        return;
      }
      console.log(`${args.path}; removed ${discovered.length}\n  ${discovered.join('\n  ')}`);
      return { contents: source, loader: 'tsx' };
    });
  },
};

// TODO Macros: StripIndent, Preval, JSON-subset-loader, Millisecond-convert

export {
  macroPlugin,
  snippets as macroSnippets,
  snippetsLookup as macroSnippetsLookup
};
