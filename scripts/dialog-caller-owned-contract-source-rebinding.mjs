/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Forty-five finite current-source reviews; only the canonical owner writes ledgers. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {inspectDialogOwnedContracts} from './dialog-caller-owned-contract-boundary.mjs';
import {sourceRole} from './dialog-caller-config-source-rebinding.mjs';
const ts = createRequire(import.meta.url)('typescript');
const hash = value => createHash('sha256').update(value).digest('hex');
const id = row => JSON.stringify([row.file, row.module, row.symbol]);
const impactPath = 'compatibility/rc/dialog-caller-owned-contract-source-impact.json';
const pins = {"main": {"compatibility/rc/dialog-caller-owned-contract-source-impact.json": "34c2cf81c3875b6320ec4d24df9966046352efb66805246214e654e31af2c162", "compatibility/rc/dialog-caller-owned-contract-application.json": "79de8dd29dc0accdff02c0bef40b7ee22fc0328dfcbaef9d98ac9e0e97e58d65", "compatibility/rc/api/dialog-template-component-state-decision.json": "891c51a4f52792d6d6bdab08f1e3e474dc85ee4cfae725d7025c4a987a0a5fcb", "compatibility/rc/dialog-caller-owned-contract-diagnostic-reconciliation.json": "7cf1a69e240b822e563aa8151671fa026ce4c7aa10046e72cf3c29a0db71c99e", "compatibility/rc/dialog-caller-owned-ref-lifetime-main.json": "357aca2fa93c180e9349e385a8d1c172748261b7f9c2bf55c91380fea88484d1"}, "21.x": {"compatibility/rc/dialog-caller-owned-contract-source-impact.json": "e764cc4ad3c74e596b03be1d70265f623ab1b89b24126266e9af6ee0c02845fe", "compatibility/rc/dialog-caller-owned-contract-application.json": "c3c839cb5ba73b2d5bc77a68ade4070eabac9c38086a716fd53fb74842b319b7", "compatibility/rc/api/dialog-template-component-state-decision.json": "0333c6ca020719c2d6bdb332cdf72a34f4f6bc9fdd36553db1c97778b7de3974", "compatibility/rc/dialog-caller-owned-contract-diagnostic-reconciliation.json": "d57977652496d8bcfb96264079135c55b547a82105fe2f84687dbc46dbb05d84", "compatibility/rc/dialog-caller-owned-ref-lifetime-21.json": "dd9901fb5170ff6d221eb8bce0e75faf8498b3bcee42e559914ff16869ddd4c5"}};
export const DIALOG_OWNED_CONTRACT_REVIEW = 'compatibility/f10/authored-use-reviews/dialog-owned-contract-source-context.json';

