// This is the AST processing code used in replaceMacro(). It's looking for tag
// template expressions and objects member expressions. If you're a macro author
// you might want to support other types too, such as unary expressions,
// function calls, etc.

function cssImpl(statics, ...templateVariables) {
  console.log('cssImpl');
  return '"CSS"'; // Put a string back in the sourcecode
}

function injectGlobalImpl(statics, ...templateVariables) {
  console.log('injectGlobalImpl');
  return ''; // Put literally nothing back
}

/** @typedef {import('../../acorn-macros/index').Macro} Macro */

/** @type {(options: {}) => Macro} */
const styleTakeoutMacro = (options) => {
  const importObjects = options.importObjects ?? {};
  /** @type {Macro} */
  return {
    importSource: 'styletakeout.macro',
    importSpecifierImpls: {
      css: cssImpl,
      injectGlobal: injectGlobalImpl,
      ...importObjects,
    },
    importSpecifierRangeFn: (importSpecifier, identifierAncestors) => {
      const node = identifierAncestors[identifierAncestors.length - 1];
      const nodeParent = identifierAncestors[identifierAncestors.length - 2];
      if ('css' === importSpecifier || 'injectGlobal' === importSpecifier) {
        if (nodeParent.type !== 'TaggedTemplateExpression') {
          throw 'Macros css and injectGlobal must be called as tag template functions';
        }
        const range = nodeParent;
        return { start: range.start, end: range.end };
      }
      if (importSpecifier in importObjects) {
        // TODO: Read up the ancestor path to member expression.
        const range = node;
        return { start: range.start, end: range.end };
      }
      throw new Error(`Unknown import "${importSpecifier}" for styletakeout.macro`);
    },
  };
};

export { styleTakeoutMacro, cssImpl, injectGlobalImpl };
