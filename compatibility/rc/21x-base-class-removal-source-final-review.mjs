/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Complete source-assessment coverage, explicitly conditional on four unapplied local repairs. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';

const SELF = 'compatibility/rc/21x-base-class-removal-source-final-review.mjs';
const PREFIX = 'compatibility/rc/21x-base-class-removal-source-';
const SHA = '55f9618b687fc0da4743a3cf27e113ceb837e151';
const image = readFileSync(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url), ts = require('typescript');
const hash = raw => createHash('sha256').update(raw).digest('hex');
export const baseClassRemovalReviewLoadedImage = Object.freeze({path: SELF, sha256: hash(image), bytes: image.length});
const pins = {
  original: ['original-qualified.json', '9e0d2542317e5191cdd04af1dbead861cfa382c2b3f9da7b886a8102f2e13183'],
  journal: ['review-progress-tabs-tooltip.json', '5181564df149ce9ab295db99f6be680937ea29762f39d95af08d44c73d60367b'],
  controls: ['owned-control-member-review.json', 'd268ffc2cac25b381fd5f7da305daa3395285d2c96d097faf9996f6324e80673'],
  overlays: ['owned-overlay-member-review.json', '044ac4c5a8056f07f6d0951f16c687989f0c015a7fc5302c36c8b69e63af0da5'],
  dialog: ['owned-dialog-member-review.json', '1076fb2099edc011ff83b2ee4d9361de15c3a6841e57634fbc9d428633f53a33'],
  unmatched: ['unmatched-declarations-assessed.json', 'ece7ed81aefa7b1cb84a537beaa170f71f35ae452acab5e4f7fbfcd30135d59c'],
  bindings: ['public-binding-qualified.json', '42a263ab65bed7ba529b37c5c75ff2bc695c9d1de686c2f3847d072805fd11bd'],
  rx: ['rx-signature-qualified.json', 'bfcb3ee432c375df3bb2ef8e8da89acffa4e33a8b166343699c6fa81bd965473'],
  error: ['error-harness-proposal-qualified.json', 'b36b98e713d9a11f31d1bffccde29f8144fffac09df85b957ff0c8c822861116'],
  snack: ['snack-token-proposal-qualified.json', '63103305cf37149bd611c63cfa5f6ebded1250eceadf50d87f2d6c5a1d2554b4'],
  ink: ['nav-inkbar-proposal-qualified.json', 'f5bec2f8a7d5c7be0dc5453c21c325665a657329e1ec3e5a50027ba5321995b2'],
  keyboard: ['menu-keyboard-proposal-qualified.json', 'd98de3ef13d5d818c247d99f2c8ff5111bb8d487ef6c0a83db683fb204dfd6cf'],
};
const familyJudgments = {
  autocomplete: 'Retain local origin/trigger/panel bases,legacy options and aria-owns;modern concrete folding does not replace manual construction,initialization,selection or landscape ownership.',
  checkbox: 'Retain the generic legacy event/base,host animation target,origin-aware focus and lifetime cleanup;current MDC input animation and concrete checkbox types are not interchangeable.',
  core: 'Retain locally owned option/optgroup bases,parent tokens and generic selection event;modern concrete queries and IDs do not replace the legacy option model.',
  dialog: 'Retain legacy constructors/ref/data/config/container identities,mat-dialog prefix and public-peer composition;modern hardcoded ref/container and private hooks are not an adoption route.',
  'form-field': 'Retain legacy harness locators/control protocols/four appearances;restore the exact protected error predicate helper locally rather than inherit a modern selector or private helper.',
  menu: 'Retain local item/panel/content ownership,legacy selectors,elevation4 and lifecycle. Modern concrete menu/type narrowing is not adopted;restore handled-key propagation independently.',
  paginator: 'Retain generic finite paginator protocols,distinct legacy defaults/appearance and harness/select behavior;modern concrete defaults/outline fallback are not substituted.',
  radio: 'Retain generic local group/button/event and historical shared token role,origin-aware focus and label locators;modern concrete typing does not replace the owned legacy contract.',
  select: 'Retain local options/events/form-field token and historical overlap/centering/padding. Native motion and separate accessibility changes remain separately qualified;modern non-overlap positioning is not adopted.',
  'slide-toggle': 'Retain legacy native-input markup,focus origin,own event/defaults and input harness;modern button/MDC concrete source and focus behavior are not substituted.',
  'snack-bar': 'Retain legacy alignment/portal/content hooks,own reference/config/service and handset class;modern concrete container/ref coupling is not adopted. Restore the historical content-token lookup locally.',
  table: 'Retain finite paginator/page protocols and legacy cell/row/table harness bases. Current concrete paginator/harness constraints are not adopted;comment-only hunks remain accounted within the whole reviewed SHA.',
  tabs: 'Retain local tab/label/body/header/link/query contracts,optional panel,separate legacy ink bar and genuine public portal adapter;modern ink-bar/required-panel concrete folding is not adopted. Restore immediate no-active-link ink-bar hide.',
  tooltip: 'Retain local tooltip component,manual constructor,optional Directionality,handset behavior,legacy classes/zero offsets and protected hooks;modern margin/component/constructor folding is not adopted.',
};
const extraOwnedJudgments = {
  'autocomplete:LegacyAutocompleteAnimationEvent': 'Finite local event type for the historical null completion stream;does not reproduce the animation engine or modern component API.',
  'dialog:LegacyDialogTitleContainer': 'Finite owned labelled-by queue protocol used by the title-state bridge;no current concrete container/private fields are required.',
  'dialog:LegacyDialogContainerPeer': 'Finite identity/overlay/container/disableClose relation to a public CDK ref;the supplied owner is distinguished from unrelated ambient refs.',
  'dialog:LegacyDialogContainerState': 'Weak-map state owns focus notifications/CDR/peer cleanup and avoids expanding the frozen legacy class declaration surface.',
  'menu:LegacyMenuAnimationEvent': 'Finite state completion protocol for owned CSS motion,not a full animation-engine event ABI;native lifecycle/style gates remain required.',
  'slide-toggle:MatSlideToggleDefaultOptions': 'Finite local defaults shape used by the historical base and local token/config;does not import current concrete slide-toggle state or template.',
  'snack-bar:MatLegacySnackBarModule': 'Existing legacy module retains local service/default providers and button/common/overlay/portal imports;its absence from changed-tag files is not evidence of a new component fork.',
  'tabs:MatLegacyTabLabel': 'Genuine public current label parent is constructed from supplied public template/view dependencies;local nearest-tab identity and historical label token/query are preserved. No ordinary current component implementation is copied.',
  'tabs:LegacyTabTransitionEvent': 'Finite from/to phase protocol for owned body transitions;does not promise the removed engine callback metadata or qualify native frames.',
  'tabs:MatTabNavPanel': 'Finite local id/active-tab protocol preserves the optional legacy panel;does not require the current concrete panel component.',
};
const repairKeys = ['error', 'snack', 'ink', 'keyboard'];
const memberKey = row => row.owner + '\0' + row.member + '\0' + row.owned_path;
const headerKey = row => row.owner + '\0' + row.owned_path;

