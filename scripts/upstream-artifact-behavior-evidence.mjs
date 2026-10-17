/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {readEvidenceMember, validatePackedConsumerRun} from './upstream-packed-run-evidence.mjs';
import {SELECT_FOCUS_CLICK_CASE_ID, packedSelectFocusClickCase} from './select-focus-click-packed-contract.mjs';
import {SELECT_DETACH_CASE_ID, packedSelectDetachCase} from './select-detach-packed-contract.mjs';
import {TABLE_ONPUSH_CASE_ID, packedTableOnPushCase} from './table-onpush-packed-contract.mjs';
import {CHIP_DISABLED_CASE_ID,MENU_LAZY_CASE_ID,TOOLTIP_CONTAINER_CASE_ID,packedChipDisabledCase,packedMenuLazyCase,packedTooltipContainerCase} from './chip-menu-tooltip-packed-contract.mjs';

export const ARTIFACT_BEHAVIOR_KIND = 'artifact-required-individual-behavior';
export const SELECT_FOCUS_SHA = '1b6db8c89b00ace8aaa0e0824866acec5369635f';
export const SELECT_FOCUS_PATCH = 'b937a4a631c52484825a5a3ab74a301b01b64ba494ff72ef4eb7d0de7c992aba';
export const SELECT_FOCUS_MEMBERS = Object.freeze([
  'projects/ngx-material-legacy/legacy-select/select.html',
  'projects/ngx-material-legacy/legacy-select/internal/select-base.ts',
  'projects/ngx-material-legacy/legacy-select/select.ts',
  'projects/ngx-material-legacy/legacy-form-field/form-field.html',
  'scripts/packed-consumer-aot-smoke.mjs',
  'scripts/packed-consumer-evidence.mjs',
  'scripts/chip-menu-tooltip-packed-contract.mjs',
  'scripts/bidi-isolated-packed-contract.mjs', 'scripts/bidi-isolated-packed-fixture.mjs',
  'scripts/selection-comparator-packed-contract.mjs', 'scripts/selection-comparator-packed-fixture.mjs',
  'scripts/native-date-packed-contract.mjs', 'scripts/native-date-packed-fixture.mjs',
  'scripts/upstream-artifact-behavior-evidence.mjs',
  'scripts/select-focus-click-packed-fixture.mjs',
  'scripts/select-focus-click-packed-contract.mjs',
  'compatibility/rc/matrices/library-exports.json',
  'compatibility/rc/matrices/full-verify.json',
]);
export const SELECT_DETACH_SHA = '688c430fe8df09152ee59eb8a2ca62b5ba2fb81e';
export const SELECT_DETACH_PATCH = 'b443861e8eabbfa6c7613fc26349a89e59d2b364493d426461957beb247b691a';
export const TABLE_ONPUSH_SHA = 'ca9c490ee30dbf7c9c147079197d0dbc0abcd611';
export const TABLE_ONPUSH_PATCH = '3630c1798278c09cfd65afa8a4d5853034cfd2a0bd67eff9dc2edd6aa4d8808f';
const producerMembers = [
  'scripts/packed-consumer-aot-smoke.mjs', 'scripts/packed-consumer-evidence.mjs',
  'scripts/chip-menu-tooltip-packed-contract.mjs', 'scripts/upstream-artifact-behavior-evidence.mjs',
  'scripts/bidi-isolated-packed-contract.mjs', 'scripts/bidi-isolated-packed-fixture.mjs',
  'scripts/selection-comparator-packed-contract.mjs', 'scripts/selection-comparator-packed-fixture.mjs',
  'scripts/native-date-packed-contract.mjs', 'scripts/native-date-packed-fixture.mjs',
  'compatibility/rc/matrices/library-exports.json', 'compatibility/rc/matrices/full-verify.json',
];
export const SELECT_DETACH_MEMBERS = Object.freeze([
  'projects/ngx-material-legacy/legacy-select/select.html',
  'projects/ngx-material-legacy/legacy-select/internal/select-base.ts',
  'projects/ngx-material-legacy/legacy-select/select.ts',
  'scripts/select-detach-packed-fixture.mjs', 'scripts/select-detach-packed-contract.mjs', ...producerMembers,
]);
export const TABLE_ONPUSH_MEMBERS = Object.freeze([
  'projects/ngx-material-legacy/legacy-table/table.ts',
  'projects/ngx-material-legacy/legacy-table/internal/table-construction-context.ts',
  'projects/ngx-material-legacy/legacy-table/row.ts',
  'projects/ngx-material-legacy/legacy-table/table-module.ts',
  'projects/ngx-material-legacy/legacy-table/table-data-source.ts',
  'projects/ngx-material-legacy/legacy-table/internal/public-constructor-context.ts',
  'scripts/table-onpush-packed-fixture.mjs', 'scripts/table-onpush-packed-contract.mjs',
  'compatibility/rc/table-public-module-sources/cdk-22.1.7-table.mjs',
  'compatibility/rc/table-public-module-sources/cdk-21.2.14-table.mjs', ...producerMembers,
]);
export const CHIP_DISABLED_SHA='86ebb9bfd55e637be1e6d0117a10e290c5247ebd';
export const CHIP_DISABLED_PATCH='d3ed5898e018bf496e5769ffd2dfdc1e148c3869beb78d8a992b36323814ea21';
export const CHIP_DISABLED_MEMBERS=Object.freeze([
  'projects/ngx-material-legacy/legacy-chips/chip.ts',
  'projects/ngx-material-legacy/legacy-chips/chip-list.ts',
  'projects/ngx-material-legacy/legacy-chips/chip-list.spec.ts',
  'reference/material-16.2.14/chips-keyboard-sources/chip.ts',
  'reference/material-16.2.14/chip-blur-sources/chip-list.ts', ...producerMembers,
]);
export const MENU_LAZY_SHA='86a96c9290e3896485c6b6c0d039873652f543df';
export const MENU_LAZY_PATCH='43ed5d9c6e88c0275fd0acd049ddeb31a34f56e1268806db5c5b65371afa9c29';
export const MENU_LAZY_MEMBERS=Object.freeze([
  'projects/ngx-material-legacy/legacy-menu/menu.ts',
  'projects/ngx-material-legacy/legacy-menu/menu-trigger.ts',
  'projects/ngx-material-legacy/legacy-menu/menu-content.ts',
  'projects/ngx-material-legacy/legacy-menu/menu.html',
  'projects/ngx-material-legacy/legacy-menu/menu.scss',
  'projects/ngx-material-legacy/legacy-menu/menu.spec.ts',
  'projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts',
  'projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts',
  'projects/ngx-material-legacy/legacy-menu/internal/menu-content-base.ts',
  'projects/ngx-material-legacy/legacy-menu/internal/menu-panel.ts',
  'projects/ngx-material-legacy/legacy-core/internal/motion-event.ts',
  'compatibility/rc/menu-overlay-exit-original-trigger.ts.gz',
  'compatibility/rc/menu-overlay-exit-original-animations.ts.gz',
  'compatibility/rc/menu-overlay-exit-source-proof.json',
  'compatibility/rc/menu-overlay-exit-accepted-protocol.json',
  'compatibility/rc/menu-overlay-exit-native-accepted.json',
  'scripts/native-motion-consumer.ts','scripts/native-motion-roster.mjs', ...producerMembers,
]);
export const TOOLTIP_CONTAINER_SHA='68b267dd59f3addf92a3b9f8ce9e8baa479df7f4';
export const TOOLTIP_CONTAINER_PATCH='18b8d7b47b2f26e04cf1d50df6cc26d773af0cb8760c9f1015487e4af356cd90';
export const TOOLTIP_CONTAINER_MEMBERS=Object.freeze([
  'projects/ngx-material-legacy/legacy-tooltip/tooltip.ts',
  'projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts',
  'projects/ngx-material-legacy/legacy-tooltip/tooltip.html',
  'projects/ngx-material-legacy/legacy-tooltip/tooltip.scss',
  'projects/ngx-material-legacy/legacy-tooltip/tooltip.spec.ts',
  'reference/material-16.2.14/tooltip-render-sources/tooltip.ts',
  'compatibility/rc/dialog-public-container-peer-sources/cdk-21.2.14-portal.mjs',
  'compatibility/rc/dialog-public-container-peer-sources/cdk-21.2.14-_portal-directives-chunk.d.ts',
  'compatibility/rc/dialog-public-container-peer-sources/cdk-22.1.7-portal.mjs',
  'compatibility/rc/dialog-public-container-peer-sources/cdk-22.1.7-_portal-directives-chunk.d.ts', ...producerMembers,
]);
export const CHIP_BACKSPACE_SHA='46bcc21cbc19ff8ec946485febf70a85146f1026';
export const CHIP_SEPARATOR_SHA='5153a5cd4bdd69649f07ba6596cad56bfd9eb2b1';
const chipKeyboardCases=[
  ['packed-consumer/harness/chip-input-backspace-release','chipBackspaceRelease'],
  ['packed-consumer/harness/chip-repeated-removal-and-separator','chipRepeatedEvents'],
];
export const CHIP_KEYBOARD_MEMBERS=Object.freeze([
  'projects/ngx-material-legacy/legacy-chips/chip-input.ts',
  'projects/ngx-material-legacy/legacy-chips/chip.ts',
  'projects/ngx-material-legacy/legacy-chips/chip-list.spec.ts',
  ...['chip-input.ts','chip.ts','chip-list.spec.ts','provenance.json'].map(path=>'reference/material-16.2.14/chips-keyboard-sources/'+path),
  'scripts/check-upstream-audit-disposition.mjs','scripts/upstream-packed-run-evidence.mjs',...producerMembers,
]);
const scopes = new Map([
  [SELECT_FOCUS_SHA, {patch: SELECT_FOCUS_PATCH, kind: 'select-focus-before-click', members: SELECT_FOCUS_MEMBERS,
    caseId: SELECT_FOCUS_CLICK_CASE_ID, harness: 'selectFocusClick', evaluate: packedSelectFocusClickCase}],
  [SELECT_DETACH_SHA, {patch: SELECT_DETACH_PATCH, kind: 'select-close-on-real-scroll-detach', members: SELECT_DETACH_MEMBERS,
    caseId: SELECT_DETACH_CASE_ID, harness: 'selectScrollDetach', evaluate: packedSelectDetachCase}],
  [TABLE_ONPUSH_SHA, {patch: TABLE_ONPUSH_PATCH, kind: 'table-no-data-row-on-push', members: TABLE_ONPUSH_MEMBERS,
    caseId: TABLE_ONPUSH_CASE_ID, harness: 'tableOnPushRendering', evaluate: packedTableOnPushCase}],
  [CHIP_DISABLED_SHA,{patch:CHIP_DISABLED_PATCH,kind:'chip-disabled-own-input-isolation',members:CHIP_DISABLED_MEMBERS,
    caseId:CHIP_DISABLED_CASE_ID,harness:'chipDisabledObservation',legacyField:'chipDisabledIsolation',evaluate:packedChipDisabledCase}],
  [MENU_LAZY_SHA,{patch:MENU_LAZY_PATCH,kind:'menu-lazy-owned-view-detach',members:MENU_LAZY_MEMBERS,
    caseId:MENU_LAZY_CASE_ID,harness:'menuLazyObservation',legacyField:'lazyMenuLifecycle',evaluate:packedMenuLazyCase}],
  [TOOLTIP_CONTAINER_SHA,{patch:TOOLTIP_CONTAINER_PATCH,kind:'tooltip-eager-view-container',members:TOOLTIP_CONTAINER_MEMBERS,
    caseId:TOOLTIP_CONTAINER_CASE_ID,harness:'tooltipContainerObservation',legacyField:'tooltipOriginalEagerDependencies',evaluate:packedTooltipContainerCase}],
  [CHIP_BACKSPACE_SHA,{patch:'83a4860a58a3fb63c5f26224735f2c0dbe7834d50889693f0468ba27796ee036',
    kind:'original-chip-keyup-backspace-state',members:CHIP_KEYBOARD_MEMBERS,keyboard:true}],
  [CHIP_SEPARATOR_SHA,{patch:'7be37f5426716aafd2a70dcaed7730abf6af48a625da0120252c819c7627e67e',
    kind:'original-chip-repeated-separator-events',members:CHIP_KEYBOARD_MEMBERS,keyboard:true}],
]);
/** Read-only finite metadata for individual source review and focused validation. */
export function artifactBehaviorRequirements(sha){
  const row=scopes.get(sha);
  return row?{sha,patch:row.patch,kind:row.kind,case_ids:row.keyboard?chipKeyboardCases.map(([id])=>id):[row.caseId],members:[...row.members],
    harness:row.keyboard?chipKeyboardCases.map(([,field])=>field):row.harness,legacy_field:row.legacyField||null}:null;
}
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const demand = (value, message) => { if (!value) throw new Error(message); };
const sameIds = (actual, expected) => Array.isArray(actual) && actual.length === expected.length
  && new Set(actual).size === actual.length && actual.every(id => expected.includes(id));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

