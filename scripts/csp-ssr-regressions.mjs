#!/usr/bin/env node
/**
 * Negatives for csp-ssr. Does not launch a browser or render on the server.
 * A missing nonce, an inline style or script the policy would block, a
 * client-only render presented as SSR, dirty source, and an unbound artifact
 * must be rejected.
 */
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCase, deriveMainRoster, observationProblems, samplePass, PUBLIC_ENTRIES, RENDER_FAMILIES} from './csp-ssr-roster.mjs';
import {CSP_SSR_MARKER, parseCspSsrStdout, serverObservation, serverOverlayOpen} from './csp-ssr-run.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
function expect(name, condition) {
  if (!condition) failures.push(name);
}

const roster = deriveMainRoster();
expect('no safari id', roster.ids.every(id => !id.includes('safari')));
expect('no hydration id', roster.ids.every(id => !id.includes('hydration')));
expect('chromium only for nonce', roster.groups['nonce-and-negative'].every(id => id.split('/')[2] === 'chromium'));
expect('server group has every public entry', PUBLIC_ENTRIES.every(entry => roster.ids.includes(`csp-ssr/21.x/server/dom-free-server-and-leaks/import/${entry}`)));
expect('server group has every testing entry', PUBLIC_ENTRIES.every(entry => roster.ids.includes(`csp-ssr/21.x/server/dom-free-server-and-leaks/testing/${entry}`)));
expect('render families', RENDER_FAMILIES.every(family => roster.ids.includes(`csp-ssr/21.x/server/dom-free-server-and-leaks/render/${family}`)));
expect('hydration unclaimed', roster.notApplicable.some(item => item.claim === 'hydration'));
expect('safari not applicable', roster.notApplicable.some(item => item.engine === 'safari'));

const page = readFileSync(join(root, 'scripts/csp-ssr-consumer.ts'), 'utf8');
expect('page has no unsafe-inline', !page.includes('unsafe-inline'));
expect('page reads the nonce token', page.includes('CSP_NONCE'));

const matrix = JSON.parse(readFileSync(join(root, 'compatibility/rc/matrices/full-verify.json'), 'utf8'));
const row = matrix.checks.find(item => item.check_id === 'csp-ssr');
expect('matrix21 roster', JSON.stringify(row.acceptance.cases_by_line['21.x']) === JSON.stringify(roster.groups));
expect('opposite main line stays null', Object.values(row.acceptance.cases_by_line.main).every(value => value === null));
expect('implemented', row.implemented === true);

const goodOutcomes = roster.ids.map(id => ({id, ok: true, observation: samplePass(id), evidence: 'observed'}));
const good = observationProblems({
  requiredIds: roster.ids, outcomes: goodOutcomes, sourceClean: true, artifactSha: 'abc', boundSha: 'abc', chromiumLaunched: true,
});
expect('clean observation', good.problems.length === 0 && good.skipped.length === 0);

function withOne(id, mutate) {
  return goodOutcomes.map(item => item.id === id ? {...item, observation: {...item.observation, ...mutate(item.observation)}} : item);
}
function problems(id, mutate, extra = {}) {
  return observationProblems({
    requiredIds: roster.ids,
    outcomes: withOne(id, mutate),
    sourceClean: true,
    artifactSha: 'abc',
    boundSha: 'abc',
    chromiumLaunched: true,
    ...extra,
  }).problems.join('\n');
}

const correct = roster.ids.find(id => id.endsWith('/dialog/correct-nonce'));
const spinnerCorrect = roster.ids.find(id => id.endsWith('/progress-spinner/correct-nonce'));
const dialogWrong = roster.ids.find(id => id.endsWith('/dialog/wrong-nonce'));
const missing = roster.ids.find(id => id.endsWith('/progress-spinner/missing-nonce'));
const inlineScript = roster.ids.find(id => id.endsWith('/policy/unapproved-inline-script'));
const inlineStyle = roster.ids.find(id => id.endsWith('/policy/unapproved-inline-style'));
const render = roster.ids.find(id => id.endsWith('/render/dialog-host'));

