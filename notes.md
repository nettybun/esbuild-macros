There's a lot of open issues and noise about merging source maps. I think it
will work to just do `applySourceMap(...)` but the resolution matters.

1. Wanted to use `magic-string` for source mapped bundle replacements like
   - https://github.com/luwes/sinuous/blob/master/scripts/rollup-plugin-replace.js
2. Unfortunately it can't read/input source maps...
   - https://github.com/Rich-Harris/magic-string/issues/140
3. Mention of `sorcery` instead, but unmaintained for 5 years and has this bug
   - https://github.com/Rich-Harris/sorcery/issues/67
4. Similar/same issue in `source-map`:
   - https://github.com/mozilla/source-map/issues/216
   - https://github.com/mozilla/source-map/issues/351
5. Mention of merging/reading an existing source map:
   - https://github.com/dumberjs/modify-code#join-existing-source-map
6. The above points to this example using `source-map#applySourceMap()`:
   - https://github.com/gulp-sourcemaps/vinyl-sourcemaps-apply/blob/master/index.js
