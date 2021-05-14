import acorn from 'acorn';
import * as walk from 'acorn-walk';

/** @typedef {{ importSource: string, rangeFromAST: MacroRangeResolver, exports: { [name: string]: any } }} Macro */
/** @typedef {{ [name: string]: any }} MacroExports */
/** @typedef {{ start: number, end: number }} IntervalRange */
/** @typedef {(specifier:string, ancestors:acorn.Node[]) => IntervalRange} MacroRangeResolver */

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
    if (macroIndices[name])
      throw new Error(`Duplicate macro "${name}" at indices ${macroIndices[name]} and ${i}`);
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
  /** @type {IntervalRange[]} */
  // TODO: Maybe not type IntervalRange, needs to track which macro it's for...
  // TODO: Maybe be honest and call it a stack
  const openIdentifierRanges = [];
  // Identifiers that have been fully processed and eval'd. We've parsed past
  // their range end and these are ready to be sliced directly into the code.
  /** @type {(IntervalRange & { str: string })[]} */
  // TODO: Maybe not type IntervalRange, needs to track eval'd content...
  const closedIdentifierRanges = [];

  /** @param {(IntervalRange & { str: string })} range */
  const insertClosedId = (range) =>
    intervalRangeListInsert(closedIdentifierRanges, range);

  /** @param {number} start; @param {number} end */
  // TODO: Maybe splice not query
  const queryClosedIds = (start, end) =>
    intervalRangeListQuery(closedIdentifierRanges, start, end);

  const ast = typeof sourcecode === 'string'
    ? acorn.parse(sourcecode, { ecmaVersion: 'latest' })
    : sourcecode;
  if (!ast || ast.type !== 'Program')
    throw new Error('Provided sourcecode must JS code string or an Acorn AST');

  // Import statements must come first as per ECMAScript specification but this
  // isn't enforced by Acorn, so throw if an import is after an identifier.
  let seenIndentifier = false;
  // TODO: Add types https://github.com/acornjs/acorn/issues/946
  walk.ancestor(ast, {
    ImportDeclaration(node) {
      if (seenIndentifier) {
        throw new Error('Can\'t declare an import after an identifier');
      }
      console.log(`Found import statement ${node.start}->${node.end}`);
      const sourceName = node.source.value;
      if (!sourceName.endsWith('.macro') || !macroIndices[sourceName]) return;
      node.specifiers.forEach(n => {
        const specImportMap = macroSpecifiersToLocals[sourceName] || (macroSpecifiersToLocals[sourceName] = {});
        const specLocals = specImportMap[n.imported.name] || (specImportMap[n.imported.name] = []);
        if (!specLocals.includes(n.local.name)) {
          specLocals.push(n.local.name);
          macroLocalsToSpecifiers[n.local.name] = {
            source: sourceName,
            specifier: n.imported.name,
          };
        }
      });
    },
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
      const range = resolver(meta.specifier, ancestors);
      // Move items from open -> closed _BEFORE_ adding to the open stack
      closeOpenIdsUpTo(range.start);
      openIdentifierRanges.push(range);
    },
  });
  // There might be elements on the open stack still so clear them
  closeOpenIdsUpTo(ast.end);

  /** @param {number} sourcecodeIndex */
  function closeOpenIdsUpTo(sourcecodeIndex) {
    // Walk through the stack backwards
    for (let i = openIdentifierRanges.length; i >= 0; i--) {
      const range = openIdentifierRanges[i];
      if (range.end > sourcecodeIndex) return;
      openIdentifierRanges.pop();
      closeOpenId(range);
    }
  }

  /** @param {IntervalRange} range */
  function closeOpenId(range) {
    // XXX: To do this I'll need to know what identifier/macro this is. That
    // information isn't currently stored in the open stack.
    const { start, end, identifier } = range;
    let evalExpression = sourcecode.slice(start, end);
    for (const edit of queryClosedIds(start, end)) {
      // TODO: Possibly remove the closed id so re-entry (below) doesn't need to
      // replace the id. Simplifies overlap/covering logic.
      evalExpression
        = evalExpression.slice(start, edit.start - 1)
        // TODO: This needs to live somewhere...
        + edit.str
        + evalExpression.slice(edit.end);
    }
    let ret;
    const spec = macroLocalsToSpecifiers[identifier.name];
    try {
      // Running in a new closure so `identifier.name` doesn't conflict
      {
        eval(`const ${identifier.name} = macroExports.${spec}; ret = ${evalExpression}`);
      }
    } catch (err) {
      throw new Error(`Macro eval for \`${evalExpression}\` threw: ${err}`);
    }
    if (typeof ret !== 'string') {
      throw new Error(`Macro eval returned ${typeof ret} not a string`);
    }
    // TODO: See TODO comment above
    insertClosedId({ start, end, str: ret });
  }
  console.log('macroSpecifiersToLocals', macroSpecifiersToLocals);
  console.log('macroLocalsToSpecifiers', macroLocalsToSpecifiers);
  console.log('openIdentifierRanges', openIdentifierRanges);
  console.log('closedIdentifierRanges', closedIdentifierRanges);

  // TODO: Use the closedIdentifierRanges entries to return macro-free source
  return sourcecode;
};

