#!/usr/bin/env node
/**
 * Structural inventory of the frozen seed versus the disposition ledger.
 *
 * A structural pass is unique final rows for every seed SHA. It is not
 * security clearance and it does not admit the upstream-audit-disposition
 * check. Sensitive rows and material inheritance/behavior decisions need
 * individually sufficient proof. Import ancestry and a nonempty ledger
 * string are not that proof.
 *
 *   node scripts/check-upstream-audit-disposition.mjs
 *   node scripts/check-upstream-audit-disposition.mjs --admission --line main
 */
import {createHash} from 'node:crypto';
import {existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const ALLOWED_FINAL = new Set([
  'irrelevant',
  'not-applicable',
  'inherited',
  'already-adapted',
  'do-not-adopt',
  'adapt',
  'already-present',
]);
const PENDING = new Set(['open', 'needs-individual-review', 'security-review']);
const INHERITED = new Set(['inherited']);
const BEHAVIOR = new Set(['adapt', 'already-adapted', 'already-present']);
const REVIEW_DEPTHS = new Set([
  'individual-semantic',
  'individual-deep',
  'individual-compatibility',
  'individual-escalated',
]);
const HEX64 = /^[0-9a-f]{64}$/;
const SECURITY_LINE = /bypassSecurityTrust|DomSanitizer|\.innerHTML|securityContext|javascript:|eval\(|new Function\(|document\.write/;

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function hasFlag(name) {
  return process.argv.includes(name);
}

const seedPath = arg('--seed', join(root, 'compatibility/f10/upstream-sha-risk-bootstrap.json'));
const ledgerPath = arg('--ledger', join(root, 'compatibility/f10/disposition-ledger/ledger.json'));
const reportPath = arg('--report', join(root, 'compatibility/rc/reports/upstream-audit-disposition.json'));
const symbolsPath = arg('--symbols', join(root, 'compatibility/f10/authored-dependency-inventory-seed.json'));
const patchesDir = arg('--patches', '');
const line = arg('--line', '');
const admission = hasFlag('--admission');

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

function patchText(entry) {
  if (typeof entry.patch === 'string' && entry.patch) return entry.patch;
  if (!patchesDir || !entry.sha) return '';
  const file = join(patchesDir, `${entry.sha}.diff`);
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
}

function securityHunkLabeledDocsOnly(entry) {
  const label = `${entry.final_disposition || ''} ${entry.read_note_disposition || ''} ${entry.reason || ''}`;
  if (!/docs-only/i.test(label)) return false;
  const patch = patchText(entry);
  if (!patch) return false;
  let file = '';
  for (const row of patch.split('\n')) {
    if (row.startsWith('diff --git ')) file = row.split(' b/').pop();
    if (!row.startsWith('+') || row.startsWith('+++')) continue;
    if (file.endsWith('.md')) continue;
    if (SECURITY_LINE.test(row)) return true;
  }
  return false;
}

function sensitiveClass(entry) {
  if (entry.bucket === 'security-deep') return 'security';
  const files = Array.isArray(entry.files) ? entry.files.join('\n') : '';
  const blob = `${entry.subject || ''}\n${files}`;
  if (/a11y|accessibility|live-announcer|focus-trap|focus-monitor|aria-/i.test(blob)) return 'a11y';
  if (/\b(ngOnInit|ngOnChanges|ngOnDestroy|ngAfterViewInit|ngAfterContentInit)\b/.test(entry.subject || '')) {
    return 'lifecycle';
  }
  return null;
}

function evidenceClass(entry) {
  const rel = entry.evidence_report;
  if (typeof rel !== 'string' || !rel.trim()) return 'missing';
  if (rel.startsWith('/') || rel.split('/').includes('..')) return 'missing';
  if (rel === 'compatibility/rc/reports/upstream-audit-disposition.json') return 'circular';
  const file = join(root, rel);
  if (!existsSync(file) || !lstatSync(file).isFile()) return 'missing-file';
  return 'file';
}

function individualProofOk(entry) {
  const proof = entry.individual_proof;
  if (!proof || typeof proof !== 'object' || Array.isArray(proof)) return false;
  if (!HEX64.test(proof.diff_sha256 || '')) return false;
  if (!REVIEW_DEPTHS.has(proof.review_depth)) return false;
  if (!Array.isArray(proof.affected_branches) || proof.affected_branches.length === 0) return false;
  if (!proof.affected_branches.every(branch => branch === 'main' || branch === '21.x')) return false;
  if (line && !proof.affected_branches.includes(line)) return false;
  if (typeof proof.decision !== 'string' || proof.decision.trim().length < 40) return false;
  if (proof.proof_kind === 'batch' || proof.proof_kind === 'ancestry' || proof.proof_kind === 'import') return false;
  if (INHERITED.has(entry.final_disposition)) {
    const installed = proof.installed_member;
    const behavior = proof.reachable_behavior;
    if (!installed || typeof installed !== 'object' || !HEX64.test(installed.sha256 || '')) return false;
    if (!behavior || behavior.kind !== 'executed-delegation' || typeof behavior.id !== 'string' || !behavior.id.trim()) {
      return false;
    }
  }
  return true;
}

if (!existsSync(seedPath)) fail(2, `Missing seed: ${seedPath}`);
if (!existsSync(ledgerPath)) fail(1, `Missing disposition ledger: ${ledgerPath}`);

const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
const seedShas = new Set(seed.commits.map(commit => commit.sha));
const ledgerBySha = new Map();
const conflicts = [];
for (const entry of ledger.entries || []) {
  if (ledgerBySha.has(entry.sha)) conflicts.push(entry.sha);
  ledgerBySha.set(entry.sha, entry);
}
const missing = [...seedShas].filter(sha => !ledgerBySha.has(sha));
const unresolved = [];
const unknown = [];
const missingEvidence = [];
const circularEvidence = [];
const insufficientSensitive = [];
const insufficientInherited = [];
const insufficientBehavior = [];
const missingBranch = [];
for (const entry of ledgerBySha.values()) {
  const disposition = entry.final_disposition;
  if (!disposition || PENDING.has(disposition)) unresolved.push(entry.sha);
  else if (!ALLOWED_FINAL.has(disposition)) unknown.push(entry.sha);
  const evidence = evidenceClass(entry);
  if (evidence === 'circular') circularEvidence.push(entry.sha);
  else if (evidence !== 'file') missingEvidence.push(entry.sha);
  const sensitive = sensitiveClass(entry);
  const needsIndividual = Boolean(sensitive) || INHERITED.has(disposition) || BEHAVIOR.has(disposition);
  if (needsIndividual && !individualProofOk(entry)) {
    if (sensitive) insufficientSensitive.push(entry.sha);
    if (INHERITED.has(disposition)) insufficientInherited.push(entry.sha);
    if (BEHAVIOR.has(disposition)) insufficientBehavior.push(entry.sha);
    const branches = entry.individual_proof && Array.isArray(entry.individual_proof.affected_branches)
      ? entry.individual_proof.affected_branches : [];
    if (!line || !branches.includes(line)) missingBranch.push(entry.sha);
  }
}
const outside = [...ledgerBySha.keys()].filter(sha => !seedShas.has(sha));
const securityDocsOnly = [...ledgerBySha.values()].filter(securityHunkLabeledDocsOnly).map(entry => entry.sha);
const forgedClearance = ledger.security_clearance === 'passed' || ledger.g11_claim === 'passed';

let symbolUsesOpen = null;
let symbolStatus = 'missing';
if (existsSync(symbolsPath)) {
  const symbols = JSON.parse(readFileSync(symbolsPath, 'utf8'));
  symbolStatus = symbols.status || 'missing';
  const uses = Array.isArray(symbols.symbol_uses) ? symbols.symbol_uses : [];
  symbolUsesOpen = uses.filter(use => use.disposition !== 'closed' || use.status === 'inventory-seed').length;
} 

const structuralOk = missing.length === 0 && unresolved.length === 0 && conflicts.length === 0
  && outside.length === 0 && securityDocsOnly.length === 0 && unknown.length === 0
  && !forgedClearance && ledger.g11_claim === 'not-passed';
const dispositionOk = structuralOk && missingEvidence.length === 0 && circularEvidence.length === 0
  && insufficientSensitive.length === 0 && insufficientInherited.length === 0
  && insufficientBehavior.length === 0 && missingBranch.length === 0
  && symbolUsesOpen === 0 && symbolStatus === 'closed';

const summary = {
  ok: structuralOk,
  structural_inventory: structuralOk ? 'pass' : 'fail',
  disposition_admission: dispositionOk ? 'pass' : 'incomplete',
  security_clearance: 'not-passed',
  g11_claim: 'not-passed',
  seed_rows: seedShas.size,
  ledger_rows: ledgerBySha.size,
  missing: missing.length,
  unresolved: unresolved.length,
  conflicting_sha_rows: conflicts.length,
  outside_seed: outside.length,
  security_hunk_labeled_docs_only: securityDocsOnly.length,
  unknown_disposition: unknown.length,
  missing_evidence: missingEvidence.length,
  circular_evidence: circularEvidence.length,
  insufficient_sensitive: insufficientSensitive.length,
  insufficient_inherited: insufficientInherited.length,
  insufficient_behavior: insufficientBehavior.length,
  missing_branch_applicability: missingBranch.length,
  symbol_uses_open: symbolUsesOpen,
  symbol_status: symbolStatus,
  forged_clearance: forgedClearance,
};

const report = {
  schema_version: 1,
  role: 'upstream audit disposition coverage',
  check_id: 'upstream-audit-disposition',
  seed_rows: seedShas.size,
  ledger_rows: ledgerBySha.size,
  missing_from_ledger: missing.length,
  unresolved_in_ledger: unresolved.length,
  conflicting_sha_rows: conflicts.length,
  outside_seed: outside.length,
  security_hunk_labeled_docs_only: securityDocsOnly.length,
  unknown_disposition: unknown.length,
  missing_evidence: missingEvidence.length,
  circular_evidence: circularEvidence.length,
  insufficient_sensitive: insufficientSensitive.length,
  insufficient_inherited: insufficientInherited.length,
  insufficient_behavior: insufficientBehavior.length,
  missing_branch_applicability: missingBranch.length,
  symbol_uses_open: symbolUsesOpen,
  symbol_status: symbolStatus,
  ledger_sha256: createHash('sha256').update(readFileSync(ledgerPath)).digest('hex'),
  result: structuralOk ? 'pass' : 'fail',
  structural_inventory: summary.structural_inventory,
  disposition_admission: summary.disposition_admission,
  security_clearance: 'not-passed',
  g11_claim: 'not-passed',
  limitations: [
    'Structural inventory equality is not security clearance and is not cell closure.',
    'Sensitive rows and inherited or other material behavior decisions need individual proof. Tag ancestry or an import path is not that proof.',
    'A ledger string cannot set security clearance. g11_claim stays not-passed.',
    'Does not claim G11.',
  ],
};

function coordinatorRequest() {
  const names = ['RC_CHECK_ID', 'RC_RUN_ID', 'RC_INVOCATION_ID', 'RC_EVIDENCE_BINDING', 'RC_ASSERTION_OUTPUT_DIR'];
  const present = names.filter(name => process.env[name]);
  if (present.length === 0) return null;
  if (present.length !== names.length) return {error: `incomplete coordinator environment: ${present.join(', ')}`};
  if (process.env.RC_CHECK_ID !== 'upstream-audit-disposition') return {error: 'RC_CHECK_ID is not upstream-audit-disposition'};
  const invocation = process.env.RC_INVOCATION_ID;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,191}$/.test(invocation)) return {error: 'invalid invocation identity'};
  let binding;
  try {
    binding = JSON.parse(process.env.RC_EVIDENCE_BINDING);
  } catch {
    return {error: 'RC_EVIDENCE_BINDING is not JSON'};
  }
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) return {error: 'binding is not an object'};
  if (binding.run_id !== process.env.RC_RUN_ID) return {error: 'binding run_id does not match RC_RUN_ID'};
  const outputDir = process.env.RC_ASSERTION_OUTPUT_DIR;
  if (!outputDir || !existsSync(outputDir)) return {error: 'assertion output directory is missing'};
  const stat = lstatSync(outputDir);
  if (!stat.isDirectory() || stat.isSymbolicLink()) return {error: 'assertion output directory is not a real directory'};
  const expectedSuffix = join('evidence', 'upstream-audit-disposition', invocation);
  if (!outputDir.endsWith(expectedSuffix)) return {error: 'assertion directory is not check-owned'};
  return {binding, invocation, runId: process.env.RC_RUN_ID, outputDir, runDir: resolve(outputDir, '..', '..', '..'), line: binding.source_line};
}

