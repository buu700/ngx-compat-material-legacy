/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {gunzipSync} from 'node:zlib';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {validateBrowserMatrixRun} from './upstream-browser-run-evidence.mjs';
import {formFieldStateTokensOkay} from './form-field-state-style-observation.mjs';
export const FORM_FIELD_HOVER_SHA = 'cf456a2d43837497367662e7de22f1b2bcbf4f00';
export const FORM_FIELD_HOVER_KIND = 'browser-required-individual-form-field-hover';
const patch = 'e2ca404fabad6af81c12ef841957e5d3a05a9439627b3302751baccde7ec9d69';
const peers = {
  main: {version: '22.1.7', path: 'compatibility/rc/form-field-hover-followup-peer-members/8796ccc010d8fa1862a78c3a799af465b989fecf19a90fb0a8859079a4777d85.mjs.gz',
    sha256: '8796ccc010d8fa1862a78c3a799af465b989fecf19a90fb0a8859079a4777d85', stored_sha256: '72202b1ccb60a18c41ddfa45fb5cd6a545f56ce1b20b4b58bb9cb2e7379ffd46', bytes: 126113},
  '21.x': {version: '21.2.14', path: 'compatibility/rc/form-field-hover-followup-peer-members/1981af655b978abbf4deab909488ced158784242564d5f3709bf6d3de285bc39.mjs.gz',
    sha256: '1981af655b978abbf4deab909488ced158784242564d5f3709bf6d3de285bc39', stored_sha256: 'db9d7950822bb042d5c34776cdbfe128ff2d06d4667552ab4654e89950d572a2', bytes: 126438},
};
const members = [
  'scripts/upstream-form-field-hover-evidence.mjs', 'scripts/upstream-browser-run-evidence.mjs', 'scripts/upstream-packed-run-evidence.mjs',
  'scripts/check-upstream-audit-disposition.mjs', 'scripts/rc-verify.py', 'scripts/packed-consumer-evidence.mjs',
  'scripts/browser-matrix-acceptance.mjs', 'scripts/browser-matrix-roster.mjs', 'scripts/browser-required-cells.mjs',
  'scripts/browser-surface-families.mjs', 'scripts/form-field-state-style-observation.mjs', 'scripts/sass-form-field-state-contract.mjs',
  'compatibility/rc/matrices/full-verify.json', 'compatibility/rc/matrices/library-exports.json', 'testing/legacy-runner/historical-inventory.json',
  'projects/ngx-material-legacy/package.json', 'projects/ngx-material-legacy/styles/form-field/_form-field-focus-overlay.scss',
  'projects/ngx-material-legacy/styles/form-field/_form-field-theme.scss', 'projects/ngx-material-legacy/styles/legacy-form-field/_form-field-theme.scss',
  'projects/ngx-material-legacy/legacy-form-field/form-field.html',
  'reference/material-16.2.14/error-helper-sources/form-field-focus-overlay.scss',
];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const demand = (value, message) => {if (!value) throw new Error(message);};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sameIds = (actual, expected) => Array.isArray(actual) && actual.length === expected.length
  && new Set(actual).size === actual.length && actual.every(id => expected.includes(id));
export function formFieldHoverRequirements(sha, line) {
  const peer = Object.hasOwn(peers, line) ? peers[line] : null;
  return sha === FORM_FIELD_HOVER_SHA && peer ? structuredClone({sha, patch, kind: 'historical-exported-form-field-host-hover',
    members: [...members, peer.path], runtimes: ['zoneful', 'zoneless'], themes: ['peer-form-hover', 'peer-form-hover-dark'],
    installed_member: {package: '@angular/material', version: peer.version, path: peer.path, sha256: peer.sha256, member: 'MatFormField structural styles'}}) : null;
}
export function requiresFormFieldHover(entry, proof) {
  return entry?.sha === FORM_FIELD_HOVER_SHA || proof?.proof_kind === FORM_FIELD_HOVER_KIND
    || (object(proof) && Object.hasOwn(proof, 'form_field_hover_behavior'));
}
const pointOkay = value => object(value) && ['x', 'y', 'width', 'height'].every(key => typeof value[key] === 'number' && Number.isFinite(value[key]))
  && value.width > 0 && value.height > 0;
