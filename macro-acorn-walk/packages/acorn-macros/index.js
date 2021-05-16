import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

/** @typedef {{ importSource: string, importSpecifierImpls: MacroImpls, importSpecifierRangeFn: MacroRangeFn }} Macro */
/** @typedef {{ [name: string]: any }} MacroImpls */
/** @typedef {(specifier:string, ancestors:acorn.Node[]) => IntervalRange} MacroRangeFn */

/** @typedef {{ start: number, end: number }} IntervalRange */
/** @typedef {IntervalRange & { macroLocal: string }} OpenMacroRange */
/** @typedef {IntervalRange & { replacement: string }} ClosedMacroRange */

// This is updated every replacement before the eval so macros can access this
// metadata through this object. I don't provide sourcemapped line/col/filename
// info that's lost during esbuild since it's expensive to recover
const evalMetadata = {};

/** @param {string} code; @param {Macro[]} macros; @param {acorn.Node} [ast] */
const replaceMacros = (code, macros, ast) => {
  /** @type {{ [importSource: string]: number }} */
  const macroIndices = {};
  /** @type {{ [importSource: string]: MacroRangeFn }} */
  const macroToSpecifierRangeFns = {};
  /** @type {MacroImpls} */
  const macroToSpecifierImpls = {};
  macros.forEach((macro, i) => {
    const name = macro.importSource;
    if (macroIndices[name]) {
      throw new Error(`Duplicate macro "${name}" at indices ${macroIndices[name]} and ${i}`);
    }
    macroIndices[name] = i;
    macroToSpecifierRangeFns[name] = macro.importSpecifierRangeFn;
    macroToSpecifierImpls[name] = macro.importSpecifierImpls;
  });
  /** @type {{ [macro: string]: { [spec: string]: string[] } }} string[] is of local variable names */
  const macroSpecifierToLocals = {};
  /** @type {{ [local: string]: { source: string, specifier: string } }} source is the macro name */
  const macroLocalToSpecifiers = {};

  // Identifier ranges that could have macros in them. We've started parsing
  // their range (given by rangeFromAST) but haven't reached their end yet.
  /** @type {OpenMacroRange[]} */
  const openMacroRangeStack = [];
  // Identifiers that have been fully processed and eval'd. We've parsed past
  // their range end and these are ready to be sliced directly into the code.
  /** @type {ClosedMacroRange[]} */
  const closedMacroRangeList = [];

  /** @type {(range: ClosedMacroRange) => void} */
  const insertClosed = (range) =>
    intervalRangeListInsert(closedMacroRangeList, range);

  /** @type {(start: number, end: number) => ClosedMacroRange[]} */
  const spliceClosed = (start, end) =>
    // @ts-ignore JSDoc doesn't do <T extends IntervalRange[]>...
    intervalRangeListSplice(closedMacroRangeList, start, end);

  // This doesn't have to be a start AST node like node.type === "Program". It
  // can be anything. That's useful to someone somewhere.
  if (!ast) {
    ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
  }
  // Can be used by macro implementations during their call in eval()
  const evalMetadataReset = {
    // TODO: Enable this
    // code,
    snipRaw: '',
    snipRawStart: 0,
    snipRawEnd: 0,
    snipEval: '',
    macroSource: '',
    macroSpecifier: '',
  };
  // Import statements must come first as per ECMAScript specification but this
  // isn't enforced by Acorn, so throw if an import is after an identifier.
  let seenIndentifier = false;
  // TODO: Add types https://github.com/acornjs/acorn/issues/946
  /** @typedef {{ name: string }} Named */
  /** @typedef {acorn.Node & { name: string }} IdentifierNode */
  /** @typedef {acorn.Node & { source: { value: string }, specifiers: SpecifierNode[] }} ImportNode */
  /** @typedef {acorn.Node & { local: Named, imported: Named }} SpecifierNode */
  walk.ancestor(ast, {
    /** @param {ImportNode} node */
    ImportDeclaration(node) {
      if (seenIndentifier) {
        throw new Error('Import statement found after an identifier');
      }
      const sourceName = node.source.value;
      console.log(`Found import statement ${node.start}->${node.end} ${sourceName}`);
      if (!sourceName.endsWith('.macro') || !(sourceName in macroIndices)) return;
      node.specifiers.forEach(n => {
        const specImportMap = macroSpecifierToLocals[sourceName] || (macroSpecifierToLocals[sourceName] = {});
        const specLocals = specImportMap[n.imported.name] || (specImportMap[n.imported.name] = []);
        if (specLocals.includes(n.local.name)) return;
        specLocals.push(n.local.name);
        macroLocalToSpecifiers[n.local.name] = {
          source: sourceName,
          specifier: n.imported.name,
        };
      });
      insertClosed({ start: node.start, end: node.end, replacement: '' });
    },
    /** @param {IdentifierNode} node */
    Identifier(node, state, ancestors) {
      seenIndentifier = true;
      console.log('Identifier', node.name);
      const meta = macroLocalToSpecifiers[node.name];
      if (!meta) return;
      // Move items from open -> closed _BEFORE_ adding to the open stack
      closeOpenIdsUpTo(node.start);
      console.log('Identifier matches', meta.source, meta.specifier);
      ancestors.forEach((n, i) => {
        console.log(`  - ${'  '.repeat(i)}${n.type} ${p(n)}`);
      });
      const resolver = macroToSpecifierRangeFns[meta.source];
      const { start, end } = resolver(meta.specifier, ancestors);
      openMacroRangeStack.push({ start, end, macroLocal: node.name });
    },
  });
  // There might be elements on the open stack still so clear them
  closeOpenIdsUpTo(ast.end);

  /** @param {number} sourcecodeIndex */
  function closeOpenIdsUpTo(sourcecodeIndex) {
    // Walk through the stack backwards
    for (let i = openMacroRangeStack.length - 1; i >= 0; i--) {
      const open = openMacroRangeStack[i];
      if (open.end > sourcecodeIndex) return;
      openMacroRangeStack.pop();
      closeOpenId(open);
    }
  }

  /** @param {OpenMacroRange} open */
  function closeOpenId(open) {
    const { start, end, macroLocal } = open;
    console.log(`Closing open macro range: ${p(open)}`);
    let evalExpression = code.slice(start, end);
    evalMetadata.snipRaw = evalExpression;
    evalMetadata.snipRawStart = start;
    evalMetadata.snipRawEnd = end;
    // Work backwards to not mess up indices
    for (const range of spliceClosed(start, end).reverse()) {
      evalExpression
        = evalExpression.slice(0, range.start - start)
        + range.replacement
        + evalExpression.slice(range.end - start);
    }
    const { source, specifier } = macroLocalToSpecifiers[macroLocal];
    evalMetadata.snipEval = evalExpression;
    evalMetadata.macroSource = source;
    evalMetadata.macroSpecifier = specifier;
    evalMetadata.macroSpecifierLocal = macroLocal;
    console.log('Macro eval:', evalMetadata);
    let evalResult;
    // For nicer error messages; only used in eval string below
    let macro = macroToSpecifierImpls;
    evalExpression = `const ${macroLocal} = macro["${source}"]["${specifier}"]; ${evalExpression}`;
    try {
      // Running in a new closure so `macroLocal` doesn't conflict with us
      { evalResult = eval(evalExpression); }
    } catch (err) {
      throw new Error(`Macro eval for:\n${evalExpression}\n${err}`);
    }
    console.log('Macro eval result:', evalResult);
    if (typeof evalResult !== 'string') {
      throw new Error(`Macro eval returned ${typeof evalResult} instead of a string`);
    }
    Object.assign(evalMetadata, evalMetadataReset);
    insertClosed({ start, end, replacement: evalResult });
  }
  console.log('macroSpecifierToLocals', macroSpecifierToLocals);
  console.log('macroLocalToSpecifiers', macroLocalToSpecifiers);
  console.log('openMacroRangeStack', openMacroRangeStack);
  console.log('closedMacroRangeList', closedMacroRangeList);

  // Work backwards to not mess up indices
  for (const range of closedMacroRangeList.reverse()) {
    code
      = code.slice(0, range.start)
      + range.replacement
      + code.slice(range.end);
  }
  return code;
};

