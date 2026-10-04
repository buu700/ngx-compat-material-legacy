#!/usr/bin/env node
/**
 * Engine-free motion lifecycle check.
 *
 * Primary overlay entries must use the public MATERIAL_ANIMATIONS helper and
 * CSS/timer motion. Deleted /animations recipe modules are not required and
 * are not restored. Pass --self-check to test the predicates without reading
 * the tree or writing a receipt.
 *
 * The main host-motion roster is these predicates. It is derived before the
 * workspace is read. 21.x stays unresolved. This is not native-motion.
 */
import {readFileSync, writeFileSync, mkdirSync, lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {join, dirname, resolve, relative} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const trackedReceipt = join(root, 'compatibility/pack-proof/motion-lifecycle-smoke.json');

const PRIMARIES = [
  'dialog',
  'menu',
  'menuHtml',
  'select',
  'selectHtml',
  'formField',
  'formFieldHtml',
  'snackBar',
  'tabs',
  'tabBody',
  'tooltip',
  'tooltipBase',
];

const PRIMARY_SLUG = {
  dialog: 'dialog',
  menu: 'menu',
  menuHtml: 'menu-html',
  select: 'select',
  selectHtml: 'select-html',
  formField: 'form-field',
  formFieldHtml: 'form-field-html',
  snackBar: 'snack-bar',
  tabs: 'tabs',
  tabBody: 'tab-body',
  tooltip: 'tooltip',
  tooltipBase: 'tooltip-base',
};

function caseId(suffix) {
  return `motion-smoke/host-motion/${suffix}`;
}

export const HOST_MOTION_CASES = [
  caseId('helper/no-private-helpers'),
  caseId('helper/public-material-animations'),
  caseId('helper/legacy-animations-disabled'),
  ...PRIMARIES.flatMap(name => [
    caseId(`${PRIMARY_SLUG[name]}/present`),
    caseId(`${PRIMARY_SLUG[name]}/no-engine-import`),
    caseId(`${PRIMARY_SLUG[name]}/no-animations-metadata`),
  ]),
  caseId('dialog/css-open-class'),
  caseId('menu-html/css-motion-class'),
  caseId('menu/css-animation-callback'),
  caseId('select-html/css-motion-class'),
  caseId('snack-bar/css-enter-class'),
  caseId('tabs/css-transition-callback'),
  caseId('tooltip-base/honors-motion-helper'),
];

if (new Set(HOST_MOTION_CASES).size !== HOST_MOTION_CASES.length) {
  throw new Error('host-motion case ids are not unique');
}

const engineImport = /from\s+['"]@angular\/animations['"]/;
const privateHelper = /(?<![A-Za-z])_getAnimationsState\s*\(|(?<![A-Za-z])_animationsDisabled\s*\(/;
const animationsMetadata = /(^|\n)\s*animations\s*:/;

export function hostMotionObservations(files) {
  const found = new Map();
  function observe(id, ok, detail) {
    if (!HOST_MOTION_CASES.includes(id)) {
      throw new Error(`unreviewed host-motion case: ${id}`);
    }
    if (found.has(id)) throw new Error(`duplicate host-motion observation: ${id}`);
    found.set(id, {case_id: id, result: ok ? 'pass' : 'fail', detail: ok ? 'observed' : detail});
  }

  const helper = files.helper ?? '';
  observe(
    caseId('helper/no-private-helpers'),
    !privateHelper.test(helper),
    'helper must not call private Material animation helpers',
  );
  observe(
    caseId('helper/public-material-animations'),
    helper.includes('MATERIAL_ANIMATIONS') && helper.includes("from '@angular/material/core'"),
    'helper must import public MATERIAL_ANIMATIONS',
  );
  observe(
    caseId('helper/legacy-animations-disabled'),
    helper.includes('legacyAnimationsDisabled'),
    'helper missing legacyAnimationsDisabled',
  );

  for (const name of PRIMARIES) {
    const slug = PRIMARY_SLUG[name];
    const text = files[name] ?? '';
    observe(caseId(`${slug}/present`), Boolean(text), `missing primary source: ${name}`);
    observe(caseId(`${slug}/no-engine-import`), !engineImport.test(text), `${name} imports @angular/animations`);
    observe(
      caseId(`${slug}/no-animations-metadata`),
      !animationsMetadata.test(text),
      `${name} still declares an animations metadata array`,
    );
  }

  const dialog = files.dialog ?? '';
  observe(
    caseId('dialog/css-open-class'),
    Boolean(dialog) && dialog.includes('mat-legacy-dialog-container-open'),
    'dialog is missing its CSS open class',
  );
  const menuHtml = files.menuHtml ?? '';
  observe(
    caseId('menu-html/css-motion-class'),
    Boolean(menuHtml) && menuHtml.includes('mat-menu-panel-animations-enabled'),
    'menu panel is missing its CSS motion class',
  );
  const menu = files.menu ?? '';
  observe(
    caseId('menu/css-animation-callback'),
    Boolean(menu) && menu.includes('_onCssAnimationDone'),
    'menu is missing the CSS animation callback',
  );
  const selectHtml = files.selectHtml ?? '';
  observe(
    caseId('select-html/css-motion-class'),
    Boolean(selectHtml) && selectHtml.includes('mat-select-panel-animations-enabled'),
    'select panel is missing its CSS motion class',
  );
  const snackBar = files.snackBar ?? '';
  observe(
    caseId('snack-bar/css-enter-class'),
    Boolean(snackBar) && snackBar.includes('mat-snack-bar-container-enter'),
    'snack-bar is missing its CSS enter class',
  );
  const tabs = files.tabs ?? '';
  observe(
    caseId('tabs/css-transition-callback'),
    Boolean(tabs) && tabs.includes('_onContentTransitionEnd'),
    'tabs are missing the CSS transition callback',
  );
  const tooltipBase = files.tooltipBase ?? '';
  observe(
    caseId('tooltip-base/honors-motion-helper'),
    Boolean(tooltipBase) && tooltipBase.includes('legacyAnimationsDisabled'),
    'tooltip does not honor the motion helper',
  );

  const missing = HOST_MOTION_CASES.filter(id => !found.has(id));
  if (missing.length) throw new Error(`host-motion observations missing: ${missing.join(', ')}`);
  return HOST_MOTION_CASES.map(id => found.get(id));
}

export function lifecycleErrors(files) {
  return hostMotionObservations(files)
    .filter(item => item.result !== 'pass')
    .map(item => item.detail);
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function receiptPath() {
  const directed = process.env.RC_ASSERTION_OUTPUT_DIR;
  if (process.env.RC_CHECK_ID === 'motion-smoke' && directed) {
    const target = join(directed, 'motion-lifecycle-smoke.json');
    if (resolve(target) === resolve(trackedReceipt)) {
      throw new Error('motion receipt must not overwrite the tracked pack-proof file');
    }
    return target;
  }
  return trackedReceipt;
}

function gitValue(args) {
  const result = spawnSync('git', args, {cwd: root, encoding: 'utf8'});
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

export function coordinatorRequest() {
  // A directed receipt (RC_CHECK_ID + RC_ASSERTION_OUTPUT_DIR) is not acceptance.
  // Acceptance starts only when the coordinator also supplies run identity.
  const names = ['RC_RUN_ID', 'RC_INVOCATION_ID', 'RC_EVIDENCE_BINDING'];
  const present = names.filter(name => process.env[name]);
  if (present.length === 0) return null;
  if (present.length !== names.length || process.env.RC_CHECK_ID !== 'motion-smoke' || !process.env.RC_ASSERTION_OUTPUT_DIR) {
    return {error: 'incomplete coordinator environment'};
  }
  const invocation = process.env.RC_INVOCATION_ID;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,191}$/.test(invocation)) {
    return {error: 'invalid invocation identity'};
  }
  let binding;
  try {
    binding = JSON.parse(process.env.RC_EVIDENCE_BINDING);
  } catch {
    return {error: 'RC_EVIDENCE_BINDING is not JSON'};
  }
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) {
    return {error: 'binding is not an object'};
  }
  if (binding.run_id !== process.env.RC_RUN_ID) {
    return {error: 'binding run_id does not match RC_RUN_ID'};
  }
  if (binding.source_line === '21.x') return {skip: true};
  if (binding.source_line !== 'main') return {error: 'binding source line is not a supported line'};
  const commit = gitValue(['rev-parse', 'HEAD']);
  const tree = gitValue(['rev-parse', 'HEAD^{tree}']);
  if (!commit || !tree || binding.source_commit !== commit || binding.source_tree !== tree) {
    return {error: 'binding source identity does not match this checkout'};
  }
  const outputDir = process.env.RC_ASSERTION_OUTPUT_DIR;
  let stat;
  try {
    stat = lstatSync(outputDir);
  } catch {
    return {error: 'assertion output directory is missing'};
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    return {error: 'assertion output directory is not a real directory'};
  }
  const expectedSuffix = join('evidence', 'motion-smoke', invocation);
  if (!outputDir.endsWith(expectedSuffix)) return {error: 'assertion directory is not check-owned'};
  return {
    binding,
    invocation,
    runId: process.env.RC_RUN_ID,
    outputDir,
    runDir: resolve(outputDir, '..', '..', '..'),
    line: 'main',
  };
}

export function writeAcceptance(request, observations, fileHashes) {
  const failed = observations.filter(item => item.result !== 'pass').map(item => item.case_id);
  const passed = failed.length === 0 && observations.length === HOST_MOTION_CASES.length;
  const assertion = {
    kind: 'host-motion-source-observations',
    check_id: 'motion-smoke',
    run_id: request.runId,
    invocation_id: request.invocation,
    note: 'Each case is one source predicate the lifecycle runner already evaluated. This is not a native-motion browser result and not a 21.x roster.',
    file_sha256: fileHashes,
    cases: observations,
  };
  const assertionPath = join(request.outputDir, 'host-motion-observations.json');
  const assertionBytes = Buffer.from(`${JSON.stringify(assertion, null, 2)}\n`);
  writeFileSync(assertionPath, assertionBytes);
  const relativeAssertion = relative(request.runDir, assertionPath).split('\\').join('/');
  const output = {
    path: relativeAssertion,
    sha256: createHash('sha256').update(assertionBytes).digest('hex'),
    bytes: assertionBytes.length,
  };
  const ids = observations.map(item => item.case_id);
  const report = {
    schema_version: 1,
    template: false,
    run_id: request.runId,
    check_id: 'motion-smoke',
    line: request.line,
    invocation_id: request.invocation,
    binding: request.binding,
    coverage: passed ? 'complete' : 'incomplete',
    result: passed ? 'pass' : 'fail',
    exit_code: passed ? 0 : 1,
    g04_claim: 'not-passed',
    subject_kind: 'source',
    subject_ids: ['source'],
    artifacts: {},
    expected_case_ids: ids,
    discovered_case_ids: ids,
    executed_case_ids: ids,
    passed_case_ids: observations.filter(item => item.result === 'pass').map(item => item.case_id),
    failed_case_ids: failed,
    skipped_case_ids: [],
    unresolved_case_ids: [],
    exceptions: [],
    passed: observations.length - failed.length,
    failed: failed.length,
    skipped: 0,
    outputs: [output],
    case_results: observations.map(item => ({
      case_id: item.case_id,
      result: item.result,
      kind: 'assertion',
      output_paths: [relativeAssertion],
    })),
    command: ['node', 'scripts/motion-lifecycle-smoke.mjs'],
    limitations: [
      'Source lifecycle predicates for the main host-motion roster. Not a packed artifact and not the native-motion browser cases.',
      '21.x host-motion stays unresolved.',
      'A passing roster does not claim G04.',
    ],
  };
  const reportsDir = join(request.runDir, 'reports');
  mkdirSync(reportsDir, {recursive: true});
  writeFileSync(join(reportsDir, 'motion-smoke.json'), `${JSON.stringify(report, null, 2)}\n`);
  return passed;
}

function selfCheck() {
  const clean = {
    helper: "import {MATERIAL_ANIMATIONS} from '@angular/material/core';\nexport function legacyAnimationsDisabled() { return false; }\n",
    dialog: 'const OPEN_CLASS = "mat-legacy-dialog-container-open";\n',
    menu: '_onCssAnimationDone()\n',
    menuHtml: '[class.mat-menu-panel-animations-enabled]\n',
    select: 'legacyAnimationsDisabled()\n',
    selectHtml: '[class.mat-select-panel-animations-enabled]\n',
    formField: 'legacyAnimationsDisabled()\n',
    formFieldHtml: 'class="mat-form-field-subscript-message"\n',
    snackBar: "'[class.mat-snack-bar-container-enter]'\n",
    tabs: '_onContentTransitionEnd()\n',
    tabBody: 'class TabBody {}\n',
    tooltip: 'class Tooltip {}\n',
    tooltipBase: 'legacyAnimationsDisabled()\n',
  };
  const failures = [];
  const cleanCases = hostMotionObservations(clean);
  if (cleanCases.length !== HOST_MOTION_CASES.length) failures.push('clean fixture did not evaluate every case');
  if (cleanCases.some(item => item.result !== 'pass')) failures.push('clean fixture should pass');
  if (lifecycleErrors(clean).length !== 0) failures.push('clean fixture errors should be empty');
  const engine = hostMotionObservations({
    ...clean,
    dialog: `${clean.dialog}\nimport {trigger} from '@angular/animations';\n`,
  });
  if (engine.filter(item => item.result !== 'pass').map(item => item.case_id).join() !== caseId('dialog/no-engine-import')) {
    failures.push('engine import should fail only dialog/no-engine-import');
  }
  const metadata = hostMotionObservations({...clean, tooltip: 'animations: []\n'});
  if (!metadata.some(item => item.result !== 'pass' && item.case_id === caseId('tooltip/no-animations-metadata'))) {
    failures.push('animations metadata should fail');
  }
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exit(1);
  }
  console.log(`motion lifecycle self-check passed (${HOST_MOTION_CASES.length} cases)`);
  process.exit(0);
}

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

export function workspaceMotionFiles() {
  return {
    helper: read('projects/ngx-material-legacy/legacy-core/internal/legacy-animations.ts'),
    dialog: read('projects/ngx-material-legacy/legacy-dialog/dialog-container.ts'),
    menu: read('projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts'),
    menuHtml: read('projects/ngx-material-legacy/legacy-menu/menu.html'),
    select: read('projects/ngx-material-legacy/legacy-select/select.ts'),
    selectHtml: read('projects/ngx-material-legacy/legacy-select/select.html'),
    formField: read('projects/ngx-material-legacy/legacy-form-field/form-field.ts'),
    formFieldHtml: read('projects/ngx-material-legacy/legacy-form-field/form-field.html'),
    snackBar: read('projects/ngx-material-legacy/legacy-snack-bar/snack-bar-container.ts'),
    tabs: read('projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts'),
    tabBody: read('projects/ngx-material-legacy/legacy-tabs/tab-body.ts'),
    tooltip: read('projects/ngx-material-legacy/legacy-tooltip/tooltip.ts'),
    tooltipBase: read('projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts'),
  };
}

function isDirectRun() {
  if (!process.argv[1]) return false;
  return pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
}

function main() {
  if (process.argv.includes('--self-check')) selfCheck();
  if (process.argv.includes('--print-cases')) {
    process.stdout.write(`${JSON.stringify(HOST_MOTION_CASES)}\n`);
    return;
  }
  const files = workspaceMotionFiles();
  const observations = hostMotionObservations(files);
  const errors = observations.filter(item => item.result !== 'pass').map(item => item.detail);
  const result = {
    schema_version: 3,
    captured_at: new Date().toISOString(),
    status: errors.length ? 'fail' : 'ok',
    evidence_binding: 'source-lifecycle',
    artifact: null,
    errors,
    helper_sha256: sha256(files.helper),
    limitations: [
      'Checks current source. It does not consume a packed tarball and is not a release receipt.',
      'Deleted /animations recipe modules are not required.',
    ],
  };
  const outPath = receiptPath();
  mkdirSync(dirname(outPath), {recursive: true});
  writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
  const request = coordinatorRequest();
  if (request?.error) {
    console.error(`motion-smoke: refusing acceptance report: ${request.error}`);
    process.exit(2);
  }
  if (request && !request.skip) {
    const hashes = Object.fromEntries(Object.entries(files).map(([name, text]) => [name, sha256(text)]));
    const accepted = writeAcceptance(request, observations, hashes);
    if (!accepted) {
      console.error(JSON.stringify(result, null, 2));
      process.exit(1);
    }
  } else if (errors.length) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({status: result.status, errors: result.errors, cases: observations.length}));
}

if (isDirectRun()) main();
