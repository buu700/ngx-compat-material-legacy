#!/usr/bin/env node
/**
 * Negatives for the browser-matrix release roster. Does not launch a browser.
 */
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {deriveReleaseIds, familiesFromInventory, loadMainReleaseRoster, observationProblems} from './browser-matrix-roster.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
function expect(name, condition) {
  if (!condition) failures.push(name);
}

const roster = loadMainReleaseRoster();
expect('family count', roster.families.length === 22);
expect('912 cells', roster.ids.length === 912);
expect('304 chromium', roster.perEngine.chromium === 304);
expect('304 firefox', roster.perEngine.firefox === 304);
expect('304 webkit', roster.perEngine.webkit === 304);
expect('no 21.x', roster.ids.every(id => id.split('/')[1] === 'main'));
expect('no safari id', roster.ids.every(id => !id.includes('safari')));
expect('stable', JSON.stringify(deriveReleaseIds(roster.families, 'main')) === JSON.stringify(roster.ids));

const inventory = JSON.parse(readFileSync(join(root, 'testing/legacy-runner/historical-inventory.json'), 'utf8'));
expect('inventory families', JSON.stringify(familiesFromInventory(inventory)) === JSON.stringify(roster.families));

const matrix = JSON.parse(readFileSync(join(root, 'compatibility/rc/matrices/full-verify.json'), 'utf8'));
const row = matrix.checks.find(item => item.check_id === 'browser-matrix');
expect('matrix main roster', JSON.stringify(row.acceptance.cases_by_line.main['release-engine-runtime-state-matrix']) === JSON.stringify(roster.ids));
expect('21.x null', row.acceptance.cases_by_line['21.x']['release-engine-runtime-state-matrix'] === null);

const goodEngines = {
  chromium: {launched: true, product: 'Chrome/128.0.0.0'},
  firefox: {launched: true, browserName: 'firefox', version: '130.0'},
  webkit: {launched: true, backend: 'webkitgtk', api: 'WebKit2-4.1', safari_certification: false, version: '2.46.0'},
};
const goodOutcomes = roster.ids.map(id => ({id, ok: true, evidence: 'observed'}));
const good = observationProblems({
  requiredIds: roster.ids,
  outcomes: goodOutcomes,
  engines: goodEngines,
  sourceClean: true,
  artifactSha: 'abc',
  boundSha: 'abc',
});
expect('clean observation', good.problems.length === 0);

const missing = observationProblems({
  requiredIds: roster.ids,
  outcomes: goodOutcomes,
  engines: {chromium: goodEngines.chromium, webkit: goodEngines.webkit},
  sourceClean: true,
  artifactSha: 'abc',
  boundSha: 'abc',
});
expect('missing firefox', missing.problems.some(item => item === 'missing browser firefox'));

const skipped = observationProblems({
  requiredIds: roster.ids,
  outcomes: goodOutcomes.slice(1),
  engines: goodEngines,
  sourceClean: true,
  artifactSha: 'abc',
  boundSha: 'abc',
});
expect('skipped cell', skipped.problems.some(item => item.startsWith('skipped required cell ')));

const chromiumOnly = observationProblems({
  requiredIds: roster.ids,
  outcomes: goodOutcomes,
  engines: {chromium: goodEngines.chromium},
  sourceClean: true,
  artifactSha: 'abc',
  boundSha: 'abc',
});
expect('chromium-only', chromiumOnly.problems.includes('chromium-only run presented as full coverage'));

const forged = observationProblems({
  requiredIds: roster.ids,
  outcomes: goodOutcomes,
  engines: {...goodEngines, webkit: {launched: true, backend: 'playwright', api: 'WebKit2-4.1', browserName: 'Safari', safari_certification: true}},
  sourceClean: true,
  artifactSha: 'abc',
  boundSha: 'abc',
});
expect('forged webkit', forged.problems.includes('forged browser name webkit'));

const dirty = observationProblems({
  requiredIds: roster.ids,
  outcomes: goodOutcomes,
  engines: goodEngines,
  sourceClean: false,
  artifactSha: 'abc',
  boundSha: 'abc',
});
expect('dirty source', dirty.problems.includes('dirty source'));

const unbound = observationProblems({
  requiredIds: roster.ids,
  outcomes: goodOutcomes,
  engines: goodEngines,
  sourceClean: true,
  artifactSha: 'abc',
  boundSha: 'def',
});
expect('unbound artifact', unbound.problems.includes('unbound artifact'));

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('browser-matrix regressions passed');
