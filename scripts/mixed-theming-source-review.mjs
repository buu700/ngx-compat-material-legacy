/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete original theming source and owned-scope checks; no Sass/compiler/native execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteMixedThemingFile} from '../compatibility/rc/mixed-theming-source-authenticator.mjs';
import {originalEnvironmentCases} from './spec-test-environment-source-review.mjs';
import {overlayHooks} from './spec-overlay-async-source-review.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
import {inspectChipEmptyRepair} from './spec-stability-chip-repair.mjs';
import {deriveHistoricalRoster} from './historical-case-roster.mjs';
const ts = createRequire(import.meta.url)('typescript');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prefix = 'compatibility/rc/mixed-theming-source-', pinSha = 'df334c7929358b366ca55fb32345a2458b286e7bf6ebe35c7e2afd9ea6e693d2';
const hash = value => createHash('sha256').update(value).digest('hex');
export const THEMING_SHAS = ['82844b3d52235f67119eb5f0fe4e5c56474440c3', '1735032610eec0cb4d9695b2fd621a71346495c7',
  '0da585f7307ea98b5575d520d3b6da79769827c4', 'a28b5b0ace56e005d6e9100bbd76d87c33d254ac'];
export const INSPECTION_NAMES = ['get-theme-version', 'get-theme-type', 'get-theme-color', 'get-theme-typography', 'get-theme-density', 'theme-has'];
const parse = text => {const file = ts.createSourceFile('original.ts', text, ts.ScriptTarget.Latest, true);
  assert.equal(file.parseDiagnostics.length, 0); return file;};
function semantic(node) {const children = []; ts.forEachChild(node, n => {children.push(semantic(n));});
  return [node.kind, ts.isVariableDeclarationList(node) ? node.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let) : null,
    node.isTypeOnly ?? null, ts.isIdentifier(node) ? node.text : ts.isLiteralExpression(node) ? node.text : null, children];}