export function validateBaseClassRemovalReview(data, original) {
  assert.equal(original.sha, SHA); assert.equal(original.sections.length, 72);
  assert.equal(data.original.original_files_authenticated, 72);
  assert.equal(data.original.original_hunks_replayed, 329);
  assert.equal(data.original.source_review_complete, false, 'prior original-only receipt must remain unchanged');
  assert.equal(data.journal.original_members_read, 72); assert.equal(data.journal.original_hunks_read, 329);
  for (const report of Object.values(data)) if (report && typeof report === 'object') {
    if ('product_changes' in report) assert.equal(report.product_changes, 0);
    if ('actual_native_packed_browser_floor_or_full_audit_qualified' in report)
      assert.equal(report.actual_native_packed_browser_floor_or_full_audit_qualified, false);
  }
  const allPairs = [...data.initial.pairs, ...data.supplement.additional_pairs];
  const expected = new Map(allPairs.flatMap(pair => pair.differences.map(m => [
    pair.key + '\0' + m.key + '\0' + pair.owned_path, m])));
  assert.equal(expected.size, 361);
  const reviewed = [data.controls, data.overlays, data.dialog].flatMap(r => r.changed_member_reviews);
  assert.equal(reviewed.length, 361); assert.equal(new Set(reviewed.map(memberKey)).size, 361);
  for (const row of reviewed) {
    const old = expected.get(memberKey(row)); assert.ok(old, memberKey(row));
    assert.equal(row.tagged_token_sha256, old.tagged?.token_sha256 || null);
    assert.equal(row.owned_token_sha256, old.owned?.token_sha256 || null);
    assert.ok(row.source_review.length > 70); assert.equal(row.whole_family_or_native_qualified, false);
  }
  const expectedHeaders = new Map(allPairs.filter(p => !p.headers_token_identical)
    .map(p => [p.key + '\0' + p.owned_path, p]));
  const headers = [data.controls, data.overlays, data.dialog].flatMap(r => r.changed_header_reviews);
  assert.equal(expectedHeaders.size, 71); assert.equal(headers.length, 71);
  assert.equal(new Set(headers.map(headerKey)).size, 71);
  for (const row of headers) {
    const pair = expectedHeaders.get(headerKey(row)); assert.ok(pair);
    assert.equal(row.tagged_header_sha256, hash(pair.tagged_header));
    assert.equal(row.owned_header_sha256, hash(pair.owned_header));
  }
  const requiredDeclarations = data.supplement.still_unmatched_tagged_declarations.map(r => r.key).sort();
  assert.equal(requiredDeclarations.length, 65);
  assert.deepEqual(data.unmatched.judgments.map(r => r.key).sort(), requiredDeclarations);
  assert.equal(data.unmatched.unaccounted_for, 0);
  for (const row of data.unmatched.judgments) {
    assert.ok(row.judgment.length > 70);
    assert.ok(row.owned_path || row.uses?.length, row.key);
  }
  assert.equal(data.initial.unmatched_owned_declarations.length, 10);
  assert.deepEqual(data.initial.unmatched_owned_declarations.map(r => r.key).sort(), Object.keys(extraOwnedJudgments).sort());
  assert.equal(data.bindings.external_declarations, 513); assert.equal(data.bindings.named_symbol_uses, 1419);
  assert.deepEqual(data.bindings.diagnostics, []);
  assert.ok(data.bindings.observations.every(r => r.kind === 'named'));
  assert.ok(data.bindings.flagged_named_uses.every(r => r.specifier.startsWith('rxjs') && !r.underscore_or_private_spelling));
  assert.equal(data.rx.actual_calls, 74); assert.deepEqual(data.rx.selected_deprecated_calls, []);
  assert.equal(data.rx.versions['@angular/core'], '21.2.23');
  assert.equal(data.rx.versions['@angular/material'], '21.2.14');
  assert.equal(data.rx.versions['@angular/cdk'], '21.2.14');
  assert.equal(data.unmatched.property_variances.length, 1);
  const variance = data.unmatched.property_variances[0];
  assert.equal(variance.key, 'paginator:MatPaginatorSelectConfig'); assert.equal(variance.name, 'panelClass');
  const printType = text => {
    const source = ts.createSourceFile('type.ts', 'type Receipt = ' + text + ';', ts.ScriptTarget.Latest, true);
    assert.equal(source.parseDiagnostics.length, 0);
    return ts.createPrinter({removeComments: true}).printNode(ts.EmitHint.Unspecified, source.statements[0].type, source);
  };
  assert.equal(printType(variance.tagged.type), printType(variance.current.type));
  assert.equal(variance.current.deprecated, false); assert.equal(variance.optionality_equal, true);
  for (const key of repairKeys) {
    assert.equal(data[key].git_apply_check?.applied ?? false, false);
    assert.ok(data[key].patch.path.endsWith('.patch'));
  }
  assert.equal(data.error.positive_compiler_cells, 3); assert.equal(data.error.private_visibility_compiler_control_rejected, true);
  assert.equal(data.snack.cells.length, 2); assert.equal(data.snack.cells[0].diagnostics.length, 0);
  assert.equal(data.ink.observations.length, 4); assert.equal(data.ink.proposed_method_tokens_equal_untouched_tag, true);
  assert.equal(data.ink.noninvoking_control_rejected, true);
  assert.equal(data.keyboard.observations.length, 6); assert.equal(data.keyboard.method_tokens_equal_untouched_tag, true);
  assert.equal(data.keyboard.noninvoking_control_rejected, true);
  const sourceJournal = new Map(data.journal.initial_member_reviews.map(row => [row.path, row]));
  assert.equal(sourceJournal.size, 72);
  const decisions = [];
  for (const section of original.sections) {
    const read = sourceJournal.get(section.path); assert.ok(read);
    assert.equal(read.patch_sha256, section.patch_sha256); assert.equal(read.hunks.length, section.hunks.length);
    const stem = section.path.startsWith('src/material/') ? section.path.split('/')[2]
      : section.path.split('/').at(-1).replace(/\.md$/, '');
    const family = Object.keys(familyJudgments).sort((a, b) => b.length - a.length)
      .find(name => stem === name || stem.startsWith(name + '-'));
    assert.ok(family, section.path);
    for (let index = 0; index < section.hunks.length; index++) {
      const hunk = section.hunks[index], note = read.hunks[index];
      assert.equal(note.index, hunk.index); assert.equal(note.header, hunk.header); assert.equal(note.sha256, hunk.sha256);
      assert.equal(hash(hunk.text), hunk.sha256); assert.ok(note.initial_technical_review.length > 30);
      decisions.push({path: section.path, index: hunk.index, header: hunk.header, sha256: hunk.sha256,
        family, original_reading: note.initial_technical_review,
        final_source_judgment: familyJudgments[family],
        disposition: 'do-not-transplant-modern-base-consolidation',
        original_API_golden: section.path.endsWith('.md'),
        native_API_or_packed_qualification: false});
    }
  }
  assert.equal(decisions.length, 329);
  return {decisions, member_entries_reviewed: reviewed.length, headers_reviewed: headers.length,
    declarations_reviewed: requiredDeclarations.length, owned_support_declarations_reviewed: 10,
    sole_property_spelling_variance_is_formatting: true};
}

