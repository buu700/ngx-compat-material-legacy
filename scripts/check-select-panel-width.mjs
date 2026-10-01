#!/usr/bin/env node
/**
 * Select panel width mechanism check.
 *
 * Historical 16.2.14 SCSS never declared width/min-width: calc(100% + 32px);
 * that value lived on the Angular `transformPanel` animation showing state.
 * Engine-free CSS keyframes only animate opacity/transform, so the candidate
 * restores the open-panel resting min-width in owned SCSS.
 *
 *   node scripts/check-select-panel-width.mjs
 */
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const historical = readFileSync(
  join(root, 'compatibility/rc/oracles/material-16.2.14-legacy-select.scss'),
  'utf8',
);
const local = readFileSync(
  join(root, 'projects/ngx-material-legacy/legacy-select/select.scss'),
  'utf8',
);
const spec = readFileSync(
  join(root, 'projects/ngx-material-legacy/legacy-select/select.spec.ts'),
  'utf8',
);
const calcRule = /^(?!\s*\/\/).*min-width:\s*calc\(100%\s*\+\s*32px\)/m;
const calcMultiple = /^(?!\s*\/\/).*min-width:\s*calc\(100%\s*\+\s*64px\)/m;
const errors = [];
if (!historical.includes('min-width: 100%')) {
  errors.push('historical stylesheet lost min-width: 100%');
}
if (calcRule.test(historical)) {
  errors.push('historical stylesheet unexpectedly gained a calc(100% + 32px) rule');
}
if (!calcRule.test(local)) {
  errors.push(
    'candidate must restore open-panel min-width: calc(100% + 32px) (engine-free equivalent of transformPanel showing)',
  );
}
if (!calcMultiple.test(local)) {
  errors.push(
    'candidate must restore multiple open-panel min-width: calc(100% + 64px) (showing-multiple)',
  );
}
if (!spec.includes('200 + 32') || !spec.includes('400 + 32')) {
  errors.push('the historical width assertion is missing');
}
const report = {
  schema_version: 1,
  role: 'select panel width mechanism',
  historical_sha256: createHash('sha256').update(historical).digest('hex'),
  historical_has_calc_rule: calcRule.test(historical),
  local_has_calc_rule: calcRule.test(local),
  local_has_multiple_calc_rule: calcMultiple.test(local),
  root_cause:
    'Historical +32/+64px came from Angular transformPanel animation minWidth states, not SCSS. Engine-free CSS keyframes omitted those widths; candidate SCSS restores them on the open panel.',
  local_difference:
    'Candidate declares min-width: calc(100% + 32px) (and +64px for .mat-select-panel-multiple) as the resting open-panel width. Historical oracle keeps min-width: 100% only. Spec assertions remain 200+32 / 400+32.',
  limitations: [
    'This source check does not execute the two overlay geometry specs; those need the family runner.',
    'Does not claim G09 or full historical suite closure.',
  ],
};
const reportPath = join(root, 'compatibility/rc/reports/select-panel-width.json');
mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(
  JSON.stringify(
    {
      ok: true,
      historical_calc_rule: false,
      candidate_calc_rule: true,
      candidate_multiple_calc_rule: true,
    },
    null,
    2,
  ),
);