/** Exact historical implementation and assertion, independent of current peers.
 * Source hashes alone cannot authorize transplanting modern repeat semantics. */
function originalChipKeyboardSource(root){
  const base='reference/material-16.2.14/chips-keyboard-sources/';
  const pins={
    'chip-input.ts':'8970d734fc5404e9e54341a21bea9753311ed3447f415006ac41234ca9890680',
    'chip.ts':'a3809031dbb69a835b3766f2af6052073939bab62a70161fe57e39260377fe5a',
    'chip-list.spec.ts':'a64a9468dd842c9a944c381b466d135497baa7d25f1d7503b5a1aefd0e363053',
  };
  const originals=Object.fromEntries(Object.entries(pins).map(([path,pin])=>{
    const bytes=readEvidenceMember(root,base+path);demand(hash(bytes)===pin,'changed original chip keyboard source');return [path,bytes.toString()];
  }));
  const read=name=>readEvidenceMember(root,'projects/ngx-material-legacy/legacy-chips/'+name).toString();
  let candidate=read('chip-input.ts'),expected=originals['chip-input.ts'];
  const replaceOnce=(text,before,after)=>{demand(text.split(before).length===2,'changed original chip input transform');return text.replace(before,after);};
  candidate=replaceOnce(candidate,' * Copyright (c) 2026 Ryan Lester.\n','');
  candidate=replaceOnce(candidate,"import {coerceBooleanProperty} from '@angular/cdk/coercion';\ntype BooleanInput = string | boolean | null | undefined;","import {BooleanInput, coerceBooleanProperty} from '@angular/cdk/coercion';");
  expected=replaceOnce(expected,'@Directive({','@Directive({\n  standalone: false,');
  for(const declaration of ['MatChipInputEvent','MatChipInput'])expected=replaceOnce(expected,
    ' * @deprecated Use `'+declaration+'` from `@angular/material/chips` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.\n * @breaking-change 17.0.0\n','');
  demand(candidate===expected,'changed original chip input algorithm or API');
  const method=text=>{const matches=[...text.matchAll(/^  _handleKeydown\(event: KeyboardEvent\)(?:\s*:\s*void)?\s*\{[\s\S]*?^  }/gm)];demand(matches.length===1,'missing original chip keydown handler');return matches[0][0];};
  demand(method(read('chip.ts'))===method(originals['chip.ts']),'changed original chip repeated-removal handler');
  const begin="        it(\n          'should not focus the last chip when pressing BACKSPACE after changing input, '",
    end="        it('should focus last chip after pressing BACKSPACE after creating a chip'";
  const assertion=text=>{const start=text.indexOf(begin),finish=text.indexOf(end,start);demand(start>=0&&finish>start,'missing original chip keyup assertion');return text.slice(start,finish);};
  demand(assertion(read('chip-list.spec.ts'))===assertion(originals['chip-list.spec.ts']),'changed original chip keyup assertion');
}