export function inspectBaseClassRemovalReview({root = process.cwd(), read = path => readFileSync(resolve(root, path))} = {}) {
  const bound = new Map();
  function member(ref) {
    const raw = read(ref.path); assert.equal(hash(raw), ref.sha256, 'changed review input ' + ref.path);
    if (ref.bytes !== undefined) assert.equal(raw.length, ref.bytes);
    const actual = {path: ref.path, sha256: ref.sha256, bytes: raw.length};
    if (bound.has(ref.path)) assert.deepEqual(bound.get(ref.path), actual); else bound.set(ref.path, actual);
    return raw;
  }
  member({path: SELF, sha256: hash(image)});
  const compiler = relative(root, require.resolve('typescript'));
  member({path: compiler, sha256: hash(readFileSync(require.resolve('typescript')))});
  const data = {};
  for (const [key, [suffix, sha256]] of Object.entries(pins)) data[key] = JSON.parse(member({path: PREFIX + suffix, sha256}));
  const parsed = new Set();
  function bindInputs(report) {
    for (const ref of report.source_bindings || []) member(ref);
  }
  for (const report of Object.values(data)) bindInputs(report);
  const lookup = suffix => {
    const ref = data.controls.source_bindings.find(r => r.path === PREFIX + suffix); assert.ok(ref, suffix);
    return JSON.parse(member(ref));
  };
  data.initial = lookup('owned-member-inventory.json'); data.supplement = lookup('owned-closure-supplement.json');
  const originalData = JSON.parse(member(data.original.original_data_report)); bindInputs(originalData);
  const original = JSON.parse(gunzipSync(member(data.original.originals)));
  const worksheetRef = originalData.source_bindings.find(ref => ref.path === PREFIX + 'worksheet.json');
  assert.ok(worksheetRef); const worksheet = JSON.parse(member(worksheetRef));
  for (const key of ['protected_ledger', 'protected_registry', 'protected_roster', 'prior_source_admission']) member(worksheet[key]);
  for (const key of repairKeys) member(data[key].patch);
  const facts = validateBaseClassRemovalReview(data, original);
  const extraOwned = data.initial.unmatched_owned_declarations.map(row => {
    const raw = readFileSync(resolve(root, row.path)); member({path: row.path, sha256: hash(raw)});
    return {...row, judgment: extraOwnedJudgments[row.key]};
  });
  const cyphPath = '/home/parallels/cyph/shared/js/cyph/services/material-dialog.service.ts';
  const cyph = readFileSync(cyphPath); member({path: relative(root, cyphPath), sha256: hash(cyph)});
  assert.match(cyph.toString(), /MatLegacyDialogRef as MatDialogRef/);
  assert.match(cyph.toString(), /instanceof MatDialogRef/);
  const diff = spawnSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
    'diff', '--name-only', worksheet.source_parent, '--', 'projects'], {cwd: root, encoding: 'utf8'});
  assert.equal(diff.status, 0, diff.stderr); assert.equal(diff.stdout, '', 'source-only worksheet changed product');
  const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard', '--', 'projects'], {cwd: root, encoding: 'utf8'});
  assert.equal(untracked.status, 0); assert.equal(untracked.stdout, '');
  const assertCurrent = () => {for (const ref of bound.values()) {
    const raw = read(ref.path); assert.equal(hash(raw), ref.sha256, 'late review input ' + ref.path); assert.equal(raw.length, ref.bytes);
  }};
  assertCurrent();
  const report = {schema_version: 1, line: '21.x', sha: SHA,
    role: 'Complete source-evidence assessment of one upstream base-class-removal SHA;four required local repairs remain unapplied and canonical/product admission remains false',
    original_files: 72, original_source_files: 47, original_API_golden_files: 25,
    original_hunks_reviewed: 329, member_difference_entries_reviewed: facts.member_entries_reviewed,
    changed_headers_reviewed: facts.headers_reviewed, remaining_tagged_declarations_reviewed: facts.declarations_reviewed,
    owned_support_declaration_judgments: extraOwned, per_hunk_decisions: facts.decisions,
    external_declarations_typechecked: 513, named_public_symbol_uses_resolved: 1419,
    actual_Rx_selected_overloads_reviewed: 74, selected_deprecated_Rx_overloads: 0,
    sole_property_spelling_variance_is_formatting: true,
    recommended_upstream_disposition: 'do-not-adopt',
    required_repairs: repairKeys.map(key => ({id: key, qualification: {path: PREFIX + pins[key][0], sha256: pins[key][1]},
      patch: data[key].patch, applied: false})),
    source_review_complete: true, substantive_whole_SHA_review_complete: true,
    required_repairs_satisfied: false, current_owned_or_minimum_contract_qualified: false,
    canonical_admission_ready: false, canonical_dispositions_changed: 0, product_changes: 0,
    original_authentication_tests_reexecuted: false, earlier_qualified_artifacts_modified: false,
    cyph_sanity: {path: cyphPath, sha256: hash(cyph), imported_legacy_ref_used_for_instanceof: true,
      consumer_build_executed: false, modified: false, limit: 'Scoped current source check;not every external/generated consumer usage.'},
    limits: 'Source review and declaration/selected-overload checks do not qualify whole-product type/AOT,node DI,style geometry,motion frames,packed/browser/consumer or Node/Rx floors. Repairs and separately bounded canonical admission must follow. All both-line/full-plan gates remain required.',
    actual_native_packed_browser_floor_or_full_audit_qualified: false, g11_claim: 'not-passed',
    source_bindings: [...bound.values()]};
  return {data, original, facts, report, assertCurrent};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.version, 'v24.21.0'); assert.equal(ts.version, '5.9.2');
  const result = inspectBaseClassRemovalReview();
  const controls = [
    ['missing-member', data => data.dialog.changed_member_reviews.pop()],
    ['missing-header', data => data.dialog.changed_header_reviews.pop()],
    ['missing-tagged-declaration', data => data.unmatched.judgments.pop()],
    ['missing-original-hunk', data => data.journal.initial_member_reviews[0].hunks.pop()],
    ['wrong-token-proof', data => data.overlays.changed_member_reviews[0].owned_token_sha256 = '0'.repeat(64)],
    ['deprecated-call', data => data.rx.selected_deprecated_calls.push({})],
    ['unapplied-proposal-falsely-applied', data => data.ink.git_apply_check.applied = true],
    ['native-claim-in-source-report', data => data.dialog.actual_native_packed_browser_floor_or_full_audit_qualified = true],
  ];
  for (const [name, mutate] of controls) {
    const data = structuredClone(result.data); mutate(data);
    assert.throws(() => validateBaseClassRemovalReview(data, result.original), {name: 'AssertionError'}, name);
  }
  const target = result.report.required_repairs[0].patch.path;
  assert.throws(() => inspectBaseClassRemovalReview({read: path => {
    const raw = readFileSync(resolve(process.cwd(), path)); return path === target ? Buffer.concat([raw, Buffer.from(' ')]) : raw;
  }}), {name: 'AssertionError'});
  let fault = false;
  const late = inspectBaseClassRemovalReview({read: path => {
    const raw = readFileSync(resolve(process.cwd(), path)); return fault && path === target ? Buffer.concat([raw, Buffer.from(' ')]) : raw;
  }});
  fault = true; assert.throws(() => late.assertCurrent(), {name: 'AssertionError'});
  result.assertCurrent();
  result.report.semantic_fault_controls_rejected = controls.map(([name]) => name);
  result.report.cold_input_faults_rejected = 1; result.report.late_input_faults_rejected = 1;
  writeFileSync(PREFIX + 'final-review-qualified.json', JSON.stringify(result.report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({result: 'complete-source-review-qualified-with-required-repairs',
    original_files: 72, original_hunks: 329, member_entries: 361, changed_headers: 71,
    unmatched_declarations: 65, semantic_controls_rejected: controls.length,
    cold_and_late_faults_rejected: 2, required_repairs: 4, canonical_admission_ready: false,
    native_or_packed_qualified: false}));
}
