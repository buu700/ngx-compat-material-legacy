/** @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * MIT-style license: see the target repository LICENSE.
 */
const {createRequire} = require('node:module');
const {performance} = require('node:perf_hooks');
const {resolve} = require('node:path');
const requireNpm = createRequire(resolve(process.argv[2], 'package.json'));
const minimatch = requireNpm('minimatch');
const brace = requireNpm('brace-expansion');
const packageJson = requireNpm('brace-expansion/package.json');
const cases = {
  'triage-011': '{' + '{a},'.repeat(16000) + 'b}',
  'triage-012': '{a,b}'.repeat(100),
  'triage-013': '{a}' + '}'.repeat(64000) + ',z}',
  'triage-014': '{'.repeat(4000) + 'a,b' + '}'.repeat(4000),
  'triage-015': '{' + Array(400).fill('{' + '0'.repeat(50) + '1..100000}').join(',') + '}',
  control: 'packages/{a,b}/**',
};
const id = process.argv[3], pattern = cases[id];
if (!pattern || Buffer.byteLength(pattern) > 65536) throw new Error('unexpected bounded input');
const start = performance.now();
try {
  const output = minimatch.braceExpand(pattern);
  console.log(JSON.stringify({id, node:process.version, module:packageJson.version, input_bytes:Buffer.byteLength(pattern),
    output_count:output.length, output_characters:output.reduce((n,s)=>n+s.length,0),
    elapsed_ms:performance.now()-start, sample:output.slice(0,2).map(s=>s.length>100?s.slice(0,100):s),
    limits:{minimatch_pattern_length:65536, brace_default_count:brace.EXPANSION_MAX},
    exact_actual_caller:'npm bundled minimatch.braceExpand with default options', result:'returned'}));
} catch (error) {
  console.log(JSON.stringify({id, node:process.version, module:packageJson.version, input_bytes:Buffer.byteLength(pattern),
    elapsed_ms:performance.now()-start, result:'exception', error:{name:error.name,message:error.message,stack:error.stack.slice(0,2500)}}));
  process.exitCode=2;
}