const refReasons = {
  FocusOrigin: 'The five-value erased focus-origin parameter and close-result flow are unchanged; the constructor now registers its paired peer in owned state without DI.',
  ESCAPE: 'The exact Escape comparison, disableClose gate and close call remain unchanged. Hot before-close/open notifications do not change the keycode value or dispatch guard.',
  hasModifierKey: 'The four-modifier predicate and its short-circuit position remain unchanged; no keyboard listener or selector changes.',
  GlobalPositionStrategy: 'The full updatePosition implementation and public strategy operations remain unchanged. Notification streams now broadcast without replay, independently of position behavior.',
  ComponentRef: 'The readonly handle now admits undefined as well as null. Actual tagged template opens return undefined; the modern peer null is normalized by the owned service. Component opens retain the same real handle. The prior template-null assertion is superseded by the exact authorized type decision, not retained as a current claim.',
};
const serviceReasons = {
  ComponentType: 'All component/template overloads and generic constructor signatures remain unchanged; genuine component portal opens still return the owned ref.',
  Overlay: 'Overlay creation, position strategy selection and disposal ownership remain unchanged. Component and template portal ownership is exercised by the actual public Dialog.open protocol; native geometry remains unqualified.',
  OverlayContainer: 'The historical constructor parameter and its compatibility treatment remain unchanged; no upstream private container service is introduced.',
  ScrollStrategy: 'The existing scroll factory and spread precedence remain unchanged; template-handle normalization occurs only after the public open call.',
  ComponentRef: 'The owned assignment now uses cdkRef.componentRef ?? undefined and the corresponding component instance normalization. Actual tagged template ownership is undefined, superseding the earlier nullable-handle assumption. No host-view or private Core access is added.',
  Injectable: 'The decorator, constructor parameters and DI metadata remain unchanged; the service still resolves the same public CDK Dialog.',
  InjectionToken: 'The data/ref/container provider callback and distinct token identities remain unchanged; the paired owned ref is registered without a new injection token.',
  Injector: 'The public injector lookup and constructor parameter remain unchanged; no application is created to support manual ref construction.',
  OnDestroy: 'The lifecycle interface, close-all and complete ngOnDestroy bodies remain unchanged. Existing close-safety mutation tests still pass against the applied sources.',
  TemplateRef: 'All template signatures remain unchanged. A real template portal now exposes tagged undefined componentRef/componentInstance; this corrects runtime values without changing consumer styles or portal ownership.',
  Type: 'The config/ref/container constructor type signatures and supplied class selection remain unchanged; the exact generic fallback default repair remains intact.',
};
const containerReasons = {
  Component: 'Component metadata, selectors and constructor are unchanged. Content attachment recognizes a peer registered by manual owned-ref construction; the actual generated test subclass factory still runs.',
  EventEmitter: 'The existing animation-event emitter and finish/open/close methods remain unchanged; notification Subject changes belong to the owned ref, not this emitter.',
  FocusMonitor: 'Focus-origin monitoring and restoration calls remain unchanged. Recapture now skips only a paired enabled-close peer that the owned ref temporarily keeps disabled for deferred closing.',
  FocusOrigin: 'The erased focus-origin annotations and restoration values remain unchanged; the recapture ownership guard adds no new origin value.',
  FocusTrap: 'The existing trap object and trap method calls remain unchanged. A paired enabled-close backdrop does not trap focus before closing, matching tagged observations; disabled-close and unpaired recapture retain their behavior.',
  FocusTrapFactory: 'The public trap-factory creation call and ownership remain unchanged; the new recapture guard prevents an extra trap operation rather than constructing another trap.',
  InteractivityChecker: 'The constructor token and all public focusability checks remain unchanged; no private focus API is adopted.',
  OverlayRef: 'The guard checks strict peer.overlayRef and peer.containerInstance ownership before skipping recapture. It uses the existing overlay identity and the stable public DialogRef.disableClose field; it cannot authorize an unrelated overlay or container.',
  Platform: 'The existing platform injection and browser guard remain unchanged. Native-browser and SSR behavior are not qualified by protocol DOM ports.',
  BasePortalOutlet: 'Inheritance, constructor and complete component/template/DOM attachment and disposal methods remain unchanged; only content-attached peer selection changes.',
  CdkPortalOutlet: 'The content query and direct outlet operations remain unchanged. Registered ownership prevents duplicate backdrop handling for paired manual construction.',
  ComponentPortal: 'The complete direct component-attachment callback and signature remain unchanged; the actual public component portal still attaches with its genuine handle.',
  DomPortal: 'The complete DOM-attachment failure-recovery method and signature remain unchanged; the independent earlier portal evidence retains its bounded scope.',
  TemplatePortal: 'The direct template-attachment callback and signature remain unchanged; undefined component ownership is normalized in the service, not by changing template DOM.',
  ChangeDetectorRef: 'The same owned state retains its detector and existing markForCheck sites; peer registration only adds and later clears a link in the same WeakMap.',
  ComponentRef: 'The component-attachment return type and real handle remain unchanged. The separately widened optional handle is on the dialog ref and does not change this attachment API.',
  DOCUMENT: 'The document constructor token and active-element containment check remain unchanged. The exact paired-peer guard executes before recapture; native document/focus execution remains separate.',
  ElementRef: 'Host-element injection and containment/trap target uses remain unchanged. No template, selector, CSS or SCSS source changes accompany the guard.',
  EmbeddedViewRef: 'Template-attachment signatures and returned view ownership remain unchanged; no embedded view is synthesized or normalized.',
  Inject: 'All constructor parameter annotations and explicit token expressions remain unchanged, including MatDialogConfig; peer association uses owned state without DI.',
  NgZone: 'Zone injection and existing stabilization callbacks remain unchanged; no scheduling API or animation engine is introduced.',
  OnDestroy: 'The existing destroy call path remains unchanged. The owned state now clears its paired peer together with existing teardown, preventing later recapture after destroy.',
  Optional: 'Existing optional constructor metadata remains unchanged. Registered-peer lookup falls back to the ambient optional dialog ref for unpaired construction.',
  ProviderToken: 'The erased generic token helper and lookup signature remain unchanged; no token identity or provider graph is replaced.',
  Renderer2: 'Renderer injection and every renderer operation remain unchanged; the ownership guard performs no DOM mutation.',
  ViewChild: 'The same outlet query and metadata remain unchanged. Actual generated test queries execute in the bounded proof; native leaf-template execution remains unqualified.',
  assertInInjectionContext: 'The existing optional public-service lookup guard remains unchanged; manual explicit construction still runs outside DI in the owned runtime proof.',
  inject: 'The existing public injection calls and fallback lookup remain unchanged. Registered manual ownership requires no injection call or application creation.',
};

