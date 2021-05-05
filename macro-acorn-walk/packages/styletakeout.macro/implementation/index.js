// This is the AST processing code used in replaceMacro()

// Macros will just be a function I guess ^-^
// (specifier:string, ancestors:acorn.Node[]) => [start:number, end:number]
const styleTakeoutMacro = (options) => {
  const importEvals = options.importEvals ?? {};
  return (specifier, ancestors) => {
    const node = ancestors[ancestors.length - 1];
    const nodeParent = ancestors[ancestors.length - 2];
    if ('css' === specifier || 'injectGlobal' === specifier) {
      if (nodeParent.type !== 'TaggedTemplateExpression') {
        throw 'Macros css and injectGlobal must be called as tag template functions';
      }
      const range = nod// eParent;
      return [range.start, range.end];
    }
    if (specifier in importEvals) {
      // TODO: Read up the ancestor path tp the nearest expression? Need a
      // replacement range to eval...
      const range = // ???; Unary expression? Tag template? Function parameter?
      return [range.start, range.end];
    }
    throw new Error(`Unknown import "${specifier}" for styletakeout.macro`);
  };
};

export { styleTakeoutMacro, cssImpl, injectGlobalImpl };
