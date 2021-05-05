// This is what is imported into source code. It's a stub. The actual imports
// are handled in the macro implementation under ./implementation/index.js

/** Takeout css`` statement is replaced with a string of a unique classname */
export declare function css(statics: TemplateStringsArray, ...variables: string[]): string;
/** Takeout injectGlobal`` statement is removed entirely */
export declare function injectGlobal(statics: TemplateStringsArray, ...variables: string[]): void;

// Use `declare module 'styletakeout.macro' { const x: { ... } }` to define type
// support for imports set in styletakeoutMacro's `importEvals` option.