// TODO: Ohno. It's [,)
/** @param {{ start: number, end: number }} x */
const p = (x) => `[${x.start},${x.end}]`;

/** @param {IntervalRange[]} list; @param {IntervalRange} range  */
function intervalRangeListInsert(list, range) {
  if (range.start > range.end) {
    throw new Error('Given range start > end');
  }
  for (let i = 0; i < list.length; i++) {
    const cursor = list[i];
    // Entirely before cur
    if (range.end < cursor.start) {
      console.log(`${p(range)} < ${p(cursor)}; inserting`);
      list.splice(i, 0, range);
      return;
    }
    // Entirely after cur
    if (range.start > cursor.end) {
      console.log(`${p(range)} > ${p(cursor)}; next`);
      continue;
    }
    // Overlapping before (ib) or after (ia) cur
    throw new Error(`Overlap of ${p(range)} with ${p(cursor)}`);
  }
  list.push(range);
}

/** @param {IntervalRange[]} list; @param {number} start; @param {number} end */
function intervalRangeListSplice(list, start, end) {
  if (start > end) {
    throw new Error('Given range start > end');
  }
  // Stored in reverse order so the splice() loop doesn't mess up indices later
  const removeIndices = [];
  for (let i = 0; i < list.length; i++) {
    const cursor = list[i];
    // OK
    if (cursor.start >= start && cursor.end <= end) {
      removeIndices.unshift(i);
      continue;
    }
    // Entirely before
    if (cursor.end < start) continue;
    // Entirely after. We're passed the range. Exit.
    if (cursor.start > end) break;
    throw new Error(`Splice partially cuts ${p(cursor)}`);
  }
  /** @type {IntervalRange[]} */
  const matches = [];
  // The indices are valid. It's safe to use [0]
  removeIndices.forEach(ri => matches.unshift(list.splice(ri, 1)[0]));
  return matches;
}

export { replaceMacros, evalMetadata };
