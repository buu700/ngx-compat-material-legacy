#!/usr/bin/env node
/**
 * Explain one artifact-bound historical suite against the spec-file inventory
 * and the prior executed-total label.
 *
 *   node scripts/explain-historical-totals.mjs --run <run.json> [--out <report.json>]
 *
 * Reads the run manifest and the legacy-*.json files under its reports directory.
 * Does not rerun Karma. Does not rewrite family totals or status.json.
 */
import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DISCOVERY = 'legacy-runner discovery';
const PROBE = 'legacy-runner deliberate fail probe';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function familyFromReportName(name) {
  const stamped = name.match(/^legacy-(.+)-(\d{8}T\d{6}Z)\.json$/);
  if (stamped) return stamped[1];
  const plain = name.match(/^legacy-(.+)\.json$/);
  return plain ? plain[1] : null;
}

function suiteExecuted(report, description) {
  return (report.by_suite || [])
    .filter(suite => suite.description_path === description)
    .reduce((sum, suite) => sum + (suite.executed || 0), 0);
}

function gapPhrase(label, value) {
  if (label == null) return 'not numeric beside';
  const gap = label - value;
  if (gap === 0) return 'equal to';
  return `${Math.abs(gap)} ${gap > 0 ? 'above' : 'below'}`;
}

export function explainHistoricalTotals({
  run,
  reports,
  inventory,
  workspaceReports,
  priorLabel,
  runId,
  sourceClean,
}) {
  const library = (run.artifacts || []).find(artifact => artifact.id === 'library');
  if (!library || !library.sha256) fail('run.json has no library artifact sha256');
  const families = [];
  const mapped = new Set();
  let executed = 0;
  let passed = 0;
  let failed = 0;
  let discovery = 0;
  let probe = 0;
  const shas = new Set();
  const modes = new Set();
  for (const report of reports) {
    const totals = report.totals || {};
    executed += totals.executed || 0;
    passed += totals.passed || 0;
    failed += totals.failed || 0;
    discovery += suiteExecuted(report, DISCOVERY);
    probe += suiteExecuted(report, PROBE);
    if (report.artifact_sha256) shas.add(report.artifact_sha256);
    if (report.subject_mode) modes.add(report.subject_mode);
    for (const spec of report.mapped_specs || []) {
      if (spec && spec.historical_path) mapped.add(spec.historical_path);
    }
    families.push({
      family: report.family,
      executed: totals.executed || 0,
      passed: totals.passed || 0,
      failed: totals.failed || 0,
      discovery: suiteExecuted(report, DISCOVERY),
      deliberate_fail_probe: suiteExecuted(report, PROBE),
      mapped_specs: (report.mapped_specs || []).length,
    });
  }
  families.sort((a, b) => a.family.localeCompare(b.family));
  const inventoryPaths = new Set((inventory.rows || []).map(row => row.historical_path));
  const workspace = new Map(workspaceReports.map(report => [report.family, report.totals?.executed || 0]));
  const familyTotalsMatchWorkspace = families.length > 0 && families.every(family =>
    workspace.get(family.family) === family.executed);
  const labelCountMatch = String(priorLabel || '').match(/(\d+)-pass/);
  const priorLabelCount = labelCountMatch ? Number(labelCountMatch[1]) : null;
  const withoutRunner = executed - discovery - probe;
  const onlyArtifact = [...mapped].filter(path => !inventoryPaths.has(path)).sort();
  const onlyInventory = [...inventoryPaths].filter(path => !mapped.has(path)).sort();
  return {
    schema_version: 1,
    role: 'artifact-bound historical executed-total explanation',
    check_id: 'historical-legacy-artifact',
    run_id: runId,
    subject_mode: modes.size === 1 ? [...modes][0] : [...modes].sort(),
    artifact_sha256: library.sha256,
    report_artifact_sha256: [...shas],
    artifact_sha_matches_reports: shas.size === 1 && [...shas][0] === library.sha256,
    source_clean: sourceClean,
    inventory_path: 'testing/legacy-runner/historical-inventory.json',
    inventory_denominator: inventory.denominator,
    inventory_unit: 'spec files',
    inventory_rows: (inventory.rows || []).length,
    mapped_specs: mapped.size,
    mapped_specs_match_inventory: onlyArtifact.length === 0 && onlyInventory.length === 0
      && mapped.size === inventory.denominator,
    unmapped_inventory_paths: onlyInventory,
    extra_mapped_paths: onlyArtifact,
    families: families.length,
    executed,
    passed,
    failed,
    runner_discovery: discovery,
    runner_deliberate_fail_probe: probe,
    executed_without_runner_rows: withoutRunner,
    workspace_report_executed: [...workspace.values()].reduce((sum, value) => sum + value, 0),
    family_totals_match_workspace_reports: familyTotalsMatchWorkspace,
    prior_status_key: 'RC-06-partial-artifact-run',
    prior_status_label: priorLabel,
    prior_label_count: priorLabelCount,
    label_minus_executed: priorLabelCount == null ? null : priorLabelCount - executed,
    label_minus_without_runner_rows: priorLabelCount == null ? null : priorLabelCount - withoutRunner,
    family_totals: families,
    explanation: [
      `This artifact-bound run executed ${executed} Jasmine tests across ${families.length} families.`,
      `${discovery} are legacy-runner discovery rows and ${probe} are deliberate-fail probes, leaving ${withoutRunner} component executions.`,
      `The inventory denominator is ${inventory.denominator} spec files. This run mapped ${mapped.size} of those paths.`,
      `The prior status label "${priorLabel}" names ${priorLabelCount}, which is ${gapPhrase(priorLabelCount, withoutRunner)} the component executions and ${gapPhrase(priorLabelCount, executed)} the executed total.`,
      'Family totals are the totals this run recorded. They are not rewritten to force the prior label.',
    ].join(' '),
    limitations: [
      'Does not rewrite family totals or status.json to force the prior label.',
      'The inventory counts spec files. The executed total counts Jasmine tests, including one discovery row and one deliberate-fail probe per family.',
      'A remembered total of 2195 is not stored on these family reports.',
      sourceClean
        ? 'The run manifest recorded a clean source tree.'
        : 'The run manifest recorded a dirty source tree. The executed bytes are the packed library tarball named by artifact_sha256.',
    ],
  };
}

