/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exactly twelve source admissions; historical parent views never admit runtime work. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
import {inspectRippleOptionsIntegration as inspectParent,
  historicalRippleAuthoredReader as historicalParent,
  rippleIntegrationPrior, RIPPLE_AUTHORED_LEDGER, RIPPLE_INTEGRATION_INPUTS,
  RIPPLE_INTEGRATION_PRIOR} from './ripple-global-options-integration.mjs';
export {rippleIntegrationPrior, RIPPLE_AUTHORED_LEDGER, RIPPLE_INTEGRATION_INPUTS, RIPPLE_INTEGRATION_PRIOR};
export const NG_ZONE_INTEGRATION_PRIOR = 'compatibility/rc/ng-zone-use-integration-prior.json.gz';
const pins = {main: 'f4913f2deeee9facf894a7000f16961942103c97a4dccedcac949792fe9723c3',
  '21.x': 'ef030f3147eedaaf88377b9b8079ebb1abb359bd5a7b6aadab60445e96291820'};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const key = row => JSON.stringify([row.file, row.module, row.symbol]);
const expectedKeys = [
  'legacy-form-field/form-field.ts', 'legacy-chips/chip.ts', 'legacy-slider/slider.ts',
  'legacy-tooltip/internal/tooltip-base.ts', 'legacy-tabs/internal/paginated-tab-header.ts',
  'legacy-tabs/internal/tab-body-base.ts', 'legacy-checkbox/internal/checkbox-base.ts',
  'legacy-snack-bar/internal/snack-bar-container-base.ts',
  'legacy-autocomplete/internal/autocomplete-trigger-base.ts', 'legacy-select/internal/select-base.ts',
  'legacy-menu/internal/menu-base.ts', 'legacy-menu/internal/menu-trigger-base.ts',
].map(file => key({file, module: '@angular/core', symbol: 'NgZone'})).sort();
const gitMember = (root, commit, path) => execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0',
  '-c', 'maintenance.auto=0', 'show', commit + ':' + path], {cwd: root, maxBuffer: 4 * 1024 * 1024,
  env: {...process.env, GIT_NO_LAZY_FETCH: '1'}});

export function ngZoneIntegrationPrior({root = process.cwd(), read = p => readFileSync(join(root, p))} = {}) {
  const bytes = read(NG_ZONE_INTEGRATION_PRIOR), prior = JSON.parse(gunzipSync(bytes));
  assert.equal(hash(bytes), pins[prior.line], 'unknown twelve-use integration preimages');
  assert.equal(prior.schema_version, 1); assert.equal(prior.ledger.path, RIPPLE_AUTHORED_LEDGER);
  assert.equal(hash(prior.ledger.text), prior.ledger.sha256);
  assert.equal(hash(gitMember(root, prior.source_parent, prior.ledger.path)), prior.ledger.sha256,
    'ledger parent differs from authenticated Git subject');
  assert.deepEqual(prior.selected.map(key).sort(), expectedKeys);
  for (const edit of prior.test_context_edits) {
    assert.equal(hash(edit.text), edit.sha256);
    assert.equal(hash(gitMember(root, prior.source_parent, edit.path)), edit.sha256,
      'test parent differs from authenticated Git subject: ' + edit.path);
  }
  return prior;
}

export function expectedNgZoneIntegratedLedger(prior) {
  const body = JSON.parse(prior.ledger.text);
  assert.equal(json(body), prior.ledger.text);
  assert.equal(body.reviewed_uses, 1452); assert.equal(body.open_uses, 284);
  const wanted = new Map(prior.selected.map(row => [key(row), row.source_review]));
  let changed = 0;
  for (const row of body.symbol_uses) if (wanted.has(key(row))) {
    assert.equal(row.status, 'inventory-seed'); assert.equal(row.disposition, 'open');
    assert.equal(row.source_review, undefined);
    row.status = 'reviewed'; row.disposition = 'closed'; row.source_review = {...wanted.get(key(row))}; changed++;
  }
  assert.equal(changed, 12); body.reviewed_uses = 1464; body.open_uses = 272;
  body.note = 'Frozen1736-use denominator retained. Twelve exact NgZone source reviews admitted after the six ripple roles; prior receipts and source epochs are preserved. Current valid reviewed labels: 1464; open: 272. Native, packed and full floor qualification remain separate; G11 not-passed.';
  return Buffer.from(json(body));
}

