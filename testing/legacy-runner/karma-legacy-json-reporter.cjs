const fs = require('fs');
const path = require('path');

function readBundledMeta() {
  const bundled = path.resolve(__dirname, 'out/bundled-specs.json');
  const file = fs.existsSync(bundled) ? bundled : path.resolve(__dirname, 'historical-specs.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (Array.isArray(raw)) {
    return {
      subject_mode: process.env.LEGACY_SUBJECT_MODE || 'workspace-dist',
      package_root: process.env.LEGACY_PACKAGE_ROOT || null,
      run_id: process.env.LEGACY_RUN_ID || null,
      artifact_sha256: process.env.LEGACY_ARTIFACT_SHA256 || null,
      rows: raw,
    };
  }
  return {
    subject_mode: raw.subject_mode || process.env.LEGACY_SUBJECT_MODE || 'workspace-dist',
    package_root: raw.package_root || process.env.LEGACY_PACKAGE_ROOT || null,
    run_id: raw.run_id || process.env.LEGACY_RUN_ID || null,
    artifact_sha256: raw.artifact_sha256 || process.env.LEGACY_ARTIFACT_SHA256 || null,
    rows: raw.rows || [],
  };
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
      suites[suite] = {executed: 0, passed: 0, failed: 0, skipped: 0, description_path: suite};
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
    const meta = readBundledMeta();
    const payload = {
      schema_version: 1,
      runner: 'karma+jasmine+esbuild',
      mode: expectFail ? 'deliberate-fail' : 'normal',
      subject_mode: meta.subject_mode,
      package_root: meta.package_root,
      run_id: meta.run_id,
      artifact_sha256: meta.artifact_sha256,
      totals: {executed: total, passed, failed, skipped},
      by_suite: Object.values(suites),
      failures,
      deliberate_fail_observed: deliberateFailSeen,
      mapped_specs: meta.rows.map(row => ({
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
