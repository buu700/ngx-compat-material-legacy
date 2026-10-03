#!/usr/bin/env node
/**
 * Negatives for native-motion. Does not launch a browser.
 * A detectChanges stand-in, zero-duration stylesheet, wrapper background,
 * missing engine, dirty source, or unbound artifact must be rejected.
 */
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  buttonsFor,
  deriveMainRoster,
  INTERRUPT_BUTTONS,
  MODE_BUTTONS,
  observationProblems,
  samplePass,
  ZERO_BUTTONS,
} from './native-motion-roster.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
function expect(name, condition) {
  if (!condition) failures.push(name);
}

const roster = deriveMainRoster();
expect('282 cases', roster.ids.length === 282);
expect('94 per engine', roster.perEngine.chromium === 94 && roster.perEngine.firefox === 94 && roster.perEngine.webkit === 94);
expect('138 enabled group', roster.perGroup['enabled-disabled-reduced'] === 138);
expect('66 interruption group', roster.perGroup['interruption-destruction'] === 66);
expect('78 notify group', roster.perGroup['exactly-once-notification'] === 78);
expect('no 21.x', roster.ids.every(id => id.split('/')[1] === 'main'));
expect('no safari id', roster.ids.every(id => !id.includes('safari')));
expect('safari is not applicable', roster.notApplicable.some(item => item.engine === 'safari' && /not Safari/.test(item.reason)));
expect('zero fake is not a case', roster.notApplicable.some(item => item.mode === 'zero' && /0ms override would be a fake/.test(item.reason)));

const page = readFileSync(join(root, 'scripts/native-motion-consumer.ts'), 'utf8');
expect('page has no detectChanges', !page.includes('.detectChanges(') && !page.includes('markForCheck('));
expect('page has no animations module', !page.includes('@angular/animations'));
for (const button of [...MODE_BUTTONS, ...ZERO_BUTTONS, ...INTERRUPT_BUTTONS]) {
  expect(`button ${button}`, page.includes(`id="${button}"`));
}
expect('enabled buttons', buttonsFor('modes', 'enabled').length === MODE_BUTTONS.length + ZERO_BUTTONS.length);
expect('reduced has no zero button', !buttonsFor('modes', 'reduced').some(button => button.includes('zero')));

const matrix = JSON.parse(readFileSync(join(root, 'compatibility/rc/matrices/full-verify.json'), 'utf8'));
const row = matrix.checks.find(item => item.check_id === 'native-motion');
expect('matrix main roster', JSON.stringify(row.acceptance.cases_by_line.main) === JSON.stringify(roster.groups));
expect('21.x null', Object.values(row.acceptance.cases_by_line['21.x']).every(value => value === null));
expect('implemented', row.implemented === true);

const goodEngines = {
  chromium: {launched: true, product: 'Chrome/128.0.0.0'},
  firefox: {launched: true, browserName: 'firefox', version: '157.0'},
  webkit: {launched: true, backend: 'webkitgtk', api: 'WebKit2-4.1', safari_certification: false, version: '2.52.6'},
};
const goodOutcomes = roster.ids.map(id => ({id, ok: true, observation: samplePass(id), evidence: 'observed'}));
const good = observationProblems({
  requiredIds: roster.ids, outcomes: goodOutcomes, engines: goodEngines, sourceClean: true, artifactSha: 'abc', boundSha: 'abc',
});
expect('clean observation', good.problems.length === 0 && good.skipped.length === 0);

function withOne(id, mutate) {
  return goodOutcomes.map(row => row.id === id ? {...row, observation: {...row.observation, ...mutate(row.observation)}} : row);
}
const enabledId = roster.ids.find(id => id.endsWith('/enabled-disabled-reduced/dialog/enabled'));
const zeroFake = observationProblems({
  requiredIds: roster.ids,
  outcomes: withOne(enabledId, () => ({durationMs: 0})),
  engines: goodEngines, sourceClean: true, artifactSha: 'abc', boundSha: 'abc',
});
expect('zero-duration CSS fake', zeroFake.problems.some(item => item.includes('zero-duration CSS fake')));

const standIn = observationProblems({
  requiredIds: roster.ids,
  outcomes: withOne(enabledId, () => ({detectChangesCalls: 1})),
  engines: goodEngines, sourceClean: true, artifactSha: 'abc', boundSha: 'abc',
});
expect('detectChanges stand-in', standIn.problems.some(item => item.includes('detectChanges stand-in')));

const wrapper = observationProblems({
  requiredIds: roster.ids,
  outcomes: withOne(enabledId, () => ({selector: 'body', selectorMatches: false})),
  engines: goodEngines, sourceClean: true, artifactSha: 'abc', boundSha: 'abc',
});
expect('wrapper background', wrapper.problems.some(item => item.includes('wrapper background is not component motion')));

const missing = observationProblems({
  requiredIds: roster.ids, outcomes: goodOutcomes,
  engines: {chromium: goodEngines.chromium, webkit: goodEngines.webkit},
  sourceClean: true, artifactSha: 'abc', boundSha: 'abc',
});
expect('missing engine', missing.problems.some(item => item === 'missing browser firefox'));

const dirty = observationProblems({
  requiredIds: roster.ids, outcomes: goodOutcomes, engines: goodEngines, sourceClean: false, artifactSha: 'abc', boundSha: 'abc',
});
expect('dirty source', dirty.problems.includes('dirty source'));

const unbound = observationProblems({
  requiredIds: roster.ids, outcomes: goodOutcomes, engines: goodEngines, sourceClean: true, artifactSha: 'abc', boundSha: 'def',
});
expect('unbound artifact', unbound.problems.includes('unbound artifact'));

const descendantId = roster.ids.find(id => id.endsWith('/interruption-destruction/snack-bar/descendant-end'));
const descendant = observationProblems({
  requiredIds: roster.ids,
  outcomes: withOne(descendantId, () => ({descendantIgnored: false})),
  engines: goodEngines, sourceClean: true, artifactSha: 'abc', boundSha: 'abc',
});
expect('descendant stand-in', descendant.problems.some(item => item.includes('descendant event counted as completion')));

const twiceId = roster.ids.find(id => id.endsWith('/exactly-once-notification/dialog/afterOpened/enabled'));
const twice = observationProblems({
  requiredIds: roster.ids,
  outcomes: withOne(twiceId, () => ({notifications: 2})),
  engines: goodEngines, sourceClean: true, artifactSha: 'abc', boundSha: 'abc',
});
expect('emitted twice', twice.problems.some(item => item.includes('emitted more than once')));

const staleId = roster.ids.find(id => id.endsWith('/interruption-destruction/dialog/reopen-instance'));
const stale = observationProblems({
  requiredIds: roster.ids,
  outcomes: withOne(staleId, () => ({staleClosed: true})),
  engines: goodEngines, sourceClean: true, artifactSha: 'abc', boundSha: 'abc',
});
expect('stale close', stale.problems.some(item => item.includes('stale close removed the reopened instance')));

const fallbackId = roster.ids.find(id => id.endsWith('/interruption-destruction/select/missing-end-fallback'));
const fallback = observationProblems({
  requiredIds: roster.ids,
  outcomes: withOne(fallbackId, () => ({fallbackCompleted: false})),
  engines: goodEngines, sourceClean: true, artifactSha: 'abc', boundSha: 'abc',
});
expect('missing fallback', fallback.problems.some(item => item.includes('missing fallback completion')));

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`native-motion regressions passed (${roster.ids.length} cases)`);
