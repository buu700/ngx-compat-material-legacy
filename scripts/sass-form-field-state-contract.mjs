/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Six finite cases: untouched16 CSS plus a public three-token rule at the color boundary. */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {measureM2PeerProgram, peerMeasurementMatches} from './sass-current-companion-peer.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const catalog = JSON.parse(readFileSync(new URL('../fixtures/sass/form-field-state-contracts.json', import.meta.url)));
const oracleRaw = readFileSync(new URL('../compatibility/rc/oracles/material-16.2.14-sass-api.json', import.meta.url));
const argumentsRaw = readFileSync(new URL('../fixtures/sass/mixin-argument-contracts.json', import.meta.url));
const oracle = JSON.parse(oracleRaw), argumentsCatalog = JSON.parse(argumentsRaw);
const defaults = ['mixin-css/form-field-color', 'mixin-css/form-field-theme'];
const argumentProbes = argumentsCatalog.cases.filter(p => ['form-field-color', 'form-field-theme'].includes(p.mixin));
const ids = [...defaults, ...argumentProbes.map(p => p.case_id)];
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
if (catalog.schema_version !== 1 || catalog.oracle_sha256 !== sha(oracleRaw)
    || catalog.argument_catalog_sha256 !== sha(argumentsRaw)
    || !equal(Object.keys(catalog.cases).sort(), ids.sort()) || argumentProbes.length !== 4)
  throw Error('finite form-field state roster or immutable inputs changed');

export const FORM_FIELD_STATE_CONTRACT = 'historical-form-field-css-with-public-state-tokens';
export const FORM_FIELD_STATE_DEFAULT_CASES = Object.freeze(Object.fromEntries(defaults.map(id => [id, catalog.cases[id]])));
export const FORM_FIELD_STATE_ARGUMENT_CASES = Object.freeze(Object.fromEntries(argumentProbes.map(p => [p.case_id, catalog.cases[p.case_id]])));

export function formFieldStatePeerProgram(id) {
  const e = Object.hasOwn(catalog.cases, id) ? catalog.cases[id] : null;
  return e ? "@use '@angular/material' as peer;\n" + e.scope
    + ' {\n@include peer.form-field-overrides((state-layer-color: ' + e.values.ink
    + ', hover-state-layer-opacity: ' + e.values.hover + ', focus-state-layer-opacity: ' + e.values.focus + '));\n}\n' : null;
}
for (const [id, e] of Object.entries(catalog.cases)) {
  const probe = argumentProbes.find(p => p.case_id === id), isDefault = defaults.includes(id);
  const name = isDefault ? id.slice(10) : probe.mixin;
  const argument = isDefault ? '$__theme' : probe.argument;
  const scope = isDefault ? '.sass-api-probe' : '.sass-argument-probe';
  const call = isDefault ? `${scope} { @include m.${name}(${argument}); }` : probe.call;
  const setup = isDefault ? oracle.standard_theme : argumentsCatalog.setup;
  const program = "@use '__entry__' as m;\n" + setup + '\n' + call + '\n';
  const colorProgram = "@use '__entry__' as m;\n" + setup + '\n' + scope + ' { @include m.form-field-color(' + argument + '); }\n';
  const dark = id.endsWith('/custom-dark-theme');
  const values = {ink: dark ? 'rgba(255, 255, 255, 0.87)' : 'rgba(0, 0, 0, 0.87)', hover: dark ? '0.08' : '0.04', focus: dark ? '0.24' : '0.12'};
  if (e.kind !== (isDefault ? 'default' : 'argument') || e.name !== name || e.dimension !== name.slice(11)
      || e.scope !== scope || e.argument !== argument || e.call !== call || !equal(e.values, values)
      || e.original.program_sha256 !== sha(program) || e.color.program_sha256 !== sha(colorProgram)
      || ![e.original, e.color].every(m => typeof m.css === 'string' && sha(m.css) === m.css_sha256 && Buffer.byteLength(m.css) === m.css_bytes)
      || !e.original.css.startsWith(e.color.css) || e.separator !== '\n' || e.after_separator !== (e.dimension === 'theme' ? '\n' : '')
      || e.peer_program !== formFieldStatePeerProgram(id)
      || !equal(Object.keys(e.peers).sort(), ['21.x', 'main'])
      || Object.values(e.peers).some(p => p.program_sha256 !== sha(e.peer_program) || sha(p.css) !== p.css_sha256 || Buffer.byteLength(p.css) !== p.css_bytes))
    throw Error('finite form-field original, insertion or peer recipe changed: ' + id);
  if (isDefault) {
    const inv = oracle.members.mixins[name].invocation;
    if (e.original.css_sha256 !== inv.css_sha256 || e.original.css_bytes !== inv.css_bytes)
      throw Error('original default form-field golden changed');
  } else if (['case_id', 'mixin', 'variant', 'argument', 'call'].some(key => e[key] !== probe[key]))
    throw Error('original form-field argument probe changed');
}
const peerSourceSets = Object.fromEntries(Object.entries(catalog.peer_inputs).map(([line, sources]) => [line, new Set(sources.map(s => JSON.stringify([s.root, s.path, s.sha256, s.bytes])))]));
export function measureFormFieldStatePeer(options) {
  const program = formFieldStatePeerProgram(options.caseId);
  if (program === null) throw Error('unknown form-field state case');
  return measureM2PeerProgram({...options, program});
}
export function formFieldStateExpectedCss(id, original, peer) {
  const e = Object.hasOwn(catalog.cases, id) ? catalog.cases[id] : null;
  const floor = e?.peers[peer?.line], sourceSet = Object.hasOwn(peerSourceSets, peer?.line) ? peerSourceSets[peer.line] : null;
  if (!floor || !sourceSet || typeof original?.css !== 'string' || original.css !== e.original.css
      || original.css_sha256 !== e.original.css_sha256 || original.css_bytes !== e.original.css_bytes
      || !peerMeasurementMatches(peer, formFieldStatePeerProgram(id), {})
      || peer.css !== floor.css || peer.css_sha256 !== floor.css_sha256 || peer.css_bytes !== floor.css_bytes
      || peer.sources.length !== sourceSet.size
      || peer.sources.some(s => !sourceSet.has(JSON.stringify([s.root, s.path, s.sha256, s.bytes])))) return null;
  return e.color.css + e.separator + peer.css + e.after_separator + original.css.slice(e.color.css.length);
}
export function formFieldStateArgumentResultsMatch(id, original, actual, peer) {
  if (!Object.hasOwn(FORM_FIELD_STATE_ARGUMENT_CASES, id)) return false;
  const expected = formFieldStateExpectedCss(id, original, peer);
  return expected !== null && actual?.css === expected && actual.css_sha256 === sha(actual.css)
    && actual.css_bytes === Buffer.byteLength(actual.css);
}
export function formFieldStateDefaultMeasurementOk(id, m, line) {
  const e = Object.hasOwn(FORM_FIELD_STATE_DEFAULT_CASES, id) ? FORM_FIELD_STATE_DEFAULT_CASES[id] : null;
  if (!e || !peerSourceSets[line] || m?.line !== line || m.program_sha256 !== e.original.program_sha256
      || typeof m.css !== 'string' || m.css_sha256 !== sha(m.css) || m.css_bytes !== Buffer.byteLength(m.css)
      || typeof m.sass_version !== 'string' || !m.sass_version.startsWith('dart-sass\t1.104.1\t')) return false;
  const ss = m.sources;
  if (!Array.isArray(ss) || !ss.length || ss.some(s => !Number.isInteger(s.root) || ![0, 1, 2].includes(s.root)
      || typeof s.path !== 'string' || !s.path || s.path.startsWith('/') || s.path.includes('\\') || s.path.split('/').includes('..')
      || !/^[0-9a-f]{64}$/.test(s.sha256) || !Number.isInteger(s.bytes) || s.bytes < 1)
      || new Set(ss.map(s => `${s.root}/${s.path}`)).size !== ss.length) return false;
  return ['_index.scss', 'styles/bridges/_form-field-state-overrides.scss', 'styles/form-field/_form-field-theme.scss',
    'styles/form-field/_form-field-focus-overlay.scss', 'styles/core/theming/_theming.scss'].every(path => ss.some(s => s.root === 0 && s.path === path));
}
export function formFieldStateDefaultResultsMatch(id, actual, contract) {
  const e = Object.hasOwn(FORM_FIELD_STATE_DEFAULT_CASES, id) ? FORM_FIELD_STATE_DEFAULT_CASES[id] : null;
  if (!e || contract?.classification !== 'conforming-current-companion' || contract.contract !== FORM_FIELD_STATE_CONTRACT
      || !formFieldStateDefaultMeasurementOk(id, actual?.actual_measurement, contract.peer?.line)) return false;
  const expected = formFieldStateExpectedCss(id, e.original, contract.peer);
  return expected !== null && actual.css === expected && actual.actual_measurement.css === expected && actual.sha256 === sha(expected);
}

