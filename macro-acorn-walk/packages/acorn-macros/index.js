// Provides replaceMacros()

import * as walk from 'acorn-walk';

// PLAN: Walk the AST and remove all imports to collect specifiers. For each
// identifier see if its part of a macro, ask the macro its range, it'll say a
// start/end index in which the specifier will (later) like to eval. This index
// is only based on the AST not any replacements that have happened or happen.
// This is important: it says "I want to eval from A->B and I'll return you
// something in its place". It's _not_ saying "I want to do AST manipulaiton on
// this region now/later". This is its _one_ time to see the AST and it doesn't
// get to modify anything about the AST. Ok. Consider this spec "open" like an
// open bracket "(" and add it to an open spec stack. Load the next identifier:
// is it within the open spec? Then it'll be eval'd+replaced before it so add it
// to the open stack (note if this new open spec says it'll eval _beyond_ it's
// parent open spec then throw an error; that's wrong). Otherwise, if we're out
// of an open range of a spec then that/those open spec(s) close. To close a
// spec, eval the range with all overlaping eval'd ranges considered. This is
// done by using a known-replacements table that stores the widest replacement
// range and its content. Note that you can't have partial overlap; it's either
// no overlap or the incoming changeset will be larger and replace the existing
// (assert this and throw an error overwise). When you're about to eval a range
// you ask "does anything in this range need to be replaced?" No? Then eval it
// and add a new no-overlap changeset to the table. Yes? Load the changeset from
// the table, replace the are of the range with it, and replace the entry in the
// table (widening the ranges of course (assert this)). By the time we're fully
// done walking the AST we'll have entries in the table that will be directly
// replaced into the final source code. 🤞🤞

// { "styletakeout.macro": { "decl": ["a1", "d"], "css": ["c", "c1"] }, ... }
const macroSpecifiersToLocals = {};
// { "a1": { "source": "styletakeout.macro", "specifier": "decl" }, ... }
const macroLocalsToSpecifiers = {};
// Per-macro functions which receive one of their specifiers and its AST
// identifier ancestor list to return an index range that will be eval'd
const macroDefinitions = {};

// This is per ECMAScript spec but not enforced by Acorn.
let seenIndentifier = false;
// TODO: Add types https://github.com/acornjs/acorn/issues/946
/** @type {walk.AncestorVisitors<{}>} */
const visitors = {
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
    const changeset = macroDefinitions[meta.source](meta.specifier, ancestors);
    // TODO: Add the changeset to the known-replacement table
    const errorLoc = `${meta.specifier}@${node.start}->${node.end}`;
    const [start, end] = changeset;
    let ret;
    try {
      ret = eval(bundle.slice(start, end));
    } catch (err) {
      throw `Macro ${errorLoc}: ${err}`;
    }
    if (typeof ret !== 'string') {
      throw `Macro ${errorLoc} eval returned type ${typeof ret} instead of a string`;
    }
    // TODO: Put it back into the known-replacements table...
  },
};

const replaceMacros = (bundle, macros) => {
  // Macros will just be a function I guess ^-^
  // (specifier:string, ancestors:acorn.Node[]) => [start:number, end:number]
  macros.forEach(macro => {
    macroDefinitions[macro.name] = macro;
  });
  // TODO: Parse bundle into an AST or accept a pre-parsed AST.
  const ast = {};
  walk.ancestor(ast, visitors);
  console.log('macroSpecifiersToLocals', macroSpecifiersToLocals);
  console.log('macroLocalsToSpecifiers', macroLocalsToSpecifiers);

  // TODO: Use the remaining known-replacements table entries to return the new
  // macro-free bundle

  // TODO: Final replacements...
  return bundle;
};


export { replaceMacros };
