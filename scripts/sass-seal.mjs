#!/usr/bin/env node
/**
 * Peer-aware Sass seal against a packed library artifact (full-verify sass-seal).
 *
 * Installs the identified tarball plus exact public peers in an isolated
 * consumer, compiles the packed facade allowing only declared @angular/material
 * (and @angular/cdk) public Sass, rejects archived @material/* and undeclared
 * workspace loads, runs the three sealed value fixtures, compares the finite
 * exact ordered-CSS fixtures, and proves a forbidden-import negative.
 *
 * The ordered-CSS roster is only the strict nonempty fixtures that match the
 * sealed reference. It does not close sass-api-and-values, isolation-negatives,
 * DOM, or 21.x, and it does not mark sass-seal accepted.
 *
 *   node scripts/sass-seal.mjs --tarball <path>
 *   node scripts/sass-seal.mjs --run <run.json>
 *
 * Does not claim G06–G08.
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseLegacyArgs, resolveLibraryFromRun, sha256File} from './resolve-run-library.mjs';
import {ORDERED_CSS_FIXTURE_IDS, UNRESOLVED_STRICT_CSS, runOrderedCss, writeOrderedCssAssertions} from './sass-ordered-css.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sealedPath = join(root, 'reference/material-16.2.14/sass-values/sass-value-report.json');
const reportPath = join(root, 'compatibility/rc/reports/sass-seal.json');
const sass = createRequire(join(root, 'package.json'))('sass');

const PEER_MATERIAL = '22.1.7';
const PEER_CDK = '22.1.7';
const ALLOWED_PREFIXES = ['@angular/material', '@angular/cdk'];

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

const {runPath, tarball: tarballArg, unknown} = parseLegacyArgs(process.argv.slice(2));
if (unknown.length) fail(2, `Unknown argument: ${unknown[0]}`);

let tarball;
let runId = null;
if (runPath) {
  const resolved = resolveLibraryFromRun(runPath);
  tarball = resolved.tarball;
  runId = resolved.draft?.run_id ?? null;
} else if (tarballArg) {
  tarball = tarballArg;
} else {
  fail(2, '--tarball or --run is required');
}
if (!existsSync(tarball)) fail(2, `Missing tarball: ${tarball}`);
if (!existsSync(sealedPath)) fail(2, `Missing sealed report: ${sealedPath}`);

const tarballSha = sha256File(tarball);
const consumer = mkdtempSync(join(tmpdir(), 'ngx-compat-sass-seal-'));
const installTarball = join(consumer, 'library.tgz');
writeFileSync(installTarball, readFileSync(tarball));
writeFileSync(join(consumer, 'package.json'), JSON.stringify({
  name: 'ngx-compat-sass-seal-consumer',
  private: true,
  dependencies: {
    '@angular/cdk': PEER_CDK,
    '@angular/material': PEER_MATERIAL,
    sass: JSON.parse(readFileSync(join(root, 'node_modules/sass/package.json'), 'utf8')).version,
    '@ngx-compat/material-legacy': `file:${installTarball}`,
  },
}, null, 2));
writeFileSync(join(consumer, '.npmrc'), 'install-links=true\nfund=false\naudit=false\n');

const env = {...process.env, NODE_PATH: '', NODE_OPTIONS: ''};
delete env.NODE_PATH;
const install = spawnSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock'], {
  cwd: consumer,
  encoding: 'utf8',
  timeout: 180000,
  env,
});
if (install.status !== 0) {
  fail(1, `npm install failed\n${(install.stderr || install.stdout || '').slice(-2000)}`);
}

const installedLib = realpathSync(join(consumer, 'node_modules/@ngx-compat/material-legacy'));
if (relative(realpathSync(consumer), installedLib).startsWith('..')) {
  fail(1, `Library resolved outside the consumer: ${installedLib}`);
}
const installedMaterial = realpathSync(join(consumer, 'node_modules/@angular/material'));
if (relative(realpathSync(consumer), installedMaterial).startsWith('..')) {
  fail(1, `Material peer resolved outside the consumer: ${installedMaterial}`);
}
// Guard against workspace ancestry: installed material must not be the workspace copy.
const workspaceMaterial = resolve(root, 'node_modules/@angular/material');
if (existsSync(workspaceMaterial) && realpathSync(workspaceMaterial) === installedMaterial) {
  fail(1, 'Material peer resolved to the workspace node_modules (not isolated)');
}

const entry = join(installedLib, '_index.scss');
if (!existsSync(entry)) fail(1, 'Packed package missing _index.scss');

const requested = [];
const denied = [];
function isAllowed(url) {
  const s = String(url);
  return ALLOWED_PREFIXES.some(prefix => s === prefix || s.startsWith(prefix + '/'));
}
function isForbiddenArchived(url) {
  const s = String(url);
  return s === '@material' || s.startsWith('@material/') || s === 'material' || s.startsWith('material/');
}

let compiled = false;
let compileError = null;
let cssBytes = 0;
try {
  const result = sass.compile(entry, {
    style: 'expanded',
    sourceMap: false,
    loadPaths: [join(consumer, 'node_modules')],
    importers: [{
      findFileUrl(url) {
        const s = String(url);
        requested.push(s);
        if (isForbiddenArchived(s)) {
          denied.push(s);
          throw new Error(`sass-seal refused archived import: ${s}`);
        }
        if (isAllowed(s)) {
          // Fall through to loadPaths / package exports resolution.
          return null;
        }
        // Relative loads are handled by the compiler before importers for file URLs;
        // bare undeclared specs must not resolve via workspace.
        if (!s.startsWith('.') && !s.startsWith('file:')) {
          denied.push(s);
          throw new Error(`sass-seal refused undeclared import: ${s}`);
        }
        return null;
      },
    }],
  });
  compiled = true;
  cssBytes = Buffer.byteLength(result.css, 'utf8');
} catch (err) {
  compileError = String(err);
}

// Negative: a fixture that @use '@material/button' must fail under the same policy.
const negativeDir = mkdtempSync(join(tmpdir(), 'ngx-compat-sass-neg-'));
const negativeFile = join(negativeDir, 'forbidden.scss');
writeFileSync(negativeFile, "@use '@material/button';\n");
let negativeRejected = false;
let negativeError = null;
try {
  sass.compile(negativeFile, {
    style: 'expanded',
    sourceMap: false,
    loadPaths: [join(consumer, 'node_modules')],
    importers: [{
      findFileUrl(url) {
        const s = String(url);
        if (isForbiddenArchived(s)) {
          throw new Error(`sass-seal refused archived import: ${s}`);
        }
        if (isAllowed(s)) return null;
        if (!s.startsWith('.') && !s.startsWith('file:')) {
          throw new Error(`sass-seal refused undeclared import: ${s}`);
        }
        return null;
      },
    }],
  });
} catch (err) {
  negativeRejected = /refused archived import|Can't find stylesheet|sass-seal refused/i.test(String(err));
  negativeError = String(err).slice(0, 500);
}
rmSync(negativeDir, {recursive: true, force: true});

// Sealed value fixtures in the same isolated peer environment.
const valuesOut = join(consumer, 'sass-values-out');
// run-sass-value-fixtures requires a non-existing output directory.
const valuesRun = spawnSync(process.execPath, [
  join(root, 'scripts/run-sass-value-fixtures.mjs'),
  '--environment', consumer,
  '--module', '@ngx-compat/material-legacy',
  '--output', valuesOut,
], {cwd: root, encoding: 'utf8', env});
const valuesReportPath = join(valuesOut, 'sass-value-report.json');
let valueComparisons = [];
let valuesOk = false;
if (existsSync(valuesReportPath)) {
  const captured = JSON.parse(readFileSync(valuesReportPath, 'utf8'));
  const sealed = JSON.parse(readFileSync(sealedPath, 'utf8'));
  valueComparisons = captured.fixtures.map(item => {
    const oracle = sealed.fixtures.find(entryItem => entryItem.id === item.id);
    const match = item.status === 'compiled' && oracle?.status === 'compiled'
      && JSON.stringify(item.debug) === JSON.stringify(oracle.debug);
    return {
      id: item.id,
      owned_status: item.status,
      sealed_status: oracle?.status ?? 'missing',
      debug_matches_sealed: match,
      error: item.error ?? null,
    };
  });
  valuesOk = valueComparisons.length > 0 && valueComparisons.every(c => c.debug_matches_sealed);
}

const orderedCss = runOrderedCss(consumer);
const orderedCssOk = orderedCss.ok;


const materialRequested = requested.some(isAllowed);
const ok = compiled && !compileError && negativeRejected && valuesOk && orderedCssOk && materialRequested;


function writeOrderedCssAssertionFiles(results) {
  const names = ['RC_CHECK_ID', 'RC_RUN_ID', 'RC_INVOCATION_ID', 'RC_EVIDENCE_BINDING', 'RC_ASSERTION_OUTPUT_DIR'];
  const present = names.filter(name => process.env[name]);
  if (present.length === 0) return null;
  if (present.length !== names.length || process.env.RC_CHECK_ID !== 'sass-seal') {
    fail(2, 'sass-seal: incomplete coordinator environment');
  }
  const invocation = process.env.RC_INVOCATION_ID;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,191}$/.test(invocation)) {
    fail(2, 'sass-seal: invalid invocation identity');
  }
  let binding;
  try {
    binding = JSON.parse(process.env.RC_EVIDENCE_BINDING);
  } catch {
    fail(2, 'sass-seal: RC_EVIDENCE_BINDING is not JSON');
  }
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) {
    fail(2, 'sass-seal: binding is not an object');
  }
  if (binding.source_line === '21.x') return null;
  if (binding.source_line !== 'main') fail(2, 'sass-seal: binding source line is not main');
  const outputDir = process.env.RC_ASSERTION_OUTPUT_DIR;
  let stat;
  try {
    stat = lstatSync(outputDir);
  } catch {
    fail(2, 'sass-seal: assertion output directory is missing');
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail(2, 'sass-seal: assertion output directory is not a real directory');
  }
  if (!outputDir.endsWith(join('evidence', 'sass-seal', invocation))) {
    fail(2, 'sass-seal: assertion directory is not check-owned');
  }
  writeOrderedCssAssertions(outputDir, results);
  return outputDir;
}

const report = {
  schema_version: 1,
  role: 'peer-aware packed Sass seal',
  check_id: 'sass-seal',
  run_id: runId,
  tarball_sha256: tarballSha,
  peer_versions: {
    '@angular/material': PEER_MATERIAL,
    '@angular/cdk': PEER_CDK,
  },
  consumer: consumer,
  library_realpath: installedLib,
  material_realpath: installedMaterial,
  compiled,
  css_bytes: cssBytes,
  compile_error: compileError,
  importer_requests: [...new Set(requested)],
  denied_imports: [...new Set(denied)],
  material_peer_requested: materialRequested,
  negative_archived_material_rejected: negativeRejected,
  negative_error: negativeError,
  sealed_value_comparisons: valueComparisons,
  sealed_values_match: valuesOk,
  values_runner_exit: valuesRun.status,
  result: ok ? 'pass' : 'fail',
  ordered_css_case_ids: ORDERED_CSS_FIXTURE_IDS,
  ordered_css_results: orderedCss.results,
  ordered_css_exact: orderedCssOk,
  ordered_css_compile_status: orderedCss.compile_status,
  ordered_css_compare_status: orderedCss.compare_status,
  ordered_css_compile_error: orderedCss.compile_error,
  not_executed: {
    'sass-api-and-values': null,
    'isolation-negatives': null,
    'ordered-css-dom-unresolved-strict': UNRESOLVED_STRICT_CSS,
    '21.x': null,
  },
  limitations: [
    'Seals packed facade compile, three sealed value fixtures, and the finite exact ordered-CSS fixtures under exact public peers.',
    'Ordered CSS cases are only the strict nonempty fixtures that match the sealed reference. Unresolved strict diffs are not rostered and their expected CSS was not rewritten.',
    'Does not execute sass-api-and-values, isolation-negatives, bridge-review fixtures, empty debug CSS, or DOM.',
    'Does not execute the thirteen companion bridge computed-style rows (G07).',
    '21.x sass-seal groups stay null. Does not mark sass-seal accepted. Does not claim G06–G08.',
  ],
};

mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
const assertionDir = writeOrderedCssAssertionFiles(orderedCss.results);
console.log(JSON.stringify({
  ok,
  compiled,
  sealed_values_match: valuesOk,
  ordered_css_exact: orderedCssOk,
  ordered_css_cases: ORDERED_CSS_FIXTURE_IDS.length,
  negative_archived_material_rejected: negativeRejected,
  assertion_dir: assertionDir,
  tarball_sha256: tarballSha,
}, null, 2));

if (!ok) {
  const reasons = [];
  if (!compiled) reasons.push(`compile failed: ${compileError}`);
  if (!negativeRejected) reasons.push('archived @material negative did not refuse');
  if (!valuesOk) reasons.push('sealed value fixtures did not match');
  if (!orderedCssOk) reasons.push('ordered CSS fixtures did not match the sealed reference');
  if (!materialRequested) reasons.push('compile never requested @angular/material peer');
  fail(1, `sass-seal failed: ${reasons.join('; ')}`);
}
