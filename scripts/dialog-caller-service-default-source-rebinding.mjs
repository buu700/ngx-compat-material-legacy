/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Eleven finite source reviews; the existing canonical owner alone writes ledgers. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {inspectDialogServiceDefaults} from './dialog-caller-service-default-boundary.mjs';
import {sourceRole} from './dialog-caller-config-source-rebinding.mjs';
const ts = createRequire(import.meta.url)('typescript');
const hash = value => createHash('sha256').update(value).digest('hex');
const id = row => JSON.stringify([row.file, row.module, row.symbol]);
const impactPath = 'compatibility/rc/dialog-caller-service-default-source-impact.json';
const pins = {main: '3492ea07466a944f6439706dd7214ab97866e3c6b4d76d8edb21f30a9b3361fd',
  '21.x': '058d96015969da1c8117b1e38ce6adb84b522c8fea187e09d8e19e7df92677dd'};
export const DIALOG_SERVICE_DEFAULT_REVIEW = 'compatibility/f10/authored-use-reviews/dialog-service-default-source-context.json';

export function dialogServiceDefaultSourceRebinding({root = process.cwd(),
  read = path => readFileSync(join(root, path))} = {}) {
  const boundary = inspectDialogServiceDefaults({root, read, requireApplied: true}), bytes = read(impactPath);
  assert.equal(hash(bytes), pins[boundary.line], 'changed dialog service source-impact capture');
  const prior = JSON.parse(bytes); assert.equal(prior.line, boundary.line);
  assert.equal(prior.selected.length, 11); assert.equal(prior.frozen, 11); assert.equal(prior.additional, 0);
  const originals = new Map();
  for (const ref of [...prior.ledgers, prior.SHA_ledger, ...prior.prior_review_members]) {
    const original = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
      'show', prior.source_parent + ':' + ref.path], {cwd: root, maxBuffer: 16 * 1024 * 1024,
      env: {...process.env, GIT_NO_LAZY_FETCH: '1'}});
    assert.equal(hash(original), ref.sha256, 'unauthenticated dialog service source-impact member');
    originals.set(ref.path, JSON.parse(original));
    if (prior.prior_review_members.some(member => member.path === ref.path)) {
      assert.equal(hash(read(ref.path)), ref.sha256, 'changed original complete dialog service review');
    }
  }
  const closed = prior.ledgers.flatMap(ref => originals.get(ref.path).symbol_uses.filter(row =>
    row.file === 'legacy-dialog/internal/dialog-base.ts' && row.disposition === 'closed').map(row => ({ledger: ref.path, row})));
  assert.deepEqual(closed, prior.selected.map(item => ({ledger: item.ledger, row: item.original_row})));
  const target = boundary.targets[0], before = ts.createSourceFile(target.path,
    boundary.preimages.get(target.path).toString(), ts.ScriptTarget.Latest, true);
  const after = ts.createSourceFile(target.path, boundary.proposed_sources.get(target.path), ts.ScriptTarget.Latest, true);
  const shape = source => {
    assert.equal(source.parseDiagnostics.length, 0);
    const type = source.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === '_MatDialogBase');
    assert.ok(type);
    return {imports: source.statements.filter(ts.isImportDeclaration).map(node => node.getText(source)),
      members: type.members.map(node => ts.isMethodDeclaration(node) && node.name.getText(source) === 'open' && node.body ?
        node.getText(source).slice(0, node.body.getStart(source) - node.getStart(source)) : node.getText(source))};
  };
  assert.deepEqual(shape(after), shape(before), 'dialog service API or other class members changed');
  const sources = new Map([...boundary.proposed_sources].map(([path, text]) =>
    [path, ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)]));
  const options = {noResolve: true, noLib: true, types: [], target: ts.ScriptTarget.ES2022, experimentalDecorators: true};
  const host = ts.createCompilerHost(options);
  host.getSourceFile = path => sources.get(path.startsWith(root + '/') ? path.slice(root.length + 1) : path);
  const checker = ts.createProgram([...sources.keys()], options, host).getTypeChecker();
  const reasons = {
    ComponentType: 'All component/template overloads and their generic signatures remain identical.',
    Overlay: 'Existing overlay/position operations and ownership stay unchanged;the real public Dialog.open protocol executes on both sides. Native geometry remains separate.',
    OverlayContainer: 'The compatibility constructor parameter and its existing treatment remain identical.',
    ScrollStrategy: 'The existing scroll factory,option precedence and public strategy type remain identical.',
    ComponentRef: 'The component-ref type,provider callback assignment and returned ownership remain identical.',
    Injectable: 'The Injectable decorator and service construction metadata remain identical.',
    InjectionToken: 'The existing data-token constructor parameter and provider identity remain identical.',
    Injector: 'The existing injector constructor parameter and public Dialog lookup remain identical.',
    OnDestroy: 'The lifecycle interface and complete ngOnDestroy/close-all implementations remain identical.',
    TemplateRef: 'All template overloads and their generic signatures remain identical.',
    Type: 'Configuration/ref/container constructor type signatures remain identical.',
  };
  const reviews = prior.selected.map(item => {
    const row = item.original_row, cases = originals.get(row.source_review.path).reviews.filter(other => id(other) === id(row));
    assert.equal(cases.length, 1); const previous = cases[0]; assert.deepEqual(previous, item.complete_prior_case);
    assert.ok(reasons[row.symbol], 'unreviewed service source role');
    return {file: row.file, module: row.module, symbol: row.symbol, candidate_source_sha256: target.sha256,
      conclusion: previous.conclusion, reviewer: 'Codex primary implementer;bounded generic dialog default source-context review',
      decision: (previous.decision ?? '') + ' The exact generic fallback repair restores tagged ariaModal=true/maxWidth=80vw only for a fresh exact peer config instance. Supplied defaults,per-open options,explicit undefined and custom configuration classes preserve all before observations. ' + reasons[row.symbol] +
        ' Two complete49-file strict programs and70 actual tagged/before/candidate protocol cases plus two semantically valid rejected source faults qualify this source change. This is no new source closure,native,packed,AOT,SSR or full-floor admission.',
      prior_source_context: {ledger_snapshot_parent: prior.source_parent, review: row.source_review, case: previous},
      current_source_role: sourceRole(sources.get(target.path), checker, row),
      independent_evidence: [row.source_review, {path: impactPath, sha256: hash(bytes)}, boundary.ref,
        boundary.proof.candidate, {path: 'scripts/dialog-caller-service-default-boundary.mjs',
          sha256: hash(read('scripts/dialog-caller-service-default-boundary.mjs'))},
        {path: 'scripts/dialog-caller-service-default-source-rebinding.mjs',
          sha256: hash(read('scripts/dialog-caller-service-default-source-rebinding.mjs'))}],
    };
  });
  return {line: boundary.line, boundary, prior, rows: prior.selected,
    review: {schema_version: 1, line: boundary.line, status: 'reviewed',
      criteria: 'Eleven prior closed service-base roles rebound individually to the exact applied generic-default source;complete cases/conclusions and all signatures/other class members preserved.',
      reviews, new_semantic_closures: 0, source_rebindings: 11, API_signatures_and_other_class_members_unchanged: true,
      actual_native_packed_AOT_or_full_floor_qualified: false}};
}
