/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Resolve retained declarations omitted from the initial navigation inventory; no acceptance. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';

const root = process.cwd(), prefix = 'compatibility/rc/21x-base-class-removal-source-';
const require = createRequire(import.meta.url), ts = require('typescript');
const hash = raw => createHash('sha256').update(raw).digest('hex'), bound = new Map();
function readBound(path, expected) {
  const absolute = resolve(root, path), raw = readFileSync(absolute);
  if (expected) assert.equal(hash(raw), expected, path);
  const ref = {path: relative(root, absolute), sha256: hash(raw), bytes: raw.length};
  if (bound.has(absolute)) assert.deepEqual(bound.get(absolute), ref);
  else bound.set(absolute, ref);
  return raw;
}
assert.equal(process.version, 'v24.21.0'); assert.equal(ts.version, '5.9.2');
readBound(fileURLToPath(import.meta.url)); readBound(require.resolve('typescript'));
const prior = JSON.parse(readBound(prefix + 'owned-member-inventory.json',
  '08c49906e2aeccf6551686319194d856023f275fdabc654cfe0d970750cd1712'));
for (const ref of prior.source_bindings) assert.equal(readBound(ref.path, ref.sha256).length, ref.bytes);
const original = JSON.parse(gunzipSync(readBound(prefix + 'originals.json.gz')));
const seedPaths = prior.source_bindings.filter(ref => ref.path.startsWith('projects/') && ref.path.endsWith('.ts'))
  .map(ref => ref.path);
assert.equal(seedPaths.length, prior.owned_source_files);
const counterpartSeeds = original.tagged_reference.members
  .filter(member => member.path.startsWith('src/material/legacy-') && member.path.endsWith('.ts'))
  .map(member => member.path.replace('src/material/', 'projects/ngx-material-legacy/'))
  .filter(path => existsSync(resolve(root, path)));
const queue = [...new Set([...seedPaths, ...counterpartSeeds])];
const sources = new Map(), relativeEdges = [], externalBindings = [];
while (queue.length) {
  const path = queue.shift(); if (sources.has(path)) continue;
  const body = readBound(path).toString(), source = ts.createSourceFile(path, body, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0, path); sources.set(path, source);
  for (const node of source.statements) if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
    const specifier = node.moduleSpecifier.text;
    if (!specifier.startsWith('.')) {
      externalBindings.push({path, specifier, declaration: node.getText(source)}); continue;
    }
    const base = resolve(root, dirname(path), specifier.replace(/\.js$/, '.ts'));
    const target = [base, base + '.ts', resolve(base, 'index.ts')]
      .find(candidate => existsSync(candidate) && statSync(candidate).isFile());
    assert.ok(target, path + ' -> ' + specifier);
    const resolvedPath = relative(root, target);
    assert.ok(resolvedPath.startsWith('projects/ngx-material-legacy/') && resolvedPath.endsWith('.ts'), resolvedPath);
    relativeEdges.push({from: path, specifier, to: resolvedPath}); queue.push(resolvedPath);
  }
}
function declarations(path, source) {
  const family = path.startsWith('src/material/') ? path.split('/')[2].replace(/^legacy-/, '')
    : path.split('/')[2].replace(/^legacy-/, '');
  return source.statements.filter(n => (ts.isClassDeclaration(n) || ts.isInterfaceDeclaration(n)) && n.name)
    .map(node => ({key: family + ':' + node.name.text, name: node.name.text, path, source, node,
      kind: ts.SyntaxKind[node.kind]}));
}
const owned = [...sources].flatMap(([path, source]) => declarations(path, source));
const renames = {'dialog:MatDialogRef': 'dialog:MatLegacyDialogRef',
  'table:_MatCellHarnessBase': 'table:_MatLegacyCellHarnessBase',
  'table:_MatRowHarnessBase': 'table:_MatLegacyRowHarnessBase',
  'table:MatRowHarnessColumnsText': 'table:MatLegacyRowHarnessColumnsText'};
