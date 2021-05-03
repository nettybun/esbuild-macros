/* eslint-disable @typescript-eslint/no-unused-vars */

// This is our friend: node_modules/acorn/dist/acorn.d.ts
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

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
  locations: true,
});

walk.full(ast, node => {
  console.log(node);
});
