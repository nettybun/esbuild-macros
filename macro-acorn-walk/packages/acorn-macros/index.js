import acorn from 'acorn';
import * as walk from 'acorn-walk';

/** @typedef {{ importSource: string, rangeFromAST: MacroRangeResolver, exports: { [name: string]: any } }} Macro */
/** @typedef {{ [name: string]: any }} MacroExports */
/** @typedef {{ start: number, end: number }} IntervalRange */
/** @typedef {(specifier:string, ancestors:acorn.Node[]) => IntervalRange} MacroRangeResolver */

/** @typedef {IntervalRange & { macroLocal: string }} OpenMacroRange */
/** @typedef {IntervalRange & { code: string }} ClosedMacroRange */

/** @param {string} sourcecode; @param {Macro[]} macros */
const replaceMacros = (sourcecode, macros) => {
  /** @type {{ [importSource: string]: number }} */
  const macroIndices = {};
  /** @type {{ [importSource: string]: MacroRangeResolver }} */
  const macroRangeFromAST = {};
  /** @type {MacroExports} */
  const macroExports = {};
  macros.forEach((macro, i) => {
    const name = macro.importSource;
    if (macroIndices[name]) {
      throw new Error(`Duplicate macro "${name}" at indices ${macroIndices[name]} and ${i}`);
    }
    macroIndices[name] = i;
    macroRangeFromAST[name] = macro.rangeFromAST;
    macroExports[name] = macro.exports;
  });
  /** @type {{ [macro: string]: { [spec: string]: string[] } }} string[] is of local variable names */
  const macroSpecifiersToLocals = {};
  /** @type {{ [local: string]: { source: string, specifier: string } }} source is the macro name */
  const macroLocalsToSpecifiers = {};

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

  const ast = typeof sourcecode === 'string'
    ? acorn.parse(sourcecode, { ecmaVersion: 'latest' })
    : sourcecode;
  if (!ast || ast.type !== 'Program') {
    throw new Error('Provided sourcecode must JS code string or an Acorn AST');
  }
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
      console.log(`Found import statement ${node.start}->${node.end}`);
      const sourceName = node.source.value;
      if (!sourceName.endsWith('.macro') || !macroIndices[sourceName]) return;
      node.specifiers.forEach(n => {
        const specImportMap = macroSpecifiersToLocals[sourceName] || (macroSpecifiersToLocals[sourceName] = {});
        const specLocals = specImportMap[n.imported.name] || (specImportMap[n.imported.name] = []);
        if (specLocals.includes(n.local.name)) return;
        specLocals.push(n.local.name);
        macroLocalsToSpecifiers[n.local.name] = {
          source: sourceName,
          specifier: n.imported.name,
        };
      });
    },
    /** @param {IdentifierNode} node */
    Identifier(node, state, ancestors) {
      seenIndentifier = true;
      console.log('Identifier', node.name);
      const meta = macroLocalsToSpecifiers[node.name];
      if (!meta) return;
      console.log('Identifier matches', meta.source, meta.specifier);
      ancestors.forEach((n, i) => {
        console.log(`  - ${'  '.repeat(i)}${n.type}:${JSON.stringify(n)}`);
      });
      const resolver = macroRangeFromAST[meta.source];
      const { start, end } = resolver(meta.specifier, ancestors);
      // Move items from open -> closed _BEFORE_ adding to the open stack
      closeOpenIdsUpTo(start);
      openMacroRangeStack.push({ start, end, macroLocal: node.name });
    },
  });
  // There might be elements on the open stack still so clear them
  closeOpenIdsUpTo(ast.end);

  /** @param {number} sourcecodeIndex */
  function closeOpenIdsUpTo(sourcecodeIndex) {
    // Walk through the stack backwards
    for (let i = openMacroRangeStack.length; i >= 0; i--) {
      const open = openMacroRangeStack[i];
      if (open.end > sourcecodeIndex) return;
      openMacroRangeStack.pop();
      closeOpenId(open);
    }
  }

  /** @param {OpenMacroRange} open */
  function closeOpenId(open) {
    const { start, end, macroLocal } = open;
    let evalExpression = sourcecode.slice(start, end);
    for (const edit of spliceClosed(start, end)) {
      evalExpression
        = evalExpression.slice(start, edit.start - 1)
        + edit.code
        + evalExpression.slice(edit.end);
    }
    let code;
    const spec = macroLocalsToSpecifiers[macroLocal];
    try {
      // Running in a new closure so `macroLocal` doesn't conflict with us
      {
        eval(`const ${macroLocal} = macroExports.${spec}; ret = ${evalExpression}`);
      }
    } catch (err) {
      throw new Error(`Macro eval for \`${evalExpression}\` threw error: ${err}`);
    }
    if (typeof code !== 'string') {
      throw new Error(`Macro eval returned ${typeof code} instead of a string: ${code}`);
    }
    insertClosed({ start, end, code });
  }
  console.log('macroSpecifiersToLocals', macroSpecifiersToLocals);
  console.log('macroLocalsToSpecifiers', macroLocalsToSpecifiers);
  console.log('openIdentifierRanges', openMacroRangeStack);
  console.log('closedIdentifierRanges', closedMacroRangeList);

  // TODO: Use the closedIdentifierRanges entries to return macro-free source
  return sourcecode;
};

/** @param {IntervalRange} range */
const p = (range) => `[${range.start},${range.end}]`;

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
    throw new Error(`Overlaps of ${p(range)} with ${p(cursor)}`);
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
  // The indices are valid. It's safe to use [0]
  const matches = removeIndices.map(ri => list.splice(ri, 1)[0]);
  return matches;
}

export { replaceMacros };
