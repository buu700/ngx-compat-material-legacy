#!/usr/bin/env node
/**
 * The select panel +32px assertion is in the 16.2.14 spec, but that tag's
 * stylesheet does not set width: calc(100% + 32px). Do not add the rule here.
 *
 *   node scripts/check-select-panel-width.mjs
 */
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const historical = readFileSync(join(root, 'compatibility/rc/oracles/material-16.2.14-legacy-select.scss'), 'utf8');
const local = readFileSync(join(root, 'projects/ngx-material-legacy/legacy-select/select.scss'), 'utf8');
const spec = readFileSync(join(root, 'projects/ngx-material-legacy/legacy-select/select.spec.ts'), 'utf8');
const rule = /^(?!\s*\/\/).*width:\s*calc\(100%\s*\+\s*32px\)/m;
const errors = [];
if (!historical.includes('min-width: 100%')) errors.push('historical stylesheet lost min-width: 100%');
if (!local.includes('min-width: 100%')) errors.push('local stylesheet lost min-width: 100%');
if (rule.test(historical) || rule.test(local)) errors.push('a calc(100% + 32px) rule is present');
if (!spec.includes('200 + 32') || !spec.includes('400 + 32')) errors.push('the historical width assertion is missing');
const report = {
  schema_version: 1,
  role: 'select panel width mechanism',
  historical_sha256: createHash('sha256').update(historical).digest('hex'),
  historical_has_calc_rule: rule.test(historical),
  local_has_calc_rule: rule.test(local),
  local_difference: 'Import paths are under styles/, and CSS keyframes were added for the engine-free panel. The panel width rules match the 16.2.14 stylesheet.',
  failures_recorded: [
    'Expected select panel width to be 100% + 32px: 200 vs about 232, and 400 vs about 432',
  ],
  limitations: [
    'No calc rule was added. The 16.2.14 stylesheet does not contain one.',
    'This does not make the two select tests pass.',
  ],
};
const reportPath = join(root, 'compatibility/rc/reports/select-panel-width.json');
mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(JSON.stringify({ok: true, calc_rule: false}, null, 2));
