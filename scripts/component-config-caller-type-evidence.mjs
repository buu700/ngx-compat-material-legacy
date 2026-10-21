/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete current configuration type evidence; no defaults/runtime or canonical credit. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {componentConfigSource} from './component-config-caller-contracts.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const raw = root => path => readFileSync(join(root, path));
const pins = {
  main: {path: 'compatibility/rc/component-config-caller-public-types-main.json', sha256: '24057005a19fd9f639feb4ed4a7e4ee107b2ff59630582c3ed905fe9dade6714'},
  '21.x': {path: 'compatibility/rc/component-config-caller-public-types-21.json', sha256: 'e6e482f0f110ed2e92ec24d96ad7b8f3a307307487db43201b2a88771f07339a'},
};
const unstable = new Set(['docs-private', 'deprecated', 'breaking-change', 'experimental', 'developerPreview']);
const owned = ['legacy-progress-bar/progress-bar.ts:MatProgressBarDefaultOptions',
  'legacy-progress-bar/progress-bar.ts:MAT_PROGRESS_BAR_DEFAULT_OPTIONS',
  'legacy-progress-bar/progress-bar.ts:MAT_PROGRESS_BAR_LOCATION',
  'legacy-progress-bar/progress-bar.ts:MatProgressBarLocation',
  'legacy-checkbox/internal/checkbox-base.ts:TransitionCheckState'].sort();

export function qualifiedComponentConfigTypes({root = process.cwd(), read = raw(root)} = {}) {
  const source = componentConfigSource({root, read}), line = source.prior.line, ref = pins[line];
  const bytes = read(ref.path);
  assert.equal(hash(bytes), ref.sha256, 'changed component configuration type proof');
  const proof = JSON.parse(bytes);
  assert.equal(proof.line, line);
  assert.equal(proof.discovering, false);
  assert.equal(proof.source_parent, source.prior.source_parent);
  assert.equal(proof.source_files, 200);
  assert.equal(source.sources.size, 200);
  assert.equal(proof.source_closures, 0);
  assert.equal(proof.actual_runtime_native_packed_AOT_or_full_floor_qualified, false);
  assert.equal(proof.g11_claim, 'not-passed');
  assert.deepEqual(proof.metadata, source.metadata);
  const inputs = new Map();
  for (const member of proof.inputs) {
    assert.equal(inputs.has(member.path), false, 'duplicate configuration type input');
    inputs.set(member.path, member.sha256);
    assert.equal(hash(read(member.path)), member.sha256, 'changed configuration type input ' + member.path);
    assert.ok(!member.path.includes('snack-dom-source-context'), 'mutable source owner in configuration type proof');
  }
  for (const [path, text] of source.sources) assert.equal(inputs.get(path), hash(text), 'missing current graph input');
  for (const member of source.metadata) assert.equal(inputs.get(member.path), member.sha256);
  const versions = {original: ['16.2.12', '16.2.14'], main: ['22.1.7', '22.1.7'], '21.x': ['21.2.23', '21.2.14']};
  assert.equal(proof.subjects.length, 3);
  const seen = new Set();
  let current;
  for (const subject of proof.subjects) {
    assert.equal(seen.has(subject.line), false);
    seen.add(subject.line);
    assert.deepEqual([subject.Core, subject.Material], versions[subject.line]);
    assert.equal(subject.strict, true);
    assert.equal(subject.strictPropertyInitialization, false);
    assert.equal(subject.noImplicitOverride, true);
    assert.equal(subject.skipLibCheck, false);
    assert.deepEqual(subject.diagnostics, []);
    assert.equal(subject.invalid_type_controls, 7);
    assert.equal(subject.SDK_rewrites, false);
    assert.equal(subject.symbols.length, 32);
    assert.equal(subject.symbols.filter(symbol => symbol.actually_consumed_current_peer).length, 27);
    for (const symbol of subject.symbols) {
      assert.equal(symbol.missing, false);
      assert.ok(symbol.declarations.length > 0);
      if (subject.line !== 'original' && symbol.actually_consumed_current_peer) {
        assert.ok(symbol.tags.every(tag => !unstable.has(tag)), 'unstable current configuration symbol');
      }
    }
    assert.deepEqual(subject.unstable_current_uses, []);
    assert.deepEqual(subject.selected_any_unknown_casts, []);
    if (subject.line === line) {
      current = subject;
      assert.equal(subject.current_source_files, 200);
      assert.equal(subject.actual_bindings.length, 73);
      assert.equal(subject.actual_bindings.filter(binding => binding.current_peer_use).length, 68);
      assert.deepEqual(subject.actual_bindings.filter(binding => !binding.current_peer_use)
        .map(binding => binding.file + ':' + binding.name).sort(), owned);
      const facts = new Map(source.facts.map(fact => [fact.file + ':' + fact.module + ':' + fact.symbol, fact]));
      const bound = new Set();
      for (const binding of subject.actual_bindings) {
        const key = binding.file + ':' + binding.module + ':' + binding.name, fact = facts.get(key);
        assert.ok(fact);
        assert.equal(bound.has(key), false);
        bound.add(key);
        assert.equal(binding.current_peer_use, fact.current_peer_use);
        assert.equal(binding.current_module, fact.current_module);
        assert.ok(binding.declarations.length > 0);
      }
      assert.equal(subject.actual_consumed_members.length, 66);
      assert.deepEqual(subject.actual_resolved_calls, []);
      for (const member of subject.actual_consumed_members) {
        assert.equal(member.hidden, false);
        assert.ok(member.tags.every(tag => !unstable.has(tag)), 'unstable consumed configuration member');
      }
    } else {
      assert.equal(subject.current_source_files, 0);
      assert.deepEqual(subject.actual_bindings, []);
      assert.deepEqual(subject.actual_consumed_members, []);
      assert.deepEqual(subject.actual_resolved_calls, []);
    }
  }
  assert.deepEqual([...seen].sort(), Object.keys(versions).sort());
  assert.ok(current);
  return {source, proof, ref, current, source_closures_prepared: 0,
    actual_runtime_native_packed_AOT_or_full_floor_qualified: false};
}
