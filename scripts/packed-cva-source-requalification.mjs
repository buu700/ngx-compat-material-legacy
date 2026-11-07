/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite source-role successor; old source readers never admit current runtime. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {dialogTitlePriorMetadataRead} from './snack-dom-source-context.mjs';
import {qualifyPackedProductSourceRepairs} from './packed-product-source-recovery.mjs';
import {autocompleteSelectionReaderSubject} from './autocomplete-selection-spec-subject.mjs';
import {sourceRole} from './dialog-caller-config-source-rebinding.mjs';
import {scanValueAccessorTokenUses} from './value-accessor-token-source-review.mjs';
import {authoredUseReviewEvidence} from './authored-use-inventory.mjs';
import {scanCurrentAuthoredUses, currentAuthoredUseAdmission} from './authored-current-use-inventory.mjs';

const ts = createRequire(import.meta.url)('typescript');
export const PACKED_CVA_ROLE_INPUTS = 'compatibility/rc/packed-cva-source-review-inputs.json';
const pins = {main: '7b9ba00f8f4d104f29f6332babad1a00310cf634a8b50dff83b80cfc3a402b06',
  '21.x': '73b61b0ff8c7a3288d079207ffc30bd910b7cadae177c3c2b8a402cf59b7e59b'};
const frozenPath = 'compatibility/f10/authored-dependency-dispositions.json';
const addedPath = 'compatibility/f10/authored-dependency-current-dispositions.json';
const reviewPath = 'compatibility/f10/authored-use-reviews/packed-cva-current-source-boundaries.json';
const rolesPath = 'compatibility/rc/packed-cva-current-public-roles.json';
const proofPath = 'compatibility/rc/packed-cva-current-source-requalification-proof.json';
const productPrefix = 'projects/ngx-material-legacy/';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const key = row => JSON.stringify([row.file, row.module, row.symbol]);
const disk = root => path => readFileSync(join(root, path));
const ref = (path, value) => ({path, sha256: hash(value)});
const gitCache = new Map();
function original(root, commit, path) {
  const id = JSON.stringify([root, commit, path]);
  const env = {...process.env, GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1'};
  for (const name of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
    'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete env[name];
  if (!gitCache.has(id)) gitCache.set(id, execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0',
    '-c', 'maintenance.auto=0', 'show', commit + ':' + path], {cwd: root, maxBuffer: 32 * 1024 * 1024,
    env}));
  return Buffer.from(gitCache.get(id));
}
/** Source-only retired-role proof adapter; exact old/new implementation bytes. */
export function packedCvaMetadataToolingEpoch({root = process.cwd(), read = disk(root)} = {}) {
  const raw = read(PACKED_CVA_ROLE_INPUTS), inputs = JSON.parse(raw);
  assert.equal(hash(raw), pins[inputs.line], 'changed packed role tooling inputs');
  const delta = inputs.metadata_tooling_delta;
  assert.equal(delta.path, 'scripts/authored-additional-use-baseline.mjs');
  const before = original(root, inputs.source_checkpoint, delta.path);
  assert.equal(hash(before), delta.before_sha256);
  let after = before.toString();
  for (const edit of delta.edits) {
    assert.equal(after.split(edit.before).length, 2); after = after.replace(edit.before, edit.after);
  }
  assert.equal(hash(after), delta.sha256);
  const expected = hash(read(delta.path));
  assert.ok(expected === delta.before_sha256 || expected === delta.sha256, 'changed retired-role type proof adapter');
  const assertCurrent = () => assert.equal(hash(read(delta.path)), expected, 'late retired-role proof adapter mutation');
  return {path: delta.path, before, read: path => {
    if (path !== delta.path) return read(path);
    assertCurrent(); return Buffer.from(before);
  }, assertCurrent};
}
function sourceProgram(root, paths, read) {
  const options = {noResolve: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    experimentalDecorators: true};
  const host = ts.createCompilerHost(options), oldRead = host.readFile.bind(host);
  const names = new Map(paths.map(path => [join(root, path), path]));
  host.readFile = path => names.has(path) ? read(names.get(path)).toString() : oldRead(path);
  const program = ts.createProgram([...names.keys()], options, host);
  return {checker: program.getTypeChecker(), source: path => {
    const source = program.getSourceFile(join(root, path));
    assert.equal(source.parseDiagnostics.length, 0); return source;
  }};
}
const shapes = role => role.occurrences.map(o => JSON.stringify([o.parent_kind, o.parent_source])).sort();
function retainedRole(source, checker, row) {
  const imports = source.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text === row.module)
    .flatMap(n => n.importClause?.namedBindings?.elements ?? [])
    .filter(n => (n.propertyName ?? n.name).text === row.symbol);
  assert.ok(imports.length <= 1, 'ambiguous retained import ' + key(row));
  if (!imports.length) return {binding: null, occurrences: [], retained_absent_original_peer_binding: true,
    bound_parameters_and_fields: [], complete_caller_members: []};
  const binding = imports[0], symbol = checker.getSymbolAtLocation(binding.name);
  assert.ok(symbol); let references = 0;
  function visit(node) {
    if (ts.isIdentifier(node) && node !== binding.name && node !== binding.propertyName &&
        checker.getSymbolAtLocation(node) === symbol) references++;
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (references) return sourceRole(source, checker, row);
  return {binding: binding.parent.parent.parent.getText(source), import_local: binding.name.text,
    type_only: !!(binding.isTypeOnly || binding.parent.parent.isTypeOnly), occurrences: [],
    bound_parameters_and_fields: [], complete_caller_members: [], retained_unused_import: true};
}

