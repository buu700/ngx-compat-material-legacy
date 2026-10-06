#!/usr/bin/env node
/**
 * Packed-consumer AOT + harness runtime expansion beyond ESM import smoke.
 *
 * Creates a clean temp consumer, installs the packed tarball + aged Angular
 * peers, AOT-compiles representative legacy entries (button, dialog,
 * form-field/select), and runs a minimal TestBed harness runtime check for
 * MatLegacyButtonHarness.
 *
 * Usage:
 *   node scripts/packed-consumer-aot-smoke.mjs --tarball path [--skip-harness]
 * Evidence:
 *   compatibility/pack-proof/aot-harness-smoke.json
 */
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {floorConfigurations} from './consumer-floor-roster.mjs';
import {bundleConsumerHarness} from './bundle-consumer-harness.mjs';
import {
  allConsumerCaseIds,
  coordinatorRequest,
  declarationKeys,
  declarationObservations,
  harnessCaseIds,
  librarySpec as packagedSpec,
  lineForPackageVersion,
  loadExportKeys,
  projectFacts,
  readPackedIdentity,
  writeAcceptanceReport,
} from './packed-consumer-evidence.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'compatibility/pack-proof/aot-harness-smoke.json');
// F00: committed historical tarball moved to pack-proof/historical-unbound/.
// Do not silently default to it. F01 will wire fresh build/pack → --tarball.
const historicalUnboundTarball = join(
  root,
  'compatibility/pack-proof/historical-unbound/ngx-compat-material-legacy-22.0.0-rc.0.tgz',
);

const args = process.argv.slice(2);
const skipHarness = args.includes('--skip-harness');
let tarball = null;
let runManifestPath = null;
let floorCaseId = null;
let floorOutput = null;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--skip-harness') continue;
  if (arg === '--tarball' || arg === '--run' || arg === '--floor-case' || arg === '--floor-out') {
    const value = args[i + 1];
    if (!value || value.startsWith('-')) {
      console.error(`${arg} requires a path`);
      process.exit(2);
    }
    if (arg === '--tarball') tarball = resolve(value);
    else if (arg === '--run') runManifestPath = resolve(value);
    else if (arg === '--floor-case') floorCaseId = value;
    else floorOutput = resolve(value);
    i += 1;
    continue;
  }
  console.error(`Unknown argument: ${arg}`);
  process.exit(2);
}

const coordinator = coordinatorRequest('packed-consumer');
if (coordinator && coordinator.error) {
  console.error(`packed-consumer: refusing acceptance report: ${coordinator.error}`);
  process.exit(2);
}
const exportKeys = loadExportKeys();
console.log(`packed-consumer: derived ${allConsumerCaseIds(exportKeys).length} cases before reading the candidate`);

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function insideDir(dir, target) {
  const rel = relative(resolve(dir), resolve(target));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function run(cmd, cmdlineArgs, opts = {}) {
  if (floorCaseId && cmd === 'npm') {
    const npmCli = process.env.NGX_FLOOR_NPM_CLI;
    if (!npmCli || !isAbsolute(npmCli) || !npmCli.endsWith('/npm-cli.js')) throw new Error('qualified floor npm CLI required');
    cmd = process.execPath;
    cmdlineArgs = [npmCli, ...cmdlineArgs];
  }
  const res = spawnSync(cmd, cmdlineArgs, {
    encoding: 'utf8',
    ...opts,
  });
  return res;
}

function isolatedEnv() {
  const env = {...process.env, NODE_OPTIONS: ''};
  delete env.NODE_PATH;
  return env;
}

function isInside(parent, target) {
  const rel = relative(parent, target);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function librarySpec(exportKey) {
  return packagedSpec(exportKey);
}

function compilePeerHarness(consumer, rootReal) {
  const legacySpec = '@ngx-compat/material-legacy/legacy-button/testing';
  const peerSpec = '@angular/material/button/testing';
  writeFileSync(
    join(consumer, 'src/peer-harness.ts'),
    "import {MatButtonHarness} from '@angular/material/button/testing';\nexport const peerHarness = MatButtonHarness;\n",
  );
  const config = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ES2022',
      moduleResolution: 'bundler',
      strict: true,
      skipLibCheck: false,
      noEmit: true,
      experimentalDecorators: true,
      lib: ['ES2022', 'DOM'],
      types: [],
    },
    files: ['src/peer-harness.ts'],
  };
  writeFileSync(join(consumer, 'tsconfig.peer-harness.json'), JSON.stringify(config, null, 2));
  const compiled = run(
    process.execPath,
    [join(consumer, 'node_modules/typescript/lib/tsc.js'), '-p', 'tsconfig.peer-harness.json', '--pretty', 'false'],
    {cwd: consumer, timeout: 180000, env: isolatedEnv()},
  );
  const resolveSpec = spec => {
    const probe = run(
      process.execPath,
      ['--input-type=module', '-e', `
        import {createRequire} from 'node:module';
        import {pathToFileURL} from 'node:url';
        const require = createRequire(pathToFileURL(process.cwd() + '/'));
        console.log(require.resolve(process.env.LEGACY_SPEC));
      `],
      {cwd: consumer, env: {...isolatedEnv(), LEGACY_SPEC: spec}},
    );
    if (probe.status !== 0) return null;
    return realpathSync(probe.stdout.trim());
  };
  const legacyPath = resolveSpec(legacySpec);
  const peerPath = resolveSpec(peerSpec);
  const legacyOwned = Boolean(legacyPath && legacyPath.includes(`${sep}@ngx-compat${sep}material-legacy${sep}`) && !isInside(rootReal, legacyPath));
  const peerOwned = Boolean(peerPath && peerPath.includes(`${sep}@angular${sep}material${sep}`) && !legacyPath?.startsWith(peerPath) && peerPath !== legacyPath);
  const ok = compiled.status === 0 && legacyOwned && peerOwned;
  return {
    ok,
    exit_code: compiled.status,
    legacy_path: legacyPath,
    peer_path: peerPath,
    failure: ok ? null : `peer/owned harness scope failed\n${(compiled.stdout || '').slice(-800)}\n${(compiled.stderr || '').slice(-800)}`,
  };
}

