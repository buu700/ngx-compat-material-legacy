const fs = require('fs');
const path = require('path');

function readHistoricalSpecs() {
  const bundled = path.resolve(__dirname, 'out/bundled-specs.json');
  const file = fs.existsSync(bundled) ? bundled : path.resolve(__dirname, 'historical-specs.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function LegacyJsonReporter(baseReporterDecorator, config) {
  baseReporterDecorator(this);
  const options = config.legacyJsonReporter || {};
  const outputFile = options.outputFile;
  const expectFail = !!options.expectFail;
  const suites = Object.create(null);
  let total = 0, passed = 0, failed = 0, skipped = 0;
  const failures = [];
  let deliberateFailSeen = false;

  this.onSpecComplete = function (browser, result) {
    total += 1;
    const suite = (result.suite || []).join(' > ') || '(root)';
    if (!suites[suite]) {
      suites[suite] = {executed: 0, passed: 0, failed: 0, skipped: 0, source_path: suite};
    }
    suites[suite].executed += 1;
    if (result.skipped) {
      skipped += 1;
      suites[suite].skipped += 1;
    } else if (result.success) {
      passed += 1;
      suites[suite].passed += 1;
    } else {
      failed += 1;
      suites[suite].failed += 1;
      failures.push({
        suite,
        description: result.description,
        log: result.log,
      });
      if (
        suite.includes('deliberate fail') ||
        (result.description || '').includes('fails on purpose') || (result.description || '').includes('deliberate')
      ) {
        deliberateFailSeen = true;
      }
    }
  };

  this.onRunComplete = function () {
    const payload = {
      schema_version: 1,
      runner: 'karma+jasmine+esbuild',
      mode: expectFail ? 'deliberate-fail' : 'normal',
      totals: {executed: total, passed, failed, skipped},
      by_suite: Object.values(suites),
      failures,
      deliberate_fail_observed: deliberateFailSeen,
      mapped_specs: readHistoricalSpecs().map(row => ({
        historical_path: row.historical_path,
        candidate: row.candidate,
        disposition: 'executed',
      })),
      timestamp: new Date().toISOString(),
    };
    fs.mkdirSync(path.dirname(outputFile), {recursive: true});
    fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2) + '\n');
    this.write(`Legacy JSON report written to ${outputFile}\n`);

    if (expectFail) {
      if (deliberateFailSeen) {
        this.write('Deliberate failing assertion observed (expected).\n');
        // Force exit 0 for the deliberate-fail proof run.
        process.exitCode = 0;
      } else {
        this.write('ERROR: deliberate fail was requested but not observed.\n');
        process.exitCode = 1;
      }
    }
  };
}

LegacyJsonReporter.$inject = ['baseReporterDecorator', 'config'];

module.exports = {
  'reporter:legacy-json': ['type', LegacyJsonReporter],
};