/** Verify the two new detector calls and the exact constructor receiver ownership. */
export function reviewPackedDetectorCalls(root, beforeRead, currentRead) {
  const menu = productPrefix + 'legacy-menu/internal/menu-content-base.ts';
  const tab = productPrefix + 'legacy-tabs/internal/tab-body-base.ts';
  const program = sourceProgram(root, [menu, tab], currentRead);
  const results = [];
  for (const [path, className, methodName, receiverName] of [
    [menu, '_MatMenuContentBase', 'detach', '_changeDetectorRef'],
    [tab, '_MatTabBodyBase', '_finishTransition', '_changeDetectorRef'],
  ]) {
    const source = program.source(path), cls = source.statements.find(n => ts.isClassDeclaration(n) && n.name.text === className);
    assert.ok(cls, 'missing reviewed detector owner');
    const ctor = cls.members.find(ts.isConstructorDeclaration);
    const receiver = cls.members.find(n => ts.isPropertyDeclaration(n) && n.name.getText(source) === receiverName)
      ?? ctor.parameters.find(n => n.name.getText(source) === receiverName);
    assert.ok(receiver && receiver.type.getText(source) === 'ChangeDetectorRef', 'detector receiver type changed');
    const binding = program.checker.getSymbolAtLocation(receiver.type.typeName).declarations;
    assert.equal(binding.length, 1);
    assert.ok(ts.isImportSpecifier(binding[0]) && binding[0].parent.parent.parent.moduleSpecifier.text === '@angular/core');
    assert.equal(binding[0].isTypeOnly || binding[0].parent.parent.isTypeOnly, false);
    const method = cls.members.find(n => ts.isMethodDeclaration(n) && n.name.getText(source) === methodName);
    const marks = [];
    function visit(node) {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
          node.expression.name.text === 'markForCheck') {
        const declarations = program.checker.getSymbolAtLocation(node.expression.expression)?.declarations ?? [];
        assert.ok(declarations.includes(receiver), 'detector mark has another receiver');
        assert.equal(node.arguments.length, 0); marks.push(node);
      }
      ts.forEachChild(node, visit);
    }
    visit(method); assert.equal(marks.length, 1, 'one reviewed terminal mark');
    if (path === menu) {
      const conditional = method.body.statements[0]; assert.ok(ts.isIfStatement(conditional));
      assert.equal(conditional.expression.getText(source), 'this._portal?.isAttached');
      assert.deepEqual(conditional.thenStatement.statements.map(n => n.getText(source)),
        ['this._portal.detach();', 'this._changeDetectorRef.markForCheck();']);
    } else {
      assert.ok(receiver.modifiers.some(m => m.kind === ts.SyntaxKind.PrivateKeyword));
      assert.ok(receiver.modifiers.some(m => m.kind === ts.SyntaxKind.ReadonlyKeyword));
      const first = ctor.body.statements[0];
      assert.equal(first.getText(source), 'this._changeDetectorRef = changeDetectorRef;');
      const input = program.checker.getSymbolAtLocation(first.expression.right).declarations;
      assert.equal(input.length, 1); assert.equal(input[0], ctor.parameters[2]);
      const statements = method.body.statements.map(n => n.getText(source));
      assert.deepEqual(statements.slice(-3), [
        "this._elementRef.nativeElement.classList.remove('mat-tab-body-animating');",
        'this._changeDetectorRef.markForCheck();', 'this._translateTabComplete.next(transition);',
      ]);
    }
    assert.equal(beforeRead(path).toString().includes(marks[0].getText(source)), path === menu);
    results.push({path, method: methodName, source_sha256: hash(currentRead(path)),
      imported_public_receiver_bound: true, arguments: 0,
      ordering: path === menu ? 'after actual attached view destruction' : 'after terminal style writes and before original completion output'});
  }
  return results;
}