function parseArgs(argv) {
  const args = {out: join(root, 'compatibility/rc/reports/historical-totals-explanation.json')};
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (!flag.startsWith('--') || value == null) fail(`Unknown argument: ${flag}`);
    if (flag === '--run') args.run = value;
    else if (flag === '--out') args.out = value;
    else if (flag === '--inventory') args.inventory = value;
    else if (flag === '--workspace') args.workspace = value;
    else if (flag === '--prior-label') args.priorLabel = value;
    else fail(`Unknown argument: ${flag}`);
    i += 1;
  }
  return args;
}

function loadReports(dir) {
  if (!existsSync(dir)) fail(`No reports directory: ${relative(root, dir) || dir}`);
  return readdirSync(dir)
    .filter(name => name.startsWith('legacy-') && name.endsWith('.json') && name !== 'legacy-aggregate.json')
    .map(name => {
      const report = readJson(join(dir, name));
      report.family = familyFromReportName(name);
      if (!report.family) fail(`Cannot read a family from ${name}`);
      return report;
    });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.run) fail('--run is required');
  const runPath = resolve(args.run);
  const run = readJson(runPath);
  const reports = loadReports(join(dirname(runPath), 'reports'));
  const inventory = readJson(args.inventory || join(root, 'testing/legacy-runner/historical-inventory.json'));
  const workspaceDir = args.workspace || join(root, 'compatibility/rc/reports');
  const workspaceReports = loadReports(workspaceDir);
  const priorLabel = args.priorLabel
    || readJson(join(root, 'compatibility/rc/status.json')).acceptance?.['RC-06-partial-artifact-run'];
  const report = explainHistoricalTotals({
    run,
    reports,
    inventory,
    workspaceReports,
    priorLabel,
    runId: run.run_id || null,
    sourceClean: run.source ? run.source.clean === true : null,
  });
  const text = JSON.stringify(report, null, 2) + '\n';
  if (text.includes('/home/') || text.includes('/tmp/')) {
    fail('explanation report would contain an absolute home or temp path');
  }
  mkdirSync(dirname(resolve(args.out)), {recursive: true});
  writeFileSync(args.out, text);
  console.log(JSON.stringify({
    ok: report.artifact_sha_matches_reports && report.mapped_specs_match_inventory && report.failed === 0,
    run_id: report.run_id,
    executed: report.executed,
    discovery: report.runner_discovery,
    probe: report.runner_deliberate_fail_probe,
    without_runner_rows: report.executed_without_runner_rows,
    mapped_specs: report.mapped_specs,
    inventory_denominator: report.inventory_denominator,
    prior_label_count: report.prior_label_count,
    family_totals_match_workspace_reports: report.family_totals_match_workspace_reports,
    out: relative(root, resolve(args.out)) || args.out,
  }, null, 2));
}