const CASE_RESULTS = [
  ['upstream-shas', 'upstream-audit/upstream-shas/unique-membership', missing.length === 0 && conflicts.length === 0 && outside.length === 0 && unresolved.length === 0],
  ['upstream-shas', 'upstream-audit/upstream-shas/allowed-vocabulary', unknown.length === 0 && !forgedClearance],
  ['upstream-shas', 'upstream-audit/upstream-shas/sensitive-individual-proof', insufficientSensitive.length === 0],
  ['upstream-shas', 'upstream-audit/upstream-shas/independent-evidence', missingEvidence.length === 0 && circularEvidence.length === 0],
  ['authored-symbols', 'upstream-audit/authored-symbols/seed-not-closed', symbolUsesOpen === 0 && symbolStatus === 'closed'],
  ['installed-peer-fixes', 'upstream-audit/installed-peer-fixes/content-not-ancestry', insufficientInherited.length === 0],
  ['installed-peer-fixes', 'upstream-audit/installed-peer-fixes/branch-applicability', missingBranch.length === 0 && insufficientBehavior.length === 0],
  ['current-advisories', 'upstream-audit/current-advisories/not-satisfied-by-ledger', false], // this process does not query advisories
];

function writeAcceptance(request) {
  const cases = CASE_RESULTS.map(([group, caseId, passed]) => ({
    case_id: caseId,
    group,
    result: passed ? 'pass' : 'fail',
    detail: passed ? 'observed' : 'not individually sufficient for admission',
  }));
  const failed = cases.filter(item => item.result !== 'pass').map(item => item.case_id);
  const assertion = {
    kind: 'upstream-audit-disposition-observations',
    check_id: 'upstream-audit-disposition',
    run_id: request.runId,
    invocation_id: request.invocation,
    structural_inventory: summary.structural_inventory,
    disposition_admission: summary.disposition_admission,
    security_clearance: 'not-passed',
    g11_claim: 'not-passed',
    counts: summary,
    note: 'Structural row equality is recorded separately from security clearance. Failed cases are the admission gap.',
    cases,
  };
  const assertionPath = join(request.outputDir, 'disposition-observations.json');
  const assertionBytes = Buffer.from(`${JSON.stringify(assertion, null, 2)}\n`);
  writeFileSync(assertionPath, assertionBytes);
  const relativeAssertion = relative(request.runDir, assertionPath).split('\\').join('/');
  const output = {
    path: relativeAssertion,
    sha256: createHash('sha256').update(assertionBytes).digest('hex'),
    bytes: assertionBytes.length,
  };
  const passedIds = cases.filter(item => item.result === 'pass').map(item => item.case_id);
  const admitted = failed.length === 0 && summary.disposition_admission === 'pass';
  const rcReport = {
    schema_version: 1,
    template: false,
    run_id: request.runId,
    check_id: 'upstream-audit-disposition',
    line: request.line,
    invocation_id: request.invocation,
    binding: request.binding,
    coverage: admitted ? 'complete' : 'incomplete',
    result: admitted ? 'pass' : 'fail',
    exit_code: admitted ? 0 : 1,
    g11_claim: 'not-passed',
    subject_kind: 'source',
    subject_ids: ['source'],
    artifacts: {},
    expected_case_ids: cases.map(item => item.case_id),
    discovered_case_ids: cases.map(item => item.case_id),
    executed_case_ids: cases.map(item => item.case_id),
    passed_case_ids: passedIds,
    failed_case_ids: failed,
    skipped_case_ids: [],
    unresolved_case_ids: [],
    exceptions: [],
    passed: passedIds.length,
    failed: failed.length,
    skipped: 0,
    outputs: [output],
    case_results: cases.map(item => ({
      case_id: item.case_id,
      result: item.result,
      kind: 'assertion',
      output_paths: [relativeAssertion],
    })),
    command: ['node', 'scripts/check-upstream-audit-disposition.mjs', '--admission', '--line', line || request.line],
    limitations: [
      `structural_inventory=${summary.structural_inventory}; disposition_admission=${summary.disposition_admission}; security_clearance=not-passed`,
      `insufficient_sensitive=${insufficientSensitive.length}; insufficient_inherited=${insufficientInherited.length}; insufficient_behavior=${insufficientBehavior.length}; missing_evidence=${missingEvidence.length}; circular_evidence=${circularEvidence.length}; symbol_uses_open=${symbolUsesOpen}`,
      'Ledger equality does not query current advisories and does not admit this check.',
    ],
  };
  const reportsDir = join(request.runDir, 'reports');
  mkdirSync(reportsDir, {recursive: true});
  writeFileSync(join(reportsDir, 'upstream-audit-disposition.json'), `${JSON.stringify(rcReport, null, 2)}\n`);
  return failed.length === 0;
}

mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));

const request = coordinatorRequest();
if (request && request.error) fail(2, `upstream-audit-disposition: refusing acceptance report: ${request.error}`);
if (request) {
  const accepted = writeAcceptance(request);
  if (!accepted || !dispositionOk) {
    fail(1, `upstream-audit-disposition admission incomplete: sensitive=${insufficientSensitive.length} inherited=${insufficientInherited.length} behavior=${insufficientBehavior.length} missing_evidence=${missingEvidence.length} circular=${circularEvidence.length} symbols_open=${symbolUsesOpen}`);
  }
}
if (!structuralOk) {
  fail(1, `upstream-audit-disposition incomplete: missing=${missing.length} unresolved=${unresolved.length} conflicting=${conflicts.length} outside=${outside.length} security_docs_only=${securityDocsOnly.length} unknown=${unknown.length}`);
}
if (admission && !dispositionOk) {
  fail(1, `upstream-audit-disposition admission incomplete: sensitive=${insufficientSensitive.length} inherited=${insufficientInherited.length} behavior=${insufficientBehavior.length} missing_evidence=${missingEvidence.length} circular=${circularEvidence.length} symbols_open=${symbolUsesOpen} branch=${missingBranch.length}`);
}
