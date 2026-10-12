/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p)), json = p => JSON.parse(read(p));
const hash = b => createHash('sha256').update(b).digest('hex');
const write = (p, value) => writeFileSync(join(root, p), JSON.stringify(value, null, 2) + '\n');
const sourcePath = 'compatibility/rc/ink-bar-zone-source-boundary-diagnostic.json';
const runtimePath = 'compatibility/rc/ink-bar-zone-runtime-boundary-diagnostic.json';
const source = json(sourcePath), runtime = json(runtimePath), recordedCase = source.recorded_case;
const ledgerPath = 'compatibility/f10/authored-dependency-dispositions.json', ledger = json(ledgerPath);
assert.equal(source.line, ledger.line); assert.equal(recordedCase.candidate_source_sha256, hash(read(runtime.source.path)));
assert.equal(runtime.source.sha256, recordedCase.candidate_source_sha256);
assert.equal(source.producer_sha256, hash(read('tests/ink_bar_zone_source_probe.mjs')));
assert.equal(source.review_producer_sha256, hash(read('scripts/ink-bar-zone-use-review.mjs')));
assert.equal(runtime.reference.sha256, hash(read(runtime.reference.path)));
assert.equal(runtime.tagged_shared_reference.sha256, hash(read(runtime.tagged_shared_reference.path)));
assert.equal(runtime.results.length, 10); assert.equal(runtime.source_mutations.length, 4); assert.equal(runtime.runtime_mutations.length, 10);
assert.equal(runtime.type_compilation.subjects.length, 3); assert.equal(source.controls.length, 4);
assert.ok(runtime.type_compilation.subjects.every(r => r.negative_checks === 7));
assert.equal(runtime.namespace_capsule_sha256, hash(read('compatibility/rc/material-public-subjects.json')));
assert.ok(runtime.results.some(r => r.line === ledger.line && r.mode === 'zoneful'));
assert.ok(runtime.results.some(r => r.line === ledger.line && r.mode === 'zoneless'));
assert.equal(runtime.native_packed_or_full_legacy_scheduler_qualified, false);
const matches = ledger.symbol_uses.filter(r => r.file === recordedCase.file && r.module === recordedCase.module && r.symbol === recordedCase.symbol);
assert.equal(matches.length, 1); assert.equal(matches[0].disposition, 'open');
const reviewPath = 'compatibility/f10/authored-use-reviews/public-ink-bar-zone-boundary.json';
assert.ok(!existsSync(join(root, reviewPath)));
const refs = [sourcePath, runtimePath, 'scripts/ink-bar-zone-use-review.mjs',
  'tests/ink_bar_zone_source_probe.mjs', 'tests/ink_bar_zone_runtime_probe.mjs',
  runtime.reference.path, runtime.tagged_shared_reference.path,
  'projects/ngx-material-legacy/legacy-tabs/internal/ink-bar-shared.ts'].map(path => ({path, sha256: hash(read(path))}));
const decision = 'The required second constructor parameter is the checker-bound public NgZone value/type and remains in the original four-argument signature. Only public run, readonly isStable and onStable are consumed. Complete authentic original16 and both minimum public export namespaces supply stable declarations; the entire owned class and exact constructor use type-check against all three complete namespaces with skipLibCheck:false and seven negative contracts each, using borrowed TS6.0.3 rather than qualifying compiler floors. Whole untouched16 and owned classes execute across ten isolated development/production real zones: genuine peer-compatible Zone.js supplies zoneful behavior, and current public provideZonelessChangeDetection supplies a zone with no Zone global. Five alignment/visibility states and exact style-write/event sequences match original in every zoneful subject; current zoneless uses the already implemented stable fallback, whereas original intentionally never aligns there. Four authentic source mutations, ten real runtime faults and four caller-binding faults reject wrong timing, missing fallback, swapped geometry, optional construction, unsupported members or extra references. Historical constructor, selector, host, visibility methods and complete positioner body remain unchanged. Element/style/offsets and imported positioner token are explicit protocols; native geometry, node DI, whole packed component/scheduler/AOT/browser matrix and Node/Rx/compiler floors remain unqualified. The cross-line runtime retains its original main envelope: distinct original/main/21.x observations test byte-identical owned source against their own public peers; the 21.x source binding is separately derived. No consumer HTML/CSS/SCSS change or public/private upstream compatibility surface is introduced. This closes only the finite NgZone caller boundary, not G11.';
write(reviewPath, {schema_version: 1, line: ledger.line, status: 'reviewed', reviews: [{...recordedCase,
  recorded_case: recordedCase, conclusion: 'stable-public-peer', reviewer: 'Codex primary implementer', decision,
  independent_evidence: refs}], g11_claim: 'not-passed'});
Object.assign(matches[0], {status: 'reviewed', disposition: 'closed', source_review: {path: reviewPath, sha256: hash(read(reviewPath))}});
const counted = authoredUseReviewEvidence(ledger, ledger.line, read, hash); assert.equal(counted.insufficient, 0);
ledger.reviewed_uses = counted.reviewed; ledger.open_uses = ledger.symbol_uses.length - counted.reviewed; write(ledgerPath, ledger);
write('compatibility/rc/ink-bar-zone-boundary-checkpoint.json', {schema_version: 1, line: ledger.line,
  source_parent: execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(),
  status: 'one-public-zone-caller-boundary-qualified', source: recordedCase, runtime_subjects: 10,
  retained_runtime_envelope_line: runtime.line, per_line_peer_models: [...new Set(runtime.results.map(r => r.line))],
  source_negatives: 8, runtime_negatives: 10, strict_type_negative_checks: 21,
  compiler_floor_qualified: false, native_or_packed_qualified: false,
  frozen_reviewed: counted.reviewed, frozen_open: ledger.open_uses, invalid_closed: counted.insufficient,
  evidence: [{path: reviewPath, sha256: hash(read(reviewPath))}, ...refs],
  unexecuted: ['Full packed/native geometry and actual directive node DI; final Actions deferred.',
    'Canonical Node/Rx/compiler floors and complete browser matrix.', 'Complete G11 and independent final audit.'], g11_claim: 'not-passed'});
console.log(JSON.stringify({line: ledger.line, caller_roles: 1, frozen_reviewed: counted.reviewed, frozen_open: ledger.open_uses, invalid_closed: 0}));
