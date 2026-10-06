#!/usr/bin/env node
/**
 * Pure regressions for the sass-api-and-values inventory tools. No Sass compile:
 * the frozen 16.2.14 oracle is compared with itself, then mutated.
 * - The matrix roster equals apiCaseIds(oracle), in order, predeclared.
 * - An exact copy passes every case; drift mutations fail exactly their cases.
 * - Pending decisions only cover exact recorded digest pairs, never a pass.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  THEME_PARAMS,
  apiCaseIds,
  argumentCases,
  apiDriftNegative,
  classifyPending,
  compareInventory,
  invocationPlan,
  parseParams,
  splitTopLevel,
} from './sass-api-inventory.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const oracle = JSON.parse(readFileSync(join(root, 'compatibility/rc/oracles/material-16.2.14-sass-api.json'), 'utf8'));
const decisions = JSON.parse(readFileSync(join(root, 'compatibility/rc/sass-pending-decisions.json'), 'utf8'));
const matrix = JSON.parse(readFileSync(join(root, 'compatibility/rc/matrices/full-verify.json'), 'utf8'));
const row = matrix.checks.find(item => item.check_id === 'sass-seal');

assert.equal(oracle.provenance.package, '@angular/material');
assert.equal(oracle.provenance.version, '16.2.14');
assert.equal(
  createHash('sha256').update(readFileSync(join(root, oracle.provenance.lock_path))).digest('hex'),
  oracle.provenance.lock_sha256,
);
assert.deepEqual(oracle.counts, {
  variables: Object.keys(oracle.members.variables).length,
  functions: Object.keys(oracle.members.functions).length,
  mixins: Object.keys(oracle.members.mixins).length,
});
const ids = apiCaseIds(oracle);
assert.equal(new Set(ids).size, ids.length);
assert.deepEqual(row.acceptance.cases_by_line.main['sass-api-and-values'], ids);
assert.equal(row.acceptance.cases_by_line['21.x']['sass-api-and-values'], null);
const counts = {};
for (const id of ids) counts[id.split('/')[0]] = (counts[id.split('/')[0]] || 0) + 1;
assert.deepEqual(counts, {
  variable: Object.keys(oracle.members.variables).length,
  function: Object.keys(oracle.members.functions).length,
  mixin: Object.keys(oracle.members.mixins).length,
  'mixin-css': Object.keys(oracle.members.mixins).length,
  aggregate: Object.values(oracle.members.mixins).filter(item => Array.isArray(item.aggregate)).length,
});

// Parsing.
assert.deepEqual(splitTopLevel('a, (b, c), "d,e"', ','), ['a', '(b, c)', '"d,e"']);
const params = parseParams('$config-or-theme, $level: (a: 1, b: 2), $args...');
assert.deepEqual(params.params.map(p => p.name), ['config-or-theme', 'level']);
assert.equal(params.params[0].default, null);
assert.equal(params.params[1].default, '(a: 1, b: 2)');
assert.equal(params.rest, 'args');

// Invocation plans come only from the authentic signature, or for non-theme
// required parameters from a cited 16.2.14 argument case.
const argumentFile = readFileSync(join(root, 'compatibility/rc/oracles/material-16.2.14-sass-argument-cases.json'));
assert.equal(createHash('sha256').update(argumentFile).digest('hex'), oracle.provenance.argument_cases_sha256);
const cases = argumentCases();
const needArguments = [];
for (const [name, entry] of Object.entries(oracle.members.mixins)) {
  const plan = invocationPlan(name, entry);
  const required = (entry.params || []).filter(p => p.default === null).map(p => p.name);
  const themeOnly = required.every(p => THEME_PARAMS.includes(p));
  if (!themeOnly) needArguments.push(name);
  assert.equal(plan.invocable, themeOnly || Object.hasOwn(cases, name), name);
  assert.equal(entry.invocation.invocable, plan.invocable, name);
  if (!themeOnly && plan.invocable) {
    assert.deepEqual(entry.invocation.argument_source, cases[name].sources, name);
    assert.match(cases[name].call, new RegExp(`@include m\\.${name}\\(`), name);
  }
}
// Argument cases exist only for mixins whose signature needs them; each cites a 16.2.14 source.
assert.deepEqual(Object.keys(cases).sort(), needArguments.filter(name => Object.hasOwn(cases, name)).sort());
for (const [name, entry] of Object.entries(cases)) {
  assert.equal(entry.sources.length > 0, true, name);
  for (const source of entry.sources) assert.match(source, /16\.2\.14/, `${name}: ${source}`);
}
assert.equal(invocationPlan('x', {params: [{name: 'color', default: null}]}).invocable, false);
assert.equal(invocationPlan('x', {params: [{name: 'color', default: null}]}, {x: {call: '@include m.x(red);', sources: []}}).invocable, false);

// Exact self-comparison passes every predeclared case.
const css = {};
for (const [name, entry] of Object.entries(oracle.members.mixins)) {
  if (entry.invocation?.invocable) css[name] = {css: '', sha256: entry.invocation.css_sha256};
}
const exact = compareInventory(oracle, structuredClone(oracle.members), css);
assert.deepEqual(exact.map(item => item.case_id), ids);
const exactFailures = exact.filter(item => item.result !== 'pass');
assert.deepEqual(exactFailures.map(item => item.case_id), exact.filter(item => item.reason?.startsWith('not invoked')).map(item => item.case_id));
assert.equal(exactFailures.every(item => item.case_id.startsWith('mixin-css/')), true);

// API drift negative on a correct inventory.
const drift = apiDriftNegative(oracle, structuredClone(oracle.members), css);
assert.equal(drift.detected, true);
assert.equal(drift.mutated.length >= 4, true);
assert.deepEqual([...drift.newly_failed].sort(), [...drift.mutated].sort());

// Missing candidate members fail; nothing is filtered out.
const empty = compareInventory(oracle, {variables: {}, functions: {}, mixins: {}}, {});
assert.deepEqual(empty.map(item => item.case_id), ids);
assert.equal(empty.every(item => item.result === 'fail'), true);

// Pending decisions: exact digest pairs only; never blanket, never authority.
assert.match(decisions.authority, /^none:/);
for (const decision of decisions.decisions) assert.equal(decision.authority ?? null, null, decision.id);
const seen = new Set();
for (const decision of decisions.decisions) {
  assert.equal(decision.state, 'pending', decision.id);
  assert.equal(typeof decision.decision_requested, 'string', decision.id);
  assert.equal(decision.cases.length > 0, true, decision.id);
  for (const item of decision.cases) {
    assert.equal(seen.has(item.case_id), false, item.case_id);
    seen.add(item.case_id);
    assert.equal(/[*?]/.test(item.case_id), false, item.case_id);
    if (item.expected_sha256 !== undefined) {
      assert.match(item.expected_sha256, /^[0-9a-f]{64}$/);
      assert.match(item.candidate_sha256, /^[0-9a-f]{64}$/);
      assert.notEqual(item.expected_sha256, item.candidate_sha256);
      assert.equal(existsSync(join(root, item.evidence)), true, item.evidence);
    } else {
      assert.equal(typeof item.reason, 'string', item.case_id);
    }
  }
}
const pendingApi = [...seen].filter(id => ids.includes(id));
const orderedIds = row.acceptance.cases_by_line.main['ordered-css-dom'];
assert.equal([...seen].every(id => ids.includes(id) || orderedIds.includes(id)), true);

// A recorded pair is pending; a different candidate digest is unexplained and stale.
const sample = decisions.decisions.flatMap(d => d.cases).find(item => item.expected_sha256 && ids.includes(item.case_id));
const failing = {case_id: sample.case_id, result: 'fail', reason: 'compiled CSS differs', expected_sha256: sample.expected_sha256, actual_sha256: sample.candidate_sha256};
assert.equal(classifyPending([failing], decisions)[0].status, 'pending-decision');
const stale = classifyPending([{...failing, actual_sha256: 'f'.repeat(64)}], decisions)[0];
assert.equal(stale.status, 'unexplained-failure');
assert.equal(typeof stale.stale_decision, 'string');
assert.equal(classifyPending([{...failing, case_id: 'mixin-css/not-recorded'}], decisions)[0].status, 'unexplained-failure');
const passed = classifyPending([{case_id: sample.case_id, result: 'pass'}], decisions)[0];
assert.equal(passed.status, undefined);
assert.equal(passed.result, 'pass');
const notInvoked = exact.filter(item => item.result !== 'pass');
assert.equal(classifyPending(notInvoked, decisions).every(item => item.status === 'pending-decision'), true);

console.log(`sass-api regressions passed (${ids.length} api cases, ${pendingApi.length} pending, ${decisions.decisions.length} decisions)`);