/** @param {IntervalRange[]} list; @param {IntervalRange} range  */
function intervalRangeListInsert(list, range) {
  /** @param {IntervalRange} range */
  const p = (range) => `[${range.start},${range.end}]`;
  // Name: Insert range
  const ins = range;
  if (ins.start > ins.end) throw new Error('Given range start > end');
  // Stored in reverse order so .forEach(splice()) doesn't mess up indices
  const removeIndices = [];
  for (let i = 0; i < list.length; i++) {
    // Name: Current range
    const cur = list[i];
    // Covering entire cur by ins
    // TODO: Considering this an error and forcing queries/reads to REMOVE the
    // entry would be good/less code... Could make any overlap illegal
    if (ins.start <= cur.start && ins.end >= cur.end) {
      console.log(`Upcoming insert of ${p(ins)} will cover/replace ${p(cur)}`);
      removeIndices.unshift(i);
      continue;
    }
    // Covered entire ins by cur
    if (ins.start >= cur.start && ins.end <= cur.end) {
      throw new Error(`Range ${p(ins)} would be covered by ${p(cur)}`);
    }
    // Entirely before cur
    if (ins.end < cur.start) {
      console.log(`${p(ins)} < ${p(cur)}; inserting`);
      list.splice(i, 0, ins);
      removeIndices.forEach(ri => {
        console.log(`Removing ${p(list[ri])}`);
        list.splice(ri, 1);
      });
      return;
    }
    // Entirely after cur
    if (ins.start > cur.end) {
      console.log(`${p(ins)} > ${p(cur)}; next`);
      continue;
    }
    // Overlapping before (ib) or after (ia) cur
      throw new Error(`Partial overlap of ${p(ins)} with ${p(cur)}`);
    }
  list.push(ins);
}

// TODO: Not query but "intervalRangeListSplice()"? I can remove them...
/** @param {IntervalRange[]} list; @param {number} start; @param {number} end */
function intervalRangeListQuery(list, start, end) {
  /** @param {IntervalRange} range */
  const p = (range) => `[${range.start},${range.end}]`;
  if (start > end) throw new Error('Given range start > end');
  const matching = [];
  for (let i = 0; i < list.length; i++) {
    const cur = list[i];
    // OK
    if (cur.start >= start && cur.end <= end) {
      matching.push(cur);
      continue;
    }
    // Entirely before
    if (cur.end < start) continue;
    // Entirely after. We're passed the range. Exit.
    if (cur.start > end) break;
    throw new Error(`Query partially splits ${p(cur)}`);
  }
  return matching;
}

export { replaceMacros };
