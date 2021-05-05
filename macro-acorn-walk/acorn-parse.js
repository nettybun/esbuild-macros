import * as acorn from 'acorn';
import { writeFileSync, readFileSync } from 'fs';

const bundle = readFileSync('./assets/bundle.js', 'utf-8');
const ast = acorn.parse(bundle, {
  ecmaVersion: 2020,
  sourceType: 'module',
  // Controls line/column but I only need start/end indices so no thanks
  // locations: true,
});
writeFileSync('./assets/ast.json', JSON.stringify(ast, null, 2));
