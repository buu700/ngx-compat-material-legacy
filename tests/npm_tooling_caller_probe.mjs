/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 * Copyright (c) 2026 Ryan Lester.
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync, readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, extname, join, posix, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ts = createRequire(import.meta.url)('typescript');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const printer = ts.createPrinter({removeComments: true});
const hash = raw => createHash('sha256').update(raw).digest('hex');
const blob = raw => createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + raw.length + '\0'), raw])).digest('hex');
const parse = (path, text) => ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true,
  path.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS);
const line = JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json'))).version.startsWith('21.') ? '21.x' : 'main';
const profilePath = 'compatibility/rc/parent-private-npm-current-profile-inputs-v1.json';
const rosterPath = 'compatibility/rc/npm-tooling-isolation-callers.json';
const codeSuffixes = ['.cjs', '.js', '.mjs', '.py', '.sh', '.ts'];
const jsSuffixes = new Set(['.cjs', '.js', '.mjs', '.ts']);
const historicalArtifacts = {
  'private-profile-source-manifests.json': '08f1feb3a2186f6bb0bd9e36af7462e2c752c7a344632b37c44e8bb194b0b3a4',
  'private-profile-remaining-evidence.json': 'f944d76dfb5ea39bf4f7743ea377c5112218efcef4c42af465eb59437bcb82fb',
  'private-profile-remaining-result.json': '54bd6cf921745b848f05fb1d2eaea6339b870bf53ce431e9e5eaad606a390dc0',
};

function physical(path, expected) {
  assert.equal(typeof path, 'string');
  assert.ok(path && !path.includes('\\') && !posix.isAbsolute(path) && posix.normalize(path) === path
    && path.split('/').every(part => part && part !== '.' && part !== '..'), 'invalid source path');
  let target = root;
  for (const part of path.split('/')) {
    target = join(target, part);
    assert.ok(!lstatSync(target).isSymbolicLink(), 'linked source ' + path);
  }
  assert.ok(lstatSync(target).isFile(), 'non-file source ' + path);
  const raw = readFileSync(target);
  assert.ok(raw.length <= 3000000, 'oversized source ' + path);
  if (expected) {
    assert.equal(hash(raw), expected.sha256, 'current source SHA changed: ' + path);
    if ('bytes' in expected) assert.equal(raw.length, expected.bytes, 'current source size changed: ' + path);
    if ('git_blob' in expected) assert.equal(blob(raw), expected.git_blob, 'current source Git blob changed: ' + path);
  }
  return raw;
}

function enumerate(directory, suffixes) {
  const names = [];
  function walk(path) {
    const stat = lstatSync(join(root, path));
    assert.ok(!stat.isSymbolicLink(), 'linked source descendant ' + path);
    if (stat.isDirectory()) {
      for (const name of readdirSync(join(root, path)).sort()) walk(path + '/' + name);
    } else if (stat.isFile() && suffixes.includes(extname(path))) names.push(path);
  }
  assert.ok(lstatSync(join(root, directory)).isDirectory(), 'missing source directory');
  walk(directory);
  return names.sort();
}

function primaryPaths() {
  return [...new Set([...enumerate('scripts', codeSuffixes), ...enumerate('.github/workflows', ['.yaml', '.yml']),
    '.npmrc', 'chainman.toml', 'chainman.lock', 'justfile', 'package.json',
    'projects/ngx-material-legacy/package.json', 'pnpm-lock.yaml'])]
    .filter(path => path !== 'scripts/check-dependency-eligibility.py').sort();
}