function assertIsolatedInstall(consumer, consumerReal, rootReal) {
  const pkgRoot = join(consumer, 'node_modules/@ngx-compat/material-legacy');
  const pkgReal = realpathSync(pkgRoot);
  if (
    isInside(rootReal, pkgReal) ||
    pkgReal.includes(`${sep}projects${sep}ngx-material-legacy`) ||
    pkgReal.includes(`${sep}dist${sep}ngx-material-legacy`)
  ) {
    throw new Error(`Installed library resolves inside the workspace: ${pkgReal}`);
  }
  if (!isInside(consumerReal, pkgReal)) {
    throw new Error(`Installed library is outside the consumer install: ${pkgReal}`);
  }

  const workspaceLinks = [];
  const modulesDir = join(consumer, 'node_modules');
  for (const entry of readdirSync(modulesDir)) {
    const entryPath = join(modulesDir, entry);
    const children = entry.startsWith('@') && !entry.startsWith('.')
      ? readdirSync(entryPath).map(name => join(entryPath, name))
      : [entryPath];
    for (const child of children) {
      if (!lstatSync(child).isSymbolicLink()) continue;
      const target = realpathSync(child);
      if (isInside(rootReal, target)) workspaceLinks.push(`${child} -> ${target}`);
    }
  }
  if (workspaceLinks.length) {
    throw new Error(`Consumer links into the repository: ${workspaceLinks.join(', ')}`);
  }

  const installed = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8'));
  const specs = Object.entries(installed.exports ?? {})
    .filter(([key, value]) => {
      if (key === './_index' || key === './package.json') return false;
      return Boolean(value && (value.default || value.import || value.types));
    })
    .map(([key]) => librarySpec(key));
  const resolved = [];
  for (const spec of specs) {
    const probe = run(
      process.execPath,
      ['--input-type=module', '-e', `
        import {createRequire} from 'node:module';
        import {pathToFileURL} from 'node:url';
        const require = createRequire(pathToFileURL(process.cwd() + '/'));
        console.log(require.resolve(process.env.LEGACY_SPEC));
      `],
      {cwd: consumer, env: {...isolatedEnv(), LEGACY_SPEC: spec}},
    );
    if (probe.status !== 0) {
      throw new Error(`Unable to resolve ${spec}: ${(probe.stderr || probe.stdout || '').slice(-500)}`);
    }
    const found = realpathSync(probe.stdout.trim());
    if (
      isInside(rootReal, found) ||
      !found.includes(`${sep}@ngx-compat${sep}material-legacy${sep}`)
    ) {
      throw new Error(`${spec} resolved outside the installed library: ${found}`);
    }
    resolved.push({spec, path: found, insideWorkspace: isInside(rootReal, found), insideConsumer: isInside(consumerReal, found)});
  }

  const animationHits = [];
  for (const name of readdirSync(join(pkgRoot, 'fesm2022'))) {
    if (!name.endsWith('.mjs')) continue;
    const text = readFileSync(join(pkgRoot, 'fesm2022', name), 'utf8');
    if (
      /from\s+['"]@angular\/animations['"]/.test(text) ||
      /require\(\s*['"]@angular\/animations['"]\s*\)/.test(text)
    ) {
      animationHits.push(name);
    }
  }
  if (animationHits.length) {
    throw new Error(`Installed library imports @angular/animations: ${animationHits.join(', ')}`);
  }

  const lock = JSON.parse(readFileSync(join(consumer, 'package-lock.json'), 'utf8'));
  const lockedCore = lock.packages?.['node_modules/@angular/core']?.version;
  if (lockedCore !== '22.1.7') {
    throw new Error(`Consumer lock resolved @angular/core@${lockedCore ?? 'missing'}, expected 22.1.7`);
  }

  mkdirSync(join(consumer, 'src'), {recursive: true});
  writeFileSync(
    join(consumer, 'src/all-entries.ts'),
    `${specs.map(spec => `import '${spec}';`).join('\n')}\nexport {};\n`,
  );
  writeFileSync(
    join(consumer, 'tsconfig.entries.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ES2022',
          moduleResolution: 'bundler',
          strict: true,
          skipLibCheck: false,
          noEmit: true,
          experimentalDecorators: true,
          lib: ['ES2022', 'DOM'],
          types: [],
        },
        files: ['src/all-entries.ts'],
      },
      null,
      2,
    ),
  );
  const tsc = run(
    process.execPath,
    [join(consumer, 'node_modules/typescript/lib/tsc.js'), '-p', 'tsconfig.entries.json', '--pretty', 'false'],
    {cwd: consumer, timeout: 180000, env: isolatedEnv()},
  );
  if (tsc.status !== 0) {
    throw new Error(
      `Declaration check failed:\n${(tsc.stdout || '').slice(-2500)}\n${(tsc.stderr || '').slice(-1500)}`,
    );
  }

  writeFileSync(
    join(consumer, 'src/legacy-strict.ts'),
    `import {Component, NgModule} from '@angular/core';
import {MatLegacyButtonModule} from '@ngx-compat/material-legacy/legacy-button';

@Component({
  standalone: false,
  selector: 'legacy-strict-root',
  template: '<button mat-button>Ok</button>',
})
export class LegacyStrictRoot {}

@NgModule({
  imports: [MatLegacyButtonModule],
  declarations: [LegacyStrictRoot],
})
export class LegacyStrictModule {}
`,
  );
  writeFileSync(
    join(consumer, 'src/modern-strict.ts'),
    `import {Component, NgModule} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';

@Component({
  standalone: false,
  selector: 'modern-strict-root',
  template: '<button mat-button>Ok</button>',
})
export class ModernStrictRoot {}

@NgModule({
  imports: [MatButtonModule],
  declarations: [ModernStrictRoot],
})
export class ModernStrictModule {}
`,
  );
  const strictConfig = (file, outDir) => ({
    compilerOptions: {
      target: 'ES2022',
      module: 'ES2022',
      moduleResolution: 'bundler',
      experimentalDecorators: true,
      strict: true,
      skipLibCheck: false,
      lib: ['ES2022', 'DOM'],
      rootDir: 'src',
      outDir,
      types: [],
      ignoreDeprecations: compilerDeprecationVersion,
    },
    files: [file],
    angularCompilerOptions: {compilationMode: 'full', strictTemplates: true},
  });
  writeFileSync(
    join(consumer, 'tsconfig.legacy-strict.json'),
    JSON.stringify(strictConfig('src/legacy-strict.ts', 'out-legacy'), null, 2),
  );
  writeFileSync(
    join(consumer, 'tsconfig.modern.json'),
    JSON.stringify(strictConfig('src/modern-strict.ts', 'out-modern'), null, 2),
  );
  const ngc = join(consumer, 'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js');
  for (const project of ['tsconfig.legacy-strict.json', 'tsconfig.modern.json']) {
    const compiled = run(process.execPath, [ngc, '-p', project], {
      cwd: consumer,
      timeout: 180000,
      env: isolatedEnv(),
    });
    if (compiled.status !== 0) {
      throw new Error(
        `${project} failed:\n${(compiled.stdout || '').slice(-1500)}\n${(compiled.stderr || '').slice(-2000)}`,
      );
    }
  }

  const projects = ['tsconfig.entries.json', 'tsconfig.legacy-strict.json', 'tsconfig.modern.json'].map(name => {
    const facts = projectFacts(JSON.parse(readFileSync(join(consumer, name), 'utf8')));
    if (!facts.skipLibCheckFalse) throw new Error(`${name} did not keep skipLibCheck:false`);
    if (facts.paths.length) throw new Error(`${name} introduced a paths alias`);
    return {name, ...facts};
  });
  return {
    consumer_outside_repository: true,
    node_path: 'unset',
    workspace_symlinks: [],
    resolved,
    resolved_entries: resolved.length,
    declaration_program_ok: true,
    projects,
    declaration_check: 'skipLibCheck:false',
    strict_templates: ['legacy-button', 'modern-button'],
    separate_compilation_scopes: true,
    animation_engine_imports: [],
    registry_core_version: lockedCore,
    sass_include_paths: [],
    sass_compile: 'not run in this consumer',
  };
}


function collectAcceptanceCases(result, keys, consumerReal, rootReal) {
  const isolation = result.isolation || {};
  const resolved = new Map((isolation.resolved || []).map(item => [item.spec, item]));
  const projects = isolation.projects || [];
  const mainFacts = result.mainProjectFacts || {skipLibCheckFalse: false, paths: []};
  const peerFacts = result.peerProjectFacts || {skipLibCheckFalse: false, paths: []};
  const aliasKeys = [...projects.flatMap(item => item.paths || []), ...(mainFacts.paths || []), ...(peerFacts.paths || [])];
  const declarations = declarationObservations(keys, resolved, {
    programOk: isolation.declaration_program_ok === true,
    aliasKeys,
    nodePathUnset: isolation.node_path === 'unset',
    skipLibCheckFalse: projects.length > 0 && projects.every(item => item.skipLibCheckFalse === true) && mainFacts.skipLibCheckFalse === true && peerFacts.skipLibCheckFalse === true,
    projects: [...projects.map(item => item.name), 'tsconfig.json', 'tsconfig.peer-harness.json'],
  });
  const aot = [
    {
      case_id: 'packed-consumer/aot/legacy-button-strict-template',
      result: isolation.separate_compilation_scopes && (isolation.strict_templates || []).includes('legacy-button') ? 'pass' : 'fail',
      selector: 'mat-button',
      scope: 'legacy-strict-root',
      failure: null,
    },
    {
      case_id: 'packed-consumer/aot/current-button-separate-scope',
      result: isolation.separate_compilation_scopes && (isolation.strict_templates || []).includes('modern-button') ? 'pass' : 'fail',
      selector: 'mat-button',
      scope: 'modern-strict-root',
      failure: null,
    },
    {
      case_id: 'packed-consumer/aot/legacy-dialog-select-module',
      result: result.aot && result.aot.status === 'ok' ? 'pass' : 'fail',
      entries: result.aot ? result.aot.entries : [],
      strict_templates: true,
      skip_lib_check: false,
      failure: result.aot && result.aot.status === 'ok' ? null : 'module AOT did not succeed',
    },
    {
      case_id: 'packed-consumer/aot/standalone-harness-host',
      result: result.harness && result.harness.status === 'ok' ? 'pass' : 'fail',
      standalone: true,
      failure: result.harness && result.harness.status === 'ok' ? null : 'standalone harness host did not compile and run',
    },
  ];
  for (const item of aot) {
    if (item.result !== 'pass' && !item.failure) item.failure = 'AOT scope did not succeed';
  }
  const parsed = result.harness && result.harness.result ? result.harness.result : {};
  const harnessMap = {
    'packed-consumer/harness/legacy-button': parsed.buttonText === 'Go',
    'packed-consumer/harness/legacy-select': parsed.selectOpened === true && parsed.selectClosed === true,
    'packed-consumer/harness/legacy-dialog': typeof parsed.dialogText === 'string' && parsed.dialogText.includes('Hello dialog') && parsed.dialogsAfterClose === 0,
    'packed-consumer/harness/legacy-menu': parsed.menuOpen === true,
    'packed-consumer/harness/legacy-snack-bar': typeof parsed.snackText === 'string' && parsed.snackText.includes('Snack message'),
    'packed-consumer/harness/legacy-tooltip': parsed.tipVisible === true && typeof parsed.tipText === 'string' && parsed.tipText.includes('Tip text'),
    'packed-consumer/harness/legacy-tabs': parsed.tabCount === 2 && parsed.selectedTab === 'Two',
  };
  const owned = declarationKeys(keys)
    .filter(key => key.endsWith('/testing'))
    .every(key => {
      const found = resolved.get(packagedSpec(key));
      return found && found.insideConsumer && !found.insideWorkspace;
    });
  const harness = harnessCaseIds().map(caseId => {
    if (caseId === 'packed-consumer/harness/owned-resolution') {
      return {case_id: caseId, result: owned ? 'pass' : 'fail', failure: owned ? null : 'owned testing entry resolved outside the packed library'};
    }
    if (caseId === 'packed-consumer/harness/peer-harness-separate-scope') {
      const ok = Boolean(result.peer && result.peer.ok);
      return {case_id: caseId, result: ok ? 'pass' : 'fail', legacy_path: result.peer ? result.peer.legacy_path : null, peer_path: result.peer ? result.peer.peer_path : null, failure: ok ? null : 'peer harness was not compiled in a separate scope'};
    }
    const ok = harnessMap[caseId] === true;
    return {case_id: caseId, result: ok ? 'pass' : 'fail', failure: ok ? null : 'harness behavior did not match the reviewed fixture'};
  });
  return [...aot, ...declarations, ...harness];
}

let draftRun = null;
if (runManifestPath) {
  if (!existsSync(runManifestPath)) {
    console.error(`Missing run manifest: ${runManifestPath}`);
    process.exit(2);
  }
  const draft = JSON.parse(readFileSync(runManifestPath, 'utf8'));
  if (draft.schema_version !== 1 || draft.template === true || draft.stage !== 'draft') {
    console.error('run manifest must be an unsealed schema_version 1 draft');
    process.exit(2);
  }
  if (draft.purpose === 'release') {
    console.error('packed-consumer does not accept a release manifest');
    process.exit(2);
  }
  const artifact = (draft.artifacts || []).find(item => item && item.id === 'library');
  if (!artifact || typeof artifact.path !== 'string' || typeof artifact.sha256 !== 'string') {
    console.error('draft run has no library artifact');
    process.exit(2);
  }
  const runDir = dirname(runManifestPath);
  if (isAbsolute(artifact.path) || artifact.path.split(/[\\/]/).includes('..')) {
    console.error('draft library path must stay inside the run directory');
    process.exit(2);
  }
  const fromRun = resolve(runDir, artifact.path);
  if (!insideDir(runDir, fromRun)) {
    console.error('draft library path must stay inside the run directory');
    process.exit(2);
  }
  if (tarball && resolve(tarball) !== fromRun) {
    console.error('--tarball does not match the draft library artifact');
    process.exit(2);
  }
  tarball = fromRun;
  if (resolve(tarball) === resolve(historicalUnboundTarball)) {
    console.error('The historical unbound tarball cannot satisfy a draft run.');
    process.exit(2);
  }
  if (!existsSync(tarball)) {
    console.error(`Draft library artifact is missing: ${tarball}`);
    process.exit(2);
  }
  const digest = sha256File(tarball);
  const bytes = statSync(tarball).size;
  draftRun = {run_id: draft.run_id, runDir, artifact, digest, bytes, line: draft.source?.line ?? null};
  if (digest !== artifact.sha256 || bytes !== artifact.bytes) {
    console.error('Tarball bytes do not match the draft library artifact. Not repacking.');
    mkdirSync(join(runDir, 'reports'), {recursive: true});
    writeFileSync(
      join(runDir, 'reports/packed-consumer.json'),
      JSON.stringify(
        {
          schema_version: 1,
          template: false,
          run_id: draft.run_id,
          check_id: 'packed-consumer',
          line: draft.source?.line ?? null,
          subject_kind: 'artifact',
          subject_ids: ['library'],
          command: process.argv.slice(1),
          exit_code: 1,
          result: 'fail',
          expected_case_ids: ['rehash'],
          executed_case_ids: ['rehash'],
          passed: 0,
          failed: 1,
          skipped: 0,
          skip_reasons: [],
          outputs: [],
          limitations: ['Digest mismatch. The consumer did not install or repack.'],
          artifact: {id: 'library', expected_sha256: artifact.sha256, actual_sha256: digest},
        },
        null,
        2,
      ) + '\n',
    );
    process.exit(1);
  }
  let packedIdentity;
  try {
    packedIdentity = readPackedIdentity(tarball);
  } catch (error) {
    console.error(error && error.message ? error.message : error);
    process.exit(1);
  }
  const expectedLine = lineForPackageVersion(packedIdentity.version);
  if (packedIdentity.name !== '@ngx-compat/material-legacy' || expectedLine !== draftRun.line) {
    console.error(`packed library ${packedIdentity.name}@${packedIdentity.version} does not match run line ${draftRun.line}`);
    process.exit(1);
  }
}

if (!tarball) {
  console.error(
    'F00/F01: --tarball or --run is required. Committed pack-proof .tgz is historical-unbound and must not be a silent default. Build/pack current source first (see scripts/pack-draft-run.mjs), then pass the draft manifest.',
  );
  console.error(`Historical unbound (traceability only): ${historicalUnboundTarball}`);
  process.exit(2);
}
if (!existsSync(tarball)) {
  console.error(`Missing tarball: ${tarball}. Build/pack first.`);
  process.exit(2);
}

if (Boolean(floorCaseId) !== Boolean(floorOutput) || (floorCaseId && (skipHarness || runManifestPath))) {
  console.error('Floor mode requires --floor-case and --floor-out with --tarball, full harness execution, and its own report.');
  process.exit(2);
}
const sourceManifest = JSON.parse(readFileSync(libraryManifestPath(), 'utf8'));
const sourceLine = lineForPackageVersion(sourceManifest.version);
let floorConfiguration = null;
if (floorCaseId) {
  const floorPlan = JSON.parse(readFileSync(join(root, 'compatibility/rc/consumer-floor-plan.json'), 'utf8'));
  floorConfiguration = floorConfigurations(floorPlan, sourceLine, sourceManifest)
    .find(item => item.case_id === floorCaseId && item.group === 'library-runtime');
  const identity = readPackedIdentity(tarball);
  if (!floorConfiguration || process.versions.node !== floorConfiguration.node
      || identity.name !== sourceManifest.name || lineForPackageVersion(identity.version) !== sourceLine
      || existsSync(floorOutput)) {
    console.error('Unknown floor case, wrong actual runtime/artifact line, or stale output.');
    process.exit(2);
  }
}
function libraryManifestPath() { return join(root, 'projects/ngx-material-legacy/package.json'); }
const compilerDeprecationVersion = Number((floorConfiguration?.typescript
  ?? JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).devDependencies.typescript).split('.')[0]) >= 6 ? '6.0' : '5.0';
