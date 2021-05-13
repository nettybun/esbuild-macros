import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { writeFileSync, readFileSync } from 'fs';

// From collecting all types in a Set() via walk.full(ast, node => ...)
// 'BinaryExpression'
// 'CallExpression'
// 'ExpressionStatement'
// 'Identifier'
// 'ImportDeclaration'
// 'ImportSpecifier'
// 'Literal'
// 'MemberExpression'
// 'Program'
// 'TaggedTemplateExpression'
// 'TemplateElement'
// 'TemplateLiteral'
// 'VariableDeclaration'
// 'VariableDeclarator'
// Skip esbuild for now since it's not wired up yet
const ast = JSON.parse(readFileSync('./assets/ast.json', 'utf-8'));

// { "styletakeout.macro": { "decl": ["a1", "d"], "css": ["c", "c1"] }, ... }
const macroSpecifiersToLocals = {};
// { "a1": { "source": "styletakeout.macro", "specifier": "decl" }, ... }
const macroLocalsToSpecifiers = {};

walk.ancestor(ast, {
  ImportDeclaration(node) {
    const sourceName = node.source.value;
    if (!sourceName.endsWith('.macro')) {
      console.log(`SKIP Import ${node.start}->${node.end}`);
      return;
    }
    console.log(`Import ${node.start}->${node.end} { ${node.specifiers.map(n => `${n.imported.name} as ${n.local.name}`)} } from ${sourceName}`);
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
  // XXX: This is different than `ast.filter(o => o.type === "Indentifier")`
  // because it _skips_ identifier nodes that are part of variable declarations,
  // import specifiers, and other areas that _define_ an identifier. This walk
  // callback is only for the _use_ of identifiers. It's also great because an
  // identifier in a member expression like "ok.decl.ok" matching _only_ the
  // first "ok" and not "decl" even though "decl" is { type: "Identifier" } too
  Identifier(node, state, ancestors) {
    const meta = macroLocalsToSpecifiers[node.name];
    if (!meta) {
      console.log(`SKIP Identifier ${node.start}->${node.end} ${node.name}`);
      return;
    }
    console.log(`Indentifier ${node.start}->${node.end} ${node.name} from ${meta.source}:${meta.specifier}`);
  },
});