// Recover exactly one literal from trusted verifier text; never import/execute it.
const checker = physical('scripts/check-dependency-eligibility.py').toString('utf8');
const pins = [...checker.matchAll(/^NPM_CURRENT_PRIVATE_PROFILE_SHA256\s*=\s*["']([a-f0-9]{64})["']\s*$/gm)];
assert.equal(pins.length, 1, 'missing or ambiguous current profile trust anchor');
assert.notEqual(pins[0][1], '0'.repeat(64), 'current profile is not sealed');
const profile = JSON.parse(physical(profilePath, {sha256: pins[0][1]}));
assert.deepEqual(profile.historical_artifacts, historicalArtifacts, 'historical artifact identities changed');
const subject = profile.lines[line];
assert.ok(subject && /^[a-f0-9]{40}$/.test(subject.source_parent), 'missing current source parent');
const sourceRows = new Map(), inputRows = new Map();
for (const [kind, destination] of [['source_files', sourceRows], ['support_files', sourceRows], ['input_files', inputRows]]) {
  assert.ok(Array.isArray(subject[kind]), 'missing profile ' + kind);
  for (const row of subject[kind]) {
    assert.ok(!sourceRows.has(row.path) && !inputRows.has(row.path), 'duplicate profile source ' + row.path);
    assert.match(row.sha256, /^[a-f0-9]{64}$/);
    assert.match(row.git_blob, /^[a-f0-9]{40}$/);
    assert.ok(Number.isSafeInteger(row.bytes) && row.bytes >= 0);
    destination.set(row.path, row);
  }
}
assert.ok(!sourceRows.has('scripts/check-dependency-eligibility.py'), 'circular trusted checker binding');
assert.ok(inputRows.has(rosterPath), 'original caller roster is not bound');
const roster = JSON.parse(physical(rosterPath, inputRows.get(rosterPath)));
assert.ok(Array.isArray(subject.support_discovery) && subject.support_discovery.length === 2);
assert.deepEqual(subject.support_discovery.map(group => group.root).sort(),
  ['compatibility/handoff/codex-closeout/tools', 'tests']);
for (const group of subject.support_discovery) assert.deepEqual(group.suffixes, codeSuffixes);

function checkPopulation() {
  assert.deepEqual(subject.source_files.map(row => row.path).sort(), primaryPaths(), 'current primary population changed');
  for (const group of subject.support_discovery) {
    const members = enumerate(group.root, codeSuffixes);
    assert.deepEqual(group.paths, members, 'current support discovery population changed: ' + group.root);
    for (const path of members) assert.ok(sourceRows.has(path), 'unbound current support code ' + path);
  }
}
function checkPhysical() {
  physical(profilePath, {sha256: pins[0][1]});
  for (const [name, sha256] of Object.entries(historicalArtifacts)) {
    physical('compatibility/rc/tool-advisory-triage/' + name, {sha256});
  }
  checkPopulation();
  for (const row of [...sourceRows.values(), ...inputRows.values()]) physical(row.path, row);
  for (const [path, pair] of Object.entries(subject.historical_source_hashes)) {
    assert.ok(sourceRows.has(path) || inputRows.has(path), 'unbound historical/current source ' + path);
    assert.equal(pair.current_sha256, (sourceRows.get(path) ?? inputRows.get(path)).sha256);
  }
}
checkPhysical();

const oldDocuments = {};
for (const [name, sha256] of Object.entries(historicalArtifacts)) {
  oldDocuments[name] = JSON.parse(physical('compatibility/rc/tool-advisory-triage/' + name, {sha256}));
}
const historical = oldDocuments['private-profile-source-manifests.json'].lines[line];
const oldEvidence = oldDocuments['private-profile-remaining-evidence.json'].roots[line];
assert.equal(historical.source_parent, oldEvidence.revision);
assert.deepEqual(Object.keys(subject.historical_source_hashes).sort(), Object.keys(oldEvidence.source_hashes).sort());
for (const [path, digest] of Object.entries(oldEvidence.source_hashes)) {
  assert.equal(subject.historical_source_hashes[path].historical_sha256, digest);
}

function gitData(commit, path) {
  assert.match(commit, /^[a-f0-9]{40}$/);
  assert.ok(path && !path.includes(':') && posix.normalize(path) === path && !path.startsWith('../') && !posix.isAbsolute(path));
  const result = spawnSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
    'show', commit + ':' + path], {cwd: root, maxBuffer: 4 * 1024 * 1024});
  assert.equal(result.status, 0, String(result.stderr));
  return result.stdout;
}
function normalizeHistorical(path, source) {
  const sf = parse(path, source);
  const print = node => printer.printNode(ts.EmitHint.Unspecified, node, sf);
  const transformed = ts.transform(sf, [context => {
    const visitor = node => {
      if (ts.isImportDeclaration(node) && node.moduleSpecifier.text === './npm-tooling-options.mjs') return undefined;
      if (ts.isCallExpression(node) && node.expression.getText(sf) === 'npmToolingOptions') return node.arguments[0];
      if (['scripts/native-motion-run.mjs', 'scripts/browser-required-cells.mjs'].includes(path)
          && ts.isPropertyAssignment(node) && node.name.getText(sf) === 'npmProfile') {
        assert.equal(print(node.initializer), "readFileSync(join(root, 'scripts/npm-tooling-options.mjs'), 'utf8')");
        return undefined;
      }
      return ts.visitEachChild(node, visitor, context);
    };
    return sourceFile => ts.visitNode(sourceFile, visitor);
  }]);
  const result = hash(printer.printFile(transformed.transformed[0]));
  transformed.dispose();
  return result;
}

// Historical programs are authenticated Git DATA. They are never imported/executed,
// and no later product repair is reversed to manufacture current-source equality.
const historicalRows = new Map(historical.source_files.map(row => [row.path, row]));
assert.equal(historicalRows.size, historical.source_files.length);
for (const row of roster.source_preimages) {
  const original = gitData(row.commit, row.path);
  assert.equal(hash(original), row.sha256);
  assert.equal(hash(printer.printFile(parse(row.path, original.toString('utf8')))), row.normalized_sha256);
  const reviewed = historicalRows.get(row.path);
  assert.ok(reviewed, 'caller missing from historical profile');
  const raw = gitData(historical.source_parent, row.path);
  assert.equal(hash(raw), reviewed.sha256);
  assert.equal(raw.length, reviewed.bytes);
  assert.equal(blob(raw), reviewed.git_blob);
  assert.equal(normalizeHistorical(row.path, raw.toString('utf8')), row.normalized_sha256,
    'historical non-environment source behavior changed: ' + row.path);
}

// Cache AST facts only for the exact path and source text. Every audit still
// re-enumerates and authenticates physical inputs; this is never a cached pass.
const astFacts = new Map();
function currentCalls(path, source) {
  const key = hash(Buffer.from(source));
  const versions = astFacts.get(path);
  const cached = versions?.get(key);
  if (cached && cached.source === source) return cached.calls;
  const calls = [];
  const sf = parse(path, source);
  const print = node => printer.printNode(ts.EmitHint.Unspecified, node, sf);
  function visit(node) {
    if (ts.isCallExpression(node) && node.arguments.length && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'npm') {
      if (node.expression.getText(sf) === 'toolVersion' && node.arguments.length === 1) return;
      const argv = node.arguments[1];
      if (argv && ts.isArrayLiteralExpression(argv) && argv.elements.length === 1 && ts.isStringLiteral(argv.elements[0]) && ['-v', '--version'].includes(argv.elements[0].text)) return;
      assert.ok(['spawnSync', 'run'].includes(node.expression.getText(sf)), 'unreviewed npm dispatcher ' + path);
      const options = node.arguments[2];
      assert.ok(options && ts.isCallExpression(options) && options.expression.getText(sf) === 'npmToolingOptions', 'unwrapped mutating npm caller ' + path);
      assert.equal(options.arguments.length, 2);
      assert.ok(ts.isObjectLiteralExpression(options.arguments[0]));
      assert.ok(argv, 'missing npm argv ' + path);
      assert.equal(print(argv), print(options.arguments[1]), 'guarded argv does not match executed argv');
      calls.push(Object.freeze({path, callee: node.expression.getText(sf), argv: print(argv)}));
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  const result = Object.freeze(calls);
  const entries = versions ?? new Map();
  entries.set(key, Object.freeze({source, calls: result}));
  astFacts.set(path, entries);
  return result;
}

function auditCurrent(overrides = new Map()) {
  checkPhysical();
  const names = [...new Set([...sourceRows.keys(), ...overrides.keys()])].filter(path => jsSuffixes.has(extname(path))).sort();
  const found = [];
  for (const path of names) {
    const source = overrides.get(path) ?? physical(path, sourceRows.get(path)).toString('utf8');
    found.push(...currentCalls(path, source));
  }
  const expected = roster.callers.map(row => {
    const sf = parse('argv.js', row.argv);
    return {path: row.path, callee: row.callee, argv: printer.printNode(ts.EmitHint.Unspecified, sf.statements[0].expression, sf)};
  });
  assert.deepEqual(found.sort((a,b) => a.path.localeCompare(b.path)), expected.sort((a,b) => a.path.localeCompare(b.path)), 'npm caller population changed');
  // Raw fingerprints reject unrelated behavior and support-code mutations even
  // where AST caller facts remain unchanged. Never normalize current programs.
  for (const [path, source] of overrides) {
    assert.ok(sourceRows.has(path), 'additional current source ' + path);
    assert.equal(hash(Buffer.from(source)), sourceRows.get(path).sha256, 'current whole-program source changed: ' + path);
  }
  checkPhysical();
  return {calls: found.length, files: new Set(found.map(row => row.path)).size, scanned_js_ts_files: names.length};
}

const positive = auditCurrent();
const first = roster.callers[0].path;
const current = physical(first).toString('utf8');
const support = subject.support_files.find(row => jsSuffixes.has(extname(row.path)) && row.path !== 'tests/npm_tooling_caller_probe.mjs');
assert.ok(support, 'missing JavaScript support scope');
const negatives = [
  new Map([['scripts/added-unwrapped-npm.mjs', "spawnSync('npm', ['install'], {cwd: '/tmp'});\n"]]),
  new Map([[first, current + "\nspawnSync('npm', ['query', '.external'], npmToolingOptions({cwd: '/tmp'}, ['install']));\n"]]),
  new Map([[first, current.replace('npmToolingOptions(', 'unownedNpmOptions(')]]),
  new Map([[first, current + '\nthrow new Error("unrelated behavior change");\n']]),
  new Map([['tests/nested/added-unwrapped-npm.ts', "spawnSync('npm', ['install'], {cwd: '/tmp'});\n"]]),
  new Map([[support.path, physical(support.path).toString('utf8') + "\nspawnSync('npm', ['install'], {cwd: '/tmp'});\n"]]),
  new Map([[support.path, physical(support.path).toString('utf8') + '\nvoid "unrelated support behavior change";\n']]),
];
for (const negative of negatives) assert.throws(() => auditCurrent(negative));
checkPhysical();
console.log(JSON.stringify({result: 'pass', ...positive, negative_controls: negatives.length,
  historical_normalization: 'authenticated old Git source DATA only',
  current_source_identity: 'complete pinned raw programs; no historical projection',
  typescript: ts.version, node: process.version, execution: 'static AST and Git data reads only'}));
