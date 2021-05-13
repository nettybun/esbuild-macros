// This is the AST processing code used in replaceMacro(). It's looking for tag
// template expressions and objects member expressions. If you're a macro author
// you might want to support other types too, such as unary expressions,
// function calls, etc.

const cssImpl = () => {};
const injectGlobalImpl = () => {};

const styleTakeoutMacro = (options) => {
  const objectExports = options.objectExports ?? {};
  return {
    importSource: 'styletakeout.macro',
    rangeFromAST: (importSpecifier, identifierAncestors) => {
      const node = identifierAncestors[identifierAncestors.length - 1];
      const nodeParent = identifierAncestors[identifierAncestors.length - 2];
      if ('css' === importSpecifier || 'injectGlobal' === importSpecifier) {
        if (nodeParent.type !== 'TaggedTemplateExpression') {
          throw 'Macros css and injectGlobal must be called as tag template functions';
        }
        const range = nodeParent;
        return { start: range.start, end: range.end };
      }
      if (importSpecifier in objectExports) {
        // TODO: Read up the ancestor path to member expression.
        const range = {};
        return { start: range.start, end: range.end };
      }
      throw new Error(`Unknown import "${importSpecifier}" for styletakeout.macro`);
    },
    exports: {
      css: cssImpl,
      injectGlobal: injectGlobalImpl,
      ...objectExports,
    },
  };
};

export { styleTakeoutMacro, cssImpl, injectGlobalImpl };
