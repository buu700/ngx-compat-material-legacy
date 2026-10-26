/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Individual dependency decisions for the original eighteen dialog roles. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {inspectDialogOwnedContracts} from './dialog-caller-owned-contract-boundary.mjs';
import {sourceRole} from './dialog-caller-config-source-rebinding.mjs';
const ts = createRequire(import.meta.url)('typescript');
const hash = value => createHash('sha256').update(value).digest('hex');
const id = row => JSON.stringify([row.file, row.module, row.symbol ?? row.name]);
export const DIALOG_CALLER_REVIEW = 'compatibility/f10/authored-use-reviews/dialog-callers.json';
const reasons = new Map([
  ['legacy-dialog/dialog-config.ts:MatDialogConfig', 'The nondeprecated public class supplies the remaining peer configuration fields. The owned legacy subclass restores ariaModal=true,maxWidth=80vw and historical focus/string-duration values;the local runtime view excludes the three upstream compatibility properties before defining their historical domains. Genuine construction and real service opens preserve option/default precedence. This does not grant equivalence to other current Material configuration behavior.'],
  ['legacy-dialog/dialog-module.ts:DialogModule', 'The public module and real Angular injector supply CDK Dialog services. Actual public Dialog.open and generated test container/content factories execute at both maintained peer minima. The historical legacy module still owns its declarations,providers and distinct data/default/scroll tokens. Its packed metadata and actual legacy leaf AOT factory remain separate checks.'],
  ['legacy-dialog/dialog-ref.ts:DialogRef', 'The owned historical ref delegates overlay ownership,closed/backdrop/keyboard streams,size,position and panel-class operations to the genuine public CDK ref. Its legacy hot notifications and template undefined sentinel are restored;its cancellation,reentrancy,idempotence and first-result protections remain owned fixes. The exact public peer fields used for paired focus ownership are checked in all three authenticated declarations. Manual construction requires no application or DI.'],
  ['legacy-dialog/dialog-ref.ts:DialogPosition', 'The public optional top,bottom,left,right shape and tagged scalar domains support the unchanged updatePosition implementation. Explicit side precedence and center defaults execute through the actual public ref with finite position protocols. Native coordinates and viewport geometry remain unqualified.'],
  ['legacy-dialog/dialog-ref.ts:MatDialogConfig', 'The imported public config provides the ref constructor type and its historical disableClose/position/size/ID policy. Deprecated focus/string-duration reads are confined to the owned runtime view in the container. Constructor signatures stay identical,while the one optional componentRef type widening is explicitly recorded. Paired registration changes no provider or config token identity.'],
  ['legacy-dialog/dialog-ref.ts:MatDialogState', 'All typed OPEN,CLOSING,CLOSED values match the tagged0,1,2 domain. Actual owned ref lifecycle cases exercise the transitions and retain the existing safety fixes. Tagged const-enum erasure and current runtime-enum emission remain explicit differences in the public evidence;runtime module-object identity is not asserted.'],
  ['legacy-dialog/internal/dialog-container-base.ts:CdkDialogContainer', 'The original imported container is absent. The historical owned container extends stable public BasePortalOutlet and owns its legacy focus,portal and lifecycle helpers. The exact current49-source boundary,tagged comparisons and public portal callbacks support this finite replacement;it does not inherit a current private container or animation implementation. Native leaf HTML/style/geometry and packed factories remain separate.'],
  ['legacy-dialog/internal/dialog-container-base.ts:MatDialogConfig', 'The explicit @Inject(MatDialogConfig) retains the actual public token;the parameter uses the independently owned historical runtime view. Seven formerly planned-removal focus/duration reads are locally owned and their original scalar domains are checked. Default/manual/JIT/focus protocols and the actual constructor execute;there is no new application bootstrap,private upstream helper or consumer style change.'],
  ['legacy-dialog/internal/dialog-base.ts:Dialog', 'The service resolves the stable public CDK Dialog and uses genuine component/template open protocols with the existing custom provider callback and legacy ref/container classes. It preserves distinct legacy tokens,option precedence and scroll/position policy. Public default differences are repaired only for a fresh exact peer config fallback;custom configurations and explicit undefined retain their observed behavior. Unsupported fixture injection failures remain recorded and grant no lifecycle credit.'],
  ['legacy-dialog/internal/dialog-base.ts:DialogConfig', 'The public generic configuration shape describes the same container/provider/context callbacks supplied to Dialog.open. Strict actual-SDK programs validate the complete49-file graph,while real component/template portals execute. Deferred owned close handling remains explicit and is not delegated to peer removal semantics. This closes the finite source/configuration protocol,not arbitrary application overrides or packed injector graphs.'],
  ['legacy-dialog/internal/dialog-base.ts:DialogRef', 'The generic public handle from Dialog.open supplies the actual component/container ownership and public streams. The owned service normalizes absent componentRef/componentInstance to tagged undefined without changing real component handles. Real peer close/disposal and manual-ref interaction cases execute;the record does not claim all current DialogRef behavior matches tagged Material.'],
  ['legacy-dialog/internal/dialog-base.ts:MatDialogConfig', 'The default config class is the stable public class. A fresh exact-class fallback receives only legacy ariaModal=true and maxWidth=80vw before per-open spread. Supplied defaults,explicit undefined and custom classes retain their observations without mutation. Legacy config construction separately owns historical focus/duration values;there is no dependency on deprecated upstream compatibility reads.'],
  ['legacy-dialog/internal/dialog-container-base.ts:DialogRef', 'Optional ambient injection and explicitly registered owned-ref pairing use the public ref. Recapture skips only the actual same-overlay,same-container peer temporarily disabled for owned deferred close while the legacy config permits closing. Disabled-close and unpaired direct recapture remain exercised. The stable public overlayRef,containerInstance and disableClose declaration fields are verified without private implementation access.'],
  ['legacy-dialog/internal/dialog-container-state.ts:DialogContainer', 'The public structural container protocol is the erased parameter boundary for the owned state hook. Its optional focus notification hook is provided by the owned WeakMap-backed stream;title queues and detector scheduling remain locally owned. The same state now releases its peer link on destroy. No current private field or copied upstream container machinery is required.'],
  ['legacy-dialog/internal/dialog-initial-focus.ts:MatDialogConfig', 'The original peer import is removed and the original obligation is retained explicitly. The helper now accepts the owned historical runtime configuration view,which preserves tagged boolean/string autofocus and string/number duration domains. Focus selection and lifecycle protocols exercise the owned helper;this does not erase the retained additional role or claim native focus geometry.'],
  ['legacy-dialog/public-api.ts:AutoFocusTarget', 'The existing historical alias reexports the stable nondeprecated public string target type. Actual original/current declarations and strict positive/negative fixtures preserve the finite domain. Boolean and arbitrary-string historical configuration values remain owned by the local legacy runtime view rather than broadening this alias.'],
  ['legacy-dialog/public-api.ts:DialogPosition', 'The historical alias remains a direct reexport of the stable public optional-side position type. The independently checked original/current scalar and assignment contracts support its shape;position algorithms and native layout are covered separately. No modern API enumeration or wildcard mirror is introduced.'],
  ['legacy-dialog/public-api.ts:MatDialogState', 'The historical alias retains typed state values OPEN=0,CLOSING=1,CLOSED=2. The genuine public proof preserves the tagged const-enum erasure/current runtime-export distinction instead of normalizing it away. This is the existing finite legacy alias,with no assertion of identical emitted namespace objects or complete lifecycle equivalence.'],
]);

