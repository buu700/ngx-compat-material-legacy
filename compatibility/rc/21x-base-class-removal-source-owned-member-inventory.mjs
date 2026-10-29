/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Navigation only: exact tagged-to-owned declaration/member tokens, without identifier rewrites. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve, relative} from 'node:path';
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
const original = JSON.parse(gunzipSync(readBound(prefix + 'originals.json.gz',
  '3cb87a97a4365dd9959ec4c5fd4a5a2e1f0d5c3656e91e7e1aef65181955f49a')));
const journal = JSON.parse(readBound(prefix + 'review-progress-tabs-tooltip.json',
  '5181564df149ce9ab295db99f6be680937ea29762f39d95af08d44c73d60367b'));
assert.equal(journal.original_members_read, 72); assert.equal(journal.original_hunks_read, 329);
const ownedPaths = new Map();
function collect(value) {
  if (Array.isArray(value)) {for (const child of value) collect(child); return;}
  if (!value || typeof value !== 'object') return;
  if (typeof value.path === 'string' && value.path.startsWith('projects/ngx-material-legacy/') &&
      value.path.endsWith('.ts') && value.sha256 && value.bytes) {
    const prior = ownedPaths.get(value.path);
    if (prior) assert.equal(prior.sha256, value.sha256, value.path);
    else ownedPaths.set(value.path, {path: value.path, sha256: value.sha256, bytes: value.bytes});
  }
  for (const child of Object.values(value)) collect(child);
}
collect(journal); assert.ok(ownedPaths.size > 50);
function tokens(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text), out = [];
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan())
    out.push([kind, scanner.getTokenText()]);
  return out;
}
function declarations(path, body, family) {
  const source = ts.createSourceFile(path, body, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0, path);
  return source.statements.filter(n => (ts.isClassDeclaration(n) || ts.isInterfaceDeclaration(n)) && n.name)
    .map(node => ({key: family + ':' + node.name.text, path, body, source, node,
      name: node.name.text, kind: ts.SyntaxKind[node.kind]}));
}
const taggedDeclarations = [], ownedDeclarations = [];
for (const member of original.tagged_reference.members) {
  if (!member.path.startsWith('src/material/') || !member.path.endsWith('.ts')) continue;
  assert.equal(hash(member.body), member.sha256);
  const family = member.path.split('/')[2].replace(/^legacy-/, '');
  taggedDeclarations.push(...declarations(member.path, member.body, family));
}
for (const ref of ownedPaths.values()) {
  const raw = readBound(ref.path, ref.sha256); assert.equal(raw.length, ref.bytes);
  const family = ref.path.split('/')[2].replace(/^legacy-/, '');
  ownedDeclarations.push(...declarations(ref.path, raw.toString(), family));
}
function memberMap(owner) {
  const out = new Map();
  for (const node of owner.node.members) {
    const base = ts.SyntaxKind[node.kind] + ':' + (node.name?.getText(owner.source) || '<constructor>') + ':' +
      (node.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword) ? 'static' : 'instance');
    let key = base, index = 1; while (out.has(key)) key = base + ':' + ++index;
    const text = node.getText(owner.source);
    out.set(key, {key, text, token_sha256: hash(JSON.stringify(tokens(text))),
      line: owner.source.getLineAndCharacterOfPosition(node.getStart(owner.source)).line + 1});
  }
  return out;
}
const pairs = [], unmatchedTagged = [], ambiguous = [], matchedOwned = new Set();
for (const tagged of taggedDeclarations) {
  const candidates = ownedDeclarations.filter(o => o.key === tagged.key && o.kind === tagged.kind);
  if (!candidates.length) {unmatchedTagged.push({key: tagged.key, path: tagged.path, kind: tagged.kind}); continue;}
  if (candidates.length !== 1) {
    ambiguous.push({key: tagged.key, tagged_path: tagged.path, owned_paths: candidates.map(c => c.path)}); continue;
  }
  const owned = candidates[0]; matchedOwned.add(owned.path + ':' + owned.key);
  const oldMembers = memberMap(tagged), newMembers = memberMap(owned), unchanged = [], changes = [];
  for (const [key, oldMember] of oldMembers) {
    const current = newMembers.get(key);
    if (current && oldMember.token_sha256 === current.token_sha256)
      unchanged.push({key, token_sha256: current.token_sha256, tagged_line: oldMember.line, owned_line: current.line});
    else changes.push({key, status: current ? 'changed' : 'not-directly-present', tagged: oldMember, owned: current || null});
  }
  for (const [key, current] of newMembers) if (!oldMembers.has(key))
    changes.push({key, status: 'owned-only', tagged: null, owned: current});
  const header = owner => owner.body.slice(owner.node.getStart(owner.source), owner.node.members.pos);
  const oldHeader = header(tagged), newHeader = header(owned);
  pairs.push({key: tagged.key, kind: tagged.kind, tagged_path: tagged.path, owned_path: owned.path,
    tagged_header: oldHeader, owned_header: newHeader,
    headers_token_identical: JSON.stringify(tokens(oldHeader)) === JSON.stringify(tokens(newHeader)),
    tagged_members: oldMembers.size, owned_members: newMembers.size, unchanged_members: unchanged, differences: changes});
}
const unmatchedOwned = ownedDeclarations.filter(o => !matchedOwned.has(o.path + ':' + o.key))
  .map(o => ({key: o.key, path: o.path, kind: o.kind}));
for (const [path, ref] of bound) {
  const raw = readFileSync(path); assert.equal(raw.length, ref.bytes); assert.equal(hash(raw), ref.sha256);
}
const report = {schema_version: 1, line: '21.x', sha: original.sha, node: process.version, typescript: ts.version,
  role: 'Navigation only. Exact syntax tokens within uniquely paired same-family/same-name class or interface declarations. No renaming,filtering of members or rewriting of imports. Text identity does not prove imported type/token identity,inheritance,provider behavior,metadata,lifetime or native acceptance. Missing direct members may be inherited;unmatched modern declarations are not automatically irrelevant.',
  owned_source_files: ownedPaths.size, tagged_declarations: taggedDeclarations.length,
  owned_declarations: ownedDeclarations.length, unique_pairs: pairs.length,
  exact_member_pairs: pairs.reduce((n, p) => n + p.unchanged_members.length, 0),
  member_differences: pairs.reduce((n, p) => n + p.differences.length, 0),
  pairs, unmatched_tagged_declarations: unmatchedTagged, ambiguous_pairs: ambiguous,
  unmatched_owned_declarations: unmatchedOwned, source_bindings: [...bound.values()],
  canonical_dispositions_changed: 0, product_changes: 0, exceptions_changed: 0,
  whole_SHA_substantive_review_complete: false, actual_native_packed_browser_floor_or_full_audit_qualified: false,
  g11_claim: 'not-passed'};
writeFileSync(prefix + 'owned-member-inventory.json', JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({role: 'navigation-only', owned_source_files: report.owned_source_files,
  unique_pairs: pairs.length, exact_member_pairs: report.exact_member_pairs,
  member_differences: report.member_differences, ambiguous_pairs: ambiguous.length,
  whole_SHA_qualified: false}));
