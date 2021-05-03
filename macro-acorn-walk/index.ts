/* eslint-disable @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unused-vars */

// This is our friend: node_modules/acorn/dist/acorn.d.ts
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

// From collecting all types in a Set() via walk.full(ast, node => ...)

type KnownNodeTypes =
  | 'BinaryExpression'
  | 'CallExpression'
  | 'ExpressionStatement'
  | 'Identifier'
  | 'ImportDeclaration'
  | 'ImportSpecifier'
  | 'Literal'
  | 'MemberExpression'
  | 'Progra'
  | 'TaggedTemplateExpression'
  | 'TemplateElement'
  | 'TemplateLiteral'
  | 'VariableDeclaration'
  | 'VariableDeclarator'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type NodeAny = acorn.Node & { [k: string]: any }


// TODO: Import esbuild and use it like macro-regex which transpiles the example
// code and passes the build result for further work. For now though, here's the
// output directly as a string.

const bundle = `
// ../macros/styletakeout.macro/example.ts
import {decl as i, colours as s, css as e, classes as n} from "styletakeout.macro";

// ../macros/styletakeout.macro/example-imported.ts
import {decl as o, sizes as a, css as r} from "styletakeout.macro";
const m = a._04, t = r\`
  padding: \${o.size._05};
\`

// ../macros/styletakeout.macro/example.ts
, $ = s.blue._400, l = e\`
  padding: 15px;
  background-color: \${s.blue._500};
  margin-top: \${i.size._05};
  margin-left: \${i.size._04};
  margin-right: \${i.size._03};
\`;
console.log(l);
console.log(i.pageBackground);
console.log(t);
"" + e\`vertical-align: middle\` + l + n.text._0_xs;
"" + e\`vertical-align: middle\`;
"" + l + e\`vertical-align: middle\` + l;
"" + l + e\`vertical-align: middle\`;
"" + e\`vertical-align: middle\`;
"" + e\`vertical-align: middle\`;
`.trim();

const ast = acorn.parse(bundle, {
  ecmaVersion: 2020,
  sourceType: 'module',
  // This is actually the line/column. I only care about the start/end indices.
  // locations: true,
});

const macroToImports: {
  [importSource in string]?: {
    [importSpecifier in string]?: string[]
  }
} = {};

// Reverse lookup from node objects?
// TODO: No. See below.
const importsToMacro = new Map<NodeAny, { source: string, specifier: string }>();

const walkerMethods: {
  [key in KnownNodeTypes]?: (node: NodeAny, state: unknown, ancestors: NodeAny[]) => void
} = {
  ImportDeclaration(node) {
    console.log(`Import ${node.start}->${node.end}`);
    const source = node.source.value as string;
    (node.specifiers as NodeAny[]).forEach(n => {
      const o = macroToImports[source] || (macroToImports[source] = {});
      const a = o[n.imported.name] || (o[n.imported.name] = []);
      if (!a.includes(n.local.name)) {
        a.push(n.local.name);
        importsToMacro.set(n.local, {
          source,
          specifier: n.local.name as string,
        });
      }
    });
  },
  Identifier(node, state, ancestors) {
    console.log('Identifier', node.name);
    // TODO: Ok obviously this isn't how it works - the node stores start/end
    // information so it'll be different every single time...
    const meta = importsToMacro.get(node);
    if (!meta) return;
    console.log(meta.source, meta.specifier);
  },
};

// TODO: https://github.com/acornjs/acorn/issues/946
// @ts-ignore Doesn't like NodeAny
walk.ancestor(ast, walkerMethods);

console.log(macroToImports);