expect('missing nonce', problems(missing, () => ({styleSrcViolations: 0, spinnerRules: 1, spinnerNonce: 'policy', stylesWithPolicyNonce: 1})).includes('missing nonce'));
expect('dialog does not borrow the spinner style', problems(correct, () => ({spinnerRules: 0, spinnerNonce: ''})) === '');
expect('spinner dynamic style', problems(spinnerCorrect, () => ({spinnerRules: 0, spinnerNonce: ''})).includes('dynamic style was not nonce-approved'));
expect('rejected nonce is the surface nonce', problems(dialogWrong, () => ({rejectedStyles: 0})).includes('wrong nonce was not the rejected nonce'));
const closedMenu = '<style>.mat-menu-panel { color: red; }</style><button id="menu-host">Menu</button>';
const openMenu = `${closedMenu}<div class="mat-menu-panel" role="menu"></div>`;
expect('stylesheet is not an open menu', serverOverlayOpen(closedMenu, ['mat-menu-panel']) === false);
expect('panel element is an open menu', serverOverlayOpen(openMenu, ['mat-menu-panel']) === true);
expect('blocked inline style', problems(inlineStyle, () => ({inlineStyleApplied: true, styleSrcViolations: 0})).includes('inline style the policy would block'));
expect('blocked inline script', problems(inlineScript, () => ({inlineScriptRan: true, scriptSrcViolations: 0})).includes('inline script the policy would block'));
expect('client-only render', problems(render, () => ({clientOnly: true, documentBefore: 'object', renderedOnServer: true})).includes('client-only render presented as SSR'));
expect('unsafe-inline', problems(correct, () => ({unsafeInline: true})).includes('unsafe-inline'));
expect('dirty source', observationProblems({
  requiredIds: roster.ids, outcomes: goodOutcomes, sourceClean: false, artifactSha: 'abc', boundSha: 'abc', chromiumLaunched: true,
}).problems.includes('dirty source'));
expect('unbound artifact', observationProblems({
  requiredIds: roster.ids, outcomes: goodOutcomes, sourceClean: true, artifactSha: 'abc', boundSha: 'def', chromiumLaunched: true,
}).problems.includes('unbound artifact'));
expect('missing engine', observationProblems({
  requiredIds: roster.ids, outcomes: goodOutcomes, sourceClean: true, artifactSha: 'abc', boundSha: 'abc', chromiumLaunched: false,
}).problems.includes('missing required engine'));

const serverId = roster.ids.find(id => id.includes('/server/dom-free-server-and-leaks/import/'));
const frameBody = {
  timers: 0, documentBefore: 'undefined', windowBefore: 'undefined', documentAfter: 'undefined', windowAfter: 'undefined',
  exitCode: 0, renderedOnServer: false, serverImport: true, clientOnly: false, hydration: false, threw: false,
};
const framed = `npm warn before\n${CSP_SSR_MARKER}${JSON.stringify(frameBody)}\nchild log after\n`;
const parsed = parseCspSsrStdout(framed);
expect('marker length', CSP_SSR_MARKER.length === 10);
expect('frame with surrounding logs', parsed.ok === true && parsed.payload.timers === 0);
expect('missing frame', parseCspSsrStdout('no marker\n').error === 'missing-frame');
expect('truncated json', parseCspSsrStdout(`${CSP_SSR_MARKER}{"timers":`).error === 'malformed-json');
expect('invalid payload', parseCspSsrStdout(`${CSP_SSR_MARKER}{"timers":"none"}`).error === 'invalid-payload');
expect('conflicting frames', parseCspSsrStdout(`${CSP_SSR_MARKER}${JSON.stringify(frameBody)}\n${CSP_SSR_MARKER}${JSON.stringify({...frameBody, timers: 1})}`).error === 'conflicting-frames');
const missingObs = serverObservation({ok: false, error: 'missing-frame', code: 1});
expect('framing is not a timer leak', !('timers' in missingObs) && assertCase(serverId, missingObs).join(' ').includes('server observation missing-frame') && !assertCase(serverId, missingObs).join(' ').includes('leaked a timer'));
const exitObs = serverObservation({ok: true, payload: {...frameBody, timers: 0}, code: 1});
expect('exit failure stays an exit failure', assertCase(serverId, exitObs).join(' ').includes('exit was not successful') && !assertCase(serverId, exitObs).join(' ').includes('leaked a timer'));
const leakObs = serverObservation({ok: true, payload: {...frameBody, timers: 1}, code: 0});
expect('retained timer still fails', assertCase(serverId, leakObs).join(' ').includes('leaked a timer'));

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`csp-ssr regressions passed (${roster.ids.length} cases)`);
