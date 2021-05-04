import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

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

// These are the imports? Maybe? Unless I import the whole file...
// If I'm going the eval() route then importing it makes sense. Unfortunately
// this is an issue for TypeScript and transpilation.
const styletakeout = {
  value: 2021,
  decl: {
    background: '#FFF',
    colour: styletakeout.colours,
  },
  colours: {
    grey: '#CCC',
    black: '#000',
  },
  classes: {
    center: styletakeout.css`text-align: center;`,
  },
  css() {},
  injectGlobal() {},
};

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

const macroDefinitions = {
  'styletakeout.macro': (specifier, ancestors) => {
    // TODO: These will need to be defined as eval-able objects/functions or at
    // least be able to be processed in an arbitrary order such as a css``
    // noticing it has a decl inside of it but that decl has not yet been hit.
    if (['css', 'injectGlobal'].includes(specifier)) {
      // TODO: This is always true? Because "Program"
      if (ancestors.length < 2) {
        throw 'Macros css and injectGlobal must be called as tag template functions';
      }
      const self = ancestors[ancestors.length - 1];
      const parent = ancestors[ancestors.length - 2];
      const errorLoc = `${specifier}@${self.start}->${self.end}`;
      if (parent.type !== 'TaggedTemplateExpression') {
        throw 'Macros css and injectGlobal must be called as tag template functions';
      }
      // No just run?
      // const { expressions, quasis } = parent.quasi;
      // Not run...check the statements for validity? Like individually eval
      // each quasis? They have a start/end. I can eval them...
      const { start, end } = parent.quasi;
      let ret;
      try {
        ret = eval(bundle.slice(start, end));
      } catch (err) {
        throw `Macro ${errorLoc}: ${err}`;
      }
      if (typeof ret !== 'string') {
        throw `Macro ${errorLoc} eval returned type ${typeof ret} instead of a string`;
      }
      return ret;
    } else if (specifier in styletakeout) {
      // It's a decl, colours, etc. Possibly a single value...like a number?
      // Dropping in the value should work? Like `{ ... }.colours.background`.
      // Then also for `5.colours` it'll throw. How to know the boundary index
      // values? Look up but by how much...

      // If it's a unary, binary, expression, those are fine. If it's a function
      // parameter that's not fine? Same with a class? Ugh. Do I need to check
      // all?
      styletakeout[specifier];
    }
    throw new Error(`Unknown import "${specifier}" for styletakeout.macro`);
  },
};

// TODO: https://github.com/acornjs/acorn/issues/946
walk.ancestor(ast, {
  ImportDeclaration(node) {
    console.log(`Found import statement ${node.start}->${node.end}`);
    const sourceName = node.source.value;
    if (!sourceName.endsWith('.macro')) return;
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
    console.log('Identifier matches', meta.source, meta.specifier);
    ancestors.forEach((n, i) => {
      console.log(`  - ${'  '.repeat(i)}${n.type}:${JSON.stringify(n)}`);
    });
    // TODO: Actually do the replacement now by adding to a replace-queue:
    // { start: 103, end: 144, content: '...' } | undefined
    const diff = macroDefinitions[meta.source](meta.specifier, ancestors);
    // Later I'll do a topological sort maybe? How to reconcile nested changes?
    // Does modifying the AST reflect in later things? I think so?

    // Decl/Colours/Etc can look up, if it's in template string, then if it's
    // the only thing in the quasis expression then remove the expression (which
    // joins the neighbouring strings) and if there are no quasis anymore and
    // it's not a tag template then convert it to a normal string

    // But I'm not serializing the AST...

    // The AST actually encounters the css`` before the ${decl.x.y} inside of it
    // so I need to...look down? Not only up? Yeah. That's...simpler?

    // That means I _don't_ do decl's first anymore (!!!) I do it in the order
    // of the AST. So I get a css``, I read its tag, covers two decl`s, then
    // return, then encounter those two decl's next - I'll have known that I've
    // seen these based on their start/end indices. I basically skip until I'm
    // beyond a certain "cursor". This is also handy because looking down means
    // I can detect css`` inside css`` (which is illegal; says me).

    // Either that or... I use the start/end to take css`...` out in its
    // entirety and eval() it. Spicy. Yeah. Huh. Don't walk that AST unless I
    // need to I guess...

    // Oh.

    // I don't need walk.ancestor? Because I look down, not up... and I eval. Is
    // that real hot girl shit?...No. No it's not. I _do_ need ancestor because
    // decl/css/etc still needs to look up to see if they're in a template
    // string expression and try to clean it up. Thankfully now I'm not cleaning
    // up css`...` strings, only `m5 ${css`...`} p5 ${decl.x}` strings...

    // That will use a template-queue for patches...patch to `m5 #HASH p5 ${}`
    // then later decl will see its also in a template string, check the queue-
    // Uh. No. Bad.

    // No it's less work to invoke a moment at the moment of noticing that css``
    // is in a template string expression: move up and process all quasis: this
    // will add the full start/end of the string to the replace-queue which is
    // already a handled use case. Good.

    // Ok that handles the topo sort issue and macro ordering _I think_ 🤞🤞
  },
});

console.log('macroSpecifiersToLocals', macroSpecifiersToLocals);
console.log('macroLocalsToSpecifiers', macroLocalsToSpecifiers);
