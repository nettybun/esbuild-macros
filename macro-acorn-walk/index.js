import acorn from 'acorn';
import walk from 'acorn-walk';

// From collecting all types in a Set() via walk.full(ast, node => ...)
// 'BinaryExpression'
// 'CallExpression'
// 'ExpressionStatement'
// 'Identifier'
// 'ImportDeclaration'
// 'ImportSpecifier'
// 'Literal'
// 'MemberExpression'
// 'Progra'
// 'TaggedTemplateExpression'
// 'TemplateElement'
// 'TemplateLiteral'
// 'VariableDeclaration'
// 'VariableDeclarator'

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


// { "styletakeout.macro": { "decl": ["a1", "d"], "css": ["c", "c1"] }, ... }
const macroSpecifiersToLocals = {};
// { "a1": { "source": "styletakeout.macro", "specifier": "decl" }, ... }
const macroLocalsToSpecifiers = {};

// TODO: https://github.com/acornjs/acorn/issues/946
walk.ancestor(ast, {
  ImportDeclaration(node) {
    console.log(`Import ${node.start}->${node.end}`);
    const sourceName = node.source.value;
    node.specifiers.forEach(n => {
      const specImportMap = macroSpecifiersToLocals[sourceName] || (macroSpecifiersToLocals[sourceName] = {});
      const specLocals = specImportMap[n.imported.name] || (specImportMap[n.imported.name] = []);
      if (!specLocals.includes(n.local.name)) {
        specLocals.push(n.local.name);
        macroLocalsToSpecifiers[n.local.name] = {
          source: sourceName,
          specifier: n.imported.name,
        };
      }
    });
  },
  Identifier(node, state, ancestors) {
    console.log('Identifier', node.name);
    const meta = macroLocalsToSpecifiers[node.name];
    if (!meta) return;
    console.log('Identifier', node.name, meta.source, meta.specifier);
    ancestors.forEach(n => console.log('Ancestor:', n.type, n.name));
  },
});

console.log('macroSpecifiersToLocals', macroSpecifiersToLocals);
console.log('macroLocalsToSpecifiers', macroLocalsToSpecifiers);
