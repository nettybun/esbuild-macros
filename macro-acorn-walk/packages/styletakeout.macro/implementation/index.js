// This is the AST processing code used in replaceMacro(). It's looking for tag
// template expressions and objects member expressions. If you're a macro author
// you might want to support other types too, such as unary expressions,
// function calls, etc.

import { evalMetadata } from '../../acorn-macros/index.js';

// Side effect: Start a stylesheet immediately
let sheet = '';
let count = 0;

function interpolateTemplateString(quasis, expressions) {
  let string = '';
  for (let i = 0; i < expressions.length; i++) {
    string += quasis[i] + expressions[i];
  }
  string += quasis[quasis.length - 1];
  return string.replace(/\n?\s*/g, '');
}

function cssImpl(statics, ...templateVariables) {
  count++;
  const string = interpolateTemplateString(statics, templateVariables);
  sheet += `css: ${count}: ${string}\n`;
  console.log('cssImpl', string);
  // Location might not be provided if called outside of replaceMacros()
  const location = `[${evalMetadata.snipRawStart ?? '?'},${evalMetadata.snipRawEnd ?? '?'})`;
  // Put back a string. Also! Consider str.replaceAll('"', '\\"') as needed
  return `"css-${count}-${location}"`;
}

function injectGlobalImpl(statics, ...templateVariables) {
  count++;
  const string = interpolateTemplateString(statics, templateVariables);
  sheet += `injectGlobal: ${count}: ${string}\n`;
  console.log('injectGlobalImpl', string);
  // Put literally nothing back
  return '';
}

/** @typedef {import('../../acorn-macros/index').Macro} Macro */

/** @type {(options: {}) => Macro} */
const styletakeoutMacro = (options) => {
  const importObjects = options.importObjects ?? {};
  /** @type {Macro} */
  return {
    // TODO: hookPre, hookPost? To let macros do some cleanup
    importSource: 'styletakeout.macro',
    importSpecifierImpls: {
      css: cssImpl,
      injectGlobal: injectGlobalImpl,
      ...importObjects,
    },
    importSpecifierRangeFn: (importSpecifier, identifierAncestors) => {
      const [node, nodeParent, ...nodeRest] = [...identifierAncestors].reverse();
      if ('css' === importSpecifier || 'injectGlobal' === importSpecifier) {
        if (nodeParent.type !== 'TaggedTemplateExpression') {
          throw new Error('Macros css and injectGlobal must be called as tag template functions');
        }
        return { start: nodeParent.start, end: nodeParent.end };
      }
      if (importSpecifier in importObjects) {
        if (nodeParent.type !== 'MemberExpression') {
          throw new Error(`Import object ${importSpecifier} must accessed as an object: ${node.name}.x.y.z`);
        }
        let top = nodeParent;
        for (const node of nodeRest) if (node.type === 'MemberExpression') top = node;
        return { start: top.start, end: top.end };
      }
      throw new Error(`Unknown import "${importSpecifier}" for styletakeout.macro`);
    },
  };
};

export { styletakeoutMacro, cssImpl, injectGlobalImpl };