/** Authentic historical host hover remains visible over the hint. All states,
 * both ink tones, actual pointer targets and token consumption are required. */
export function formFieldHoverObservedOkay(row, compiledCssSha256) {
  const scenarios = row?.state_token_scenarios;
  if (row?.hover_media !== true || row.state_tokens_okay !== true || !/^[0-9a-f]{64}$/.test(compiledCssSha256 ?? '')
    || row.compiled_theme_css_sha256 !== compiledCssSha256 || !formFieldStateTokensOkay(scenarios)) return false;
  const fields = ['present', 'overlay_present', 'host_hovered', 'wrapper_hovered', 'focused', 'opacity',
    'background_color', 'state_layer_color', 'hover_token', 'focus_token'];
  if (!['baseline', 'wrapper', 'hint'].every(stage => fields.every(field => row[stage]?.[field] === scenarios[0][stage][field]))) return false;
  return [row, ...scenarios].every(context => pointOkay(context.wrapper?.point) && pointOkay(context.hint?.point)
    && (context.wrapper.point.x !== context.hint.point.x || context.wrapper.point.y !== context.hint.point.y));
}
/** No source diagnostic, boolean label or controlled wrong token admits this
 * SHA. Native execution through the exact packed exported Sass stays required. */
export function validateFormFieldHover({root, entry, proof, request}) {
  try {
    const line = request?.line ?? proof?.affected_branches?.[0], registered = formFieldHoverRequirements(entry?.sha, line);
    const scope = proof?.form_field_hover_behavior;
    demand(registered && proof?.proof_kind === FORM_FIELD_HOVER_KIND && proof.diff_sha256 === patch, 'unregistered form-field hover subject');
    demand(object(scope) && scope.kind === registered.kind && isDeepStrictEqual(scope.runtimes, registered.runtimes)
      && isDeepStrictEqual(scope.themes, registered.themes), 'wrong form-field hover scope');
    demand(isDeepStrictEqual(proof.affected_branches, [line]) && isDeepStrictEqual(proof.installed_member, registered.installed_member), 'wrong form-field hover installed member');
    demand(Array.isArray(scope.source_members) && sameIds(scope.source_members.map(row => row?.path), registered.members), 'incomplete form-field hover source scope');
    for (const member of scope.source_members) demand(/^[0-9a-f]{64}$/.test(member.sha256)
      && hash(readEvidenceMember(root, member.path)) === member.sha256, 'stale form-field hover source member');
    const peer = peers[line], stored = readEvidenceMember(root, peer.path); demand(hash(stored) === peer.stored_sha256, 'wrong form-field hover peer bytes');
    const raw = gunzipSync(stored); demand(raw.length === peer.bytes && hash(raw) === peer.sha256, 'wrong form-field hover peer source');
    const browser = validateBrowserMatrixRun({root, request}); demand(browser.ok, browser.detail);
    for (const runtime of registered.runtimes) {
      const observed = browser.observation.closeout_diagnostics[runtime].observation;
      demand(formFieldHoverObservedOkay(observed.peer_form_hover, observed.progress_csp?.compiled_css_sha256), 'insufficient ' + runtime + ' form-field hover observations');
    }
    return {ok: true, detail: 'Both runtime modes consumed the packed historical exported Sass with exact light/dark host-hover/focus states, real pointer targets, token mutation and restoration. Full Sass/other styles, floors and G11 remain separate.',
      invocation_id: browser.invocation_id, output: browser.output, library: browser.library, packed_consumer: browser.packed_consumer,
      required_runtimes: registered.runtimes, required_themes: registered.themes};
  } catch (error) {return {ok: false, detail: error.message};}
}
