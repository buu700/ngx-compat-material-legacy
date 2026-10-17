/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Synthetic validator input only: no Angular, browser, package or HTTP execution. */
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {scanCurrentAuthoredUses} from '../../scripts/authored-current-use-inventory.mjs';
import {ARTIFACT_BEHAVIOR_KIND, SELECT_FOCUS_SHA, SELECT_FOCUS_PATCH, SELECT_FOCUS_MEMBERS} from '../../scripts/upstream-artifact-behavior-evidence.mjs';
import {allConsumerCaseIds, loadExportKeys} from '../../scripts/packed-consumer-evidence.mjs';

export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function focusSample() {
  const events = (pairs, open) => [...Array.from({length: pairs}, () => [true, false]).flat(), ...(open ? [true] : [])];
  const state = (host, pairs, open) => ({panel_open: open, overlay_attached: open, expanded: String(open),
    controls: open ? host + '-panel' : null, value: 'a', focused: true, panel_id: host + '-panel',
    panel_resolution_count: open ? 1 : 0, panel_connected: open, opened_events: events(pairs, open), directive_detach_count: pairs});
  return {execution: 'packed-angular-testbed-dom', error: null,
    contexts: ['legacy', 'current'].flatMap(generation => ['bare', 'form-field'].map(enclosure => {
      const host = generation + '-' + enclosure;
      return {generation, enclosure, public_select_instance: true, public_overlay_directive_instance: true,
        foreign_generation_nodes: 0, host_id: host, enclosure_present: enclosure === 'form-field', legacy_structure: true,
        initial: state(host, 0, false), cycles: [0, 1].map(cycle => ({cycle,
          after_focus: {...state(host, cycle, true), focus_handler_delta: 1, no_touch_on_focus: true},
          after_click: {...state(host, cycle, true), focus_handler_delta: 0, no_extra_touched: true,
            state_change_delta: 0, no_detach: true, same_panel_node: true, same_overlay_ref: true},
          after_backdrop: state(host, cycle + 1, false)})),
        blocked: ['disabled', 'empty'].map(kind => ({kind, disabled: kind === 'disabled', option_count: kind === 'disabled' ? 2 : 0,
          ...state(host, 2, false), events_unchanged: true, noop_open_state_change_delta: 0, noop_open_touch_delta: 0})),
        plain_click: {before: state(host, 2, false), opened: state(host, 2, true), closed: state(host, 3, false)},
        manual_toggle: {opened: state(host, 3, true), closed: state(host, 4, false)},
        closed_noop: {...state(host, 4, false), state_change_delta: 0, touch_delta: 0, events_unchanged: true, no_detach: true},
        cleanup: {fixture_destroyed: true, host_connected: false, known_panels_remaining: 0, any_overlay_attached: false, own_subscriptions_closed: true}};
    }))};
}

