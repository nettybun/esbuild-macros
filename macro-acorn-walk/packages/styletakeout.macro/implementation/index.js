// This is the AST processing code used in replaceMacro(). It's looking for tag
// template expressions and objects member expressions. If you're a macro author
// you might want to support other types too, such as unary expressions,
// function calls, etc.

// Side effect: Start a stylesheet immediately
const sheet = '';

function cssImpl(statics, ...templateVariables) {
  console.log('cssImpl');
  // TODO: importObject will eval "50px" to 50px (no quotes...)
  return 'CSS'; // Put a string back in the sourcecode?
}

function injectGlobalImpl(statics, ...templateVariables) {
  console.log('injectGlobalImpl');
  return ''; // Put literally nothing back
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
