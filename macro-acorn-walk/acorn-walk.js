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
const ast = readFileSync('./assets/ast.json');