export function createFixture(sourceRoot, individualReview = null) {
  const temp = mkdtempSync(join(tmpdir(), 'artifact-behavior-validator-'));
  const root = join(temp, 'repo'), runDir = join(temp, 'run');
  const read = path => readFileSync(join(sourceRoot, path));
  const put = (base, path, value) => {
    const target = join(base, path); mkdirSync(dirname(target), {recursive: true});
    writeFileSync(target, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n');
  };
  const repoPut = (path, value) => put(root, path, value), runPut = (path, value) => put(runDir, path, value);
  const ts = createRequire(import.meta.url)('typescript'), copied = new Set();
  const copyModule = path => {
    if (copied.has(path)) return; copied.add(path);
    const bytes = read(path); repoPut(path, bytes);
    const sf = ts.createSourceFile(path, bytes.toString(), ts.ScriptTarget.Latest, true);
    for (const node of sf.statements) if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier?.text.startsWith('.')) {
      const next = resolve(sourceRoot, dirname(path), node.moduleSpecifier.text);
      if (!next.startsWith(sourceRoot + '/scripts/')) throw Error('Unexpected checker import');
      copyModule(next.slice(sourceRoot.length + 1));
    }
  };
  copyModule('scripts/check-upstream-audit-disposition.mjs');
  const manifest = JSON.parse(read('projects/ngx-material-legacy/package.json'));
  const line = manifest.version.startsWith('21.') ? '21.x' : 'main';
  repoPut('projects/ngx-material-legacy/package.json', manifest);
  const frozenBytes = read('compatibility/f10/authored-dependency-inventory-seed.json'), frozen = JSON.parse(frozenBytes);
  repoPut('compatibility/f10/authored-dependency-inventory-seed.json', frozenBytes);
  const note = 'Synthetic validator fixture only. No real source API, runtime, package, advisory or approval is qualified by this fixture.\n';
  for (const file of new Set(frozen.symbol_uses.map(row => row.file))) repoPut('projects/ngx-material-legacy/' + file, '// ' + note);
  const requiredMembers = new Set([...SELECT_FOCUS_MEMBERS,
    ...(individualReview?.entry.individual_proof.artifact_behavior.source_members ?? []).map(row => row.path),
    ...(individualReview?.extraMembers ?? [])]);
  for (const path of requiredMembers) repoPut(path, read(path));
  repoPut('compatibility/rc/artifact-validator-note.txt', note);
  const noteRef = {path: 'compatibility/rc/artifact-validator-note.txt', sha256: hash(note)};
  const active = scanCurrentAuthoredUses({root}), key = row => JSON.stringify([row.file, row.module, row.symbol]);
  const frozenKeys = new Set(frozen.symbol_uses.map(key)), activeKeys = new Set(active.symbol_uses.map(key));
  const additional = active.symbol_uses.filter(row => !frozenKeys.has(key(row)));
  const reviews = new Map(), groups = new Map();
  for (const row of [...frozen.symbol_uses, ...additional]) {
    if (!groups.has(row.file)) groups.set(row.file, []); groups.get(row.file).push(row);
  }
  for (const [file, rows] of groups) {
    const path = 'compatibility/f10/authored-use-reviews/artifact-fixture-' + hash(file) + '.json';
    repoPut(path, {schema_version: 1, line, status: 'reviewed', fixture_only: true, reviews: rows.map(row => ({
      file: row.file, module: row.module, symbol: row.symbol, conclusion: activeKeys.has(key(row)) ? 'stable-public-peer' : 'removed-use',
      reviewer: 'Synthetic validator fixture', candidate_source_sha256: hash(readFileSync(join(root, 'projects/ngx-material-legacy', file))),
      decision: note, independent_evidence: [noteRef]}))});
    const ref = {path, sha256: hash(readFileSync(join(root, path)))};
    for (const row of rows) reviews.set(key(row), ref);
  }
  const close = row => ({...row, status: 'reviewed', disposition: 'closed', source_review: reviews.get(key(row))});
  repoPut('symbols.json', {schema_version: 1, line, status: 'closed', symbol_uses: frozen.symbol_uses.map(close), fixture_only: true});
  repoPut('current.json', {schema_version: 1, line, status: 'closed', current_uses: active.symbol_uses.length, current_source_files: active.source_files.length,
    current_source_population_sha256: active.source_population_sha256, symbol_use_count: additional.length, symbol_uses: additional.map(close), fixture_only: true});
  const patchPath = individualReview?.review.patch_file ?? 'compatibility/rc/select-focus-click-original.patch';
  repoPut(patchPath, read(patchPath));
  const reviewPath = individualReview?.entry.evidence_report ?? 'compatibility/f10/disposition-ledger/evidence/artifact-fixture.json';
  const review = individualReview ? structuredClone(individualReview.review) :
    {sha: SELECT_FOCUS_SHA, status: 'reviewed', final_disposition: 'already-adapted',
      diff_sha256: SELECT_FOCUS_PATCH, patch_file: patchPath, fixture_only: true};
  repoPut(reviewPath, review);
  const proof = individualReview ? structuredClone(individualReview.entry.individual_proof) :
    {proof_kind: ARTIFACT_BEHAVIOR_KIND, diff_sha256: SELECT_FOCUS_PATCH, review_depth: 'individual-compatibility',
    affected_branches: [line], decision: note, artifact_behavior: {kind: 'select-focus-before-click',
      case_ids: ['packed-consumer/harness/legacy-select'], source_members: SELECT_FOCUS_MEMBERS.map(path => ({path, sha256: hash(readFileSync(join(root, path)))}))}};
  const entry = individualReview ? {...structuredClone(individualReview.entry), individual_proof: proof} :
    {sha: SELECT_FOCUS_SHA, subject: 'fix(material/select): focus-handler click fixture', bucket: 'behavior-semantic',
    final_disposition: 'already-adapted', evidence_report: reviewPath, individual_proof: proof, fixture_only: true};
  const git = args => execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', ...args], {cwd: root, encoding: 'utf8'}).trim();
  git(['init', '-q']); git(['add', '.']);
  git(['-c', 'user.name=Validator fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'Synthetic validator fixture']);
  const commit = git(['rev-parse', 'HEAD']), tree = git(['rev-parse', 'HEAD^{tree}']);
  const libraryBytes = Buffer.from('Synthetic artifact identity bytes; not a package.\n'); runPut('library.tgz', libraryBytes);
  const library = {id: 'library', path: 'library.tgz', sha256: hash(libraryBytes), bytes: libraryBytes.length};
  const run = {run_id: 'synthetic-artifact-behavior', source: {line, commit, git_tree_sha: tree, content_sha256: 'c'.repeat(64), clean: true},
    execution_inputs: {line, commit, tree, clean: true, inputs_sha256: 'd'.repeat(64)}, artifacts: [library],
    environment: {fixture_only: true}, oracles: {fixture_only: true}, pack_execution: {fixture_only: true}, pack_metadata: {fixture_only: true}};
  // Ask the actual Python digest function for cross-language binding identities.
  const digests = JSON.parse(execFileSync('python3', ['-c',
    'import sys,json;sys.path.insert(0,sys.argv[1]);from rc_acceptance import json_digest;print(json.dumps({k:json_digest(v) for k,v in json.load(sys.stdin).items()}))',
    join(sourceRoot, 'scripts')], {input: JSON.stringify({artifacts_sha256: run.artifacts, environment_sha256: run.environment,
      oracles_sha256: run.oracles, pack_execution_sha256: run.pack_execution, pack_metadata_sha256: run.pack_metadata}), encoding: 'utf8'}));
  const binding = {run_id: run.run_id, source_line: line, source_commit: commit, source_tree: tree, source_content_sha256: run.source.content_sha256,
    source_clean: true, input_clean: true, inputs_sha256: run.execution_inputs.inputs_sha256,
    matrix_sha256: hash(read('compatibility/rc/matrices/full-verify.json')), ...digests};
  const execution = {run_id: run.run_id, invocation_id: 'synthetic-packed-consumer', exit_code: 0};
  const request = {binding, runDir, runId: run.run_id, line, packedConsumerExecution: execution};
  const ids = allConsumerCaseIds(loadExportKeys()), sample = focusSample();
  const relative = `evidence/packed-consumer/${execution.invocation_id}/consumer-observations.json`;
  const observation = {kind: 'packed-consumer-observations', check_id: 'packed-consumer', run_id: run.run_id,
    invocation_id: execution.invocation_id, library_sha256: library.sha256,
    cases: ids.map(case_id => ({case_id, result: 'pass', ...(case_id === 'packed-consumer/harness/legacy-select' ? {observation: sample, legacy_harness_passed: true} : {})})),
    extra: {harness: {selectOpened: true, selectClosed: true, viewportShared: true, selectFocusClick: structuredClone(sample)}}};
  const report = {schema_version: 1, template: false, check_id: 'packed-consumer', line, run_id: run.run_id,
    invocation_id: execution.invocation_id, binding, result: 'pass', coverage: 'complete', exit_code: 0,
    subject_kind: 'artifact', subject_ids: ['library'], artifacts: {library: {sha256: library.sha256, bytes: library.bytes}},
    expected_case_ids: ids, discovered_case_ids: ids, executed_case_ids: ids, passed_case_ids: ids,
    failed_case_ids: [], skipped_case_ids: [], unresolved_case_ids: [], exceptions: [], passed: ids.length, failed: 0, skipped: 0,
    case_results: ids.map(case_id => ({case_id, result: 'pass', kind: 'assertion', output_paths: [relative]}))};
  function save() {
    runPut('run.json', run); runPut(relative, observation);
    const bytes = readFileSync(join(runDir, relative)); report.outputs = [{path: relative, sha256: hash(bytes), bytes: bytes.length}];
    runPut('reports/packed-consumer.json', report);
  }
  save();
  // Complete fake advisory input is only to let the real CLI reach its success
  // path. It never represents a network lookup or vulnerability clearance.
  const matrix = JSON.parse(read('compatibility/rc/matrices/full-verify.json'));
  const depIds = Object.values(matrix.checks.find(row => row.check_id === 'dependency-eligibility').acceptance.cases_by_line[line]).flat();
  const depPath = 'evidence/dependency-eligibility/synthetic-dependency/eligibility-observations.json';
  const depObservation = {kind: 'dependency-eligibility-observations', check_id: 'dependency-eligibility', line, run_id: run.run_id,
    invocation_id: 'synthetic-dependency', binding, lookup: 'queried', lookup_cutoff: new Date().toISOString(), lock_packages: 1,
    uncovered_lock_packages: 0, vendor_files: 119, vendor_hash_mismatches: [], cases: depIds.map(case_id => ({case_id, result: 'pass'})), fixture_only: true};
  runPut(depPath, depObservation); const depBytes = readFileSync(join(runDir, depPath));
  runPut('reports/dependency-eligibility.json', {check_id: 'dependency-eligibility', line, run_id: run.run_id, invocation_id: 'synthetic-dependency', binding,
    result: 'pass', coverage: 'complete', exit_code: 0, subject_kind: 'source', subject_ids: ['source'], expected_case_ids: depIds,
    discovered_case_ids: depIds, executed_case_ids: depIds, passed_case_ids: depIds, failed_case_ids: [], skipped_case_ids: [], unresolved_case_ids: [], exceptions: [],
    outputs: [{path: depPath, sha256: hash(depBytes), bytes: depBytes.length}],
    case_results: depIds.map(case_id => ({case_id, result: 'pass', kind: 'assertion', output_paths: [depPath]})), fixture_only: true});
  return {temp, root, runDir, line, entry, proof, request, run, report, observation, relative, library, execution, ids,
    frozenUses: frozen.symbol_uses.length, additionalUses: additional.length, save, repoPut, runPut,
    dispose: () => rmSync(temp, {recursive: true, force: true})};
}