const consumer = mkdtempSync(join(tmpdir(), 'ngx-compat-aot-harness_'));
const rootReal = realpathSync(root);
const consumerReal = realpathSync(consumer);
if (isInside(rootReal, consumerReal)) {
  console.error(`Consumer directory is inside the repository: ${consumerReal}`);
  process.exit(1);
}
const detailPath = floorOutput ?? (draftRun
  ? join(draftRun.runDir, 'reports/packed-consumer-detail.json')
  : outPath);
const result = {
  schema_version: 1,
  captured_at: new Date().toISOString(),
  run_id: draftRun ? draftRun.run_id : null,
  check_id: draftRun ? 'packed-consumer' : null,
  tarball: {path: tarball, sha256: sha256File(tarball)},
  consumer_dir: consumer,
  floor_configuration: floorConfiguration,
  node_runtime: {version: process.version, exec_path: process.execPath},
  aot: {status: 'pending'},
  harness: {status: skipHarness ? 'skipped' : 'pending'},
  errors: [],
};

try {
  const installTarball = join(consumer, 'library.tgz');
  cpSync(tarball, installTarball);
  if (sha256File(installTarball) !== sha256File(tarball)) {
    throw new Error('Copied tarball digest does not match the rehashed artifact');
  }
  const repoLockBefore = sha256File(join(root, 'pnpm-lock.yaml'));
  const pkg = {
    name: 'ngx-compat-material-legacy-aot-harness-smoke',
    private: true,
    type: 'module',
    dependencies: {
      '@angular/animations': '22.1.7',
      '@angular/cdk': '22.1.7',
      '@angular/common': '22.1.7',
      '@angular/compiler': '22.1.7',
      '@angular/compiler-cli': '22.1.7',
      '@angular/core': '22.1.7',
      '@angular/forms': '22.1.7',
      '@angular/material': '22.1.7',
      '@angular/platform-browser': '22.1.7',
      '@angular/platform-browser-dynamic': '22.1.7',
      '@ngx-compat/material-legacy': `file:${installTarball}`,
      rxjs: '7.8.2',
      tslib: '2.8.1',
      typescript: '6.0.3',
      'zone.js': '0.16.3',
      jsdom: '26.1.0',
      esbuild: JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).devDependencies.esbuild,
    },
  };
  if (floorConfiguration) {
    for (const name of Object.keys(pkg.dependencies)) {
      if (name.startsWith('@angular/')) pkg.dependencies[name] = name === '@angular/cdk'
        ? floorConfiguration.cdk : name === '@angular/material' ? floorConfiguration.material : floorConfiguration.framework;
    }
    pkg.dependencies.rxjs = floorConfiguration.rxjs;
    pkg.dependencies.typescript = floorConfiguration.typescript;
  }
  writeFileSync(join(consumer, 'package.json'), JSON.stringify(pkg, null, 2));
  writeFileSync(join(consumer, '.npmrc'), 'install-links=true\nfund=false\naudit=false\n');

  const install = run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock'], {
    cwd: consumer,
    timeout: 180000,
    env: isolatedEnv(),
  });
  if (install.status !== 0) {
    result.errors.push('npm install failed');
    result.aot = {status: 'fail', stderr: (install.stderr || '').slice(-2000)};
    throw new Error('install failed');
  }
  if (sha256File(join(root, 'pnpm-lock.yaml')) !== repoLockBefore) {
    throw new Error('Consumer install changed the repository pnpm-lock.yaml');
  }
  if (floorConfiguration) {
    result.installed_floor_versions = {};
    for (const [name, wanted] of Object.entries(pkg.dependencies)) {
      if (!name.startsWith('@angular/') && !['rxjs', 'typescript'].includes(name)) continue;
      const actual = JSON.parse(readFileSync(join(consumer, 'node_modules', ...name.split('/'), 'package.json'), 'utf8')).version;
      result.installed_floor_versions[name] = actual;
      if (actual !== wanted) throw new Error(`Installed floor ${name}@${actual} differs from ${wanted}`);
    }
    const bytes = readFileSync(join(consumer, 'package-lock.json'));
    const receipt = `${floorOutput}.package-lock.json`;
    writeFileSync(receipt, bytes);
    result.consumer_lock = {path: receipt, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex')};
  }
  result.isolation = assertIsolatedInstall(consumer, consumerReal, rootReal);
  result.peer = compilePeerHarness(consumer, rootReal);
  if (existsSync(join(consumer, 'tsconfig.peer-harness.json'))) {
    result.peerProjectFacts = projectFacts(JSON.parse(readFileSync(join(consumer, 'tsconfig.peer-harness.json'), 'utf8')));
  }
  if (!result.peer.ok) result.errors.push(result.peer.failure || 'peer harness scope failed');

  mkdirSync(join(consumer, 'src'), {recursive: true});

  writeFileSync(
    join(consumer, 'src/app.module.ts'),
    `import {NgModule, Component} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {ReactiveFormsModule} from '@angular/forms';
import {MatLegacyButtonModule} from '@ngx-compat/material-legacy/legacy-button';
import {MatLegacyDialogModule} from '@ngx-compat/material-legacy/legacy-dialog';
import {MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';
import {MatLegacySelectModule} from '@ngx-compat/material-legacy/legacy-select';

@Component({
  standalone: false,
  selector: 'aot-smoke-root',
  template: \`
    <button mat-button id="btn">Legacy</button>
    <mat-form-field>
      <mat-label>Choice</mat-label>
      <mat-select>
        <mat-option value="a">A</mat-option>
      </mat-select>
    </mat-form-field>
  \`,
})
export class AotSmokeRoot {}

@NgModule({
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    MatLegacyButtonModule,
    MatLegacyDialogModule,
    MatLegacyFormFieldModule,
    MatLegacySelectModule,
  ],
  declarations: [AotSmokeRoot],
  bootstrap: [AotSmokeRoot],
})
export class AotSmokeModule {}
`,
  );

  writeFileSync(
    join(consumer, 'src/main.ts'),
    `import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {AotSmokeModule} from './app.module';
platformBrowserDynamic().bootstrapModule(AotSmokeModule).catch(err => console.error(err));
`,
  );

  writeFileSync(
    join(consumer, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ES2022',
          moduleResolution: 'bundler',
          experimentalDecorators: true,
          emitDecoratorMetadata: false,
          strict: true,
          skipLibCheck: false,
          lib: ['ES2022', 'DOM'],
          rootDir: 'src',
          outDir: 'out-tsc',
          declaration: false,
          importHelpers: true,
          useDefineForClassFields: false,
          ignoreDeprecations: compilerDeprecationVersion,
        },
        files: ['src/app.module.ts', 'src/main.ts'],
        angularCompilerOptions: {
          enableIvy: true,
          compilationMode: 'full',
          strictTemplates: true,
        },
      },
      null,
      2,
    ),
  );

  const ngcBin = join(consumer, 'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js');
  const ngcAlt = join(consumer, 'node_modules/.bin/ngc');
  const ngcCmd = existsSync(ngcAlt) ? ngcAlt : ngcBin;
  const aot = run(process.execPath, [ngcCmd, '-p', 'tsconfig.json'], {
    cwd: consumer,
    timeout: 180000,
    env: isolatedEnv(),
  });
  result.mainProjectFacts = projectFacts(JSON.parse(readFileSync(join(consumer, 'tsconfig.json'), 'utf8')));
  const aotOk =
    aot.status === 0 &&
    existsSync(join(consumer, 'out-tsc/app.module.js')) &&
    result.mainProjectFacts.skipLibCheckFalse &&
    result.mainProjectFacts.strictTemplates &&
    result.mainProjectFacts.paths.length === 0;
  result.aot = {
    status: aotOk ? 'ok' : 'fail',
    exit_code: aot.status,
    stdout_tail: (aot.stdout || '').slice(-1500),
    stderr_tail: (aot.stderr || '').slice(-2000),
    entries: ['legacy-button', 'legacy-dialog', 'legacy-form-field', 'legacy-select'],
  };
  if (!aotOk) {
    result.errors.push('AOT compile failed');
  }

  if (!skipHarness && aotOk) {
    writeFileSync(
      join(consumer, 'src/harness-runtime.ts'),
      `import {JSDOM} from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});
const win = dom.window as any;
(globalThis as any).window = win;
(globalThis as any).document = win.document;
(globalThis as any).HTMLElement = win.HTMLElement;
(globalThis as any).HTMLInputElement = win.HTMLInputElement;
(globalThis as any).HTMLButtonElement = win.HTMLButtonElement;
(globalThis as any).Node = win.Node;
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  writable: true,
  value: win.navigator,
});
(globalThis as any).getComputedStyle = win.getComputedStyle.bind(win);
(globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(() => cb(Date.now()), 0);
(globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
(globalThis as any).MutationObserver = win.MutationObserver;
(globalThis as any).Element = win.Element;
(globalThis as any).Event = win.Event;
(globalThis as any).KeyboardEvent = win.KeyboardEvent;
(globalThis as any).MouseEvent = win.MouseEvent;
(globalThis as any).Comment = win.Comment;
(globalThis as any).DocumentFragment = win.DocumentFragment;
(globalThis as any).AnimationEvent = win.AnimationEvent;
(globalThis as any).CSS = win.CSS || {supports: () => false};
(globalThis as any).ResizeObserver =
  win.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

import 'zone.js';
import '@angular/compiler';
import {Component, inject} from '@angular/core';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import {getTestBed, TestBed} from '@angular/core/testing';
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {provideNoopAnimations} from '@angular/platform-browser/animations';
import {OverlayContainer} from '@angular/cdk/overlay';
import {MatLegacyButtonModule} from '@ngx-compat/material-legacy/legacy-button';
import {MatLegacyButtonHarness} from '@ngx-compat/material-legacy/legacy-button/testing';
import {MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';
import {MatLegacySelectModule} from '@ngx-compat/material-legacy/legacy-select';
import {MatLegacySelectHarness} from '@ngx-compat/material-legacy/legacy-select/testing';
import {MatLegacyDialog, MatLegacyDialogModule} from '@ngx-compat/material-legacy/legacy-dialog';
import {MatLegacyDialogHarness} from '@ngx-compat/material-legacy/legacy-dialog/testing';
import {MatLegacyMenuModule} from '@ngx-compat/material-legacy/legacy-menu';
import {MatLegacyMenuHarness} from '@ngx-compat/material-legacy/legacy-menu/testing';
import {MatLegacySnackBar, MatLegacySnackBarModule} from '@ngx-compat/material-legacy/legacy-snack-bar';
import {MatLegacySnackBarHarness} from '@ngx-compat/material-legacy/legacy-snack-bar/testing';
import {MatLegacyTooltipModule} from '@ngx-compat/material-legacy/legacy-tooltip';
import {MatLegacyTooltipHarness} from '@ngx-compat/material-legacy/legacy-tooltip/testing';
import {MatLegacyTabsModule} from '@ngx-compat/material-legacy/legacy-tabs';
import {MatLegacyTabGroupHarness} from '@ngx-compat/material-legacy/legacy-tabs/testing';

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

@Component({
  standalone: true,
  imports: [MatLegacyDialogModule],
  template: \`<div mat-dialog-content id="dlg">Hello dialog</div>\`,
})
class SmokeDialogContent {}

@Component({
  standalone: true,
  imports: [
    MatLegacyButtonModule,
    MatLegacyFormFieldModule,
    MatLegacySelectModule,
    MatLegacyDialogModule,
    MatLegacyMenuModule,
    MatLegacySnackBarModule,
    MatLegacyTooltipModule,
    MatLegacyTabsModule,
  ],
  template: \`
    <button mat-button id="h">Go</button>
    <mat-form-field>
      <mat-label>Choice</mat-label>
      <mat-select>
        <mat-option value="a">A</mat-option>
      </mat-select>
    </mat-form-field>
    <button mat-button [matMenuTriggerFor]="menu" id="menu-trigger">Menu</button>
    <mat-menu #menu="matMenu">
      <button mat-menu-item id="menu-item">Item</button>
    </mat-menu>
    <button mat-button id="snack-open">Snack</button>
    <button mat-button matTooltip="Tip text" id="tip">Hover</button>
    <mat-tab-group id="tabs">
      <mat-tab label="One">Tab one</mat-tab>
      <mat-tab label="Two">Tab two</mat-tab>
    </mat-tab-group>
  \`,
})
class HarnessHost {
  private readonly _dialog = inject(MatLegacyDialog);
  private readonly _snack = inject(MatLegacySnackBar);

  openDialog() {
    return this._dialog.open(SmokeDialogContent, {width: '240px'});
  }

  openSnack() {
    return this._snack.open('Snack message', 'Dismiss', {duration: 5000});
  }
}

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

async function main() {
  TestBed.configureTestingModule({
    imports: [HarnessHost, SmokeDialogContent],
    providers: [provideNoopAnimations()],
  });
  const fixture = TestBed.createComponent(HarnessHost);
  fixture.detectChanges();
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);

  const button = await loader.getHarness(MatLegacyButtonHarness.with({selector: '#h'}));
  const text = await button.getText();
  const select = await loader.getHarness(MatLegacySelectHarness);
  const isOpen = await select.isOpen();
  await select.open();
  fixture.detectChanges();
  await sleep(30);
  const selectOpened = await select.isOpen();
  await select.close();
  fixture.detectChanges();
  await sleep(30);
  const selectClosed = !(await select.isOpen());

  // Dialog open/close under NoopAnimations (CSS motion disabled path).
  const dialogRef = fixture.componentInstance.openDialog();
  fixture.detectChanges();
  await sleep(30);
  fixture.detectChanges();
  const dialogHarness = await rootLoader.getHarness(MatLegacyDialogHarness);
  const dialogText = await dialogHarness.getContentText();
  dialogRef.close();
  fixture.detectChanges();
  await sleep(30);
  fixture.detectChanges();
  const dialogsAfter = await rootLoader.getAllHarnesses(MatLegacyDialogHarness);

  // Menu open via harness.
  const menu = await loader.getHarness(MatLegacyMenuHarness.with({selector: '#menu-trigger'}));
  await menu.open();
  fixture.detectChanges();
  await sleep(20);
  const menuOpen = await menu.isOpen();
  await menu.close();
  fixture.detectChanges();
  await sleep(20);

  // Snack-bar open under NoopAnimations.
  fixture.componentInstance.openSnack();
  fixture.detectChanges();
  await sleep(40);
  fixture.detectChanges();
  const snack = await rootLoader.getHarness(MatLegacySnackBarHarness);
  const snackText = await snack.getMessage();
  await snack.dismissWithAction();
  fixture.detectChanges();
  await sleep(40);

  // Tooltip show via harness.
  const tip = await loader.getHarness(MatLegacyTooltipHarness.with({selector: '#tip'}));
  await tip.show();
  fixture.detectChanges();
  await sleep(20);
  const tipVisible = await tip.isOpen();
  const tipText = tipVisible ? await tip.getTooltipText() : '';
  await tip.hide();
  fixture.detectChanges();

  const tabGroup = await loader.getHarness(MatLegacyTabGroupHarness);
  const tabCount = (await tabGroup.getTabs()).length;
  await tabGroup.selectTab({label: 'Two'});
  fixture.detectChanges();
  await sleep(30);
  const selected = await (await tabGroup.getSelectedTab()).getLabel();

  const out = {
    ok:
      text === 'Go' &&
      isOpen === false &&
      dialogText.includes('Hello dialog') &&
      dialogsAfter.length === 0 &&
      menuOpen === true &&
      snackText.includes('Snack message') &&
      tipVisible === true &&
      tipText.includes('Tip text') &&
      selectOpened === true &&
      selectClosed === true &&
      tabCount === 2 &&
      selected === 'Two',
    buttonText: text,
    selectIsOpen: isOpen,
    dialogText,
    dialogsAfterClose: dialogsAfter.length,
    menuOpen,
    snackText,
    tipVisible,
    tipText,
    selectOpened,
    selectClosed,
    tabCount,
    selectedTab: selected,
    harnesses: [
      'MatLegacyButtonHarness',
      'MatLegacySelectHarness',
      'MatLegacyDialogHarness',
      'MatLegacyMenuHarness',
      'MatLegacySnackBarHarness',
      'MatLegacyTooltipHarness',
      'MatLegacyTabGroupHarness',
    ],
    animationsProvider: 'provideNoopAnimations',
  };
  console.log(JSON.stringify(out));
  if (!out.ok) {
    throw new Error('harness assertions failed: ' + JSON.stringify(out));
  }
}

main().catch(err => {
  console.error(err && err.stack ? err.stack : err);
  throw err;
});
`,
    );

    // Recompile including harness-runtime.ts
    const tsconfig = JSON.parse(readFileSync(join(consumer, 'tsconfig.json'), 'utf8'));
    tsconfig.files = ['src/app.module.ts', 'src/main.ts', 'src/harness-runtime.ts'];
    tsconfig.compilerOptions.strict = false;
    tsconfig.compilerOptions.skipLibCheck = false;
    tsconfig.angularCompilerOptions.strictTemplates = false;
    writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
    const aot2 = run(process.execPath, [ngcCmd, '-p', 'tsconfig.json'], {
      cwd: consumer,
      timeout: 180000,
      env: isolatedEnv(),
    });
    if (aot2.status !== 0) {
      result.harness = {
        status: 'fail',
        exit_code: aot2.status,
        stderr_tail: (aot2.stderr || '').slice(-2000),
        note: 'ngc compile of harness-runtime.ts failed',
      };
      result.errors.push('Harness compile failed');
    } else {
      const bundle = bundleConsumerHarness(consumer);
      const harness = run(process.execPath, [bundle.output], {
        cwd: consumer,
        timeout: 120000,
        env: isolatedEnv(),
      });
      let parsed = null;
      try {
        const lines = (harness.stdout || '').trim().split('\n').filter(Boolean);
        parsed = JSON.parse(lines[lines.length - 1]);
      } catch {
        parsed = null;
      }
      result.harness = {
        status: harness.status === 0 && parsed?.ok ? 'ok' : 'fail',
        bundle: bundle.receipt,
        exit_code: harness.status,
        result: parsed,
        stderr_tail: (harness.stderr || '').slice(-2000),
        stdout_tail: (harness.stdout || '').slice(-1000),
        entries: [
          'legacy-button/testing',
          'legacy-select/testing',
          'legacy-dialog/testing',
          'legacy-menu/testing',
          'legacy-snack-bar/testing',
          'legacy-tooltip/testing',
          'legacy-tabs/testing',
        ],
      };
      if (result.harness.status !== 'ok') {
        result.errors.push('Harness runtime failed');
      }
    }
  }


  result.acceptanceCases = collectAcceptanceCases(result, exportKeys, consumerReal, rootReal);
  if (coordinator && result.acceptanceCases.some(item => item.result !== 'pass')) {
    result.errors.push('one or more packed-consumer acceptance cases failed');
  }
  result.status = result.errors.length ? 'fail' : 'ok';
} catch (err) {
  result.status = 'fail';
  result.errors.push(String(err && err.message ? err.message : err));
} finally {
  if (draftRun || floorOutput) mkdirSync(dirname(detailPath), {recursive: true});
  writeFileSync(detailPath, JSON.stringify(result, null, 2) + '\n');
  // Keep consumer on failure for debugging; remove on success to save disk.
  if (result.status === 'ok') {
    try {
      rmSync(consumer, {recursive: true, force: true});
      result.consumer_dir = '(removed after success)';
      writeFileSync(detailPath, JSON.stringify(result, null, 2) + '\n');
    } catch {
      /* ignore */
    }
  }
  if (draftRun && coordinator && result.status === 'ok' && Array.isArray(result.acceptanceCases)) {
    if (coordinator.runId !== draftRun.run_id) {
      console.error('coordinator run id does not match the draft manifest');
      result.status = 'fail';
      result.errors.push('run id mismatch');
    } else if (resolve(coordinator.runDir) !== resolve(draftRun.runDir)) {
      console.error('coordinator assertion directory is not in this run');
      result.status = 'fail';
      result.errors.push('run directory mismatch');
    } else {
      const written = writeAcceptanceReport({
        checkId: 'packed-consumer',
        request: coordinator,
        cases: result.acceptanceCases,
        expectedIds: allConsumerCaseIds(exportKeys),
        library: {sha256: draftRun.artifact.sha256, bytes: draftRun.artifact.bytes},
        assertionName: 'consumer-observations.json',
        assertionBody: {
          peer: result.peer || null,
          harness: result.harness && result.harness.result ? result.harness.result : null,
        },
        command: ['node', 'scripts/packed-consumer-aot-smoke.mjs', '--run', runManifestPath],
      });
      if (!written.passed) {
        result.status = 'fail';
        result.errors.push('acceptance report was not complete');
      }
    }
  } else if (draftRun) {
    const exitCode = result.status === 'ok' ? 0 : 1;
    const report = {
      schema_version: 1,
      template: false,
      run_id: draftRun.run_id,
      check_id: 'packed-consumer',
      line: draftRun.line,
      subject_kind: 'artifact',
      subject_ids: ['library'],
      command: process.argv.slice(1),
      exit_code: exitCode,
      result: result.status === 'ok' ? 'pass' : 'fail',
      expected_case_ids: ['rehash', 'aot', 'harness'],
      executed_case_ids: skipHarness ? ['rehash', 'aot'] : ['rehash', 'aot', 'harness'],
      passed: result.status === 'ok' ? 1 : 0,
      failed: result.status === 'ok' ? 0 : 1,
      skipped: skipHarness ? 1 : 0,
      skip_reasons: skipHarness ? ['--skip-harness'] : [],
      outputs: [
        {
          path: 'reports/packed-consumer-detail.json',
          sha256: sha256File(detailPath),
        },
      ],
      limitations: [
        'Rehashed the draft library artifact before install.',
        'Diagnostic slice only. Coordinator mode writes the acceptance report.',
      ],
      artifact: {
        id: 'library',
        sha256: draftRun.artifact.sha256,
        bytes: draftRun.artifact.bytes,
      },
    };
    writeFileSync(
      join(draftRun.runDir, 'reports/packed-consumer.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
  }
}

console.log(JSON.stringify({status: result.status, errors: result.errors, harness_diagnostics: result.harness?.status === 'fail' ? {stderr: result.harness.stderr_tail, stdout: result.harness.stdout_tail, result: result.harness.result} : null, outPath: detailPath}, null, 2));
process.exit(result.status === 'ok' ? 0 : 1);