// Only modern aggregate names call the changed ordinary form-field mixin.
// The complete historical color prefix must occur once in the existing whole
// aggregate model. No candidate CSS is searched, stripped or normalized.
export const FORM_FIELD_STATE_AGGREGATE_CASES = Object.freeze({
  'mixin-css/all-component-colors': 'mixin-css/form-field-color',
  'mixin-css/all-component-themes': 'mixin-css/form-field-theme',
  'mixin-argument/all-component-colors/custom-full-theme': 'mixin-argument/form-field-color/custom-full-theme',
  'mixin-argument/all-component-colors/raw-color-config': 'mixin-argument/form-field-color/raw-color-config',
  'mixin-argument/all-component-themes/custom-full-theme': 'mixin-argument/form-field-theme/custom-full-theme',
  'mixin-argument/all-component-themes/custom-dark-theme': 'mixin-argument/form-field-theme/custom-dark-theme',
});
export function insertFormFieldStateInAggregate(id, css, peer) {
  if (!Object.hasOwn(FORM_FIELD_STATE_AGGREGATE_CASES, id) || typeof css !== 'string'
      || !Object.hasOwn(catalog.peer_inputs, peer?.line)) return null;
  const e = catalog.cases[FORM_FIELD_STATE_AGGREGATE_CASES[id]], floor = e.peers[peer.line];
  // The caller already authenticates its complete aggregate peer program and
  // contribution. Additionally require the exact public state API's sources,
  // which are loaded by that same floor's public Material barrel.
  const paths = ['_index.scss', 'form-field/_form-field-theme.scss', 'form-field/_m3-form-field.scss', 'core/tokens/_token-utils.scss'];
  const required = Object.fromEntries(paths.map(path => {
    const s = catalog.peer_inputs[peer.line].find(s => s.root === 0 && s.path === path);
    if (!s) throw Error('authenticated form-field state source missing');
    return [path, [s.sha256, s.bytes]];
  }));
  if (!peerMeasurementMatches(peer, peer.program, required) || css.split(e.color.css).length !== 2) return null;
  const at = css.indexOf(e.color.css) + e.color.css.length, suffix = css.slice(at);
  return css.slice(0, at) + e.separator + floor.css + (suffix ? '\n' : '') + suffix;
}
