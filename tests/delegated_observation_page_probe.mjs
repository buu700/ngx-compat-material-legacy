/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {delegatedObservationPage} from '../scripts/delegated-observation-page.mjs';

function inspect(page) {
  assert.ok(!page.includes('jasmine.css'));
  assert.ok(!page.includes('boot1.js'));
  assert.ok(!page.includes('<style'));
  const scripts = [...page.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
  assert.deepEqual(scripts, ['/jasmine/jasmine.js', '/jasmine/jasmine-html.js', '/jasmine/boot0.js', '/out/legacy-tests.iife.js']);
  const callbacks = [], reporters = [], configurations = [];
  let executions = 0;
  const environment = {configure: value => configurations.push(value), addReporter: value => reporters.push(value), execute() {executions++;}};
  const window = {innerWidth: 1400, innerHeight: 1200, addEventListener(type, callback) {assert.equal(type, 'load'); callbacks.push(callback);}};
  const document = {body: {}, documentElement: {clientWidth: 1400, clientHeight: 1200}, querySelectorAll: () => []};
  const inline = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.equal(inline.length, 1);
  vm.runInNewContext(inline[0], {window, document, jasmine: {getEnv: () => environment}, getComputedStyle: () => ({margin: '8px', overflowY: 'visible'})});
  assert.equal(executions, 0, 'specs must load before execution starts');
  assert.equal(callbacks.length, 1); callbacks[0](); assert.equal(executions, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(configurations)), [{random: false}]);
  assert.equal(reporters.length, 1);
  const reporter = reporters[0];
  reporter.specDone({status: 'passed', fullName: 'positive'});
  reporter.specDone({status: 'pending', fullName: 'not-executed'});
  for (let i = 0; i < 55; i++) reporter.specDone({id: 'failure-' + i, fullName: 'failed-' + i, status: 'failed', failedExpectations: [{message: 'Expected12toEqual8', stack: 'actual-stack'}]});
  assert.equal(window.__done, undefined);
  reporter.jasmineDone({overallStatus: 'failed', failedExpectations: [{message: 'suite-error', stack: 'suite-stack'}]});
  const summary = JSON.parse(JSON.stringify(window.__summary));
  assert.deepEqual([summary.executed, summary.passed, summary.failed, summary.skipped], [56, 1, 55, 1]);
  assert.equal(summary.failures.length, 50); assert.equal(summary.failure_details.length, 50);
  assert.deepEqual(summary.failure_details[0], {id: 'failure-0', name: 'failed-0', expectations: [{message: 'Expected12toEqual8', stack: 'actual-stack'}]});
  assert.equal(summary.overall, 'failed'); assert.equal(window.__done, true);
  assert.deepEqual(summary.global_failures, [{message: 'suite-error', stack: 'suite-stack'}]);
  assert.equal(summary.runner_layout.reporterElements, 0);
  assert.deepEqual([summary.runner_layout.bodyMargin, summary.runner_layout.bodyOverflowY], ['8px', 'visible']);
}
const page = delegatedObservationPage();
inspect(page);
const mutations = [
  page.replace('</body>', '<script src="/jasmine/boot1.js"></script></body>'),
  page.replace('stack: e.stack', 'stack: undefined'),
  page.replace('s.skipped++', 's.passed++'),
  page.replace('s.failed++', 's.failed += 0'),
];
for (const mutation of mutations) assert.throws(() => inspect(mutation));
console.log(JSON.stringify({summary_cases: 58, mutants_rejected: mutations.length, scope: 'Page bootstrap and report serialization only; no browser/Angular historical qualification'}));
