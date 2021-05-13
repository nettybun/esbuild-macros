import acorn from 'acorn';
import * as walk from 'acorn-walk';

/** @typedef {{ importSource: string, rangeFromAST: MacroRangeResolver, exports: { [name: string]: any } }} Macro */
/** @typedef {{ [name: string]: any }} MacroExports */
/** @typedef {{ start: number, end: number }} IntervalRange */
/** @typedef {(specifier:string, ancestors:acorn.Node[]) => IntervalRange} MacroRangeResolver */

/** @param {string} sourcecode; @param {Macro[]} macros */
const replaceMacros = (sourcecode, macros) => {
  const macroSpecifiersToLocals = {
    // "styletakeout.macro": { "decl": ["a1", "d"], "css": ["c", "c1"] }, ...
  };
  const macroLocalsToSpecifiers = {
    // "a1": { "source": "styletakeout.macro", "specifier": "decl" }, ...
  };

  // Per-macro functions which receive one of their specifiers and its AST
  // identifier ancestor list to return an index range that will be eval'd
  const macroDefinitions = {};

  // Replacements made throughout the AST walk. No partial overlaps. Fully
  // covering a range replaces the range with the wider range.
  /** @type {Range[]} */
  const closedRanges = rangeList;
  // Index ranges that might still have eval ranges inside of them.
  /** @type {Range[]} */
  const openRangesStack = [];

  // Macros will just be a function I guess ^-^
  // (specifier:string, ancestors:acorn.Node[]) => [start:number, end:number]
  macros.forEach(macro => {
    macroDefinitions[macro.name] = macro;
  });

  /** @param {number} sourcecodeIndex */
  const closeRangesUpTo = (sourcecodeIndex) => {
    /** @param {Range} range */
    const closeRange = (range) => {
      const { start, end } = range;
      let evalExpression = sourcecode.slice(start, end);
      for (const edit of queryRangesBetween(start, end)) {
        evalExpression
          = evalExpression.slice(start, edit.start - 1)
          + edit.str
          + evalExpression.slice(edit.end);
      }
      let ret;
      try {
        ret = eval(evalExpression);
      } catch (err) {
        throw new Error(`Macro eval for \`${evalExpression}\` threw: ${err}`);
      }
      if (typeof ret !== 'string') {
        throw new Error(`Macro eval returned ${typeof ret} not a string`);
      }
      range.str = ret;
      insertRange(range);
    };
    // Walk through the stack backwards
    for (let i = openRangesStack.length; i >= 0; i--) {
      const range = openRangesStack[i];
      if (sourcecodeIndex > range.end) {
        openRangesStack.pop();
        closeRange(range);
      }
    }
  };

  const ast = typeof sourcecode === 'string'
    ? acorn.parse(sourcecode, { ecmaVersion: 'latest' })
    : sourcecode;
  if (!ast || ast.type !== 'Program') {
    throw new Error('Provided sourcecode must JS code string or an Acorn AST');
  }

  // This is per ECMAScript spec but not enforced by Acorn.
  let seenIndentifier = false;
  // TODO: Add types https://github.com/acornjs/acorn/issues/946
  walk.ancestor(ast, {
    ImportDeclaration(node) {
      if (seenIndentifier) {
        throw new Error('Can\'t declare an import after an identifier');
      }
      console.log(`Found import statement ${node.start}->${node.end}`);
      const sourceName = node.source.value;
      if (!sourceName.endsWith('.macro')) return;
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
      closeRangesUpTo(node.start);
      const changeset = macroDefinitions[meta.source](meta.specifier, ancestors);
      const [start, end] = changeset;
      openRangesStack.push({ start, end });
    },
  });
  closeRangesUpTo(ast.end);
  console.log('macroSpecifiersToLocals', macroSpecifiersToLocals);
  console.log('macroLocalsToSpecifiers', macroLocalsToSpecifiers);
  console.log('closedRanges', closedRanges);

  // TODO: Use the finalized known-replacements table entries to return the new
  // macro-free source

  // TODO: Do the final replacements via str.replace()
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
    if (ins.start <= cur.start && ins.end >= cur.end) {
      console.log(`Upcoming insert of ${p(ins)} will cover/replace ${p(cur)}`);
      removeIndices.unshift(i);
      continue;
    }
    // Covered entire ins by cur
    if (ins.start >= cur.start && ins.end <= cur.end) {
      throw new Error(`Range ${p(ins)} would be covered by ${p(cur)}`);
    }
    let ib, ia;
    // Entirely before cur
    if ((ib = ins.end < cur.start)) {
      console.log(`${p(ins)} < ${p(cur)}; inserting`);
      list.splice(i, 0, ins);
      removeIndices.forEach(ri => {
        console.log(`Removing ${p(list[ri])}`);
        list.splice(ri, 1);
      });
      return;
    }
    // Entirely after cur
    if ((ia = ins.start > cur.end)) {
      console.log(`${p(ins)} > ${p(cur)}; next`);
      continue;
    }
    // Overlapping before (ib) or after (ia) cur
    if (!ib || !ia) {
      throw new Error(`Partial overlap of ${p(ins)} with ${p(cur)}`);
    }
    throw new Error('Unreachable');
  }
  list.push(ins);
}

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
    let cb, ca;
    // Entirely before
    if ((cb = cur.end < start)) continue;
    // Entirely after. We're passed the range. Exit.
    if ((ca = cur.start > end)) break;
    if (!cb) throw new Error(`Query partial enters into ${p(cur)}`);
    if (!ca) throw new Error(`Query partial leaves out ${p(cur)}`);
    throw new Error('Unreachable');
  }
  return matching;
}

export { replaceMacros };
