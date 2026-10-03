#!/usr/bin/env node
/**
 * Regressions for api-completeness case derivation and negative rejection.
 * Not release evidence.
 */
import {spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {
  caseGroups,
  deriveSurface,
  exportProblems,
  shapeProblems,
  bindingProblems,
  NEGATIVE_IDS,
  negativeResults,
} from './api-surface.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
function expect(name, condition, detail = '') {
  if (!condition) failures.push(detail ? `${name}: ${detail}` : name);
}

const scratch = mkdtempSync(join(tmpdir(), 'api-surface-'));
try {
  const archived = spawnSync('git', ['archive', 'baseline/angular-components-16.2.x', 'src/material'], {cwd: root, maxBuffer: 64 * 1024 * 1024});
  if (archived.status !== 0) throw new Error(archived.stderr.toString() || 'git archive failed');
  const extracted = spawnSync('tar', ['-x', '-C', scratch], {input: archived.stdout});
  if (extracted.status !== 0) throw new Error('extract failed');
  const surface = deriveSurface(join(scratch, 'src/material'));
  const groups = caseGroups(surface);
  const matrix = JSON.parse(readFileSync(join(root, 'compatibility/rc/matrices/full-verify.json'), 'utf8'));
  const row = matrix.checks.find(item => item.check_id === 'api-completeness');
  expect('main roster matches derivation', JSON.stringify(row.acceptance.cases_by_line.main) === JSON.stringify(groups));
  expect('21.x export-contract stays null', row.acceptance.cases_by_line['21.x']['export-contract'] === null);
  expect('21.x typescript-signatures stays null', row.acceptance.cases_by_line['21.x']['typescript-signatures'] === null);
  expect('21.x runtime-di-identity stays null', row.acceptance.cases_by_line['21.x']['runtime-di-identity'] === null);
  const ids = Object.values(groups).flat();
  expect('ids are unique', new Set(ids).size === ids.length, String(ids.length));
  expect('negatives are derived before any artifact', ids.includes(NEGATIVE_IDS.missingMember) && ids.includes(NEGATIVE_IDS.nameOnly) && ids.includes(NEGATIVE_IDS.unboundArtifact));
} finally {
  rmSync(scratch, {recursive: true, force: true});
}

const symbol = {symbol_id: 'legacy-button/primary/MatLegacyButton', name: 'MatLegacyButton'};
expect('missing member is rejected', exportProblems(symbol, false).length === 1);
expect('present member is not a missing-member failure', exportProblems(symbol, true).length === 0);
const signature = {
  comparison: 'signature',
  blocking: [],
  reported_signatures: ['protected method keep():void', 'public constructor()'],
  required_protected: ['protected method keep():void'],
  required_constructor: true,
};
expect('complete signature report is not name-only', shapeProblems(signature).length === 0);
expect('name-only is rejected', shapeProblems({...signature, comparison: 'name-only'}).includes('name-only'));
expect('dropped protected member is rejected', shapeProblems({...signature, reported_signatures: ['public constructor()']}).some(item => item.includes('protected-dropped')));
expect('dropped constructor is rejected', shapeProblems({...signature, reported_signatures: ['protected method keep():void'], required_constructor: true}).some(item => item.includes('constructor-dropped')));
expect('signature mismatch is rejected', shapeProblems({...signature, blocking: ['return type']}).some(item => item.includes('signature-mismatch')));
const clean = {
  source_clean: true,
  source_commit: 'a'.repeat(40),
  source_tree: 'b'.repeat(40),
  observed_commit: 'a'.repeat(40),
  observed_tree: 'b'.repeat(40),
  library_sha256: 'c'.repeat(64),
  library_bytes: 10,
  artifact_sha256: 'c'.repeat(64),
  artifact_bytes: 10,
  line: 'main',
};
expect('clean bound artifact has no identity problems', bindingProblems(clean).length === 0);
expect('forged source is rejected', bindingProblems({...clean, observed_commit: 'd'.repeat(40)}).some(item => item.includes('forged')));
expect('unbound artifact is rejected', bindingProblems({...clean, artifact_sha256: 'e'.repeat(64)}).some(item => item.includes('unbound')));
const negatives = negativeResults({symbol, signature, context: clean, tokenMatch: true});
expect('negative cases pass only when rejection is observed', negatives.every(item => item.result === 'pass'), negatives.filter(item => item.result !== 'pass').map(item => item.case_id).join(','));

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('api-completeness regressions passed');
