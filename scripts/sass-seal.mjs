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
 * sass-api-and-values: the predeclared case set comes from the frozen authentic
 * Material 16.2.14 inventory (compatibility/rc/oracles/material-16.2.14-sass-api.json,
 * scripts/sass-api-inventory.mjs): every exported variable value, function and
 * mixin signature, the CSS of every mixin invoked with the one predeclared
 * theme, and all-* aggregate membership/order. The ordered-CSS roster is every
 * non-debug fixture of fixtures/sass/manifest.json against the unmodified
 * sealed CSS. A failing case whose exact expected/candidate digests are named
 * by a pending decision (compatibility/rc/sass-pending-decisions.json) is
 * reported as pending; it never passes and writes no assertion. Isolation
 * negatives: archived @material/button rejection, a mutated sealed CSS copy,
 * a hidden load-path resolution, and API drift. Targeted real owned-control DOM styles are compared to untouched tagged CSS; the other release line is not credited.
 *
 *   node scripts/sass-seal.mjs --tarball <path>
 *   node scripts/sass-seal.mjs --run <run.json>
 *
 * Does not claim G06–G08.
 */
import {createHash} from 'node:crypto';
import {runFunctionContracts} from './sass-function-contracts.mjs';
import {ownedStyleCaseIds, renderOwnedStyles} from './sass-owned-rendered.mjs';
import {coordinatorRequest} from './packed-consumer-evidence.mjs';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {
  cpSync,
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
import {fileURLToPath, pathToFileURL} from 'node:url';
import {parseLegacyArgs, resolveLibraryFromRun, sha256File} from './resolve-run-library.mjs';
import {
  ORDERED_CSS_FIXTURE_IDS,
  UNRESOLVED_STRICT_CSS,
  compareOrderedCss,
  runOrderedCss,
  writeOrderedCssAssertions,
  writeReferenceCss,
} from './sass-ordered-css.mjs';
import {
  apiCaseIds,
  sassResultsComplete,
  apiDriftNegative,
  classifyPending,
  compareInventory,
  compileInvocation,
  inventoryModule,
  invocationPlan,
} from './sass-api-inventory.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sealedPath = join(root, 'reference/material-16.2.14/sass-values/sass-value-report.json');
const reportPath = join(root, 'compatibility/rc/reports/sass-seal.json');
export const API_ORACLE_PATH = join(root, 'compatibility/rc/oracles/material-16.2.14-sass-api.json');
export const PENDING_DECISIONS_PATH = join(root, 'compatibility/rc/sass-pending-decisions.json');
const sass = createRequire(join(root, 'package.json'))('sass');

const PEER_MATERIAL = '22.1.7';
const PEER_CDK = '22.1.7';
const ALLOWED_PREFIXES = ['@angular/material', '@angular/cdk'];

export const ISOLATION_NEGATIVE_IDS = Object.freeze([
  'archived-import',
  'mutated-golden',
  'hidden-resolution',
  'api-drift',
]);

const SEALED_CARD_CSS = join(root, 'reference/material-16.2.14/sass-css/owned-legacy-card.css');
const CARD_DECLARATION = 'background: white;';
const CARD_MUTATION = 'background: black;';

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

function isAllowed(url) {
  const s = String(url);
  return ALLOWED_PREFIXES.some(prefix => s === prefix || s.startsWith(prefix + '/'));
}

function isForbiddenArchived(url) {
  const s = String(url);
  return s === '@material' || s.startsWith('@material/') || s === 'material' || s.startsWith('material/');
}

function makeImporter({requested, denied} = {}) {
  return {
    findFileUrl(url) {
      const s = String(url);
      if (requested) requested.push(s);
      if (isForbiddenArchived(s)) {
        if (denied) denied.push(s);
        throw new Error(`sass-seal refused archived import: ${s}`);
      }
      if (isAllowed(s)) return null;
      if (!s.startsWith('.') && !s.startsWith('file:')) {
        if (denied) denied.push(s);
        throw new Error(`sass-seal refused undeclared import: ${s}`);
      }
      return null;
    },
  };
}

export function archivedImportAssertion({compiled, error}) {
  const text = error == null ? '' : String(error);
  const rejected = compiled === false && /refused archived import|Can't find stylesheet|sass-seal refused/i.test(text);
  return {
    case_id: 'archived-import',
    result: rejected ? 'pass' : 'fail',
    kind: 'assertion',
    compiled: compiled === true,
    rejected,
    error: text ? text.slice(0, 500) : null,
    note: 'Archived @material/button must be rejected. This negative fails if that import compiles.',
  };
}

export function runArchivedImportNegative(loadPaths = []) {
  const negativeDir = mkdtempSync(join(tmpdir(), 'ngx-compat-sass-neg-'));
  const negativeFile = join(negativeDir, 'forbidden.scss');
  writeFileSync(negativeFile, "@use '@material/button';\n");
  let compiled = false;
  let error = null;
  try {
    sass.compile(negativeFile, {
      style: 'expanded',
      sourceMap: false,
      loadPaths,
      importers: [makeImporter()],
    });
    compiled = true;
  } catch (err) {
    error = String(err);
  } finally {
    rmSync(negativeDir, {recursive: true, force: true});
  }
  return archivedImportAssertion({compiled, error});
}

/** Loaded stylesheet URLs outside the allowed real roots. */
export function foreignLoads(urls, roots) {
  const allowed = roots.map(item => realpathSync(item));
  const foreign = [];
  for (const url of urls) {
    const text = String(url);
    if (!text.startsWith('file:')) continue;
    let path = fileURLToPath(text);
    try { path = realpathSync(path); } catch { /* keep the literal path */ }
    if (!allowed.some(rootPath => path === rootPath || path.startsWith(rootPath + '/'))) foreign.push(path);
  }
  return foreign;
}

/**
 * A bare module that only an undeclared extra load path can satisfy must be
 * refused by the seal importer, and the loaded-URL audit must flag it when it
 * is resolved without the importer.
 */
export function runHiddenResolutionNegative(loadPaths = [], allowedRoots = []) {
  const scratch = mkdtempSync(join(tmpdir(), 'ngx-compat-sass-hidden-'));
  const shadow = join(scratch, 'shadow');
  mkdirSync(shadow);
  writeFileSync(join(shadow, '_hidden-legacy-theme.scss'), '@mixin theme() { .hidden { color: red; } }\n');
  const source = "@use 'hidden-legacy-theme' as hidden;\n@include hidden.theme();\n";
  let refused = false;
  let error = null;
  let flagged = [];
  try {
    try {
      sass.compileString(source, {loadPaths: [...loadPaths, shadow], importers: [makeImporter()]});
    } catch (err) {
      error = String(err.message || err).split('\n')[0];
      refused = /refused undeclared import: hidden-legacy-theme/.test(error);
    }
    const unguarded = sass.compileString(source, {loadPaths: [...loadPaths, shadow]});
    flagged = foreignLoads(unguarded.loadedUrls.map(url => url.href), allowedRoots.length ? allowedRoots : loadPaths);
  } finally {
    rmSync(scratch, {recursive: true, force: true});
  }
  const detected = refused && flagged.some(path => path.endsWith('_hidden-legacy-theme.scss'));
  return {
    case_id: 'hidden-resolution',
    result: detected ? 'pass' : 'fail',
    kind: 'assertion',
    refused,
    flagged_foreign: flagged.length,
    error,
    note: 'A bare import satisfiable only by an undeclared extra load path must be refused by the seal importer and flagged by the loaded-URL audit.',
  };
}

export function apiDriftAssertion(drift) {
  return {
    case_id: 'api-drift',
    result: drift?.detected ? 'pass' : 'fail',
    kind: 'assertion',
    mutated: drift?.mutated ?? [],
    newly_failed: drift?.newly_failed ?? [],
    note: 'Wrong-but-nonempty mutations of the candidate inventory (a variable value, a parameter default, a removed mixin, a CSS digest) must fail exactly their own cases.',
  };
}

export function mutatedGoldenAssertion({compareStatus, cardStatus, othersExact}) {
  const detected = typeof compareStatus === 'number' && compareStatus !== 0
    && cardStatus && cardStatus !== 'exact' && othersExact === true;
  return {
    case_id: 'mutated-golden',
    result: detected ? 'pass' : 'fail',
    kind: 'assertion',
    compare_status: typeof compareStatus === 'number' ? compareStatus : null,
    mismatched_file: detected ? 'owned-legacy-card.css' : null,
    candidate_status: cardStatus ?? null,
    note: 'Temp copy of sealed owned-legacy-card.css with one declaration changed. Passes only when scripts/compare-css.py is nonzero.',
  };
}

export function runMutatedGoldenNegative() {
  const scratch = mkdtempSync(join(tmpdir(), 'ngx-compat-sass-mut-'));
  const sealedBefore = readFileSync(SEALED_CARD_CSS);
  try {
    const reference = join(scratch, 'reference');
    const candidate = join(scratch, 'candidate');
    writeReferenceCss(reference);
    cpSync(reference, candidate, {recursive: true});
    const cssPath = join(candidate, 'owned-legacy-card.css');
    if (resolve(cssPath) === resolve(SEALED_CARD_CSS)) {
      throw new Error('refusing to mutate the sealed expected CSS');
    }
    const original = readFileSync(cssPath, 'utf8');
    if (original.split(CARD_DECLARATION).length !== 2) {
      return mutatedGoldenAssertion({compareStatus: null, cardStatus: 'missing-declaration', othersExact: false});
    }
    writeFileSync(cssPath, original.replace(CARD_DECLARATION, CARD_MUTATION));
    const compared = compareOrderedCss(reference, candidate, join(scratch, 'compare.json'));
    const files = compared.report?.files || [];
    const card = files.find(item => item.file === 'owned-legacy-card.css');
    const othersExact = ORDERED_CSS_FIXTURE_IDS
      .filter(id => id !== 'owned-legacy-card')
      .every(id => files.find(item => item.file === `${id}.css`)?.status === 'exact');
    return mutatedGoldenAssertion({
      compareStatus: compared.status,
      cardStatus: card?.status ?? null,
      othersExact,
    });
  } finally {
    const sealedAfter = readFileSync(SEALED_CARD_CSS);
    if (!sealedBefore.equals(sealedAfter)) {
      throw new Error('sealed expected CSS was modified');
    }
    rmSync(scratch, {recursive: true, force: true});
  }
}

export function runIsolationNegatives(loadPaths = [], {allowedRoots = [], drift = null} = {}) {
  const results = [
    runArchivedImportNegative(loadPaths),
    runMutatedGoldenNegative(),
    runHiddenResolutionNegative(loadPaths, allowedRoots),
    apiDriftAssertion(drift),
  ];
  if (results.map(item => item.case_id).join('\0') !== ISOLATION_NEGATIVE_IDS.join('\0')) {
    throw new Error('isolation negatives did not execute the rostered ids');
  }
  return results;
}

export function writeIsolationNegativeAssertions(outputDir, results) {
  if (results.map(item => item.case_id).join('\0') !== ISOLATION_NEGATIVE_IDS.join('\0')) {
    throw new Error('isolation negative results do not match the executed roster');
  }
  const outputs = [];
  for (const item of results) {
    const body = {
      case_id: item.case_id,
      result: item.result,
      kind: 'assertion',
      note: item.note,
    };
    if (item.case_id === 'archived-import') {
      body.compiled = item.compiled;
      body.rejected = item.rejected;
    } else if (item.case_id === 'mutated-golden') {
      body.compare_status = item.compare_status;
      body.mismatched_file = item.mismatched_file;
    } else if (item.case_id === 'hidden-resolution') {
      body.refused = item.refused;
      body.flagged_foreign = item.flagged_foreign;
    } else if (item.case_id === 'api-drift') {
      body.mutated = item.mutated;
      body.newly_failed = item.newly_failed;
    }
    const bytes = Buffer.from(`${JSON.stringify(body, null, 2)}\n`);
    const name = `${item.case_id}.json`;
    writeFileSync(join(outputDir, name), bytes);
    outputs.push({name, bytes: bytes.length});
  }
  return outputs;
}

function sha256Text(text) {
  return createHash('sha256').update(text).digest('hex');
}

/** Candidate inventory and planned invocations through the seal importer and load-URL audit. */
export function runSassApi({oracle, entryFile, loadPaths, packageRoot, allowedRoots, importer = makeImporter()}) {
  const moduleUrl = pathToFileURL(entryFile).href;
  const members = inventoryModule({sass, moduleUrl, loadPaths, packageRoot, importers: [importer]});
  const css = {};
  for (const [name, entry] of Object.entries(oracle.members.mixins)) {
    // The plan comes from the authentic signature, never from the candidate.
    const plan = invocationPlan(name, entry);
    if (!plan.invocable) continue;
    const compiled = compileInvocation(sass, moduleUrl, loadPaths, plan.call, {importers: [importer]});
    if (compiled.error) {
      css[name] = {error: compiled.error};
      continue;
    }
    const foreign = foreignLoads(compiled.loaded, allowedRoots);
    css[name] = foreign.length
      ? {error: `loaded outside the packed package and peers: ${foreign[0]}`}
      : {css: compiled.css, sha256: sha256Text(compiled.css)};
  }
  return {members, css};
}

export function apiAssertionBody(result, {oracleSha256, tarballSha256, runId, invocationId}) {
  const body = {
    case_id: result.case_id,
    result: 'pass',
    kind: 'assertion',
    group: 'sass-api-and-values',
    check_id: 'sass-seal',
    line: 'main',
    run_id: runId,
    invocation_id: invocationId,
    tarball_sha256: tarballSha256,
    oracle: 'compatibility/rc/oracles/material-16.2.14-sass-api.json',
    oracle_sha256: oracleSha256,
  };
  for (const key of ['expected', 'actual', 'expected_params', 'actual_params', 'expected_sha256', 'actual_sha256', 'expected_bytes', 'actual_bytes']) {
    if (result[key] !== undefined) body[key] = result[key];
  }
  return body;
}

export function apiAssertionFileName(caseId) {
  return `${caseId.replace(/\//g, '__')}.json`;
}

async function main() {
  const ownedIds = ownedStyleCaseIds();
  const request = coordinatorRequest('sass-seal');
  if (request?.error) fail(2, request.error);
  const {runPath, tarball: tarballArg, unknown} = parseLegacyArgs(process.argv.slice(2));
  if (unknown.length) fail(2, `Unknown argument: ${unknown[0]}`);

  let tarball;
  let runId = null;
  if (runPath) {
    const resolved = resolveLibraryFromRun(runPath);
    tarball = resolved.tarball;
    runId = resolved.draft?.run_id ?? null;
    if (request && (request.line !== resolved.line || request.runId !== runId)) fail(2, 'sass-seal: foreign run line or identity');
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

  let compiled = false;
  let compileError = null;
  let cssBytes = 0;
  try {
    const result = sass.compile(entry, {
      style: 'expanded',
      sourceMap: false,
      loadPaths: [join(consumer, 'node_modules')],
      importers: [makeImporter({requested, denied})],
    });
    compiled = true;
    cssBytes = Buffer.byteLength(result.css, 'utf8');
  } catch (err) {
    compileError = String(err);
  }

  // sass-api-and-values against the frozen authentic 16.2.14 inventory.
  const oracleText = readFileSync(API_ORACLE_PATH, 'utf8');
  const oracle = JSON.parse(oracleText);
  const decisions = JSON.parse(readFileSync(PENDING_DECISIONS_PATH, 'utf8'));
  const allowedRoots = [installedLib, installedMaterial, realpathSync(join(consumer, 'node_modules/@angular/cdk'))];
  const api = runSassApi({
    oracle, entryFile: entry, loadPaths: [join(consumer, 'node_modules')], packageRoot: installedLib, allowedRoots,
  });
  const apiIds = apiCaseIds(oracle);
  const apiResults = classifyPending(compareInventory(oracle, api.members, api.css), decisions);
  if (JSON.stringify(apiResults.map(item => item.case_id)) !== JSON.stringify(apiIds)) {
    fail(1, 'sass-api-and-values results do not match the predeclared case ids');
  }
  const drift = apiDriftNegative(oracle, api.members, api.css);
  let functions;
  try {functions = runFunctionContracts({sass,entry,loadPaths:[join(consumer,'node_modules')],allowedRoots,
    importers:[makeImporter({requested,denied})],line:'main'});}
  catch (error) {functions={ok:false,error:error.message,results:[]};}

  // Isolation negatives actually executed by this seal: archived import refusal,
  // a temp-copy declaration mutation that compare-css.py must reject, a hidden
  // load-path resolution, and API drift.
  const isolation = runIsolationNegatives([join(consumer, 'node_modules')], {allowedRoots, drift});
  const archivedNegative = isolation[0];
  const mutatedNegative = isolation[1];
  const negativeRejected = archivedNegative.result === 'pass';
  const negativeError = archivedNegative.error;
  const isolationOk = isolation.every(item => item.result === 'pass');

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
  const orderedClassified = classifyPending(orderedCss.results.map(item => ({
    ...item, expected_sha256: item.baseline_sha256, actual_sha256: item.candidate_sha256,
  })), decisions);

  let ownedRendered;
  try { ownedRendered = await renderOwnedStyles({tarball}); }
  catch (error) { ownedRendered = {error: error.message, results: {}}; }
  const ownedRenderedOk = !ownedRendered.error && ownedIds.length === Object.keys(ownedRendered.results).length
    && ownedIds.every(id => Object.values(ownedRendered.results).some(r => r.case_id === id && r.result === 'pass'));
  const materialRequested = requested.some(isAllowed);
  const pending = [...apiResults, ...orderedClassified].filter(item => item.status === 'pending-decision');
  const unexplained = [...apiResults, ...orderedClassified].filter(item => item.status === 'unexplained-failure');
  const apiPassed = apiResults.filter(item => item.result === 'pass');
  // Every required API/ordered case must pass. Pending decisions are not
  // acceptance and must also make the child exit nonzero.
  const ok = functions.ok && ownedRenderedOk && compiled && !compileError && isolationOk && valuesOk && materialRequested && unexplained.length === 0
    && orderedCss.compile_status === 0 && sassResultsComplete(apiResults,apiIds)
    && sassResultsComplete(orderedClassified,ORDERED_CSS_FIXTURE_IDS);


  function writeOrderedCssAssertionFiles(results, isolationResults) {
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
    writeIsolationNegativeAssertions(outputDir, isolationResults);
    const identity = {
      oracleSha256: sha256Text(oracleText), tarballSha256: tarballSha, runId, invocationId: invocation,
    };
    for (const item of functions.results) {
      if (item.result !== 'pass' || !functions.mutation_rejected) continue;
      const body = {...item,kind:'assertion',check_id:'sass-seal',group:'sass-api-and-values',exit_code:0,
        run_id:runId,invocation_id:invocation,binding,tarball_sha256:tarballSha,mutation_rejected:true};
      writeFileSync(join(outputDir,apiAssertionFileName(item.case_id)),JSON.stringify(body,null,2)+'\n');
    }
    for (const item of apiPassed) {
      writeFileSync(join(outputDir, apiAssertionFileName(item.case_id)),
        `${JSON.stringify(apiAssertionBody(item, identity), null, 2)}\n`);
    }
    for (const item of Object.values(ownedRendered.results || {})) {
      if (item.result !== 'pass') continue;
      const body = {...item,check_id:'sass-seal',run_id:runId,invocation_id:invocation,binding,
        line:ownedRendered.line,tarball_sha256:tarballSha,source_kind:'packed',
        reference_kind:ownedRendered.reference_kind,identities:ownedRendered.identities,
        versions:ownedRendered.versions,browser:ownedRendered.browser,strict_templates:true,skip_lib_check:false};
      writeFileSync(join(outputDir,apiAssertionFileName(item.case_id)),JSON.stringify(body,null,2)+'\n');
    }
    return outputDir;
  }

  const report = {
    schema_version: 1,
    role: 'peer-aware packed Sass seal',
    owned_rendered: ownedRendered,
    function_contracts: functions,
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
    owned_rendered_ok: ownedRenderedOk,
    owned_rendered_cases: Object.fromEntries(Object.values(ownedRendered.results || {}).map(r => [r.case_id,r.result])),
    owned_rendered_error: ownedRendered.error ?? null,
    ordered_css_compile_status: orderedCss.compile_status,
    ordered_css_compare_status: orderedCss.compare_status,
    ordered_css_compile_error: orderedCss.compile_error,
    isolation_negative_case_ids: [...ISOLATION_NEGATIVE_IDS],
    isolation_negative_results: isolation.map(item => ({
      case_id: item.case_id,
      result: item.result,
      compare_status: item.compare_status ?? null,
    })),
    isolation_negatives_pass: isolationOk,
    sass_api: {
      oracle_sha256: sha256Text(oracleText),
      case_count: apiIds.length,
      passed: apiPassed.length,
      pending: apiResults.filter(item => item.status === 'pending-decision').length,
      unexplained: apiResults.filter(item => item.status === 'unexplained-failure').map(item => ({case_id: item.case_id, reason: item.reason, stale_decision: item.stale_decision ?? null})),
      api_drift: drift,
    },
    pending_decisions: Object.entries(pending.reduce((acc, item) => {
      (acc[item.decision] ||= []).push(item.case_id);
      return acc;
    }, {})).map(([decision, cases]) => ({decision, cases})),
    unexplained_failures: unexplained.map(item => item.case_id),
    not_executed: {
      'ordered-css-dom-unresolved-strict': UNRESOLVED_STRICT_CSS,
      dom_beyond_targeted_owned_controls: null,
      '21.x': null,
    },
    limitations: [
      'Seals packed facade compile, three sealed value fixtures, the authentic 16.2.14 Sass API inventory (variables, signatures, invoked mixin CSS, aggregate membership/order) and every non-debug ordered-CSS fixture under exact public peers.',
      'Expected sets are predeclared from the frozen oracle and the fixture manifest. Sealed CSS was not rewritten. A failing case matching a pending decision digest pair is reported pending and writes no assertion; it is not a pass.',
      'Executes four main isolation negatives: archived @material/button rejection, a mutated sealed CSS copy, a hidden load-path resolution, and API drift.',
      'Empty debug CSS is covered by the value seal. Ten real owned-control DOM probes compare tagged CSS under default/custom-map, disabled/invalid, action-color and inherited typography contexts.',
      'Does not execute the thirteen companion bridge computed-style rows (G07).',
      '21.x sass-seal groups stay null. Does not mark sass-seal accepted. Does not claim G06–G08.',
    ],
  };

  mkdirSync(dirname(reportPath), {recursive: true});
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  const assertionDir = writeOrderedCssAssertionFiles(orderedCss.results, isolation);
  console.log(JSON.stringify({
    ok,
    compiled,
    sealed_values_match: valuesOk,
    ordered_css_exact: orderedCssOk,
    owned_rendered_ok: ownedRenderedOk,
    owned_rendered_cases: Object.fromEntries(Object.values(ownedRendered.results || {}).map(r => [r.case_id,r.result])),
    owned_rendered_error: ownedRendered.error ?? null,
    ordered_css_cases: ORDERED_CSS_FIXTURE_IDS.length,
    sass_api_cases: apiIds.length,
    sass_function_cases: functions.results.length,
    sass_function_passed: functions.results.filter(r=>r.result==='pass').length,
    sass_function_error: functions.error ?? null,
    sass_function_failures: functions.results.filter(r=>r.result!=='pass').map(r=>({case_id:r.case_id,error:r.error,expected_sha256:r.expected?.value_sha256 ?? null,actual_sha256:r.actual?.value_sha256 ?? null})),
    sass_api_passed: apiPassed.length,
    pending_cases: pending.length,
    unexplained_failures: unexplained.map(item => item.case_id),
    negative_archived_material_rejected: negativeRejected,
    isolation_negatives: isolation.map(item => ({case_id: item.case_id, result: item.result})),
    assertion_dir: assertionDir,
    tarball_sha256: tarballSha,
  }, null, 2));

  if (!ok) {
    const reasons = [];
    if (!ownedRenderedOk) reasons.push(`owned rendered styles failed: ${ownedRendered.error || 'probe/negative mismatch'}`);
    if (!ownedRenderedOk && !ownedRendered.error) console.error(JSON.stringify({owned_style_mismatches: Object.values(ownedRendered.results).filter(item => item.result !== 'pass')}, null, 2));
    if (!compiled) reasons.push(`compile failed: ${compileError}`);
    if (!negativeRejected) reasons.push('archived @material negative did not refuse');
    if (mutatedNegative.result !== 'pass') reasons.push(`mutated golden negative did not detect a compare-css mismatch (status=${mutatedNegative.compare_status})`);
    if (!valuesOk) reasons.push('sealed value fixtures did not match');
    if (!functions.ok) reasons.push('function semantic probes failed');
    if (pending.length) reasons.push(`pending decisions are not accepted: ${pending.length} cases`);
    if (!sassResultsComplete(apiResults,apiIds) || !sassResultsComplete(orderedClassified,ORDERED_CSS_FIXTURE_IDS)) reasons.push('required Sass case coverage is not complete');
    if (unexplained.length) reasons.push(`unexplained failures: ${unexplained.slice(0, 8).map(item => item.case_id).join(', ')}`);
    if (orderedCss.compile_status !== 0) reasons.push('ordered CSS fixtures did not compile');
    for (const item of isolation) if (item.result !== 'pass') reasons.push(`isolation negative ${item.case_id} failed`);
    if (!materialRequested) reasons.push('compile never requested @angular/material peer');
    fail(1, `sass-seal failed: ${reasons.join('; ')}`);
  }

}

const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === entry) main().catch(error => fail(1, error.message));
