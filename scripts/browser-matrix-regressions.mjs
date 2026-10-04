#!/usr/bin/env node
/**
 * Negatives for the browser-matrix release roster. Does not launch a browser.
 */
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {deriveReleaseIds, familiesFromInventory, loadMainReleaseRoster, observationProblems} from './browser-matrix-roster.mjs';
import {candidateInstallSpec, candidateQualificationDefects, fixtureQualificationDefects} from './browser-required-cells.mjs';
import {qualifyRelease} from './browser-matrix-acceptance.mjs';

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

const versions = {
  core: '22.1.7',
  cdk: '22.1.7',
  material: '22.1.7',
  rxjs: '7.8.2',
  typescript: '6.0.3',
  zone: '0.16.3',
  tslib: '2.8.1',
  sass: '1.104.1',
};
const liveDefects = fixtureQualificationDefects(null);
for (const zoneless of [false, true]) {
  const spec = candidateInstallSpec(versions, zoneless);
  const defects = candidateQualificationDefects(spec);
  expect(`${zoneless ? 'zoneless' : 'zoneful'} animations`, defects.includes('candidate installs @angular/animations'));
  expect(`${zoneless ? 'zoneless' : 'zoneful'} peer bypass`, defects.includes('candidate sets legacy-peer-deps=true'));
  expect(`${zoneless ? 'zoneless' : 'zoneful'} skipLibCheck`, defects.includes('candidate sets skipLibCheck'));
  expect(`${zoneless ? 'zoneless' : 'zoneful'} detectChanges`, defects.includes('candidate drives operations with detectChanges()'));
  expect(`${zoneless ? 'zoneless' : 'zoneful'} matches fixture scan`, JSON.stringify(defects) === JSON.stringify(liveDefects));
}
const opened = candidateQualificationDefects({
  dependencies: {'@angular/core': versions.core, '@angular/material': versions.material},
  npmrc: 'install-links=true\nfund=false\naudit=false\n',
  tsconfig: {compilerOptions: {strict: true, skipLibCheck: false}},
  labSource: 'openDialog(): void { this.dialog.open(DialogBody); }\n',
});
expect('guard opens when the fixture assumptions are gone', opened.length === 0);

const blocked = qualifyRelease({
  expectedIds: roster.ids,
  outcomes: goodOutcomes,
  defects: liveDefects,
});
expect('live defects block complete coverage', blocked.coverage === 'incomplete' && blocked.accepted === false);
expect('live defects are recorded', JSON.stringify(blocked.qualification_defects) === JSON.stringify(liveDefects));

const unrun = qualifyRelease({expectedIds: roster.ids, outcomes: [], defects: []});
expect('failed launch discovers nothing', unrun.discovered_case_ids.length === 0);
expect('failed launch executes nothing', unrun.executed_case_ids.length === 0);
expect('failed launch passes nothing', unrun.passed_case_ids.length === 0);
expect('failed launch leaves the roster unresolved', unrun.unresolved_case_ids.length === roster.ids.length);
expect('failed launch is not complete', unrun.coverage === 'incomplete');

const chromiumIds = roster.ids.filter(id => id.split('/')[2] === 'chromium');
const partial = qualifyRelease({
  expectedIds: roster.ids,
  outcomes: chromiumIds.map(id => ({id, ok: true, evidence: 'observed'})),
  defects: [],
});
expect('partial execution is only the returned cells', partial.executed_case_ids.length === chromiumIds.length);
expect('partial execution stays on chromium', partial.executed_case_ids.every(id => id.split('/')[2] === 'chromium'));
expect('partial discovery matches execution', JSON.stringify(partial.discovered_case_ids) === JSON.stringify(partial.executed_case_ids));
expect('partial run is not complete', partial.coverage === 'incomplete' && partial.unresolved_case_ids.length === roster.ids.length - chromiumIds.length);

const qualified = qualifyRelease({expectedIds: roster.ids, outcomes: goodOutcomes, defects: []});
expect('roster without fixture defects can be complete', qualified.coverage === 'complete' && qualified.accepted === true);
expect('complete executed set matches expected', JSON.stringify(qualified.executed_case_ids) === JSON.stringify(roster.ids));
expect('complete passed set matches expected', JSON.stringify(qualified.passed_case_ids) === JSON.stringify(roster.ids));

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('browser-matrix regressions passed');