export function dialogOwnedContractSourceRebinding({root = process.cwd(),
  read = path => readFileSync(join(root, path))} = {}) {
  const boundary = inspectDialogOwnedContracts({root, read, requireApplied: true});
  const evidence = Object.entries(pins[boundary.line]).map(([path, sha256]) => {
    assert.equal(hash(read(path)), sha256, 'changed applied dialog review evidence ' + path);
    return {path, sha256};
  });
  const prior = JSON.parse(read(impactPath));
  assert.equal(prior.line, boundary.line); assert.equal(prior.selected.length, 45);
  const originals = new Map();
  for (const ref of [...prior.ledgers, prior.SHA_ledger, ...prior.prior_review_members]) {
    const bytes = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
      'show', prior.source_parent + ':' + ref.path], {cwd: root, maxBuffer: 24 * 1024 * 1024,
      env: {...process.env, GIT_NO_LAZY_FETCH: '1'}});
    assert.equal(hash(bytes), ref.sha256, 'unauthenticated prior dialog review ' + ref.path);
    originals.set(ref.path, JSON.parse(bytes));
    if (prior.prior_review_members.some(member => member.path === ref.path))
      assert.equal(hash(read(ref.path)), ref.sha256, 'changed complete prior dialog case');
  }
  const targets = new Map(boundary.targets.map(member => [member.path, member]));
  const selected = prior.ledgers.flatMap(ref => originals.get(ref.path).symbol_uses
    .filter(row => targets.has('projects/ngx-material-legacy/' + row.file) && row.disposition === 'closed')
    .map(row => ({ledger: ref.path, row})));
  assert.deepEqual(selected, prior.selected.map(item => ({ledger: item.ledger, row: item.original_row})));
  assert.equal(new Set(selected.map(item => id(item.row))).size, 45);
  const sources = new Map([...boundary.proposed_sources].map(([path, text]) =>
    [path, ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)]));
  const options = {noResolve: true, noLib: true, types: [], target: ts.ScriptTarget.ES2022, experimentalDecorators: true};
  const host = ts.createCompilerHost(options);
  host.getSourceFile = path => sources.get(path.startsWith(root + '/') ? path.slice(root.length + 1) : path);
  const checker = ts.createProgram([...sources.keys()], options, host).getTypeChecker();
  const reviews = prior.selected.map(item => {
    const row = item.original_row, cases = originals.get(row.source_review.path).reviews.filter(other => id(other) === id(row));
    assert.equal(cases.length, 1); const previous = cases[0]; assert.deepEqual(previous, item.complete_prior_case);
    const path = 'projects/ngx-material-legacy/' + row.file;
    const reason = row.file === 'legacy-dialog/dialog-ref.ts' ? refReasons[row.symbol] :
      row.file === 'legacy-dialog/internal/dialog-base.ts' ? serviceReasons[row.symbol] :
      row.file === 'legacy-dialog/internal/dialog-container-base.ts' ? containerReasons[row.symbol] :
      row.file === 'legacy-dialog/internal/dialog-container-state.ts' && row.symbol === 'ChangeDetectorRef' ?
        'The existing detector field, markForCheck and detector lifecycle remain unchanged. The same owned WeakMap now stores a finite structural peer link, initializes it to null and clears it on destroy; no upstream import or new service is introduced.' : null;
    assert.ok(reason, 'unreviewed dialog dependency role ' + id(row));
    const current = sourceRole(sources.get(path), checker, row);
    return {file: row.file, module: row.module, symbol: row.symbol, candidate_source_sha256: targets.get(path).sha256,
      conclusion: previous.conclusion, reviewer: 'Codex primary implementer;individual applied dialog contract source review',
      decision: reason + ' The four-file repair also restores tagged hot notifications and template undefined values while retaining the existing close-safety fixes. The applied49-source boundary authenticates two strict programs,162 actual tagged/before/candidate protocol cases and five rejected semantic source faults. The separate applied-source close-safety suite passes20 cases and nine mutations. Prior complete cases are retained as historical evidence; their older whole-source or template-null assertions do not qualify the new source. No new source closure,native,packed,AOT,SSR,full-floor or G11 pass is inferred.',
      prior_source_context: {ledger_snapshot_parent: prior.source_parent, review: row.source_review, case: previous},
      current_source_role: current,
      semantic_contracts: {opening_and_before_close: 'tagged-hot-broadcast', template_component_state: 'tagged-undefined',
        paired_enabled_backdrop: 'close-without-extra-trap', existing_close_safety_fixes_retained: true,
        historical_prior_case_is_current_runtime_oracle: false},
      independent_evidence: [row.source_review, ...evidence, boundary.ref,
        {path: 'scripts/dialog-caller-owned-contract-boundary.mjs', sha256: hash(read('scripts/dialog-caller-owned-contract-boundary.mjs'))},
        {path: 'scripts/dialog-caller-owned-contract-source-rebinding.mjs', sha256: hash(read('scripts/dialog-caller-owned-contract-source-rebinding.mjs'))}],
    };
  });
  return {line: boundary.line, boundary, prior, rows: prior.selected,
    review: {schema_version: 1, line: boundary.line, status: 'reviewed',
      criteria: 'Forty-five prior closed roles individually rebound to the exact applied four-file dialog contract repair. Complete old cases remain historical;current decisions explicitly correct hot notifications,undefined template ownership and paired backdrop focus.',
      reviews, source_rebindings: 45, new_semantic_closures: 0,
      only_public_signature_change: 'MatLegacyDialogRef.componentRef additionally admits undefined',
      actual_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'}};
}