/** Build the unique successor without changing a source judgment outside its worksheet. */
export function preparePackedCvaSourceRequalification({root = process.cwd(), read = disk(root), historicalTitleMetadata = false} = {}) {
  assert.equal(typeof historicalTitleMetadata,'boolean');
  const inputBytes = read(PACKED_CVA_ROLE_INPUTS), inputs = JSON.parse(inputBytes), line = inputs.line;
  assert.equal(hash(inputBytes), pins[line], 'changed packed role inputs');
  packedCvaMetadataToolingEpoch({root, read});
  const nativeSpec = autocompleteSelectionReaderSubject({root, read, line});
  assert.equal(inputs.selected.length, 241); assert.equal(inputs.accessor_roles.length, 6);
  const cache = new Map();let current = path => {
    if (!cache.has(path)) cache.set(path, read(path)); return cache.get(path);
  };
  const before = new Map();
  for (const member of [...inputs.prior_ledgers, ...inputs.prior_reviews]) {
    const value = original(root, inputs.source_checkpoint, member.path);
    assert.equal(hash(value), member.sha256); assert.equal(value.length, member.bytes);
    before.set(member.path, value);
    if (inputs.prior_reviews.includes(member)) assert.equal(hash(current(member.path)), member.sha256, 'changed original review');
  }
  for (const member of inputs.bound_inputs) {
    const actual = nativeSpec.qualify(member) ?? member;
    assert.equal(hash(current(member.path)), actual.sha256, 'changed bound source input ' + member.path);
  }
  const productInputs = JSON.parse(current('compatibility/rc/snack-dom-source-context-product-inputs.json'));
  const sourceInputs = JSON.parse(current('compatibility/rc/snack-dom-source-context-inputs.json'));
  const history = JSON.parse(gunzipSync(current(sourceInputs.history_product.path)));
  assert.equal(hash(current(sourceInputs.history_product.path)), sourceInputs.history_product.sha256);
  const packed = qualifyPackedProductSourceRepairs({root, read: current, line,
    data: productInputs.packed_repairs, registry: productInputs, history});
  const actualCurrent=current;let priorRead=packed.read;
  if(historicalTitleMetadata){
    // Reconstruct this producer's original source-review epoch only. Raw title
    // admission above and the returned reader's product reads remain current.
    // The current checker above retains actual source bindings. Historical
    // comparisons use separate callbacks and never construct a current checker.
    const titleCurrent=dialogTitlePriorMetadataRead({root,read,metadataOverlay:path=>{
      if(packed.contract_preimages.has(path)){
        packed.assertCurrent(path);return Buffer.from(packed.contract_preimages.get(path));
      }
      return actualCurrent(path);
    }});
    const titlePrior=dialogTitlePriorMetadataRead({root,read:packed.read});
    const metadataCurrent=nativeSpec.titleReaders.withHistoricalToolMetadata(metadata=>metadata,{comparisonRead:titleCurrent});
    priorRead=nativeSpec.titleReaders.withHistoricalToolMetadata(metadata=>metadata,{comparisonRead:titlePrior});
    const historicalCache=new Map();current=dialogTitlePriorMetadataRead({root,read,metadataOverlay:path=>{
      if(!historicalCache.has(path))historicalCache.set(path,metadataCurrent(path));return historicalCache.get(path);
    }});
  }
  const oldRead = path => before.get(path) ?? priorRead(path);
  const ledgers = new Map(inputs.prior_ledgers.map(m => [m.path, JSON.parse(before.get(m.path))]));
  const frozen = ledgers.get(frozenPath), added = ledgers.get(addedPath);
  assert.equal(frozen.symbol_uses.length, 1736); assert.equal(added.symbol_uses.length, 315);
  const oldEvidence = [frozen, added].map(doc => authoredUseReviewEvidence(doc, line, oldRead, hash));
  assert.deepEqual(oldEvidence.map(r => [r.reviewed, r.insufficient]), [[1730, 0], [315, 0]], 'original source judgments not preserved');
  const stale = [frozen, added].flatMap(doc => authoredUseReviewEvidence(doc, line, current, hash).insufficient_uses);
  assert.deepEqual(stale.map(key).sort(), inputs.selected.map(key).sort(), 'changed finite role impact');
  const changedPaths = packed.targets.map(m => m.path).filter(path => inputs.selected.some(r => productPrefix + r.file === path));
  assert.equal(changedPaths.length, 3);
  const oldProgram = sourceProgram(root, changedPaths, oldRead), newProgram = sourceProgram(root, changedPaths, current);
  const changedRoles = [];
  for (const row of inputs.selected.filter(r => changedPaths.includes(productPrefix + r.file))) {
    const path = productPrefix + row.file;
    const previous = retainedRole(oldProgram.source(path), oldProgram.checker, row);
    const actual = retainedRole(newProgram.source(path), newProgram.checker, row);
    assert.equal(actual.binding, previous.binding); assert.equal(actual.type_only, previous.type_only);
    const expected = shapes(previous), observed = shapes(actual);
    if (row.file === 'legacy-tabs/internal/tab-body-base.ts' && row.symbol === 'ChangeDetectorRef') {
      assert.equal(observed.length, expected.length + 1);
      const index = observed.indexOf(JSON.stringify(['TypeReference', 'ChangeDetectorRef']));
      assert.ok(index >= 0); observed.splice(index, 1);
    }
    assert.deepEqual(observed, expected, 'unreviewed imported binding role ' + key(row));
    changedRoles.push({file: row.file, module: row.module, symbol: row.symbol, before: previous, current: actual});
  }
  assert.equal(changedRoles.length, 68);
  const detectors = reviewPackedDetectorCalls(root, oldRead, current);
  const accessor = scanValueAccessorTokenUses({root, readSource: path => current(path).toString()});
  accessor.cases.sort((a,b) => key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);
  assert.deepEqual(accessor.cases.map(key).sort(), inputs.accessor_roles.map(key).sort());
  const writes = new Map();
  writes.set(rolesPath, bytes({schema_version: 1, line, changed_roles: changedRoles, detector_calls: detectors,
    accessor_provider_cases: accessor.cases, scope: 'Current source bindings, complete caller members and exact tagged providers; actual packed execution is separately authenticated.',
    current_coordinator_native_or_floor_qualified: false, g11_claim: 'not-passed'}));
  const rolesRef = ref(rolesPath, writes.get(rolesPath));
  writes.set(proofPath, bytes({schema_version: 1, line, source_checkpoint: inputs.source_checkpoint,
    inputs: ref(PACKED_CVA_ROLE_INPUTS, inputBytes), roles: rolesRef,
    preserved_original_reviews: inputs.prior_reviews, requalified_existing_roles: 241, new_accessor_roles: 6,
    product_changes: 4, tooling_changes: 12, complete_case_roster: 106,
    packed_source: packed.source, packed_artifact: packed.artifact,
    paired_qualification: productInputs.packed_repairs.qualification,
    producer: nativeSpec.historicalMetadataReference('scripts/packed-cva-source-requalification.mjs'),
    source_scope_only: true, current_coordinator_native_or_floor_qualified: false, g11_claim: 'not-passed'}));
  const proofRef = ref(proofPath, writes.get(proofPath)), cases = [];
  const deltas = new Map([...productInputs.packed_repairs.targets, ...productInputs.packed_repairs.tooling].map(m => [m.path, m]));
  const common = [proofRef, rolesRef, ...inputs.bound_inputs.filter(m => m.path.includes('source-context-verification') || m.path.includes('declaration-subjects')),
    {path: productInputs.packed_repairs.qualification.path, sha256: productInputs.packed_repairs.qualification.sha256}];
  const reviewRefFor = row => ({path: row.prior_source_review.path, sha256: row.prior_source_review.sha256});
  for (const selected of inputs.selected) {
    const ledger = ledgers.get(selected.ledger), row = ledger.symbol_uses.find(r => key(r) === key(selected));
    assert.deepEqual(row.source_review, selected.prior_source_review);
    const oldBody = JSON.parse(before.get(row.source_review.path));
    const old = oldBody.reviews.find(r => key(r) === key(row)); assert.ok(old);
    const evidence = old.independent_evidence.map(e => {
      const delta = deltas.get(e.path);
      if (!delta) return e;
      assert.equal(e.sha256, delta.before_sha256);
      return {...e, sha256: delta.sha256, ...(Object.hasOwn(e, 'bytes') ? {bytes: delta.bytes} : {})};
    });
    const sourceChanged = hash(current(productPrefix + row.file)) !== old.candidate_source_sha256;
    const decision = sourceChanged
      ? 'The exact independently qualified packed repair changes this source. Before/current checker-bound imported occurrences and complete receiver caller members are recorded in the role report. All previous imported binding shapes remain exact; the tab-body ChangeDetectorRef alone gains one private field type. The same constructor-supplied public detector now marks after terminal styles before completion; lazy menu content marks after actual view destruction. No injection flag, constructor signature, token identity, selector, HTML, CSS or SCSS changes. The four exact product transformations, own-line real packed run with all106original predicates, menu18/tab47 lifecycle cases and original14/22mutants are authenticated separately. The preceding complete case and its conclusion remain available at the immutable prior review reference.'
      : 'This source and its imported binding roles are byte-identical. Only the enumerated fixture/build producer inputs changed. The exact twelve producer edits are authenticated against the immutable baseline and own-line packed source; the complete106case roster and contract predicate files retain their original identities. Real isolated strict AOT and actual Angular harness execution now pass every original case independently on both lines. The prior complete source judgment and its evidence scopes remain preserved; producer identity is refreshed only for the finite reviewed deltas.';
    const unique = new Map([...evidence, reviewRefFor(selected), ...common].map(e => [e.path, e]));
    cases.push({file: row.file, module: row.module, symbol: row.symbol,
      candidate_source_sha256: hash(current(productPrefix + row.file)), conclusion: old.conclusion,
      reviewer: 'Codex primary implementer', decision: decision + ' This closes source/producer requalification only; full coordinator, native/browser/SSR and minimum-version matrices, independent audit and G11 remain mandatory.',
      prior_decision: old.decision, prior_complete_case: {review: reviewRefFor(selected), key: key(row), sha256: hash(JSON.stringify(old))},
      independent_evidence: [...unique.values()]});
  }
  for (const selected of inputs.accessor_roles) {
    const target = accessor.cases.find(r => key(r) === key(selected));
    cases.push({file: selected.file, module: selected.module, symbol: selected.symbol,
      candidate_source_sha256: target.candidate_source_sha256, conclusion: 'stable-public-peer', reviewer: 'Codex primary implementer',
      decision: 'The runtime public forms NG_VALUE_ACCESSOR token is the provide key of the exact tagged16 named multi-provider object. The checker binds its Core forwardRef callback to the actual same-file legacy class, its real Angular decorator providers attachment, unchanged historical selector and public barrel. The authenticated own-line packed artifact constructs this actual target through Angular node DI and forms; all original multi-provider ownership, exact-instance registration, model write, user-to-model, touched, disabled/reenabled and teardown predicates pass. The other line has its own source/artifact/run, with no main-to21 evidence substitution. This closes this finite stable public token/provider source boundary. Full native/browser/SSR/scheduler/compiler/Node/RxJS and advertised minimum peer matrices and independent audit remain separate requirements; no upstream SHA, security clearance or G11 is closed here.',
      provider_case: target, independent_evidence: [...common,
        ...inputs.bound_inputs.filter(m => m.path.includes('value-accessor-token-source-review') || m.path.includes('value_accessor_token_source_probe')),
        ref(target.reference.path, current(target.reference.path))]});
  }
  assert.equal(cases.length, 247); assert.equal(new Set(cases.map(key)).size, 247);
  writes.set(reviewPath, bytes({schema_version: 1, line, status: 'reviewed', reviews: cases,
    scope: '241 exact existing source/producer successors and six independently executed accessor-token source boundaries', g11_claim: 'not-passed'}));
  const review = ref(reviewPath, writes.get(reviewPath));
  for (const selected of [...inputs.selected, ...inputs.accessor_roles]) {
    const row = ledgers.get(selected.ledger).symbol_uses.find(r => key(r) === key(selected));
    if (row.source_review) row.source_review_history = [...(row.source_review_history ?? []),
      {prior_source_review: row.source_review, source_parent: inputs.source_checkpoint,
        reason: 'Finite current packed product/producer source requalification; original complete case and decision retained.'}];
    row.status = 'reviewed'; row.disposition = 'closed'; row.source_review = review;
  }
  frozen.reviewed_uses = 1736; frozen.open_uses = 0; frozen.status = 'closed';
  frozen.note += ' Current packed source requalification retains all original judgments, repairs241stalebindings and closes the six actual accessor-token source boundaries; full G11 remains unqualified.';
  const live = scanCurrentAuthoredUses({root, readSource: path => current(path)});
  assert.equal(live.symbol_uses.length, 1963); assert.equal(live.source_files.length, 532);
  const liveByKey = new Map(live.symbol_uses.map(row => [key(row), row]));
  for (const row of added.symbol_uses) if (liveByKey.has(key(row))) {
    const actual = liveByKey.get(key(row)); row.candidate_source_sha256 = actual.candidate_source_sha256; row.occurrences = actual.occurrences;
  }
  added.source_snapshot_history.push({source_parent: inputs.source_checkpoint,
    prior_source_population_sha256: added.current_source_population_sha256,
    current_source_population_sha256: live.source_population_sha256,
    reason: 'Exactly four packed TS repairs; all1963liveuses,313liveadditions and two qualified retired obligations retained.', new_semantic_closures: 0});
  added.current_source_population_sha256 = live.source_population_sha256; added.status = 'closed';
  writes.set(frozenPath, bytes(frozen)); writes.set(addedPath, bytes(added));
  const proposedBase=path=>writes.get(path)??current(path);
  const proposed=historicalTitleMetadata?dialogTitlePriorMetadataRead({root,read,metadataOverlay:proposedBase}):proposedBase;
  const reviews = [frozen, added].map(doc => authoredUseReviewEvidence(doc, line, proposed, hash));
  assert.deepEqual(reviews.map(r => [r.reviewed, r.insufficient]), [[1736, 0], [315, 0]]);
  const admission = currentAuthoredUseAdmission({root,current: live, frozen: frozen.symbol_uses, candidate: added, line, readMember: proposed});
  assert.equal(admission.ready, true, JSON.stringify(admission)); assert.equal(admission.additional_obligations, 315);
  assert.equal(admission.retained_removed_additional_obligations, 2);
  for (const path of [frozenPath, addedPath]) {
    const accepted=actualCurrent(path).equals(before.get(path)) || actualCurrent(path).equals(writes.get(path));
    const actual=JSON.parse(actualCurrent(path)),expected=JSON.parse(writes.get(path));
    const changed=actual.symbol_uses.find((row,index)=>JSON.stringify(row)!==JSON.stringify(expected.symbol_uses[index]));
    assert.ok(accepted, 'unrelated live canonical metadata edit ' + path + (changed ? ' first changed use ' + key(changed) : ' envelope'));
  }
  nativeSpec.assertCurrent();
  return {line, inputs, writes, before, product_preimages: packed.preimages,
    reconstruction_context:historicalTitleMetadata?'authenticated-before-title-source-and-tool-metadata':'current-source',
    current_title_or_native_admission:false,
    assertCurrentNativeSpec: nativeSpec.assertCurrent,
    roles: {changed: 68, detectors: 2, accessor: 6}, admission,
    source_scope_only: true, current_coordinator_native_or_floor_qualified: false};
}

/** Only exact applied successors may project the two original metadata files. */
export function packedCvaRoleHistoricalReader({root = process.cwd(), read = disk(root)} = {}) {
  const prepared = preparePackedCvaSourceRequalification({root, read, historicalTitleMetadata:true});
  const tooling = packedCvaMetadataToolingEpoch({root, read});
  assert.equal(hash(read(tooling.path)), prepared.inputs.metadata_tooling_delta.sha256,
    'current applied source review requires its reviewed type-proof adapter');
  assertPackedCvaApplied(prepared, read);
  const originals = new Map([frozenPath, addedPath].map(path => [path, prepared.before.get(path)]));
  originals.set(tooling.path, tooling.before);
  const historical = path => {
    if (prepared.writes.has(path)) assertPackedCvaApplied(prepared, read);
    if (!originals.has(path)) return read(path);
    tooling.assertCurrent();
    return Buffer.from(originals.get(path));
  };
  return {line: prepared.line, read: historical, raw: read, members: 3, source_scope_only: true};
}

export function assertPackedCvaApplied(prepared, read) {
  prepared.assertCurrentNativeSpec();
  for (const [path, expected] of prepared.writes) assert.equal(hash(read(path)), hash(expected), 'changed current packed source review ' + path);
}
