/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** A plain Jasmine execution page, without report UI that shifts fixture geometry. */
export function delegatedObservationPage() {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
</head><body>
<script src="/jasmine/jasmine.js"></script>
<script src="/jasmine/jasmine-html.js"></script>
<script src="/jasmine/boot0.js"></script>
<script>
  jasmine.getEnv().configure({random: false});
  window.__summary = {executed: 0, passed: 0, failed: 0, skipped: 0, failures: [], failure_details: []};
  jasmine.getEnv().addReporter({
    specDone(r) {
      const s = window.__summary;
      if (r.status === 'passed') { s.executed++; s.passed++; }
      else if (r.status === 'failed') {
        s.executed++; s.failed++;
        if (s.failures.length < 50) {
          s.failures.push(r.fullName);
          s.failure_details.push({id: r.id, name: r.fullName,
            expectations: (r.failedExpectations || []).map(e => ({message: e.message, stack: e.stack}))});
        }
      } else s.skipped++;
    },
    jasmineDone(r) {
      window.__summary.overall = r.overallStatus;
      window.__summary.global_failures = (r.failedExpectations || []).map(e => ({message: e.message, stack: e.stack}));
      window.__done = true;
    },
  });
  window.addEventListener('load', () => {
    window.__summary.runner_layout = {
      innerWidth: window.innerWidth, innerHeight: window.innerHeight,
      clientWidth: document.documentElement.clientWidth, clientHeight: document.documentElement.clientHeight,
      bodyMargin: getComputedStyle(document.body).margin, bodyOverflowY: getComputedStyle(document.body).overflowY,
      reporterElements: document.querySelectorAll('.jasmine_html-reporter').length,
    };
    jasmine.getEnv().execute();
  });
</script>
<script src="/out/legacy-tests.iife.js"></script>
</body></html>`;
}