/** Registered subjects cannot fall back to a generic proof kind. */
export function requiresArtifactBehavior(entry, proof) {
  return scopes.has(entry?.sha) || proof?.proof_kind === ARTIFACT_BEHAVIOR_KIND
    || (object(proof) && Object.hasOwn(proof, 'artifact_behavior'));
}

/** Finite source-reviewed case requirements; no caller-defined case predicate. */
export function validateArtifactBehavior({root, entry, proof, request}) {
  try {
    const registered = scopes.get(entry?.sha);
    demand(registered && proof?.proof_kind === ARTIFACT_BEHAVIOR_KIND
      && proof.diff_sha256 === registered.patch, 'unregistered artifact behavior subject');
    const scope = proof.artifact_behavior;
    demand(object(scope) && scope.kind === registered.kind
      && sameIds(scope.case_ids, registered.keyboard?chipKeyboardCases.map(([id])=>id):[registered.caseId]), 'wrong artifact behavior scope');
    demand(Array.isArray(scope.source_members)
      && sameIds(scope.source_members.map(row => row?.path), registered.members), 'incomplete reviewed source scope');
    for (const row of scope.source_members) {
      demand(/^[0-9a-f]{64}$/.test(row.sha256) && hash(readEvidenceMember(root, row.path)) === row.sha256, 'stale reviewed source member');
    }
    if(registered.keyboard){
      const line=request?.line??proof.affected_branches?.[0];
      demand(entry.final_disposition==='do-not-adopt'&&['main','21.x'].includes(line)
        &&isDeepStrictEqual(proof.affected_branches,[line]),'wrong original chip decision or source branch');
      originalChipKeyboardSource(root);
    }
    if (entry.sha === TABLE_ONPUSH_SHA) {
      const line = request?.line ?? proof.affected_branches?.[0];
      const version = line === 'main' ? '22.1.7' : line === '21.x' ? '21.2.14' : null;
      const path = `compatibility/rc/table-public-module-sources/cdk-${version}-table.mjs`;
      const installed = proof.installed_member, behavior = proof.reachable_behavior;
      demand(version && installed?.package === '@angular/cdk' && installed.version === version
        && installed.path === path && installed.member === 'CdkTable._updateNoDataRow'
        && installed.sha256 === hash(readEvidenceMember(root, path)), 'wrong branch installed table member');
      demand(behavior?.kind === 'executed-delegation' && behavior.id === TABLE_ONPUSH_CASE_ID,
        'wrong required public table delegation');
    }
    const runtime = validatePackedConsumerRun({root, request});
    demand(runtime.ok, runtime.detail);
    const selected = runtime.observation.cases.find(row => row.case_id === registered.caseId);
    const harness = runtime.observation.extra?.harness;
    if(registered.keyboard){
      demand(harness?.ok===true&&chipKeyboardCases.every(([id,field])=>harness[field]===true
        &&runtime.observation.cases.find(row=>row.case_id===id)?.legacy_harness_passed===true),
      'insufficient original chip keyboard observations');
    } else if (entry.sha === SELECT_FOCUS_SHA) {
      demand(selected?.legacy_harness_passed === true && harness?.selectOpened === true && harness.selectClosed === true
        && harness.viewportShared === true && isDeepStrictEqual(harness.selectFocusClick, selected.observation)
        && packedSelectFocusClickCase(selected.observation).result === 'pass', 'insufficient select focus/click observations');
    } else if (registered.legacyField) {
      demand(selected?.legacy_harness_passed === true && harness?.[registered.legacyField] === true
        && isDeepStrictEqual(harness?.[registered.harness], selected.observation)
        && registered.evaluate(selected.observation).result === 'pass', 'insufficient ' + registered.kind + ' observations');
    } else {
      demand(selected && isDeepStrictEqual(harness?.[registered.harness], selected.observation)
        && registered.evaluate(selected.observation).result === 'pass', 'insufficient ' + registered.kind + ' observations');
    }
    return {ok: true, detail: 'Required behavior observed in this run; complete G11 judgment and final sealing remain separate.',
      invocation_id: runtime.invocation_id, output: runtime.output, library: runtime.library};
  } catch (error) {
    return {ok: false, detail: error.message};
  }
}
