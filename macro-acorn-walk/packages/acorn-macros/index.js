// Provides replaceMacros()

import acorn from 'acorn';
import * as walk from 'acorn-walk';
import { rangeList, insertRange, queryRangesBetween } from './rangeList.js';

/** @typedef {import('./rangeList').Range} Range */
/** @typedef {(specifier:string, ancestors:acorn.Node[]) => [start:number, end:number]} MacroFunctions */

/*
PLAN:
- [x] Walk the AST and remove all imports to collect specifiers.
- [x] For each identifier see if its part of a macro, ask the macro its range,
  it'll say a start/end index in which the specifier will (later) like to eval.
  This index is only based on the AST not any replacements that have happened or
  happen. This is important: it says "I want to eval from A->B and I'll return
  you something in its place". It's _not_ saying "I want to do AST manipulation
  on this region now/later". This is its _one_ time to see the AST and it
  doesn't get to modify anything about the AST. Ok.
- [ ] NEW: If there are items on the open stack and this new identifier starts
  after the top of the open stack, pop that stack item. See "To close a spec"
  below.
- [ ] Consider this spec "open" like an open bracket "(" and add it to an open
  spec stack.
- [ ] Load the next identifier:
  TODO: How? (See "NEW" above. Is this in a loop?)
  - [ ] If within the open spec then it'll be eval'd and replaced before it so
    add to the open stack (note if this new open spec says it'll eval _beyond_
    it's parent open spec then throw an error; that's wrong).
  - [ ] If we're out of an open range of a spec then that/those open spec(s)
    close. This also has to be considered if the we're at the end and there is
    no next identiftier to load. To close a spec, eval the range with all
    overlaping eval'd ranges considered. This is done by using a
    known-replacements table that stores the widest replacement range and its
    content. Note that you can't have partial overlap; it's either no overlap or
    the incoming changeset will be larger and replace the existing (assert this
    and throw an error overwise). When you're about to eval a range you ask
    "does anything in this range need to be replaced before the eval?"
    - [ ] No? Then eval it and add a new no-overlap changeset to the table.
    - [ ] Yes? Load the changeset from the table, replace the are of the range
      with it, and replace the entry in the table (widening the ranges of course
      (assert this)).
  - [ ] By the time we're fully done walking the AST we'll have entries in the
    table that will be directly replaced into the final source code. 🤞🤞
*/

/** @param {string} sourcecode; @param {MacroFunctions[]} macros */
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


export { replaceMacros };
