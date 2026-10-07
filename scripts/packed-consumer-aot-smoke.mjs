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
import {floorConfigurations,candidateFloorConfigurations} from './consumer-floor-roster.mjs';
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
let candidateFloor = false;
let floorOutput = null;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--skip-harness') continue;
  if (arg === '--tarball' || arg === '--run' || arg === '--floor-case' || arg === '--candidate-floor-case' || arg === '--floor-out') {
    const value = args[i + 1];
    if (!value || value.startsWith('-')) {
      console.error(`${arg} requires a path`);
      process.exit(2);
    }
    if (arg === '--tarball') tarball = resolve(value);
    else if (arg === '--run') runManifestPath = resolve(value);
    else if (arg === '--floor-case' || arg === '--candidate-floor-case') {
      if (floorCaseId) {console.error('Duplicate floor mode');process.exit(2);}
      floorCaseId = value;candidateFloor = arg === '--candidate-floor-case';
    }
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
  if (lockedCore !== '21.2.23') {
    throw new Error(`Consumer lock resolved @angular/core@${lockedCore ?? 'missing'}, expected 21.2.23`);
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
    'packed-consumer/harness/native-date-constructor': parsed.nativeDateConstructor === true,
    'packed-consumer/harness/native-date-provider': parsed.nativeDateProvider === true,
    'packed-consumer/harness/chip-tabindex-attribute': parsed.chipTabIndex === 6,
    'packed-consumer/harness/radio-tabindex-attribute': parsed.radioTabIndex === 8,
    'packed-consumer/harness/chip-input-backspace-release': parsed.chipBackspaceRelease === true,
    'packed-consumer/harness/chip-repeated-removal-and-separator': parsed.chipRepeatedEvents === true,
    'packed-consumer/harness/form-field-error-live-region': parsed.errorLiveRegion === true,
    'packed-consumer/harness/form-field-token-isolation': parsed.formFieldTokenIsolation === true,
    'packed-consumer/harness/progress-bar-location-and-defaults': parsed.progressLocationAndDefaults === true,
    'packed-consumer/harness/common-module-sanity-and-contrast': parsed.commonModuleBehavior === true,
    'packed-consumer/harness/checkbox-tabindex-attribute': parsed.checkboxAttribute === true,
    'packed-consumer/harness/slide-toggle-tabindex-attribute': parsed.slideToggleAttribute === true,
    'packed-consumer/harness/slider-tabindex-attribute': parsed.sliderAttribute === true,
    'packed-consumer/harness/tab-link-tabindex-attribute': parsed.tabLinkAttribute === true,
    'packed-consumer/harness/peer-icon-literal-sanitization': parsed.peerIconLiteralSanitization === true,
    'packed-consumer/harness/checkbox-node-factory-context': parsed.checkboxNodeFactoryContext === true,
    'packed-consumer/harness/peer-stepper-abstract-control': parsed.peerStepperAbstractControl === true,
    'packed-consumer/harness/tooltip-original-eager-dependencies': parsed.tooltipOriginalEagerDependencies === true,
    'packed-consumer/harness/cell-definition-original-constructors': parsed.cellDefinitionOriginalConstructors === true,
    'packed-consumer/harness/cell-original-constructors-and-grid-roles': parsed.cellOriginalConstructors === true,
    'packed-consumer/harness/text-column-original-constructor-options': parsed.textColumnOriginalConstructor === true,
    'packed-consumer/harness/tab-content-original-constructor': parsed.tabContentOriginalConstructor === true,
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
  // 21.x slim CI still exercises the committed pack-proof-21 artifact without a draft run.
  // Coordinator and pack-library negatives always pass --run.
  const defaultTarball = join(
    root,
    'compatibility/pack-proof-21/ngx-compat-material-legacy-21.0.0-rc.0.tgz',
  );
  if (existsSync(defaultTarball)) {
    tarball = defaultTarball;
  } else {
    console.error(
      'F00/F01: --tarball or --run is required. Build/pack current source first (see scripts/pack-draft-run.mjs), then pass the draft manifest.',
    );
    console.error(`Historical unbound (traceability only): ${historicalUnboundTarball}`);
    process.exit(2);
  }
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
  floorConfiguration = (candidateFloor ? candidateFloorConfigurations : floorConfigurations)(floorPlan, sourceLine, sourceManifest)
    .find(item => item.case_id === floorCaseId && item.group === (candidateFloor ? 'candidate-peer-experiment' : 'library-runtime'));
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
  experimental_peer: candidateFloor,
  advertised_floor_acceptance_credit: !candidateFloor,
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
      '@angular/animations': '21.2.23',
      '@angular/cdk': '21.2.14',
      '@angular/common': '21.2.23',
      '@angular/compiler': '21.2.23',
      '@angular/compiler-cli': '21.2.23',
      '@angular/core': '21.2.23',
      '@angular/forms': '21.2.23',
      '@angular/material': '21.2.14',
      '@angular/platform-browser': '21.2.23',
      '@angular/platform-browser-dynamic': '21.2.23',
      '@ngx-compat/material-legacy': `file:${installTarball}`,
      rxjs: '7.8.2',
      tslib: '2.8.1',
      typescript: '5.9.2',
      'zone.js': '0.15.1',
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
    if (candidateFloor && JSON.parse(bytes).packages['node_modules/rxjs']?.integrity !== floorConfiguration.rxjs_integrity) throw new Error('candidate RxJS integrity differs from reviewed registry pin');
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
import {Component, ElementRef, TemplateRef, ViewChild, Injector, ViewContainerRef, EventEmitter, InjectionToken, ANIMATION_MODULE_TYPE, NgZone, inject, isDevMode, createEnvironmentInjector, createNgModule, EnvironmentInjector} from '@angular/core';
import {Subject} from 'rxjs';
import {FormControl, Validators} from '@angular/forms';
import {MatStepperModule, MatStepper} from '@angular/material/stepper';
import {MatTabContent} from '@angular/material/tabs';
import {BreakpointObserver, BreakpointState} from '@angular/cdk/layout';
import {AriaDescriber, FocusMonitor, HighContrastMode, HighContrastModeDetector} from '@angular/cdk/a11y';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import {getTestBed, TestBed} from '@angular/core/testing';
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {provideNoopAnimations} from '@angular/platform-browser/animations';
import {Overlay, OverlayContainer} from '@angular/cdk/overlay';
import {ScrollDispatcher} from '@angular/cdk/scrolling';
import {CdkCellDef,CdkHeaderCellDef,CdkFooterCellDef,CdkCell,CdkHeaderCell,CdkFooterCell,CdkTextColumn,TEXT_COLUMN_OPTIONS} from '@angular/cdk/table';
import {MatLegacyTableModule,MatLegacyCellDef,MatLegacyHeaderCellDef,MatLegacyFooterCellDef,MatLegacyColumnDef,MatLegacyCell,MatLegacyHeaderCell,MatLegacyFooterCell,MatLegacyTable,MatLegacyTextColumn} from '@ngx-compat/material-legacy/legacy-table';
import {Platform} from '@angular/cdk/platform';
import {Directionality} from '@angular/cdk/bidi';
import {MatLegacyButtonModule} from '@ngx-compat/material-legacy/legacy-button';
import {MatLegacyButtonHarness} from '@ngx-compat/material-legacy/legacy-button/testing';
import {MatLegacyError, MatLegacyFormField, MatLegacyPrefix, MatLegacySuffix, MatLegacyFormFieldModule, MAT_LEGACY_FORM_FIELD, MAT_LEGACY_ERROR, MAT_LEGACY_PREFIX, MAT_LEGACY_SUFFIX} from '@ngx-compat/material-legacy/legacy-form-field';
import {MAT_FORM_FIELD, MAT_ERROR, MAT_PREFIX, MAT_SUFFIX} from '@angular/material/form-field';
import {MatLegacySelectModule} from '@ngx-compat/material-legacy/legacy-select';
import {MatLegacySelectHarness} from '@ngx-compat/material-legacy/legacy-select/testing';
import {MatLegacyDialog, MatLegacyDialogModule} from '@ngx-compat/material-legacy/legacy-dialog';
import {MatLegacyDialogHarness} from '@ngx-compat/material-legacy/legacy-dialog/testing';
import {MatLegacyMenuModule} from '@ngx-compat/material-legacy/legacy-menu';
import {MatLegacyMenuHarness} from '@ngx-compat/material-legacy/legacy-menu/testing';
import {MatLegacySnackBar, MatLegacySnackBarModule} from '@ngx-compat/material-legacy/legacy-snack-bar';
import {MatLegacySnackBarHarness} from '@ngx-compat/material-legacy/legacy-snack-bar/testing';
import {MatLegacyTooltip, MatLegacyTooltipModule, MAT_LEGACY_TOOLTIP_SCROLL_STRATEGY, MAT_LEGACY_TOOLTIP_DEFAULT_OPTIONS} from '@ngx-compat/material-legacy/legacy-tooltip';
import {MatLegacyTooltipHarness} from '@ngx-compat/material-legacy/legacy-tooltip/testing';
import {MatLegacyTabsModule, MatLegacyTabLink, MatLegacyTabContent} from '@ngx-compat/material-legacy/legacy-tabs';
import {MatLegacyCheckbox, MatLegacyCheckboxModule, MAT_LEGACY_CHECKBOX_DEFAULT_OPTIONS} from '@ngx-compat/material-legacy/legacy-checkbox';
import {MatLegacySlideToggle, MatLegacySlideToggleModule} from '@ngx-compat/material-legacy/legacy-slide-toggle';
import {MatLegacySlider, MatLegacySliderModule} from '@ngx-compat/material-legacy/legacy-slider';
import {MatLegacyProgressBar, MatLegacyProgressBarModule, MAT_LEGACY_PROGRESS_BAR_LOCATION, MAT_LEGACY_PROGRESS_BAR_LOCATION_FACTORY, MAT_LEGACY_PROGRESS_BAR_DEFAULT_OPTIONS} from '@ngx-compat/material-legacy/legacy-progress-bar';
import {MAT_PROGRESS_BAR_DEFAULT_OPTIONS} from '@angular/material/progress-bar';
import {MatLegacyChipsModule} from '@ngx-compat/material-legacy/legacy-chips';
import {MatLegacyRadioModule} from '@ngx-compat/material-legacy/legacy-radio';
import {MatIconModule, MatIconRegistry} from '@angular/material/icon';
import {DomSanitizer} from '@angular/platform-browser';
import {MatLegacyTabGroupHarness} from '@ngx-compat/material-legacy/legacy-tabs/testing';
import {MatLegacyCommonModule, MATERIAL_LEGACY_SANITY_CHECKS, LegacyNativeDateAdapter, LegacyNativeDateModule, MatLegacyNativeDateModule, LegacyDateAdapter, MAT_LEGACY_DATE_LOCALE, MAT_LEGACY_DATE_FORMATS, MAT_LEGACY_NATIVE_DATE_FORMATS} from '@ngx-compat/material-legacy/legacy-core';

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

const CELL_DEF_NODE_INJECTOR=new InjectionToken<Injector>('closeout-cell-def-node-injector');
const ORIGINAL_TEXT_OPTIONS=Object.freeze({defaultHeaderTextTransform:(name:string)=>'Header '+name,defaultDataAccessor:(data:any,name:string)=>'Cell '+data[name]});

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
    MatLegacyTableModule,
    MatLegacyTabsModule,
    MatLegacyChipsModule,
    MatLegacyRadioModule,
    MatIconModule,
    MatStepperModule,
    MatLegacyProgressBarModule,
    MatLegacyCheckboxModule,
    MatLegacySlideToggleModule,
    MatLegacySliderModule,
  ],
  providers: [
    {provide: MAT_LEGACY_PROGRESS_BAR_LOCATION, useValue: {getPathname:()=>'/legacy-location(path)?query=1#ignored'}},
    {provide: MAT_LEGACY_PROGRESS_BAR_DEFAULT_OPTIONS, useValue: {color:'warn',mode:'query'}},
  ],
  template: \`
    <button mat-button id="h">Go</button>
    <button mat-button id="trusted-icon-button"><mat-icon svgIcon="closeout-trusted"></mat-icon>Icon</button>
    <mat-stepper id="peer-stepper" linear>
      <mat-step [stepControl]="stepControl"><ng-template matStepLabel>First</ng-template>First step</mat-step>
      <mat-step><ng-template matStepLabel>Second</ng-template>Second step</mat-step>
    </mat-stepper>
    <mat-chip id="attribute-chip" tabindex="6">Attribute chip</mat-chip>
    <mat-checkbox id="attribute-checkbox" tabindex="7">Attribute checkbox</mat-checkbox>
    <mat-slide-toggle id="attribute-toggle" tabindex="9">Attribute toggle</mat-slide-toggle>
    <mat-slider id="attribute-slider" tabindex="11"></mat-slider>
    <nav mat-tab-nav-bar><a mat-tab-link id="attribute-tab-link" tabindex="13">Attribute link</a></nav>
    <mat-chip-list #repeatChipList>
      <mat-chip id="repeat-first">First chip</mat-chip>
      <mat-chip id="repeat-last" (removed)="repeatRemovals=repeatRemovals+1">Last chip</mat-chip>
      <input id="repeat-input" [matChipInputFor]="repeatChipList" [matChipInputSeparatorKeyCodes]="[188]" (matChipInputTokenEnd)="repeatEnds=repeatEnds+1">
    </mat-chip-list>
    <mat-progress-bar id="location-progress" [value]="45" aria-label="Location progress"></mat-progress-bar>
    <mat-radio-button id="attribute-radio" tabindex="8">Attribute radio</mat-radio-button>
    <mat-error id="error-live-default">Default error</mat-error>
    <mat-error id="error-live-explicit" aria-live="assertive">Explicit error</mat-error>
    <mat-error id="error-live-empty" aria-live="">Empty attribute error</mat-error>
    <mat-form-field id="token-field">
      <span matPrefix id="token-prefix">Prefix</span>
      <span matSuffix id="token-suffix">Suffix</span>
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
    <table mat-table id="constructor-text-table" [dataSource]="[{value:'value'}]">
      <mat-text-column name="value"></mat-text-column>
      <tr mat-header-row *matHeaderRowDef="['value']"></tr>
      <tr mat-row *matRowDef="let row; columns:['value']"></tr>
    </table>
    <mat-table id="constructor-grid" role="grid" [dataSource]="[{value:'Grid value'}]">
      <ng-container #constructorGridColumn matColumnDef="constructor-probe">
        <mat-header-cell *matHeaderCellDef>Grid header</mat-header-cell>
        <mat-cell *matCellDef="let row">{{row.value}}</mat-cell>
        <mat-footer-cell *matFooterCellDef>Grid footer</mat-footer-cell>
      </ng-container>
      <mat-header-row *matHeaderRowDef="['constructor-probe']"></mat-header-row>
      <mat-row *matRowDef="let row; columns:['constructor-probe']"></mat-row>
      <mat-footer-row *matFooterRowDef="['constructor-probe']"></mat-footer-row>
    </mat-table>
    <ng-template #manualTabTemplate matTabContent>Tab lazy probe</ng-template>
    <ng-template #manualCellTemplate matCellDef>Data probe</ng-template>
    <ng-template #manualHeaderTemplate matHeaderCellDef>Header probe</ng-template>
    <ng-template #manualFooterTemplate matFooterCellDef>Footer probe</ng-template>
    <span id="tooltip-eager" matTooltip="" [matTooltipDisabled]="true">Disabled empty tooltip</span>
    <mat-tab-group id="tabs">
      <mat-tab label="One">Tab one</mat-tab>
      <mat-tab label="Two">Tab two</mat-tab>
    </mat-tab-group>
  \`,
})
class HarnessHost {
  @ViewChild('manualTabTemplate',{read:MatLegacyTabContent,static:true}) originalTabContent!:MatLegacyTabContent;
  @ViewChild('manualTabTemplate',{read:TemplateRef,static:true}) originalTabTemplate!:TemplateRef<any>;
  @ViewChild(MatLegacyTextColumn,{static:true}) originalTextColumn!:MatLegacyTextColumn<any>;
  @ViewChild('constructorGridColumn',{read:MatLegacyColumnDef,static:true}) gridColumn!:MatLegacyColumnDef;
  @ViewChild('manualCellTemplate',{read:MatLegacyCellDef,static:true}) cellDefinition!:MatLegacyCellDef;
  @ViewChild('manualHeaderTemplate',{read:MatLegacyHeaderCellDef,static:true}) headerDefinition!:MatLegacyHeaderCellDef;
  @ViewChild('manualFooterTemplate',{read:MatLegacyFooterCellDef,static:true}) footerDefinition!:MatLegacyFooterCellDef;
  @ViewChild('manualCellTemplate',{read:TemplateRef,static:true}) cellTemplate!:TemplateRef<any>;
  @ViewChild('manualHeaderTemplate',{read:TemplateRef,static:true}) headerTemplate!:TemplateRef<any>;
  @ViewChild('manualFooterTemplate',{read:TemplateRef,static:true}) footerTemplate!:TemplateRef<any>;
  @ViewChild('manualCellTemplate',{read:CELL_DEF_NODE_INJECTOR,static:true}) cellInjector!:Injector;
  @ViewChild('manualHeaderTemplate',{read:CELL_DEF_NODE_INJECTOR,static:true}) headerInjector!:Injector;
  @ViewChild('manualFooterTemplate',{read:CELL_DEF_NODE_INJECTOR,static:true}) footerInjector!:Injector;
  stepControl = new FormControl('', Validators.required);
  repeatRemovals=0;
  repeatEnds=0;
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

const checkboxArtifactFactory=(MatLegacyCheckbox as unknown as {ɵfac:()=>MatLegacyCheckbox}).ɵfac;
const CHECKBOX_NODE_FACTORY_PROBE=new InjectionToken<MatLegacyCheckbox>('closeout-checkbox-node-factory-probe');
let observingCheckboxArtifactFactory=false;
let observingPublicEmitterBaseline=false;
const CHECKBOX_EMITTER_BASELINE=new InjectionToken<EventEmitter<unknown>[]>('closeout-public-emitter-baseline');

async function main() {
  // These constructors run outside an injection context, as in the untouched v16 API.
  class ConsumerDateAdapter extends LegacyNativeDateAdapter {
    constructor(locale: string) { super(locale); }
  }
  const direct = new LegacyNativeDateAdapter('en-US', undefined);
  const subclass = new ConsumerDateAdapter('en-GB');
  const smallYear = direct.createDate(7, 1, 28);
  const nativeDateConstructor = direct.getYear(smallYear) === 7 &&
    direct.getMonth(smallYear) === 1 && direct.getDate(smallYear) === 28 &&
    direct.getFirstDayOfWeek() === 0 && subclass.getYear(subclass.createDate(2024, 1, 29)) === 2024 &&
    direct.getMonth(direct.addCalendarMonths(direct.createDate(2023, 0, 31), 1)) === 1 &&
    direct.getDate(direct.addCalendarMonths(direct.createDate(2023, 0, 31), 1)) === 28 &&
    direct.isValid(direct.invalid()) === false && direct.deserialize('2024-02-29')?.getFullYear() === 2024;
  // A public node provider executes the untouched artifact factory inside a
  // real node context. No Angular private context helper or token is imported.
  TestBed.overrideComponent(MatLegacyCheckbox,{add:{providers:[{
    provide:CHECKBOX_NODE_FACTORY_PROBE,useFactory:()=>{
      observingCheckboxArtifactFactory=true;
      try{return checkboxArtifactFactory();}
      finally{observingCheckboxArtifactFactory=false;}
    },
  },{
    provide:CHECKBOX_EMITTER_BASELINE,useFactory:()=>{
      // The untouched v16 checkbox has exactly two EventEmitter fields.
      // Measure current public emitter construction without a private token import.
      observingPublicEmitterBaseline=true;
      try{return [new EventEmitter<unknown>(),new EventEmitter<unknown>()];}
      finally{observingPublicEmitterBaseline=false;}
    },
  }]}});
  for(const definition of [MatLegacyCellDef,MatLegacyHeaderCellDef,MatLegacyFooterCellDef]){
    TestBed.overrideDirective(definition,{add:{providers:[{
      provide:CELL_DEF_NODE_INJECTOR,useFactory:()=>inject(Injector),
    }]}});
  }
  TestBed.configureTestingModule({
    imports: [HarnessHost, SmokeDialogContent, LegacyNativeDateModule, MatLegacyNativeDateModule],
    providers: [provideNoopAnimations(), {provide: MAT_LEGACY_DATE_LOCALE, useValue: 'en-GB'}, {provide:TEXT_COLUMN_OPTIONS,useValue:ORIGINAL_TEXT_OPTIONS}],
  });
  const provided = TestBed.inject(LegacyDateAdapter);
  const nativeDateProvider = provided instanceof LegacyNativeDateAdapter &&
    provided !== direct && provided.getYear(provided.createDate(2024, 1, 29)) === 2024 &&
    TestBed.inject(MAT_LEGACY_DATE_FORMATS) === MAT_LEGACY_NATIVE_DATE_FORMATS &&
    provided.format(provided.createDate(2024, 0, 2), {year:'numeric', month:'2-digit', day:'2-digit'}) === '02/01/2024';
  // Fixed, independently authored safe SVG fixture. Exercise the peer's public
  // registry/sanitizer path without importing or copying its private TT helper.
  const iconRegistry=TestBed.inject(MatIconRegistry), sanitizer=TestBed.inject(DomSanitizer);
  iconRegistry.addSvgIconLiteral('closeout-trusted',sanitizer.bypassSecurityTrustHtml(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><path id="closeout-path" d="M0 0h8v8H0z"/></svg>'));
  let rawIconRejected=false;
  try { iconRegistry.addSvgIconLiteral('closeout-untrusted','<script>void 0</script>' as never); }
  catch { rawIconRejected=true; }
  const iconSvg=()=>new Promise<SVGElement>((resolve,reject)=>
    iconRegistry.getNamedSvgIcon('closeout-trusted').subscribe({next:resolve,error:reject}));
  const firstIcon=await iconSvg();firstIcon.querySelector('path')!.setAttribute('d','M1 1');
  const secondIcon=await iconSvg();
  const fixture = TestBed.createComponent(HarnessHost);
  fixture.detectChanges();
  const cellDefinitionObservation=[];
  const definitions=[
    [MatLegacyCellDef,CdkCellDef,fixture.componentInstance.cellDefinition,fixture.componentInstance.cellTemplate,fixture.componentInstance.cellInjector,'Data probe'],
    [MatLegacyHeaderCellDef,CdkHeaderCellDef,fixture.componentInstance.headerDefinition,fixture.componentInstance.headerTemplate,fixture.componentInstance.headerInjector,'Header probe'],
    [MatLegacyFooterCellDef,CdkFooterCellDef,fixture.componentInstance.footerDefinition,fixture.componentInstance.footerTemplate,fixture.componentInstance.footerInjector,'Footer probe'],
  ] as const;
  for(const [Owned,Peer,nodeDefinition,template,nodeInjector,text] of definitions){
    const manual=new Owned(template);
    const view=manual.template.createEmbeddedView({});view.detectChanges();
    cellDefinitionObservation.push({name:Owned.name,
      manual_argument_identity:manual.template===template,
      manual_owned_identity:manual instanceof Owned,manual_peer_identity:manual instanceof Peer,
      manual_prototype:Object.getPrototypeOf(manual)===Owned.prototype,
      parent_constructor_identity:Object.getPrototypeOf(Owned)===Peer,
      node_owned_identity:nodeDefinition instanceof Owned,node_peer_identity:nodeDefinition instanceof Peer,
      node_template_anchor:nodeDefinition.template.elementRef.nativeElement===template.elementRef.nativeElement,
      node_provider_alias:nodeInjector.get(Peer)===nodeDefinition,
      embedded_view_text:view.rootNodes.map(node=>node.textContent||'').join('').trim()===text});
    view.destroy();
  }
  const cellDefinitionOriginalConstructors=cellDefinitionObservation.length===3
    &&cellDefinitionObservation.every(row=>Object.entries(row).every(([name,value])=>name==='name'||value===true));
  const cellConstructorObservation=[];
  const column=fixture.componentInstance.gridColumn;
  for(const [Owned,Peer,selector,role] of [
    [MatLegacyHeaderCell,CdkHeaderCell,'mat-header-cell','columnheader'],
    [MatLegacyCell,CdkCell,'mat-cell','gridcell'],
    [MatLegacyFooterCell,CdkFooterCell,'mat-footer-cell','gridcell'],
  ] as const){
    const element=win.document.createElement('div');element.classList.add('manual-kept');
    const suppliedElement=new ElementRef<HTMLElement>(element);
    const manual=new Owned(column,suppliedElement);
    const node=fixture.debugElement.query(item=>item.nativeElement?.matches?.('#constructor-grid '+selector));
    cellConstructorObservation.push({name:Owned.name,
      owned_identity:manual instanceof Owned,peer_identity:manual instanceof Peer,
      prototype_identity:Object.getPrototypeOf(manual)===Owned.prototype,
      parent_constructor_identity:Object.getPrototypeOf(Owned)===Peer,
      supplied_element_classes:element.classList.contains('manual-kept')
        &&element.classList.contains('cdk-column-constructor-probe')&&element.classList.contains('mat-column-constructor-probe'),
      manual_grid_role:selector==='mat-header-cell'?element.getAttribute('role')===null:element.getAttribute('role')==='gridcell',
      node_owned_identity:node?.injector.get(Owned) instanceof Owned,
      node_peer_identity:node?.injector.get(Owned) instanceof Peer,
      node_grid_role:node?.nativeElement.getAttribute('role')===role,
      node_provider_element:!!node?.nativeElement.classList.contains('mat-column-constructor-probe')});
  }
  const cellOriginalConstructors=cellConstructorObservation.length===3
    &&cellConstructorObservation.every(row=>Object.entries(row).every(([name,value])=>name==='name'||value===true));
  const textTableNode=fixture.debugElement.query(node=>node.nativeElement?.id==='constructor-text-table');
  const textTable=textTableNode.injector.get(MatLegacyTable);
  const nodeTextColumn=fixture.componentInstance.originalTextColumn;
  const manualTextColumn=new MatLegacyTextColumn(textTable,ORIGINAL_TEXT_OPTIONS);
  const manualTextFields=manualTextColumn as any;
  const textColumnObservation={
    manual_owned_identity:manualTextColumn instanceof MatLegacyTextColumn,
    manual_peer_identity:manualTextColumn instanceof CdkTextColumn,
    parent_constructor_identity:Object.getPrototypeOf(MatLegacyTextColumn)===CdkTextColumn,
    manual_table_identity:manualTextFields._table===textTable,
    manual_options_identity:manualTextFields._options===ORIGINAL_TEXT_OPTIONS,
    default_justify:manualTextColumn.justify==='start',
    node_table_identity:(nodeTextColumn as any)._table===textTable,
    node_options_identity:(nodeTextColumn as any)._options===ORIGINAL_TEXT_OPTIONS,
    custom_header:nodeTextColumn.headerText==='Header value',
    custom_accessor:nodeTextColumn.dataAccessor({value:'value'},'value')==='Cell value',
    rendered_header:fixture.nativeElement.querySelector('#constructor-text-table th')?.textContent.trim()==='Header value',
    rendered_cell:fixture.nativeElement.querySelector('#constructor-text-table td')?.textContent.trim()==='Cell value',
    options_unmutated:Object.isFrozen(ORIGINAL_TEXT_OPTIONS)&&Object.keys(ORIGINAL_TEXT_OPTIONS).length===2,
  };
  const textColumnOriginalConstructor=Object.values(textColumnObservation).every(value=>value===true);
  const suppliedTabTemplate=fixture.componentInstance.originalTabTemplate;
  const nodeTabContent=fixture.componentInstance.originalTabContent;
  const manualTabContent=new MatLegacyTabContent(suppliedTabTemplate);
  const tabView=manualTabContent.template.createEmbeddedView({});tabView.detectChanges();
  const tabContentObservation={manual_argument_identity:manualTabContent.template===suppliedTabTemplate,
    manual_owned_identity:manualTabContent instanceof MatLegacyTabContent,
    manual_peer_identity:manualTabContent instanceof MatTabContent,
    prototype_identity:Object.getPrototypeOf(manualTabContent)===MatLegacyTabContent.prototype,
    parent_constructor_identity:Object.getPrototypeOf(MatLegacyTabContent)===MatTabContent,
    node_owned_identity:nodeTabContent instanceof MatLegacyTabContent,
    node_peer_identity:nodeTabContent instanceof MatTabContent,
    node_template_anchor:nodeTabContent.template.elementRef.nativeElement===suppliedTabTemplate.elementRef.nativeElement,
    embedded_view_text:tabView.rootNodes.map(node=>node.textContent||'').join('').trim()==='Tab lazy probe'};
  tabView.destroy();
  const tabContentOriginalConstructor=Object.values(tabContentObservation).every(value=>value===true);
  const eagerNode=fixture.debugElement.query(element=>element.nativeElement?.id==='tooltip-eager');
  const eagerTooltip=eagerNode.injector.get(MatLegacyTooltip);
  // These are owned original16 fields, not current private peer imports. Check
  // real object identity before any show(), including an empty disabled trigger.
  const eagerFields=eagerTooltip as any;
  const manualArguments=[eagerNode.injector.get(Overlay),new ElementRef(win.document.createElement('span')),
    eagerNode.injector.get(ScrollDispatcher),eagerNode.injector.get(ViewContainerRef),eagerNode.injector.get(NgZone),
    eagerNode.injector.get(Platform),eagerNode.injector.get(AriaDescriber),eagerNode.injector.get(FocusMonitor),
    eagerNode.injector.get(MAT_LEGACY_TOOLTIP_SCROLL_STRATEGY),eagerNode.injector.get(Directionality),
    eagerNode.injector.get(MAT_LEGACY_TOOLTIP_DEFAULT_OPTIONS,null)!,win.document] as const;
  // Calling the historical public constructor outside an Angular injection
  // context must honor its supplied values, not silently inject replacements.
  const manualTooltip=new MatLegacyTooltip(...manualArguments);
  const manualFields=manualTooltip as any;
  const manualSlots=['_overlay','_elementRef','_scrollDispatcher','_viewContainerRef','_ngZone','_platform',
    '_ariaDescriber','_focusMonitor','_scrollStrategy','_dir','_defaultOptions','_document'];
  const manualConstructorIdentity=manualSlots.every((name,index)=>manualFields[name]===manualArguments[index]);
  manualTooltip.ngOnDestroy();
  const tooltipEagerObservation={
    disabled_empty:eagerTooltip.disabled&&eagerTooltip.message==='',
    no_overlay_created:eagerFields._overlayRef==null&&eagerFields._tooltipInstance==null&&eagerFields._portal==null,
    overlay_identity:eagerFields._overlay===eagerNode.injector.get(Overlay),
    scroll_dispatcher_identity:eagerFields._scrollDispatcher===eagerNode.injector.get(ScrollDispatcher),
    view_container_node:eagerFields._viewContainerRef instanceof ViewContainerRef
      &&eagerFields._viewContainerRef.element.nativeElement===eagerNode.nativeElement,
    manual_constructor_identity:manualConstructorIdentity,
    strategy_identity:eagerFields._scrollStrategy===eagerNode.injector.get(MAT_LEGACY_TOOLTIP_SCROLL_STRATEGY),
    document_identity:eagerFields._document===win.document,
  };
  const tooltipOriginalEagerDependencies=Object.values(tooltipEagerObservation).every(value=>value===true);
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

  // Actual DOM events exercise the original keyup guard and repeated-event contract.
  const repeatInput=fixture.nativeElement.querySelector('#repeat-input') as HTMLInputElement;
  const repeatLast=fixture.nativeElement.querySelector('#repeat-last') as HTMLElement;
  const keyboard=(element:HTMLElement,type:string,keyCode:number,repeat=false)=>{
    const event=new KeyboardEvent(type,{bubbles:true,cancelable:true,repeat});
    Object.defineProperty(event,'keyCode',{value:keyCode});
    element.dispatchEvent(event);fixture.detectChanges();return event;
  };
  repeatInput.focus();fixture.detectChanges();
  repeatInput.value='changed';keyboard(repeatInput,'keydown',65);
  repeatInput.value='';repeatInput.dispatchEvent(new Event('input',{bubbles:true}));fixture.detectChanges();
  keyboard(repeatInput,'keydown',8,false);keyboard(repeatInput,'keydown',8,true);
  const heldDidNotFocus=document.activeElement===repeatInput;
  keyboard(repeatInput,'keyup',8);
  const releaseDidNotFocus=document.activeElement===repeatInput;
  keyboard(repeatInput,'keydown',8,false);
  const chipBackspaceRelease=heldDidNotFocus&&releaseDidNotFocus&&document.activeElement===repeatLast;
  const firstRemoval=keyboard(repeatLast,'keydown',8,false);
  const repeatedRemoval=keyboard(repeatLast,'keydown',8,true);
  repeatInput.focus();repeatInput.value='separator value';
  const firstSeparator=keyboard(repeatInput,'keydown',188,false);
  const repeatedSeparator=keyboard(repeatInput,'keydown',188,true);
  const chipRepeatedEvents=fixture.componentInstance.repeatRemovals===2&&fixture.componentInstance.repeatEnds===2
    &&firstRemoval.defaultPrevented&&repeatedRemoval.defaultPrevented&&firstSeparator.defaultPrevented&&repeatedSeparator.defaultPrevented;
  const chipTabIndex = (fixture.nativeElement.querySelector('#attribute-chip') as HTMLElement).tabIndex;
  const radioTabIndex = (fixture.nativeElement.querySelector('#attribute-radio input') as HTMLInputElement).tabIndex;
  const liveDefault=fixture.nativeElement.querySelector('#error-live-default') as HTMLElement;
  const liveExplicit=fixture.nativeElement.querySelector('#error-live-explicit') as HTMLElement;
  const liveEmpty=fixture.nativeElement.querySelector('#error-live-empty') as HTMLElement;
  const manualError=document.createElement('div');
  new MatLegacyError('',new ElementRef(manualError));
  const explicitManualError=document.createElement('div');explicitManualError.setAttribute('aria-live','assertive');
  new MatLegacyError('assertive',new ElementRef(explicitManualError));
  const errorLiveRegion=liveDefault.getAttribute('aria-live')==='polite'&&liveEmpty.getAttribute('aria-live')==='polite'
    &&liveExplicit.getAttribute('aria-live')==='assertive'
    &&[liveDefault,liveExplicit,liveEmpty].every(el=>el.getAttribute('aria-atomic')==='true')
    &&manualError.getAttribute('aria-live')==='polite'&&explicitManualError.getAttribute('aria-live')==='assertive';
  const peerIconLiteralSanitization=rawIconRejected&&firstIcon!==secondIcon
    &&secondIcon.querySelector('path')?.getAttribute('d')==='M0 0h8v8H0z'
    &&fixture.nativeElement.querySelector('#trusted-icon-button mat-icon svg path')?.getAttribute('d')==='M0 0h8v8H0z';
  const byId=(id:string)=>fixture.debugElement.query(element=>element.nativeElement?.id===id);
  const stepper=byId('peer-stepper').injector.get(MatStepper);
  const firstStep=stepper.steps.get(0)!;
  const stepControl=fixture.componentInstance.stepControl;
  const stepSelections:number[]=[];
  const stepSelectionSubscription=stepper.selectionChange.subscribe(event=>stepSelections.push(event.selectedIndex));
  stepper.selectedIndex=1;
  const invalidBlocked=stepper.selectedIndex===0&&firstStep.interacted&&firstStep.hasError&&!firstStep.completed;
  stepControl.setValue('valid');stepControl.markAsPending();
  stepper.selectedIndex=1;
  const pendingBlocked=stepper.selectedIndex===0&&stepControl.pending;
  stepControl.updateValueAndValidity();stepper.selectedIndex=1;
  const validAdvanced=stepper.selectedIndex===1&&firstStep.completed&&!firstStep.hasError;
  stepper.reset();
  const resetRestored=stepper.selectedIndex===0&&stepControl.value===null&&stepControl.invalid
    &&stepControl.pristine&&stepControl.untouched&&!firstStep.interacted&&!firstStep.completed&&!firstStep.hasError;
  stepSelectionSubscription.unsubscribe();
  const peerStepperObservation={invalidBlocked,pendingBlocked,validAdvanced,resetRestored,selections:stepSelections};
  const peerStepperAbstractControl=invalidBlocked&&pendingBlocked&&validAdvanced&&resetRestored
    &&JSON.stringify(stepSelections)===JSON.stringify([1,0]);
  const checkboxAttribute=byId('attribute-checkbox').injector.get(MatLegacyCheckbox).tabIndex===7
    &&(fixture.nativeElement.querySelector('#attribute-checkbox input') as HTMLInputElement).tabIndex===7;
  const slideToggleAttribute=byId('attribute-toggle').injector.get(MatLegacySlideToggle).tabIndex===9
    &&(fixture.nativeElement.querySelector('#attribute-toggle input') as HTMLInputElement).tabIndex===9;
  const sliderAttribute=byId('attribute-slider').injector.get(MatLegacySlider).tabIndex===11
    &&(fixture.nativeElement.querySelector('#attribute-slider') as HTMLElement).tabIndex===11;
  const tabLinkAttribute=byId('attribute-tab-link').injector.get(MatLegacyTabLink).tabIndex===13
    &&(fixture.nativeElement.querySelector('#attribute-tab-link') as HTMLElement).tabIndex===13;

  const fieldNode=byId('token-field'),prefixNode=byId('token-prefix'),suffixNode=byId('token-suffix');
  const field=fieldNode.injector.get(MatLegacyFormField);
  const formFieldTokenIsolation=new Set<unknown>([MAT_LEGACY_FORM_FIELD,MAT_LEGACY_ERROR,MAT_LEGACY_PREFIX,MAT_LEGACY_SUFFIX,MAT_FORM_FIELD,MAT_ERROR,MAT_PREFIX,MAT_SUFFIX]).size===8
    &&Object.is(fieldNode.injector.get(MAT_LEGACY_FORM_FIELD),field)&&fieldNode.injector.get(MAT_FORM_FIELD,null)===null
    &&byId('error-live-default').injector.get(MAT_LEGACY_ERROR)===byId('error-live-default').injector.get(MatLegacyError)
    &&byId('error-live-default').injector.get(MAT_ERROR,null)===null
    &&prefixNode.injector.get(MAT_LEGACY_PREFIX)===prefixNode.injector.get(MatLegacyPrefix)
    &&prefixNode.injector.get(MAT_PREFIX,null)===null
    &&suffixNode.injector.get(MAT_LEGACY_SUFFIX)===suffixNode.injector.get(MatLegacySuffix)
    &&suffixNode.injector.get(MAT_SUFFIX,null)===null
    &&field._prefixChildren.length===1&&field._suffixChildren.length===1;
  const barNode=byId('location-progress'),bar=barNode.injector.get(MatLegacyProgressBar);
  const pattern=barNode.nativeElement.querySelector('pattern') as SVGPatternElement;
  const rectangle=barNode.nativeElement.querySelector('rect') as SVGRectElement;
  const rootLocation=TestBed.inject(MAT_LEGACY_PROGRESS_BAR_LOCATION);
  const factoryLocation=TestBed.runInInjectionContext(()=>MAT_LEGACY_PROGRESS_BAR_LOCATION_FACTORY());
  const originalUrl=document.location.href;
  let dynamicLocation=false;
  try {
    win.history.replaceState(null,'','/factory-probe(path)?q=1#ignored');
    dynamicLocation=rootLocation.getPathname()==='/factory-probe(path)?q=1'&&factoryLocation.getPathname()==='/factory-probe(path)?q=1';
    win.history.replaceState(null,'','/second-path?changed=2');
    dynamicLocation=dynamicLocation&&rootLocation.getPathname()==='/second-path?changed=2'&&factoryLocation.getPathname()==='/second-path?changed=2';
  }finally {win.history.replaceState(null,'',originalUrl);}
  const progressLocationAndDefaults=dynamicLocation&&pattern!==null&&rectangle!==null
    &&barNode.injector.get(MAT_LEGACY_PROGRESS_BAR_LOCATION)!==rootLocation
    &&MAT_LEGACY_PROGRESS_BAR_DEFAULT_OPTIONS!==MAT_PROGRESS_BAR_DEFAULT_OPTIONS
    &&bar.color==='warn'&&bar.mode==='query'
    &&rectangle.getAttribute('fill')==="url('/legacy-location(path)?query=1#"+pattern.id+"')";
  // Real public constructor calls exercise the owned common module, not a dummy.
  // Simulate platform-computed colors, but use the unchanged actual CDK
  // detector/module and its public BreakpointObserver event/teardown boundary.
  const oldComputedStyle=globalThis.getComputedStyle;
  const documentWindow=document.defaultView;
  if(!documentWindow)throw Error('contrast fixture requires a document window');
  const oldWindowComputedStyle=documentWindow.getComputedStyle;
  const oldBodyClass=document.body.className;
  const contrastChanges=new Subject<BreakpointState>();
  let computedBackground='rgb(255, 255, 255)';
  let contrastProbeReads=0;
  let contrastLifecycle=false;
  const environment=createEnvironmentInjector([
    HighContrastModeDetector,
    {provide:MATERIAL_LEGACY_SANITY_CHECKS,useValue:false},
    {provide:BreakpointObserver,useValue:{observe:(query:string|string[])=>{
      if(query!=='(forced-colors: active)')throw Error('unexpected contrast media query');
      return contrastChanges.asObservable();
    }}},
  ],TestBed.inject(EnvironmentInjector));
  let commonRef:{destroy():void}|undefined;
  let environmentClosed=false;
  try {
    globalThis.getComputedStyle=(element,pseudo)=>{
      const style=oldWindowComputedStyle.call(documentWindow,element,pseudo);
      if((element as HTMLElement).style?.backgroundColor.replace(/\\s/g,'')==='rgb(1,2,3)') {
        contrastProbeReads++;
        return new Proxy(style,{get:(target,key)=>key==='backgroundColor'?computedBackground:Reflect.get(target,key,target)});
      }
      return style;
    };
    documentWindow.getComputedStyle=globalThis.getComputedStyle;
    commonRef=createNgModule(MatLegacyCommonModule,environment);
    const classes=document.body.classList;
    const black=classes.contains('cdk-high-contrast-active')&&classes.contains('cdk-high-contrast-black-on-white')&&!classes.contains('cdk-high-contrast-white-on-black');
    computedBackground='rgb(0, 0, 0)';
    contrastChanges.next({matches:true,breakpoints:{'(forced-colors: active)':true}});
    const white=classes.contains('cdk-high-contrast-active')&&classes.contains('cdk-high-contrast-white-on-black')&&!classes.contains('cdk-high-contrast-black-on-white');
    computedBackground='rgb(1, 2, 3)';
    contrastChanges.next({matches:false,breakpoints:{'(forced-colors: active)':false}});
    const none=!classes.contains('cdk-high-contrast-active')&&!classes.contains('cdk-high-contrast-black-on-white')&&!classes.contains('cdk-high-contrast-white-on-black');
    commonRef.destroy();commonRef=undefined;environmentClosed=true;environment.destroy();
    const readsBeforeDestroyedEmission=contrastProbeReads;
    computedBackground='rgb(255, 255, 255)';
    contrastChanges.next({matches:true,breakpoints:{'(forced-colors: active)':true}});
    contrastLifecycle=black&&white&&none&&contrastProbeReads===readsBeforeDestroyedEmission
      &&!classes.contains('cdk-high-contrast-active');
  } finally {
    if(commonRef)commonRef.destroy();
    if(!environmentClosed)environment.destroy();
    contrastChanges.complete();documentWindow.getComputedStyle=oldWindowComputedStyle;
    globalThis.getComputedStyle=oldComputedStyle;
    document.body.className=oldBodyClass;
  }
  const sanityWarnings: string[]=[];
  const originalWarn=console.warn;
  try {
    console.warn=(message:unknown)=>{sanityWarnings.push(String(message));};
    const doc={doctype:null,body:null} as unknown as Document;
    const detector={getHighContrastMode:()=>HighContrastMode.NONE} as unknown as HighContrastModeDetector;
    TestBed.runInInjectionContext(()=>new MatLegacyCommonModule(detector,{doctype:true,theme:false,version:false},doc));
  } finally {console.warn=originalWarn;}
  // This standalone Node fixture has no runner-local Jasmine/Jest variables.
  const runner=globalThis as typeof globalThis & {__karma__?:unknown;jasmine?:unknown;jest?:unknown;Mocha?:unknown};
  const checksEnabled=isDevMode()&&!Boolean(runner.__karma__||runner.jasmine||runner.jest||runner.Mocha);
  const checkboxProbeInjector=byId('attribute-checkbox').injector;
  const environmentProto=Object.getPrototypeOf(TestBed.inject(EnvironmentInjector));
  const environmentGet=environmentProto.get;
  const nodeRequests:Array<{token:unknown,optional:boolean}>=[];
  const emitterRequests:Array<{token:unknown,optional:boolean}>=[];
  let nodeGetDepth=0,checkboxNodeFactoryContext=false;
  let checkboxNodeFactoryError:string|null=null;
  let checkboxProbeInstance:MatLegacyCheckbox|undefined;
  environmentProto.get=function(token:unknown,notFound:unknown,flags:unknown){
    const request={token,optional:typeof flags==='number'?(flags&8)===8:Boolean(flags&&typeof flags==='object'&&'optional' in flags&&flags.optional)};
    if(nodeGetDepth===0){
      if(observingCheckboxArtifactFactory)nodeRequests.push(request);
      if(observingPublicEmitterBaseline)emitterRequests.push(request);
    }
    nodeGetDepth++;
    try{return environmentGet.call(this,token,notFound,flags);}finally{nodeGetDepth--;}
  };
  try {
    checkboxProbeInstance=checkboxProbeInjector.get(CHECKBOX_NODE_FACTORY_PROBE);
    const emitterBaseline=checkboxProbeInjector.get(CHECKBOX_EMITTER_BASELINE);
    const expected=[FocusMonitor,NgZone,ANIMATION_MODULE_TYPE,MAT_LEGACY_CHECKBOX_DEFAULT_OPTIONS];
    const directRequests=nodeRequests.slice(0,expected.length),bodyRequests=nodeRequests.slice(expected.length);
    checkboxNodeFactoryContext=checkboxProbeInstance instanceof MatLegacyCheckbox&&checkboxProbeInstance.tabIndex===7
      &&emitterBaseline.length===2&&emitterBaseline.every(emitter=>emitter instanceof EventEmitter)
      &&directRequests.length===expected.length&&directRequests.every((request,index)=>
        request.token===expected[index]&&request.optional===(index>=2))
      &&bodyRequests.length===emitterRequests.length&&bodyRequests.every((request,index)=>
        request.token===emitterRequests[index].token&&request.optional===emitterRequests[index].optional);
  } catch(error){checkboxNodeFactoryError=String(error);}
  finally {environmentProto.get=environmentGet;}
  const checkboxNodeFactoryObservation={
    attribute:checkboxProbeInstance?.tabIndex??null,
    returned:checkboxProbeInstance instanceof MatLegacyCheckbox,
    root_requests:nodeRequests.map(request=>({token:typeof request.token==='function'?request.token.name:String(request.token),optional:request.optional})),
    public_emitter_baseline_requests:emitterRequests.map(request=>({token:typeof request.token==='function'?request.token.name:String(request.token),optional:request.optional})),
    token_objects_and_optional_flags_match:checkboxNodeFactoryContext,
    error:checkboxNodeFactoryError,
  };
  checkboxProbeInstance?.ngOnDestroy();

  const commonModuleBehavior=TestBed.inject(MATERIAL_LEGACY_SANITY_CHECKS)===true
    &&String(MATERIAL_LEGACY_SANITY_CHECKS)==='InjectionToken mat-sanity-checks'
    &&contrastLifecycle
    &&sanityWarnings.length===(checksEnabled?1:0)
    &&(!checksEnabled||sanityWarnings[0].includes('Current document does not have a doctype.'));
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
      selected === 'Two' && nativeDateConstructor && nativeDateProvider && chipTabIndex === 6 && radioTabIndex === 8 && chipBackspaceRelease && chipRepeatedEvents && errorLiveRegion && formFieldTokenIsolation && progressLocationAndDefaults && commonModuleBehavior && checkboxAttribute && slideToggleAttribute && sliderAttribute && tabLinkAttribute && peerIconLiteralSanitization && checkboxNodeFactoryContext && peerStepperAbstractControl && tooltipOriginalEagerDependencies && cellDefinitionOriginalConstructors && cellOriginalConstructors && textColumnOriginalConstructor && tabContentOriginalConstructor,
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
    nativeDateConstructor,
    nativeDateProvider,
    chipTabIndex,
    radioTabIndex,
    chipBackspaceRelease,
    chipRepeatedEvents,
    errorLiveRegion,
    formFieldTokenIsolation,
    progressLocationAndDefaults,
    commonModuleBehavior,
    peerIconLiteralSanitization,
    checkboxNodeFactoryContext,
    checkboxNodeFactoryObservation,
    peerStepperAbstractControl, peerStepperObservation,
    tooltipOriginalEagerDependencies, tooltipEagerObservation,
    cellDefinitionOriginalConstructors, cellDefinitionObservation,
    cellOriginalConstructors, cellConstructorObservation,
    textColumnOriginalConstructor, textColumnObservation,
    tabContentOriginalConstructor, tabContentObservation,
    checkboxAttribute, slideToggleAttribute, sliderAttribute, tabLinkAttribute,
    commonModuleDiagnostics:{contrastLifecycle,contrastProbeReads,sanityWarnings,checksEnabled,sanityDefault:TestBed.inject(MATERIAL_LEGACY_SANITY_CHECKS),sanityToken:String(MATERIAL_LEGACY_SANITY_CHECKS)},
    chipEventCounts:{removals:fixture.componentInstance.repeatRemovals,separators:fixture.componentInstance.repeatEnds},
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
