#!/usr/bin/env node
/**
 * Release-engine roster for browser-matrix.
 *
 * Case ids are derived from the historical family inventory and the
 * applicability rules in scripts/declare-browser-matrix.mjs before any
 * browser is launched. WebKitGTK (WebKit2 4.1) is the named webkit backend.
 * It is not Safari certification. 21.x is not part of this roster.
 */
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINES = ['chromium', 'firefox', 'webkit'];
const RUNTIMES = ['zoneful', 'zoneless'];
const STATES = ['default', 'disabled', 'invalid', 'focused', 'light', 'dark', 'rtl', 'density'];
const invalidApplicable = new Set([
  'autocomplete', 'checkbox', 'chips', 'form-field', 'input', 'radio', 'select', 'slide-toggle', 'slider',
]);
const disabledNotApplicable = new Set(['card', 'core', 'dialog', 'progress-bar', 'progress-spinner', 'snack-bar', 'table']);
const focusedNotApplicable = new Set(['card', 'core', 'progress-bar', 'progress-spinner']);

export function familiesFromInventory(inventory) {
  return [...new Set(inventory.rows.map(row => row.family))].sort();
}

export function applicability(family, state) {
  if (state === 'invalid' && !invalidApplicable.has(family)) return 'a value-less family has no required or invalid state';
  if (state === 'disabled' && disabledNotApplicable.has(family)) return 'this family is not a disableable control';
  if (state === 'focused' && focusedNotApplicable.has(family)) return 'this family has no keyboard focus target';
  return null;
}

export function deriveReleaseIds(families, line = 'main') {
  if (line !== 'main') throw new Error('this pass derives the main line only');
  const ids = [];
  for (const family of families) {
    for (const runtime of RUNTIMES) {
      for (const state of STATES) {
        if (applicability(family, state)) continue;
        for (const engine of ENGINES) {
          ids.push(`release/${line}/${engine}/${runtime}/${family}/${state}`);
        }
      }
    }
  }
  return ids;
}

export function loadMainReleaseRoster() {
  const inventory = JSON.parse(readFileSync(join(root, 'testing/legacy-runner/historical-inventory.json'), 'utf8'));
  const families = familiesFromInventory(inventory);
  const ids = deriveReleaseIds(families, 'main');
  const perEngine = {};
  for (const engine of ENGINES) perEngine[engine] = ids.filter(id => id.split('/')[2] === engine).length;
  return {families, ids, perEngine, engines: ENGINES};
}

export function engineIdentityProblems(engines) {
  const problems = [];
  const chromium = engines && engines.chromium;
  const firefox = engines && engines.firefox;
  const webkit = engines && engines.webkit;
  if (!chromium || chromium.launched !== true) problems.push('missing browser chromium');
  else if (!/Chrom/i.test(String(chromium.product || ''))) problems.push('forged browser name chromium');
  if (!firefox || firefox.launched !== true) problems.push('missing browser firefox');
  else if (firefox.browserName !== 'firefox' || !firefox.version) problems.push('forged browser name firefox');
  if (!webkit || webkit.launched !== true) problems.push('missing browser webkit');
  else if (webkit.backend !== 'webkitgtk' || webkit.api !== 'WebKit2-4.1' || webkit.safari_certification === true || webkit.browserName === 'Safari') {
    problems.push('forged browser name webkit');
  }
  const launched = ENGINES.filter(engine => engines && engines[engine] && engines[engine].launched === true);
  if (launched.length === 1 && launched[0] === 'chromium') problems.push('chromium-only run presented as full coverage');
  return problems;
}

export function observationProblems({requiredIds, outcomes, engines, sourceClean, artifactSha, boundSha}) {
  const problems = [];
  if (sourceClean !== true) problems.push('dirty source');
  if (!artifactSha || artifactSha !== boundSha) problems.push('unbound artifact');
  problems.push(...engineIdentityProblems(engines || {}));
  const passed = new Set();
  for (const row of outcomes || []) {
    if (!row || typeof row.id !== 'string') continue;
    if (row.ok === true && typeof row.evidence === 'string' && row.evidence.length > 0) passed.add(row.id);
  }
  const skipped = [];
  for (const id of requiredIds) {
    if (!passed.has(id)) skipped.push(id);
  }
  if (skipped.length) problems.push(`skipped required cell ${skipped[0]}`);
  return {problems, skipped};
}