function tokenHash(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text), tokens = [];
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan())
    tokens.push([kind, scanner.getTokenText()]);
  return hash(JSON.stringify(tokens));
}
function members(owner) {
  const found = new Map();
  for (const node of owner.node.members) {
    const base = ts.SyntaxKind[node.kind] + ':' + (node.name?.getText(owner.source) || '<constructor>') + ':' +
      (node.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword) ? 'static' : 'instance');
    let key = base, index = 1; while (found.has(key)) key = base + ':' + ++index;
    const text = node.getText(owner.source);
    found.set(key, {key, text, token_sha256: tokenHash(text),
      line: owner.source.getLineAndCharacterOfPosition(node.getStart(owner.source)).line + 1});
  }
  return found;
}
const additionalPairs = [], stillUnmatched = [], ambiguous = [];
for (const missing of prior.unmatched_tagged_declarations) {
  const member = original.tagged_reference.members.find(m => m.path === missing.path);
  assert.ok(member); assert.equal(hash(member.body), member.sha256);
  const source = ts.createSourceFile(member.path, member.body, ts.ScriptTarget.Latest, true);
  const tagged = declarations(member.path, source).find(d => d.key === missing.key && d.kind === missing.kind);
  assert.ok(tagged);
  const ownedKey = renames[tagged.key] || tagged.key;
  const matches = owned.filter(o => o.key === ownedKey && o.kind === tagged.kind);
  if (!matches.length) {stillUnmatched.push(missing); continue;}
  if (matches.length !== 1) {ambiguous.push({...missing, candidates: matches.map(m => m.path)}); continue;}
  const current = matches[0], oldMembers = members(tagged), newMembers = members(current);
  const unchanged = [], differences = [];
  for (const [key, oldMember] of oldMembers) {
    const value = newMembers.get(key);
    if (value && value.token_sha256 === oldMember.token_sha256)
      unchanged.push({key, token_sha256: value.token_sha256, tagged_line: oldMember.line, owned_line: value.line});
    else differences.push({key, status: value ? 'changed' : 'not-directly-present', tagged: oldMember, owned: value || null});
  }
  for (const [key, value] of newMembers) if (!oldMembers.has(key))
    differences.push({key, status: 'owned-only', tagged: null, owned: value});
  const header = owner => owner.source.text.slice(owner.node.getStart(owner.source), owner.node.members.pos);
  additionalPairs.push({key: tagged.key, owned_key: ownedKey, tagged_path: tagged.path, owned_path: current.path,
    explicit_declaration_rename: tagged.key !== ownedKey, tagged_header: header(tagged), owned_header: header(current),
    headers_token_identical: tokenHash(header(tagged)) === tokenHash(header(current)),
    unchanged_members: unchanged, differences});
}
assert.equal(ambiguous.length, 0, JSON.stringify(ambiguous));
for (const [path, ref] of bound) {
  const raw = readFileSync(path); assert.equal(raw.length, ref.bytes); assert.equal(hash(raw), ref.sha256);
}
const report = {schema_version: 1, line: '21.x', sha: prior.sha, node: process.version, typescript: ts.version,
  role: 'Navigation supplement only. Resolve complete local relative import/export closure of the90seed sources plus existing exact-path tagged legacy source counterparts,and pair previously unmatched tagged declarations by exact name or four explicit declaration-name mappings. No member identifiers or import bindings are rewritten. No unmatched declaration is automatically irrelevant and no raw-token identity is behavior/API acceptance.',
  seed_sources: seedPaths.length, closure_sources: sources.size,
  tagged_legacy_counterpart_seeds: counterpartSeeds,
  additional_source_paths: [...sources.keys()].filter(path => !seedPaths.includes(path)),
  relative_edges: relativeEdges, external_bindings: externalBindings, explicit_declaration_mappings: renames,
  additional_pairs: additionalPairs,
  additional_exact_member_pairs: additionalPairs.reduce((n, p) => n + p.unchanged_members.length, 0),
  additional_member_differences: additionalPairs.reduce((n, p) => n + p.differences.length, 0),
  still_unmatched_tagged_declarations: stillUnmatched, ambiguous_pairs: ambiguous,
  source_bindings: [...bound.values()], product_changes: 0, canonical_dispositions_changed: 0,
  whole_SHA_substantive_review_complete: false, actual_native_packed_browser_floor_or_full_audit_qualified: false,
  g11_claim: 'not-passed'};
writeFileSync(prefix + 'owned-closure-supplement.json', JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({role: 'navigation-only', closure_sources: sources.size,
  additional_pairs: additionalPairs.length, additional_exact_members: report.additional_exact_member_pairs,
  additional_member_differences: report.additional_member_differences,
  still_unmatched_tagged: stillUnmatched.length, whole_SHA_qualified: false}));
