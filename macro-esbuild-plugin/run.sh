#!/bin/bash
esbuild --bundle index.ts --outfile=dist/build.js --external:esbuild --format=esm --platform=node
node dist/build.js
