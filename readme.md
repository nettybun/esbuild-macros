# Simulating babel-macros in esbuild

**Latest attempt is at _macro-regex/macroRegexExtract.js_**

There's no AST API for esbuild, so trying to replace the macro code is either
via reparsing the AST (i.e Babel) or doing using regexes. **Most macros will
need access to a full AST API and are better off using Babel than esbuild**. For
my case, I wanted to port _styletakeout.macro_[1] which extracts CSS-in-JS, and
I figured this wasn't complex enough to require AST operations. Is it possible
to take out CSS via `` css`...` `` tag template extraction?

There are plugins for esbuild, but to support macros means an `fs.readFile` on
every single file to see if it has an import... That's not great.

## Goal: Natively/Efficiently support macros in esbuild

If a general purpose algorithm for doing extraction and replacement of macros
could be realized as a proof-of-concept (in JS via regex) then it could marketed
to esbuild as a feature request - ideally to leverage their AST to do extraction
properly (not regex) and in parallel in Go, then making one (1) call to Node to
have all "snippets" evaluated and dropped into the final bundle. That way,
unlike plugins which have to make one Node/Go call per file, a macro would make
only one (1) call.

Originally I wrote _macroPlugin.ts_ as an attempt to work as an esbuild plugin
that extracts the macros per-file on import. It was to see if I could replace
macros "generally" via regex. It looked for function calls, tag templates, and
dot-notation of objects (see regex).

It worked for my case, in _macros/styletakeout.macro/example.ts_, but I got hung
up on the usecases beyond CSS-in-JS (notice how this repo references a handful
of macros that I was trying to convince myself with...).

## General case for extracting macros

Macros have so many applications, right? Well. Macro authors can go wild with
the AST operations, and that kind of API will never be part of esbuild. Is there
enough demand for macros without an AST API available? Having `` tag`...`  ``
would at least support css, preval, ms, sql, gql, etc but all of that is before
you consider `${...}` interpolation and *nesting* oof...

Imagine `` stripIndent`...`  `` macro with ``${() => stripIndent`...`}`` inside
of it. That's... not improbable; in JS that's fine. In macros... How do you even
pass a reference *without* the AST? No way. Then do you pass strings of code
(?!) and their (overlapping) source indices? Do a topological sort on the order
of processing the macros? Devs will also want the filename information, per
file. It's messy :(

Even without considering nesting there's the issue of "when does a macro end?".
Such as `` tag`...`(1,2,3) `` - Does the macro dev want the (1,2,3)? Or do we
pass it since it's all "part-of-the-same-expression"? In ASTExplorer you'll find
that it's not really possible to say "this is the whole expression". Then people
writing macros will ask (for their extracted code) _"am I in a JSX expression? a
string? a function?"_. There's a real macro for Lavarel-interop that imports a
database model `import { Articles } ...` and does chaining with it:
`Articles.where('...').first()`. There's zero chance of supporting that without
an AST. In Babel that's fine, walk the entire AST, but in esbuild *at most* it
will be passing a substring of code...

There's no "general purpose" macro extraction.

## Regex macros

It's not good to try and support all macros this way, but, there are some simple
macros which might be able to work well with regexes.

Isn't it too easy to trip up any kind of regex-based extraction method? Yes and
that's what parsers are for, but specifically for the case of tag templates with
very basic interpolation support that disallows nesting, it works.

If I have to do regex work then doing it on the bundle from esbuild is much
easier than doing per-file preprocessing which would need to support flexible
code styles (aka linting) and detect broken JS. Working after esbuild also means
the code is already validated and normalized. Yes, the macro code string might
still be broken, but that's per-macro: i.e CSS-in-JS macro would use Stylis' to
parse CSS. Lastly, there's also only one (1) import for the macro (its marked as
external in esbuild).

## CSS-in-JS

For CSS tag templates, aside from nesting `${...}`, I think the only case of "`"
is escaped \` in `` css`content: 'abc\`ohno\`xyz';`. ``. Thankfully there's a
regex to handle that. Hmm `` css`...${`...`}...`. `` will break too. (TODO?)

### Detecting a failed/partial extraction using `eval()`

You can't just count "{" and "}" characters, and I don't want to write a parser,
but y'know who has a fast parser? JS runtimes. If you `eval()` it in Node with a
defined `` css`...` `` function that throws for broken code (including `${}`)
that's perfect. Ideally it throws _before_ passing to Stylis, because I don't
want Stylis to try and parse a broken template expression that leaks JS - I
don't know Stylis enough to know how it'd throw and in the worst case it would
carry on silently and lead to a debugging nightmare.

I've never used `eval()` before. 🤞

### Regexes

- `` /css`((?:[^`\\]|\\.)*)`/ `` should handle escaped \`.
- `` /([^\w.])/css`...`/ `` will force "css" to start like `\b` does, but also
  with "." to prevent objects like `` some.thing.css`...` ``.

Notice that these are _incredibly_ macro-specific...

For esbuild minification, imports will change to something short like "t". Which
is questionable to search for. JS scopes might cause esbuild to reuse the
variable name in a place that doesn't conflict, so there could, in the smallest
edge case, be the use of `` t`...` `` somewhere that does _and_ doesn't refer to
the macro. I wanted to use `define` to make this even less likely, but no luck.

1. Carry on as normal and pretend it's not an issue
2. Use a default import since esbuild doesn't minify propeties on those and the
   autocomplete/highlighting in VSCode works for `` styled.xyz`...` `` so I'd be
   regexing `` t.css`...` `` or `` t.injectGlobal`...` `` which is maybe safer?
3. Does injecting eval() might prevent the imports from being minified?

Actually #3 is ruled out from esbuild docs - kills minification on the whole
file and is very bad.

I don't want to do #2 prematurely so I'll assume esbuild doesn't reuse
identifiers and try #1.

### WIP

This is working as a post-bundle regex replace in _macroRegexExtract.js_. Right
now it's executing esbuild but could be ported to be a general tool to run on
any file.