const fingerprint = node => hash(JSON.stringify(semantic(node)));
/** Lex complete source spans, keeping strings, interpolation and comments as original data. */
function spanEnd(text, start, statement) {
  const stack = [], pairs = {'(': ')', '[': ']', '{': '}'}, open = new Set(Object.keys(pairs));
  let quote = null, line = false, block = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (line) {if (c === '\n') line = false; continue;}
    if (block) {if (c === '*' && next === '/') {block = false; i++;} continue;}
    if (quote) {if (c === '\\') i++; else if (c === quote) quote = null; continue;}
    if (c === '/' && next === '/') {line = true; i++; continue;}
    if (c === '/' && next === '*') {block = true; i++; continue;}
    if (c === '"' || c === "'") {quote = c; continue;}
    if (open.has(c)) stack.push(pairs[c]);
    else if ([')', ']', '}'].includes(c)) {assert.equal(stack.pop(), c, 'unbalanced source span'); if (!statement && stack.length === 0) return i + 1;}
    else if (statement && c === ';' && stack.length === 0) return i + 1;
  }
  assert.fail('unterminated source span');
}
export function sassSourceFacts(text) {
  const functions = [];
  for (const match of text.matchAll(/^@function\s+([\w-]+)\s*\(/gm)) {
    const brace = text.indexOf('{', match.index), end = spanEnd(text, brace, false), raw = text.slice(match.index, end);
    functions.push({name: match[1], header: text.slice(match.index, brace).trim(), raw, sha256: hash(raw)});
  }
  assert.equal(new Set(functions.map(n => n.name)).size, functions.length);
  const variables = [];
  for (const match of text.matchAll(/^\$([\w-]+)\s*:/gm)) {
    const end = spanEnd(text, match.index + match[0].length, true), raw = text.slice(match.index, end);
    const keys = [...raw.matchAll(/^(\s*)([\w-]+)\s*:/gm)].map(n => ({indent: n[1].length, key: n[2]}));
    variables.push({name: match[1], raw, sha256: hash(raw), keys,
      hex_values: [...raw.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(n => n[0]),
      top_level_roles: keys.filter(n => n.indent === 2 && !/^\d+$/.test(n.key)).map(n => n.key)});
  }
  return {sha256: hash(text), functions, variables,
    module_statements: [...text.matchAll(/^\s*@(use|forward|import)\s+[^;]+;/gm)].map(n => n[0])};
}
function sourceFrame(member, side) {
  const text = member[side].text;
  if (member.path.endsWith('.scss')) return {...sassSourceFacts(text), raw: text};
  if (!/\.(?:ts|js)$/.test(member.path)) return {sha256: hash(text), raw: text};
  const file = parse(text), subject = {members: [member]};
  return {sha256: hash(text), semantic_sha256: fingerprint(file), raw: text,
    cases: originalEnvironmentCases(subject, side).map(({raw, normalized_callback_sha256, ...row}) => row),
    hooks: overlayHooks(subject, side).map(({raw, ...row}) => row)};
}
export function observeThemingSubject(subject, index) {
  assert.equal(subject.sha, THEMING_SHAS[index]);
  const files = subject.members.map(member => ({path: member.path, before: sourceFrame(member, 'before'), after: sourceFrame(member, 'after')}));
  const specs = subject.members.filter(n => n.path.endsWith('.spec.ts'));
  const before = originalEnvironmentCases({members: specs}, 'before'), after = originalEnvironmentCases({members: specs}, 'after');
  assert.equal(before.length, after.length); const byKey = new Map(after.map(n => [n.key, n]));
  const pairs = before.map(old => {const next = byKey.get(old.key); assert.ok(next, 'original test identity lost');
    assert.equal(old.mode, next.mode); return {key: old.key, before_sha256: old.sha256, after_sha256: next.sha256,
      complete_callback_semantics_equal: old.callback_sha256 === next.callback_sha256};});
  let data = null;
  if (index === 0) {
    const entry = subject.members.find(n => n.path === 'src/material/_index.scss'); assert.ok(entry);
    for (const name of INSPECTION_NAMES) {assert.ok(entry.before.text.includes('private-' + name)); assert.ok(entry.after.text.includes(name));}
    data = {published_names: INSPECTION_NAMES, ownership: 'public upstream API outside historical16 namespace'};
  } else if (index === 1 || index === 2) {
    const palette = files.find(n => n.path.endsWith('/_m3-palettes.scss')), tokens = files.find(n => n.path.endsWith('/_m3-tokens.scss'));
    assert.ok(palette && tokens);
    const oldFunctions = new Map(tokens.before.functions.map(n => [n.name, n.sha256]));
    const changedFunctions = tokens.after.functions.filter(n => oldFunctions.get(n.name) !== n.sha256).map(n => n.name);
    assert.deepEqual(changedFunctions, index === 1 ? ['_generate-palette-tokens', '_generate-ref-palette-tokens', 'generate-color-tokens'] :
      ['_generate-ref-palette-tokens', 'generate-color-tokens']);
    assert.deepEqual(palette.before.functions, palette.after.functions, 'unreviewed palette function change');
    assert.deepEqual([palette.before.variables.length, palette.after.variables.length], index === 1 ? [8, 8] : [8, 13]);
    data = {before_palette_variables: palette.before.variables.map(({raw, keys, hex_values, ...n}) => ({...n, hex_values: hex_values.length})),
      after_palette_variables: palette.after.variables.map(({raw, keys, hex_values, ...n}) => ({...n, hex_values: hex_values.length})),
      changed_token_functions: changedFunctions, unchanged_palette_helpers: palette.after.functions.map(n => n.name),
      palette_data_or_token_behavior_equivalence_proved: false};
  }
  return {sha: subject.sha, files, pairs, data, cases_before: before.length, cases_after: after.length,
    unchanged_complete_callbacks: pairs.filter(n => n.complete_callback_semantics_equal).length,
    source_conclusion_only: true, actual_Sass_Angular_native_artifact_browser_SSR_or_floor_qualified: false};
}
export function reviewThemingSubject(subject, index, pin) {
  assert.deepEqual(subject.members.map(n => [n.path, hash(n.before.text), hash(n.after.text)]),
    pin.observation.files.map(n => [n.path, n.before.sha256, n.after.sha256]), 'complete original bytes changed');
  const observed = observeThemingSubject(subject, index); assert.deepEqual(observed, pin.observation, 'unreviewed complete source frame'); return observed;
}
export function inspectThemingOwnedContext({root = rootDefault, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p))), intake = JSON.parse(read(prefix + 'intake.json'));
  for (const ref of intake.owned_context_read) assert.equal(hash(read(ref.path)), ref.sha256, 'owned M2/tooling/oracle context drift ' + ref.path);
  const oracle = JSON.parse(read('compatibility/rc/oracles/material-16.2.14-sass-api.json'));
  assert.deepEqual(oracle.counts, {variables: 47, functions: 25, mixins: 286});
  for (const kind of ['variables', 'functions', 'mixins']) assert.equal(Object.keys(oracle.members[kind]).length, oracle.counts[kind]);
  for (const name of INSPECTION_NAMES) assert.equal(Object.hasOwn(oracle.members.functions, name), false, 'new API claimed historical');
  const paths = candidateProductSourcePaths(root), rows = [], currentMaterial = [];
  for (const path of paths) {const raw = read(path), text = raw.toString(); rows.push({path, sha256: hash(raw)});
    if (!path.endsWith('.scss')) continue;
    for (const m of text.matchAll(/^\s*@(use|forward)\s+['"]([^'"]+)['"]([^;]*);/gm)) {
      assert.ok(!m[2].startsWith('@angular/material-experimental'), 'owned experimental M3 dependency ' + path);
      if (m[2] === '@angular/material') {assert.equal(m[1], 'use', 'current Material wildcard facade');
        const alias = m[3].match(/\bas\s+([\w-]+)/)?.[1]; assert.ok(alias); currentMaterial.push(path);
        assert.ok(!new RegExp('\\b' + alias + '\\.m2-[\\w-]+\\s*\\(').test(text), 'upstream m2 compatibility call-through');}
    }
    assert.ok(!/(?:\b[\w-]+\.)?(?:get-theme-(?:version|type|color|typography|density)|theme-has)\s*\(/.test(text),
      'new inspection API entered historical model ' + path);
  }
  assert.equal(paths.length, 1028);
  assert.deepEqual(currentMaterial.sort(), ['styles/bridges/_companion-overrides.scss', 'styles/bridges/_form-field-state-overrides.scss',
    'styles/datepicker/_datepicker-theme.scss', 'styles/progress-bar/_progress-bar-theme.scss'].map(n => 'projects/ngx-material-legacy/' + n));
  const lock = JSON.parse(read('toolchain-lock.json')), rootPackage = JSON.parse(read('package.json')),
    library = JSON.parse(read('projects/ngx-material-legacy/package.json'));
  assert.equal(read('.node-version').toString().trim(), lock.repository.node); assert.equal(read('.npm-version').toString().trim(), lock.release.npm);
  assert.equal(rootPackage.packageManager, 'pnpm@' + lock.repository.pnpm);
  assert.ok(library.engines.node.includes('||')); assert.notEqual(library.engines.node, rootPackage.engines.node);
  return {source_members: paths.length, members_sha256: hash(JSON.stringify(rows)), owned_context: intake.owned_context_read,
    historical_oracle_counts: oracle.counts, historical_oracle_members: 358, modern_inspection_names_added: 0,
    allowed_current_companion_style_routes: currentMaterial, current_private_tools: lock.repository,
    current_private_npm: lock.release.npm, published_node_engine: library.engines.node, peer_dependencies: library.peerDependencies,
    consumer_engine_narrowed_or_required_HTML_CSS_SCSS_changes: false, actual_compiler_floor_or_Sass_executed: false};
}
export function themingPins({root = rootDefault, readMember} = {}) {const read = readMember || (p => readFileSync(resolve(root, p)));
  const raw = read(prefix + 'observation-pins.json.gz'); assert.equal(hash(raw), pinSha, 'original source observations changed'); return JSON.parse(gunzipSync(raw));}
export function inspectThemingSources({root = rootDefault, readMember} = {}) {
  const read = readMember || (p => readFileSync(resolve(root, p))), pins = themingPins({root, readMember: read});
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const load = name => {const raw = read(prefix + name); assert.equal(hash(raw), pins.capsules[line][name]); return JSON.parse(gunzipSync(raw));};
  const originals = load('subjects.json.gz'), acquisition = load('acquisition.json.gz');
  assert.deepEqual(originals.subjects.map(n => n.sha), THEMING_SHAS); assert.deepEqual(acquisition.subjects, THEMING_SHAS);
  const censusRaw = read('compatibility/rc/upstream-complete-patch-census.json.gz'), census = JSON.parse(gunzipSync(censusRaw));
  assert.equal(census.commits.length, 1697); assert.equal(hash(censusRaw), originals.source_inventory.sha256);
  for (const packet of [originals, acquisition]) {assert.equal(packet.line, line); assert.equal(hash(read(packet.producer.path)), packet.producer.sha256);
    assert.equal(hash(packet.selection.worksheet_text), packet.selection.sha256);}
  assert.equal(acquisition.shared_cache_written, false); assert.equal(acquisition.credentials_used_or_changed, false);
  assert.equal(acquisition.upstream_or_candidate_source_executed, false);
  const subjects = originals.subjects.map((subject, index) => {
    const original = census.commits.find(n => n.sha === subject.sha); assert.equal(original.raw_commit, subject.raw_commit);
    assert.deepEqual(original.complete_changed_files, subject.complete_changed_files);
    assert.equal(hash(read(prefix + subject.sha + '.original.patch')), subject.diff_sha256);
    const parts = subject.diff.split(/(?=^diff --git )/m).filter(Boolean), hunks = []; assert.equal(parts.length, subject.members.length);
    for (const [i, member] of subject.members.entries()) {const diff = parts[i];
      hunks.push(...reviewCompleteMixedThemingFile({...subject, members: [member], complete_changed_files: [subject.complete_changed_files[i]],
        diff, diff_sha256: hash(diff), diff_bytes: Buffer.byteLength(diff), original_hunks: (diff.match(/^@@ /gm) || []).length}, THEMING_SHAS));}
    assert.equal(hunks.length, subject.original_hunks);
    return {...reviewThemingSubject(subject, index, pins.subjects[index]), hunks, review: pins.subjects[index].review};
  });
  const owned = inspectThemingOwnedContext({root, readMember: read}); assert.deepEqual(owned, pins.owned_context[line]);
  const product = inspectChipEmptyRepair({root, readMember: read}), roster = deriveHistoricalRoster(root);
  assert.equal(roster.ids.length + roster.discovery_negative_ids.length, 2228);
  return {schema_version: 1, line, subjects, owned_context: owned, complete_original_files: 28, complete_original_bodies: 56,
    complete_original_hunks: 81, retained_source_case_identities: subjects.reduce((n, s) => n + s.cases_before, 0),
    unchanged_complete_source_callbacks: subjects.reduce((n, s) => n + s.unchanged_complete_callbacks, 0), owned_product_members: product.product_members,
    current_required_historical_case_ids: 2228, product_or_consumer_changes: 0, required_consumer_HTML_CSS_SCSS_changes: 0,
    actual_Sass_Angular_native_artifact_browser_SSR_or_floor_qualified: false, g11_claim: 'not-passed'};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = inspectThemingSources(), at = process.argv.indexOf('--out');
  if (at >= 0) writeFileSync(process.argv[at + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({line: report.line, subjects: 4, files: 28, hunks: 81, cases: report.retained_source_case_identities,
    unchanged_callbacks: report.unchanged_complete_source_callbacks, actual_runtime_qualified: false}));
}