function parentProjection(prior, read) {
  const replacements = new Map([[RIPPLE_AUTHORED_LEDGER, Buffer.from(prior.ledger.text)],
    ...prior.test_context_edits.map(edit => [edit.path, Buffer.from(edit.text)])]);
  return path => replacements.has(path) ? Buffer.from(replacements.get(path)) : read(path);
}

export function inspectNgZoneUseIntegration({root = process.cwd(), read = p => readFileSync(join(root, p))} = {}) {
  const prior = ngZoneIntegrationPrior({root, read}), current = read(RIPPLE_AUTHORED_LEDGER);
  assert.equal(current.equals(expectedNgZoneIntegratedLedger(prior)), true,
    'unknown ledger bytes beyond twelve reviewed roles and exact count/note update');
  for (const member of prior.bound_members)
    assert.equal(hash(read(member.path)), member.sha256, 'changed reviewed or protected bytes: ' + member.path);
  for (const edit of prior.test_context_edits) {
    let after = edit.text;
    for (const [from, to] of edit.substitutions) {
      assert.equal(after.split(from).length, 2, 'ambiguous context substitution'); after = after.replace(from, to);
    }
    assert.equal(hash(after), edit.after_sha256);
    assert.equal(read(edit.path).toString(), after, 'unknown historical test context: ' + edit.path);
  }
  const ledger = JSON.parse(current), selected = {...ledger,
    symbol_uses: ledger.symbol_uses.filter(row => expectedKeys.includes(key(row)))};
  const evidence = authoredUseReviewEvidence(selected, prior.line, read, hash);
  assert.deepEqual(evidence, {reviewed: 12, insufficient: 0, insufficient_uses: []});
  const parent = inspectParent({root, read: parentProjection(prior, read)});
  assert.equal(parent.selected_roles_admitted, 6); assert.equal(parent.reviewed, 1452);
  return {schema_version: 1, line: prior.line, selected_roles_admitted: 12,
    frozen_uses: ledger.symbol_uses.length, reviewed: 1464, open: 272,
    unrelated_rows_preserved: 1724, ledger_sha256: hash(current), before_ledger_sha256: prior.ledger.sha256,
    source_review_documents: prior.source_reviews.length, admitted_review_evidence: evidence.reviewed,
    current_bound_members_rechecked: prior.bound_members.length, test_context_edits: prior.test_context_edits.length,
    original_six_role_checker_preserved_and_passed: true,
    historical_parent_reader_is_not_source_or_native_admission: true,
    current_source_reader_substitutions: 0, native_admission_exceptions_added: 0,
    actual_native_packed_or_floor_qualified: false, g11_claim: 'not-passed'};
}

/** Test-preservation callers alone request the exact authenticated1452 parent.
 * Recheck current1464 ledger, evidence, production sources and test edits first. */
export function ngZoneIntegrationParentReader({root = process.cwd(), read = p => readFileSync(join(root, p))} = {}) {
  inspectNgZoneUseIntegration({root, read});
  return parentProjection(ngZoneIntegrationPrior({root, read}), read);
}

/** Compose the unchanged six-role historical reader only after the twelve-use check. */
export function historicalRippleAuthoredReader({root = process.cwd(), read = p => readFileSync(join(root, p))} = {}) {
  return historicalParent({root, read: ngZoneIntegrationParentReader({root, read})});
}
export function inspectRippleOptionsIntegration({root = process.cwd(), read = p => readFileSync(join(root, p))} = {}) {
  return inspectParent({root, read: ngZoneIntegrationParentReader({root, read})});
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert.deepEqual(process.argv.slice(2), ['--validated-parent']);
  inspectNgZoneUseIntegration();
  const prior = ngZoneIntegrationPrior();
  process.stdout.write(JSON.stringify({line: prior.line, ledger: prior.ledger,
    test_context_edits: prior.test_context_edits, prior_sha256: pins[prior.line]}));
}
