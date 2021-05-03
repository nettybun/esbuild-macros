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
// macros/styletakeout.macro/example.ts
import{decl as l,colours as i,css as e,classes as a}from"styletakeout.macro";

// macros/styletakeout.macro/example-imported.ts
import{decl as s,sizes as r,css as c}from"styletakeout.macro";
var p = r._04,
t = c\`
  padding: \${s.size._05};
\`;

// macros/styletakeout.macro/example.ts
var u = i.blue._800,
o = e\`
  padding: 15px;
  background-color: \${i.blue._700};
  margin-top: \${l.size._05};
  margin-left: \${l.size._04};
  margin-right: \${l.size._03};
\`;
function d(n){return n+10}
console.log(d(10));
console.log(o);
console.log(l.pageBackground);
console.log(t);
var _ = \`m5 p5 \${e\`vertical-align: middle\`} align-center \${o} \${a.text._0_xs}\`,
x = \`m5 p5 \${e\`vertical-align: middle\`} align-center\`,
b = \`m5 p5 \${o} \${e\`vertical-align: middle\`} align-center \${o}\`,
f = \`\${o} \${e\`vertical-align: middle\`}\`,
h = \`\${e\`vertical-align: middle\`}\`,
y = \`\${e\`vertical-align: middle\`} hello\`;
`.trim();

const ast = acorn.parse(bundle, {
  ecmaVersion: 2020,
  sourceType: 'module',
  // Controls line/column but I only need start/end indices so no thanks
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