export function inspectDialogCallerReview({root = process.cwd(), read = path => readFileSync(join(root, path))} = {}) {
  const boundary = inspectDialogOwnedContracts({root, read, requireApplied: true});
  const config = boundary.defaults.configuration, prior = config.source.prior;
  assert.equal(prior.selected.length, 18); assert.equal(reasons.size, 18);
  const currentTypes = config.types.proof.subjects.find(subject => subject.line === boundary.line);
  assert.ok(currentTypes); assert.equal(currentTypes.unstable_current_uses.length, 0);
  assert.equal(currentTypes.actual_bindings.length, 18);
  const unstable = new Set(['deprecated', 'breaking-change', 'docs-private', 'experimental', 'developerPreview']);
  for (const declaration of currentTypes.symbols.filter(symbol => symbol.actually_consumed_current_peer)) {
    assert.equal(declaration.missing, false); assert.ok(declaration.declarations.length);
    assert.ok(declaration.tags.every(tag => !unstable.has(tag)));
  }
  const peerFields = [];
  for (const member of boundary.sdkDeclarations) {
    const source = ts.createSourceFile(member.path + '.d.ts', gunzipSync(read(member.path)).toString(), ts.ScriptTarget.Latest, true);
    const type = source.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'DialogRef'); assert.ok(type);
    const fields = ['overlayRef', 'containerInstance', 'disableClose'].map(name => {
      const field = type.members.find(node => node.name?.getText(source) === name); assert.ok(field);
      assert.ok(!(field.modifiers ?? []).some(node => [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword].includes(node.kind)));
      const tags = ts.getJSDocTags(field).map(tag => tag.tagName.text);
      assert.ok(tags.every(tag => !unstable.has(tag)));
      return {name, declaration: field.getText(source), tags};
    });
    peerFields.push({member, fields});
  }
  assert.equal(peerFields.length, 3);
  const sources = new Map([...boundary.proposed_sources].map(([path, text]) =>
    [path, ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)]));
  const options = {noResolve: true, noLib: true, types: [], target: ts.ScriptTarget.ES2022, experimentalDecorators: true};
  const host = ts.createCompilerHost(options);
  host.getSourceFile = path => sources.get(path.startsWith(root + '/') ? path.slice(root.length + 1) : path);
  const checker = ts.createProgram([...sources.keys()], options, host).getTypeChecker();
  const evidence = [config.source.ref, config.types.ref, config.qualification, boundary.defaults.ref, boundary.ref,
    {path: 'scripts/dialog-caller-owned-contract-boundary.mjs', sha256: hash(read('scripts/dialog-caller-owned-contract-boundary.mjs'))},
    {path: 'scripts/dialog-caller-review.mjs', sha256: hash(read('scripts/dialog-caller-review.mjs'))}];
  const reviews = prior.selected.map(item => {
    const row = item.original_row, path = 'projects/ngx-material-legacy/' + row.file, source = sources.get(path);
    assert.ok(source); const decision = reasons.get(row.file + ':' + row.symbol); assert.ok(decision);
    const before = currentTypes.actual_bindings.find(binding => id(binding) === id(row)); assert.ok(before);
    let role;
    if (!before.current_peer_use) {
      const identifiers = [];
      function visit(node) {if (ts.isIdentifier(node) && node.text === row.symbol) identifiers.push(node); ts.forEachChild(node, visit);}
      visit(source);
      if (row.symbol === 'CdkDialogContainer') {
        assert.equal(identifiers.length, 0, 'restored retired container dependency');
        role = {kind: 'OwnedClassReplacement', complete_current_source: source.text};
      } else {
        assert.equal(row.symbol, 'MatDialogConfig');
        assert.ok(!source.statements.some(node => ts.isImportDeclaration(node) && node.moduleSpecifier.text === row.module),
          'restored retired configuration peer import');
        const owned = sourceRole(source, checker, {...row, module: '../dialog-config', symbol: 'LegacyDialogRuntimeConfig'});
        assert.equal(owned.import_local, 'MatDialogConfig');
        role = {kind: 'LocallyOwnedConfigurationView', original_peer_import_removed: true, ...owned};
      }
    } else if (row.file === 'legacy-dialog/public-api.ts') {
      const declarations = source.statements.filter(ts.isExportDeclaration).filter(declaration =>
        declaration.moduleSpecifier?.text === row.module).flatMap(declaration =>
        (declaration.exportClause?.elements ?? []).filter(specifier => (specifier.propertyName ?? specifier.name).text === row.symbol)
          .map(specifier => ({declaration, specifier})));
      assert.equal(declarations.length, 1);
      role = {kind: 'PublicReexport', declaration: declarations[0].declaration.getText(source),
        export_specifier: declarations[0].specifier.getText(source)};
    } else role = sourceRole(source, checker, row);
    return {file: row.file, module: row.module, symbol: row.symbol, candidate_source_sha256: hash(source.text),
      conclusion: before.current_peer_use ? 'stable-public-peer' : row.symbol === 'CdkDialogContainer' ? 'owned-replacement' : 'removed-use',
      reviewer: 'Codex primary implementer;individual historical dialog dependency review',
      decision: decision + ' Only the finite dependency/type/public protocol boundary is closed. Actual legacy leaf factories,HTML/CSS rendering,native geometry,AOT,packed consumers,SSR and full Node/compiler/peer/RxJS floor qualification remain required. All original SHA and packed CVA obligations remain separate;G11 is not passed.',
      original_obligation: {ledger: item.ledger, row}, current_source_role: role,
      independent_evidence: evidence, actual_native_packed_AOT_or_full_floor_qualified: false};
  });
  assert.equal(new Set(reviews.map(id)).size, 18);
  assert.equal(reviews.filter(row => row.conclusion === 'stable-public-peer').length, 16);
  return {line: boundary.line, prior, boundary, peerFields, rows: prior.selected,
    review: {schema_version: 1, line: boundary.line, status: 'reviewed',
      criteria: 'Eighteen individual original dialog dependency decisions against the exact applied49-source graph,authenticated tagged/current public SDKs and actual owned public protocols. One owned container replacement and one retained removed config import remain explicit.',
      reviews, source_closures_prepared: 18, canonical_writes_performed: 0,
      actual_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'}};
}
