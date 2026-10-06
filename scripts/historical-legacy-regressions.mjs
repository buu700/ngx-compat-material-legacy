/**
 * Regressions for the historical roster binder.
 * Does not execute the browser suite and is not release evidence.
 */
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  deriveHistoricalRoster,
  discoveryNegativeResults,
  positiveMatches,
} from './historical-case-roster.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function expect(name, condition, detail = '') {
  if (!condition) {
    failures.push(detail ? `${name}: ${detail}` : name);
    console.error(`FAIL ${name}${detail ? `: ${detail}` : ''}`);
  }
}

const roster = deriveHistoricalRoster(root);
const matrix = JSON.parse(readFileSync(join(root, 'compatibility/rc/matrices/full-verify.json'), 'utf8'));
const row = matrix.checks.find(item => item.check_id === 'historical-legacy-artifact');
const main = row.acceptance.cases_by_line.main;
const line21 = row.acceptance.cases_by_line['21.x'];
expect('main spec roster matches derivation', JSON.stringify(main['original-and-shared-cases']) === JSON.stringify(roster.ids), `derived ${roster.ids.length}`);
expect('main discovery negatives match derivation', JSON.stringify(main['discovery-negatives']) === JSON.stringify(roster.discovery_negative_ids));
expect('21.x original roster stays unresolved', line21['original-and-shared-cases'] === null);
expect('21.x discovery roster stays unresolved', line21['discovery-negatives'] === null);
expect('component specs are 2150 and not the acceptance total', roster.cases.filter(item => item.kind !== 'shared-export').length === 2150);
expect('two shared-export originals stay in the roster', roster.cases.filter(item => item.kind === 'shared-export').length === 2);
expect('menu originals are identical to historical', roster.cases.filter(item => item.historical_path.includes('/legacy-menu/') && item.kind !== 'shared-export').every(item => item.adaptation === 'identical-to-historical'));

const executed = roster.cases
  .filter(item => item.kind !== 'shared-export')
  .map(item => ({full_name: item.full_name, success: true, skipped: false}));
executed.push(
  {full_name: 'legacy-runner discovery > evaluated every mapped historical spec module', success: true, skipped: false},
  {full_name: 'legacy-runner deliberate fail probe > is skipped unless deliberate-fail mode is enabled', success: true, skipped: false},
);
const sha = 'a'.repeat(64);
const context = {
  source_clean: true,
  subject_mode: 'artifact',
  artifact_sha256: sha,
  library_sha256: sha,
  aggregate_executed: 2152,
  mapped_paths: roster.paths,
};
expect('derived names bind to a clean artifact', positiveMatches(roster, executed, context));
expect('aggregate total alone does not bind', !positiveMatches(roster, [], {...context, aggregate_executed: 2152}));
const negatives = discoveryNegativeResults(roster, executed, context);
expect('discovery negatives reject', negatives.every(item => item.result === 'pass'), negatives.map(item => `${item.rejection}:${item.result}`).join(' '));

if (failures.length) {
  console.error(`historical-legacy regressions failed: ${failures.length}`);
  process.exit(1);
}
console.log(`historical-legacy regressions passed (${roster.ids.length} case ids, ${executed.length} synthetic executions)`);
