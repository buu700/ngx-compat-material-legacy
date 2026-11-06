#!/usr/bin/env node
/**
 * Packed-consumer AOT + harness runtime expansion beyond ESM import smoke.
 *
 * Creates a clean temp consumer, installs the packed tarball + aged Angular
 * peers, compiles strict declarations and separate consumer scopes, and runs
 * Angular TestBed DOM/harness contracts, including six actual legacy value
 * accessors. TestBed uses JSDOM; native browser qualification is separate.
 *
 * Usage:
 *   node scripts/packed-consumer-aot-smoke.mjs --tarball path [--skip-harness]
 * Evidence:
 *   compatibility/pack-proof/aot-harness-smoke.json
 */
import {npmToolingOptions} from './npm-tooling-options.mjs';
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
import {valueAccessorPackedFixture} from './value-accessor-packed-fixture.mjs';
import {packedValueAccessorCases} from './value-accessor-packed-contract.mjs';
import {tableOnPushPackedFixture} from './table-onpush-packed-fixture.mjs';
import {packedTableOnPushCase} from './table-onpush-packed-contract.mjs';
import {radioIdentityPackedFixture} from './radio-identity-packed-fixture.mjs';
import {packedRadioIdentityCase} from './radio-identity-packed-contract.mjs';
import {generatedIdentityPackedFixture} from './generated-identity-packed-fixture.mjs';
import {packedGeneratedIdentityCase} from './generated-identity-packed-contract.mjs';
import {selectDetachPackedFixture} from './select-detach-packed-fixture.mjs';
import {packedSelectDetachCase} from './select-detach-packed-contract.mjs';
import {menuItemTokenPackedFixture} from './menu-item-token-packed-fixture.mjs';
import {packedMenuItemTokenCase} from './menu-item-token-packed-contract.mjs';
import {selectFocusClickPackedFixture} from './select-focus-click-packed-fixture.mjs';
import {packedSelectFocusClickCase} from './select-focus-click-packed-contract.mjs';
import {packedChipDisabledCase,packedMenuLazyCase,packedTooltipContainerCase} from './chip-menu-tooltip-packed-contract.mjs';
import {bidiIsolatedPackedFixture} from './bidi-isolated-packed-fixture.mjs';
import {packedLegacyBidiScopeCase} from './bidi-isolated-packed-contract.mjs';
import {selectionComparatorPackedFixture} from './selection-comparator-packed-fixture.mjs';
import {packedSelectionComparatorCase} from './selection-comparator-packed-contract.mjs';
import {nativeDatePackedFixture} from './native-date-packed-fixture.mjs';
import {packedNativeDateConstructorCase,packedNativeDateProviderCase} from './native-date-packed-contract.mjs';
import {assertEngineFreeConsumer, assertEngineFreeHarnessInputs} from './consumer-animation-engine.mjs';
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
  const animationEngine = assertEngineFreeConsumer(consumer);
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
    animation_engine: animationEngine,
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
  const valueAccessorCases = new Map(packedValueAccessorCases(parsed.valueAccessorRegistration).map(row => [row.case_id, row]));
  const tableOnPushCase = packedTableOnPushCase(parsed.tableOnPushRendering);
  const radioIdentityCase = packedRadioIdentityCase(parsed.radioIdentity);
  const generatedIdentityCase = packedGeneratedIdentityCase(parsed.generatedIdentity);
  const selectDetachCase = packedSelectDetachCase(parsed.selectScrollDetach);
  const menuItemTokenCase = packedMenuItemTokenCase(parsed.menuItemToken);
  const selectFocusClickCase = packedSelectFocusClickCase(parsed.selectFocusClick);
  const detailedBehaviorCases = new Map([
    packedChipDisabledCase(parsed.chipDisabledObservation),packedMenuLazyCase(parsed.menuLazyObservation),
    packedTooltipContainerCase(parsed.tooltipContainerObservation),packedLegacyBidiScopeCase(parsed.isolatedLegacyBidi),
    packedSelectionComparatorCase(parsed.selectionComparatorObservation),
    packedNativeDateConstructorCase(parsed.nativeDateConstructorObservation),
    packedNativeDateProviderCase(parsed.nativeDateProviderObservation),
  ].map(row => [row.case_id,row]));
  const harnessMap = {
    'packed-consumer/harness/legacy-button': parsed.buttonText === 'Go',
    'packed-consumer/harness/legacy-select': parsed.selectOpened === true && parsed.selectClosed === true && parsed.viewportShared === true,
    'packed-consumer/harness/legacy-dialog': typeof parsed.dialogText === 'string' && parsed.dialogText.includes('Hello dialog') && parsed.dialogsAfterClose === 0,
    'packed-consumer/harness/legacy-menu': parsed.menuOpen === true && parsed.menuItemConstruction === true,
    'packed-consumer/harness/menu-lazy-item-destruction': parsed.lazyMenuLifecycle === true,
    'packed-consumer/harness/legacy-snack-bar': typeof parsed.snackText === 'string' && parsed.snackText.includes('Snack message'),
    'packed-consumer/harness/legacy-tooltip': parsed.tipVisible === true && typeof parsed.tipText === 'string' && parsed.tipText.includes('Tip text'),
    'packed-consumer/harness/legacy-tabs': parsed.tabCount === 2 && parsed.selectedTab === 'Two' && parsed.viewportShared === true,
    'packed-consumer/harness/native-date-constructor': parsed.nativeDateConstructor === true,
    'packed-consumer/harness/native-date-provider': parsed.nativeDateProvider === true,
    'packed-consumer/harness/chip-tabindex-attribute': parsed.chipTabIndex === 6,
    'packed-consumer/harness/radio-tabindex-attribute': parsed.radioTabIndex === 8,
    'packed-consumer/harness/chip-input-backspace-release': parsed.chipBackspaceRelease === true,
    'packed-consumer/harness/chip-repeated-removal-and-separator': parsed.chipRepeatedEvents === true,
    'packed-consumer/harness/chip-individual-disabled-form-isolation': parsed.chipDisabledIsolation === true,
    'packed-consumer/harness/selection-model-comparator-public-list': parsed.selectionComparatorExposure === true,
    'packed-consumer/harness/bidi-module-legacy-node-scope': parsed.legacyBidiScope === true,
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
    'packed-consumer/harness/no-data-row-original-constructor': parsed.noDataRowOriginalConstructor === true,
    'packed-consumer/harness/constructor-borrowed-provider-lifecycle': parsed.constructorBorrowedProviderLifecycle === true,
    'packed-consumer/harness/table-original-sticky-coercion-dirty-state': parsed.tableOriginalStickyBehavior === true,
    'packed-consumer/harness/table-original-boolean-input-rendering': parsed.tableOriginalBooleanInputs === true,
    'packed-consumer/harness/table-recycle-row-view-identity': parsed.tableRecycleRowIdentity === true,
    'packed-consumer/harness/table-angular-di-construction': parsed.tableAngularDiConstruction === true,
    'packed-consumer/harness/table-definition-original-constructors': parsed.tableDefinitionOriginalConstructors === true && parsed.tableOutletAndDefinitionOwnership === true,
    'packed-consumer/harness/tab-label-original-constructor-and-nearest-tab': parsed.tabLabelOriginalConstructor === true,
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
    if (valueAccessorCases.has(caseId)) return valueAccessorCases.get(caseId);
    if (caseId === tableOnPushCase.case_id) return tableOnPushCase;
    if (caseId === radioIdentityCase.case_id) return radioIdentityCase;
    if (caseId === generatedIdentityCase.case_id) return generatedIdentityCase;
    if (caseId === selectDetachCase.case_id) return selectDetachCase;
    if (caseId === menuItemTokenCase.case_id) return menuItemTokenCase;
    if (caseId === selectFocusClickCase.case_id) {
      const ok = harnessMap[caseId] === true && selectFocusClickCase.result === 'pass';
      return {...selectFocusClickCase, result: ok ? 'pass' : 'fail',
        legacy_harness_passed: harnessMap[caseId] === true,
        failure: ok ? null : selectFocusClickCase.failure || 'Original select harness conditions failed'};
    }
    if (detailedBehaviorCases.has(caseId)) {
      const row = detailedBehaviorCases.get(caseId);
      const ok = harnessMap[caseId] === true && row.result === 'pass';
      return {...row,result:ok?'pass':'fail',legacy_harness_passed:harnessMap[caseId] === true,
        failure:ok?null:row.failure || 'Original harness conditions failed'};
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
  node_runtime: {version: process.version, exec_path: process.execPath, platform: `${process.platform}-${process.arch}`},
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

  const install = run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock'], npmToolingOptions({
    cwd: consumer,
    timeout: 180000,
    env: isolatedEnv(),
  }, ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock']));
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
    writeFileSync(join(consumer, 'src/value-accessor-probe.ts'), valueAccessorPackedFixture());
    writeFileSync(join(consumer, 'src/value-accessor-contract.mjs'), readFileSync(join(root, 'scripts/value-accessor-packed-contract.mjs')));
    writeFileSync(join(consumer, 'src/table-onpush-probe.ts'), tableOnPushPackedFixture());
    writeFileSync(join(consumer, 'src/table-onpush-contract.mjs'), readFileSync(join(root, 'scripts/table-onpush-packed-contract.mjs')));
    writeFileSync(join(consumer, 'src/radio-identity-probe.ts'), radioIdentityPackedFixture());
    writeFileSync(join(consumer, 'src/radio-identity-contract.mjs'), readFileSync(join(root, 'scripts/radio-identity-packed-contract.mjs')));
    writeFileSync(join(consumer, 'src/generated-identity-probe.ts'), generatedIdentityPackedFixture());
    writeFileSync(join(consumer, 'src/generated-identity-contract.mjs'), readFileSync(join(root, 'scripts/generated-identity-packed-contract.mjs')));
    writeFileSync(join(consumer, 'src/select-detach-probe.ts'), selectDetachPackedFixture());
    writeFileSync(join(consumer, 'src/select-detach-contract.mjs'), readFileSync(join(root, 'scripts/select-detach-packed-contract.mjs')));
    writeFileSync(join(consumer, 'src/menu-item-token-probe.ts'), menuItemTokenPackedFixture());
    writeFileSync(join(consumer, 'src/menu-item-token-contract.mjs'), readFileSync(join(root, 'scripts/menu-item-token-packed-contract.mjs')));
    writeFileSync(join(consumer, 'src/select-focus-click-probe.ts'), selectFocusClickPackedFixture());
    writeFileSync(join(consumer, 'src/select-focus-click-contract.mjs'), readFileSync(join(root, 'scripts/select-focus-click-packed-contract.mjs')));
    writeFileSync(join(consumer, 'src/chip-menu-tooltip-contract.mjs'), readFileSync(join(root, 'scripts/chip-menu-tooltip-packed-contract.mjs')));
    writeFileSync(join(consumer, 'src/bidi-isolated-probe.ts'), bidiIsolatedPackedFixture());
    writeFileSync(join(consumer, 'src/bidi-isolated-contract.mjs'), readFileSync(join(root, 'scripts/bidi-isolated-packed-contract.mjs')));
    writeFileSync(join(consumer, 'src/selection-comparator-probe.ts'), selectionComparatorPackedFixture());
    writeFileSync(join(consumer, 'src/selection-comparator-contract.mjs'), readFileSync(join(root, 'scripts/selection-comparator-packed-contract.mjs')));
    writeFileSync(join(consumer, 'src/native-date-probe.ts'), nativeDatePackedFixture());
    writeFileSync(join(consumer, 'src/native-date-contract.mjs'), readFileSync(join(root, 'scripts/native-date-packed-contract.mjs')));
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
import {APP_ID, Component, Directive, ElementRef, getDebugNode, Input, TemplateRef, ViewChild, ViewChildren, QueryList, Injector, ViewContainerRef, EventEmitter, InjectionToken, ANIMATION_MODULE_TYPE, NgZone, inject, isDevMode, createEnvironmentInjector, createNgModule, EnvironmentInjector, IterableDiffers, SimpleChange, runInInjectionContext} from '@angular/core';
import {Subject} from 'rxjs';
import {FormControl, FormsModule, ReactiveFormsModule, NgModel, Validators} from '@angular/forms';
import {observePackedValueAccessors} from './value-accessor-probe';
import {PackedOnPushTableHost, observePackedTableOnPush} from './table-onpush-probe';
import {PackedRadioIdentityHost, observePackedRadioIdentity} from './radio-identity-probe';
import {GENERATED_IDENTITY_IMPORTS, observePackedGeneratedIdentity} from './generated-identity-probe';
import {SELECT_DETACH_IMPORTS, observePackedSelectDetach} from './select-detach-probe';
import {MENU_ITEM_TOKEN_IMPORTS, observePackedMenuItemToken} from './menu-item-token-probe';
import {SELECT_FOCUS_CLICK_IMPORTS, observePackedSelectFocusClick} from './select-focus-click-probe';
import {packedChipDisabledCase,packedMenuLazyCase,packedTooltipContainerCase} from './chip-menu-tooltip-contract.mjs';
import {PackedLegacyBidiScope,observePackedLegacyBidiScope} from './bidi-isolated-probe';
import {packedLegacyBidiScopeCase} from './bidi-isolated-contract.mjs';
import {observePackedSelectionComparator} from './selection-comparator-probe';
import {packedSelectionComparatorCase} from './selection-comparator-contract.mjs';
import {observePackedNativeDateManual,observePackedNativeDateProviders} from './native-date-probe';
import {packedNativeDateConstructorCase,packedNativeDateProviderCase} from './native-date-contract.mjs';
import {MatStepperModule, MatStepper} from '@angular/material/stepper';
import {MatTabContent,MatTabLabel} from '@angular/material/tabs';
import {_LegacyViewport} from '@ngx-compat/material-legacy/legacy-core';
import {CdkPortal,ComponentPortal} from '@angular/cdk/portal';
import {BreakpointObserver, BreakpointState} from '@angular/cdk/layout';
import {AriaDescriber, FocusMonitor, HighContrastMode, HighContrastModeDetector} from '@angular/cdk/a11y';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import {getTestBed, TestBed} from '@angular/core/testing';
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {Overlay, OverlayContainer} from '@angular/cdk/overlay';
import {ScrollDispatcher} from '@angular/cdk/scrolling';
import {By} from '@angular/platform-browser';
import {CdkTableModule,CdkCellDef,CdkHeaderCellDef,CdkFooterCellDef,CdkCell,CdkHeaderCell,CdkFooterCell,CdkTextColumn,TEXT_COLUMN_OPTIONS,CdkNoDataRow,CdkTable,CdkColumnDef,CdkHeaderRowDef,CdkFooterRowDef,CdkRowDef} from '@angular/cdk/table';
import {_LegacyTableDefinitionOwner,MatLegacyTableModule,MatLegacyCellDef,MatLegacyHeaderCellDef,MatLegacyFooterCellDef,MatLegacyColumnDef,MatLegacyCell,MatLegacyHeaderCell,MatLegacyFooterCell,MatLegacyTable,MatLegacyTextColumn,MatLegacyNoDataRow,MatLegacyHeaderRowDef,MatLegacyFooterRowDef,MatLegacyRowDef} from '@ngx-compat/material-legacy/legacy-table';
import {Platform} from '@angular/cdk/platform';
import {Dir, Directionality} from '@angular/cdk/bidi';
import {MatLegacyButtonModule} from '@ngx-compat/material-legacy/legacy-button';
import {MatLegacyButtonHarness} from '@ngx-compat/material-legacy/legacy-button/testing';
import {MatLegacyError, MatLegacyFormField, MatLegacyPrefix, MatLegacySuffix, MatLegacyFormFieldModule, MAT_LEGACY_FORM_FIELD, MAT_LEGACY_ERROR, MAT_LEGACY_PREFIX, MAT_LEGACY_SUFFIX} from '@ngx-compat/material-legacy/legacy-form-field';
import {MAT_FORM_FIELD, MAT_ERROR, MAT_PREFIX, MAT_SUFFIX} from '@angular/material/form-field';
import {MatLegacySelectModule} from '@ngx-compat/material-legacy/legacy-select';
import {MatLegacySelectHarness} from '@ngx-compat/material-legacy/legacy-select/testing';
import {MatLegacyDialog, MatLegacyDialogModule} from '@ngx-compat/material-legacy/legacy-dialog';
import {MatLegacyDialogHarness} from '@ngx-compat/material-legacy/legacy-dialog/testing';
import {MatLegacyMenuModule,MatLegacyMenu,MatLegacyMenuItem,MatLegacyMenuTrigger,MAT_LEGACY_MENU_PANEL} from '@ngx-compat/material-legacy/legacy-menu';
import {MatMenuItem} from '@angular/material/menu';
import {MatLegacyMenuHarness} from '@ngx-compat/material-legacy/legacy-menu/testing';
import {MatLegacySnackBar, MatLegacySnackBarModule} from '@ngx-compat/material-legacy/legacy-snack-bar';
import {MatLegacySnackBarHarness} from '@ngx-compat/material-legacy/legacy-snack-bar/testing';
import {MatLegacyTooltip, LegacyTooltipComponent, MatLegacyTooltipModule, MAT_LEGACY_TOOLTIP_SCROLL_STRATEGY, MAT_LEGACY_TOOLTIP_DEFAULT_OPTIONS} from '@ngx-compat/material-legacy/legacy-tooltip';
import {MatLegacyTooltipHarness} from '@ngx-compat/material-legacy/legacy-tooltip/testing';
import {MatLegacyTabsModule, MatLegacyTabLink, MatLegacyTabContent, MatLegacyTabLabel, MatLegacyTab, MAT_LEGACY_TAB} from '@ngx-compat/material-legacy/legacy-tabs';
import {MatLegacyCheckbox, MatLegacyCheckboxModule, MAT_LEGACY_CHECKBOX_DEFAULT_OPTIONS} from '@ngx-compat/material-legacy/legacy-checkbox';
import {MatLegacySlideToggle, MatLegacySlideToggleModule} from '@ngx-compat/material-legacy/legacy-slide-toggle';
import {MatLegacySlider, MatLegacySliderModule} from '@ngx-compat/material-legacy/legacy-slider';
import {MatLegacyProgressBar, MatLegacyProgressBarModule, MAT_LEGACY_PROGRESS_BAR_LOCATION, MAT_LEGACY_PROGRESS_BAR_LOCATION_FACTORY, MAT_LEGACY_PROGRESS_BAR_DEFAULT_OPTIONS} from '@ngx-compat/material-legacy/legacy-progress-bar';
import {MAT_PROGRESS_BAR_DEFAULT_OPTIONS} from '@angular/material/progress-bar';
import {MatLegacyChip, MatLegacyChipList, MatLegacyChipsModule} from '@ngx-compat/material-legacy/legacy-chips';
import {MatLegacyListModule, MatLegacySelectionList} from '@ngx-compat/material-legacy/legacy-list';
import {MatLegacyInputModule} from '@ngx-compat/material-legacy/legacy-input';
import {MatLegacyRadioModule} from '@ngx-compat/material-legacy/legacy-radio';
import {MatIconModule, MatIconRegistry} from '@angular/material/icon';
import {DomSanitizer} from '@angular/platform-browser';
import {MatLegacyTabGroupHarness} from '@ngx-compat/material-legacy/legacy-tabs/testing';
import {MatLegacyCommonModule, MATERIAL_ANIMATIONS, MATERIAL_LEGACY_SANITY_CHECKS, LegacyNativeDateAdapter, LegacyNativeDateModule, MatLegacyNativeDateModule, LegacyDateAdapter, MAT_LEGACY_DATE_LOCALE, MAT_LEGACY_DATE_FORMATS, MAT_LEGACY_NATIVE_DATE_FORMATS} from '@ngx-compat/material-legacy/legacy-core';

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

const CELL_DEF_NODE_INJECTOR=new InjectionToken<Injector>('closeout-cell-def-node-injector');
const LAZY_MENU_LIFETIME=new InjectionToken<{created:number;destroyed:number}>('closeout-lazy-menu-lifetime');
const ORIGINAL_TEXT_OPTIONS=Object.freeze({defaultHeaderTextTransform:(name:string)=>'Header '+name,defaultDataAccessor:(data:any,name:string)=>'Cell '+data[name]});

@Directive({selector:'[legacyMenuDestroyProbe]',standalone:true})
class MenuDestroyProbe {
  private readonly state=inject(LAZY_MENU_LIFETIME);
  constructor(){this.state.created++;}
  ngOnDestroy(){this.state.destroyed++;}
}

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
    MenuDestroyProbe,
    MatLegacySnackBarModule,
    MatLegacyTooltipModule,
    MatLegacyTableModule,
    CdkTableModule,
    MatLegacyTabsModule,
    MatLegacyChipsModule,
    MatLegacyListModule,
    MatLegacyInputModule,
    FormsModule,
    ReactiveFormsModule,
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
    {provide:LAZY_MENU_LIFETIME,useFactory:()=>({created:0,destroyed:0})},
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
    <form>
      <mat-chip-list data-closeout-list="disabled-template" name="disabled-template" [ngModel]="null">
        <mat-chip id="disabled-template-chip" value="one" disabled>Individually disabled</mat-chip>
      </mat-chip-list>
    </form>
    <mat-chip-list data-closeout-list="disabled-reactive" [formControl]="disabledChipControl">
      <mat-chip id="disabled-individual-chip" value="one" disabled>Individual</mat-chip>
      <mat-chip id="disabled-inherited-chip" value="two">Inherited</mat-chip>
    </mat-chip-list>
    <mat-selection-list id="selection-comparator-list" [multiple]="false">
      <mat-list-option value="one">Comparable one</mat-list-option>
      <mat-list-option value="two">Comparable two</mat-list-option>
    </mat-selection-list>
    <mat-selection-list id="selection-comparator-comparable-list" [multiple]="false">
      <mat-list-option value="one">Other one</mat-list-option>
      <mat-list-option value="two">Other two</mat-list-option>
    </mat-selection-list>
    <section id="bidi-legacy-scope" [dir]="legacyDirection" (dirChange)="legacyDirectionChanges=legacyDirectionChanges+1">
      <mat-form-field id="bidi-legacy-field">
        <mat-label>Scoped direction</mat-label>
        <input matInput value="Scoped one">
      </mat-form-field>
    </section>
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
      <button mat-menu-item disabled id="menu-disabled">Disabled</button>
      <button mat-menu-item disableRipple id="menu-no-ripple">No ripple</button>
    </mat-menu>
    <button mat-button [matMenuTriggerFor]="lazyMenu" id="lazy-menu-trigger">Lazy menu</button>
    <button mat-button [matMenuTriggerFor]="lazyMenu" id="lazy-menu-other-trigger">Other lazy owner</button>
    <mat-menu #lazyMenu="matMenu">
      <ng-template matMenuContent>
        <button mat-menu-item legacyMenuDestroyProbe>Lazy one</button>
        <button mat-menu-item legacyMenuDestroyProbe>Lazy two</button>
      </ng-template>
    </mat-menu>
    <button mat-button id="snack-open">Snack</button>
    <button mat-button matTooltip="Tip text" id="tip">Hover</button>
    <table mat-table id="constructor-text-table" [dataSource]="[{value:'value'}]">
      <mat-text-column name="value"></mat-text-column>
      <tr mat-header-row *matHeaderRowDef="['value']"></tr>
      <tr mat-row *matRowDef="let row; columns:['value']"></tr>
    </table>
    <mat-table id="constructor-grid" role="grid" [dataSource]="constructorGridData">
      <ng-container #constructorGridColumn matColumnDef="constructor-probe">
        <mat-header-cell *matHeaderCellDef>Grid header</mat-header-cell>
        <mat-cell *matCellDef="let row">{{row.value}}</mat-cell>
        <mat-footer-cell *matFooterCellDef>Grid footer</mat-footer-cell>
      </ng-container>
      <mat-header-row *matHeaderRowDef="['constructor-probe']"></mat-header-row>
      <mat-row *matRowDef="let row; columns:['constructor-probe']"></mat-row>
      <mat-row *matRowDef="let row; columns:['constructor-probe']; when: constructorGridWhen"></mat-row>
      <mat-footer-row *matFooterRowDef="['constructor-probe']"></mat-footer-row>
      <ng-template #manualNoDataTemplate matNoDataRow><div><span class="cdk-cell">Empty grid probe</span></div></ng-template>
    </mat-table>
    <mat-table id="recycle-view-probe" recycleRows [dataSource]="recycleProbeData">
      <ng-container matColumnDef="value"><mat-cell *matCellDef="let row">{{row.value}}</mat-cell></ng-container>
      <mat-row *matRowDef="let row; columns:['value']"></mat-row>
    </mat-table>
    <mat-table id="dispose-view-probe" [dataSource]="disposeProbeData">
      <ng-container matColumnDef="value"><mat-cell *matCellDef="let row">{{row.value}}</mat-cell></ng-container>
      <mat-row *matRowDef="let row; columns:['value']"></mat-row>
    </mat-table>
    <table mat-table id="raw-owned-table" [dataSource]="[{value:'Outer'}]">
      <ng-container cdkColumnDef="value">
        <th mat-header-cell *cdkHeaderCellDef>Header</th>
        <td mat-cell *cdkCellDef="let row">{{row.value}}
          <table cdk-table id="raw-peer-table" [dataSource]="[{value:'Inner'}]">
            <ng-container cdkColumnDef="value"><td cdk-cell *cdkCellDef="let inner">{{inner.value}}</td></ng-container>
            <tr cdk-row *cdkRowDef="let inner; columns:['value']"></tr>
          </table>
        </td>
        <td mat-footer-cell *cdkFooterCellDef>Footer</td>
      </ng-container>
      <tr mat-header-row *cdkHeaderRowDef="['value']"></tr>
      <tr mat-row *cdkRowDef="let row; columns:['value']"></tr>
      <tr mat-footer-row *cdkFooterRowDef="['value']"></tr>
    </table>
    <ng-template #manualTabTemplate matTabContent>Tab lazy probe</ng-template>
    <ng-template #manualCellTemplate matCellDef>Data probe</ng-template>
    <ng-template #manualHeaderTemplate matHeaderCellDef>Header probe</ng-template>
    <ng-template #manualFooterTemplate matFooterCellDef>Footer probe</ng-template>
    <span id="tooltip-eager" matTooltip="" [matTooltipDisabled]="true">Disabled empty tooltip</span>
    <mat-tab-group id="tabs">
      <mat-tab label="One"><ng-template #manualTabLabel mat-tab-label>One</ng-template>Tab one</mat-tab>
      <mat-tab label="Two">Tab two</mat-tab>
    </mat-tab-group>
  \`,
})
class HarnessHost {
  readonly lazyMenuLifetime=inject(LAZY_MENU_LIFETIME);
  @ViewChild('lazyMenu',{static:true}) lazyMenu!:MatLegacyMenu;
  constructorGridData=[{value:'Grid value'}];
  constructorGridWhen=()=>true;
  @ViewChild(MatLegacyRowDef,{static:true}) originalRowDefinition!:MatLegacyRowDef<any>;
  recycleProbeData=[{value:'initial recycle'}];
  disposeProbeData=[{value:'initial dispose'}];
  @ViewChild(MatLegacyHeaderRowDef,{static:true}) originalStickyHeader!:MatLegacyHeaderRowDef;
  @ViewChild(MatLegacyFooterRowDef,{static:true}) originalStickyFooter!:MatLegacyFooterRowDef;
  @ViewChild('manualNoDataTemplate',{read:MatLegacyNoDataRow,static:true}) originalNoDataRow!:MatLegacyNoDataRow;
  @ViewChild('manualNoDataTemplate',{read:TemplateRef,static:true}) originalNoDataTemplate!:TemplateRef<any>;
  @ViewChild('manualTabTemplate',{read:MatLegacyTabContent,static:true}) originalTabContent!:MatLegacyTabContent;
  @ViewChild('manualTabTemplate',{read:TemplateRef,static:true}) originalTabTemplate!:TemplateRef<any>;
  @ViewChild('manualTabLabel',{read:MatLegacyTabLabel,static:true}) originalTabLabel!:MatLegacyTabLabel;
  @ViewChild('manualTabLabel',{read:TemplateRef,static:true}) originalTabLabelTemplate!:TemplateRef<any>;
  @ViewChild('manualTabLabel',{read:ViewContainerRef,static:true}) originalTabLabelContainer!:ViewContainerRef;
  @ViewChild(MatLegacyTab,{static:true}) originalLabelTab!:MatLegacyTab;
  @ViewChild(MatLegacyTab,{read:MAT_LEGACY_TAB,static:true}) originalLabelTabToken!:MatLegacyTab;

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
  disabledChipControl=new FormControl<string[] | null>(null);
  @Input() legacyDirection:'ltr'|'rtl'='rtl';
  @ViewChildren(_LegacyTableDefinitionOwner) rawDefinitionOwners!:QueryList<_LegacyTableDefinitionOwner>;
  @ViewChildren(_LegacyTableDefinitionOwner,{read:ElementRef}) rawDefinitionHosts!:QueryList<ElementRef<Node>>;
  legacyDirectionChanges=0;
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
  const nativeDateManual=observePackedNativeDateManual();
  const nativeDateConstructorObservation=nativeDateManual.observed;
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
  const nativeDateProviderObservation=observePackedNativeDateProviders(nativeDateManual.direct);
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
    imports: [HarnessHost, PackedLegacyBidiScope, SmokeDialogContent, LegacyNativeDateModule, MatLegacyNativeDateModule, PackedOnPushTableHost, PackedRadioIdentityHost, ...GENERATED_IDENTITY_IMPORTS, ...SELECT_DETACH_IMPORTS, ...MENU_ITEM_TOKEN_IMPORTS, ...SELECT_FOCUS_CLICK_IMPORTS],
    providers: [
      // Use the ordinary application's default ID prefix rather than TestBed's app ID.
      {provide: APP_ID, useValue: 'ng'},
      {provide: MATERIAL_ANIMATIONS, useValue: {animationsDisabled: true}},
      // Preserve historical constructor-mode checks without installing an engine.
      {provide: ANIMATION_MODULE_TYPE, useValue: 'NoopAnimations'},
      {provide: MAT_LEGACY_DATE_LOCALE, useValue: 'en-GB'},
      {provide: TEXT_COLUMN_OPTIONS, useValue: ORIGINAL_TEXT_OPTIONS},
    ],
  });
  const engineFreeAnimationPolicy = TestBed.inject(MATERIAL_ANIMATIONS).animationsDisabled === true
    && TestBed.inject(ANIMATION_MODULE_TYPE) === 'NoopAnimations';
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
  const radioIdentity=await observePackedRadioIdentity();
  const generatedIdentity=await observePackedGeneratedIdentity();
  const selectScrollDetach=await observePackedSelectDetach();
  const menuItemToken=await observePackedMenuItemToken();
  const selectFocusClick=await observePackedSelectFocusClick();
  const isolatedLegacyBidi = await observePackedLegacyBidiScope();
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

  const stickyObservations=[];
  // Original16 coercion and last-write dirty semantics, not current expectations.
  for(const [target,property] of [
    [fixture.componentInstance.gridColumn,'sticky'],
    [fixture.componentInstance.gridColumn,'stickyEnd'],
    [fixture.componentInstance.originalStickyHeader,'sticky'],
    [fixture.componentInstance.originalStickyFooter,'sticky'],
  ] as const){
    const row={property,present:!!target,sequence:[] as boolean[]};
    if(target){
      const writable=target as any;writable[property]=false;target.resetStickyChanged();
      for(const [input,value,changed] of [
        ['false',false,false],['',true,true],['',true,false],[null,false,true],
        [undefined,false,false],['true',true,true],[true,true,false],[false,false,true],
      ] as const){
        writable[property]=input;
        row.sequence.push(writable[property]===value&&target.hasStickyChanged()===changed
          &&target.hasStickyChanged()===false);
      }
      writable[property]=false;target.resetStickyChanged();
    }
    stickyObservations.push(row);
  }
  const tableOriginalStickyBehavior=stickyObservations.length===4
    &&stickyObservations.every(row=>row.present&&row.sequence.length===8&&row.sequence.every(Boolean));
  const booleanTableNode=fixture.debugElement.query(element=>element.nativeElement?.id==='constructor-grid');
  const booleanTable=booleanTableNode.injector.get(MatLegacyTable);
  const tableBooleanObservations=[];
  for(const [input,expected] of [['false',false],['',true],[null,false],['true',true],[undefined,false]] as const){
    booleanTable.multiTemplateDataRows=input;booleanTable.fixedLayout=input;
    fixture.changeDetectorRef.markForCheck();fixture.detectChanges();
    tableBooleanObservations.push({
      coerced_multi:booleanTable.multiTemplateDataRows===expected,
      coerced_fixed:booleanTable.fixedLayout===expected,
      rendered_rows:booleanTableNode.nativeElement.querySelectorAll('mat-row').length===(expected?2:1),
      fixed_class:booleanTableNode.nativeElement.classList.contains('mat-table-fixed-layout')===expected,
    });
  }
  booleanTable.multiTemplateDataRows=false;booleanTable.fixedLayout=false;
  fixture.changeDetectorRef.markForCheck();fixture.detectChanges();
  const tableOriginalBooleanInputs=tableBooleanObservations.length===5
    &&tableBooleanObservations.every(row=>Object.values(row).every(value=>value===true));
  const recycleObservations=[];
  for(const [id,recycles] of [['recycle-view-probe',true],['dispose-view-probe',false]] as const){
    const node=fixture.debugElement.query(element=>element.nativeElement?.id===id);
    const table=node.injector.get(MatLegacyTable);
    const before=node.nativeElement.querySelector('mat-row');
    table.dataSource=[];fixture.changeDetectorRef.markForCheck();fixture.detectChanges();
    const removed=node.nativeElement.querySelectorAll('mat-row').length===0;
    table.dataSource=[{value:'Replacement value'}];
    fixture.changeDetectorRef.markForCheck();fixture.detectChanges();
    const after=node.nativeElement.querySelector('mat-row');
    recycleObservations.push({id,enabled:table.recycleRows===recycles,removed,
      identity:!!before&&!!after&&(before===after)===recycles,
      new_text:after?.textContent.trim()==='Replacement value'});
  }
  const tableRecycleRowIdentity=recycleObservations.length===2
    &&recycleObservations.every(row=>Object.entries(row).every(([key,value])=>key==='id'||value===true));
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
  const tableConstructionObservations=[];
  for(const node of [booleanTableNode,textTableNode]){
    const table=node.injector.get(MatLegacyTable),before=table.dataSource;
    const rejected=[];
    for(const args of [[node.injector.get(ElementRef)],Array(12).fill(null)]){
      let unexpected:any;
      try{unexpected=runInInjectionContext(node.injector,()=>Reflect.construct(MatLegacyTable,args));rejected.push(false);}
      catch(error){rejected.push(/manual dependency arguments are not supported/.test(String(error)));}
      finally{unexpected?.ngOnDestroy();}
    }
    tableConstructionObservations.push({
      owned_instance:table instanceof MatLegacyTable,
      real_parent:table instanceof CdkTable&&Object.getPrototypeOf(MatLegacyTable.prototype)===CdkTable.prototype,
      node_provider:node.injector.get(CdkTable)===table,
      manual_rejects:rejected.length===2&&rejected.every(Boolean),
      data_source_retained:table.dataSource===before,
      rendered_rows_retained:node.nativeElement.querySelectorAll('mat-row,tr[mat-row]').length>0,
    });
  }
  let tableOutsideDiRejects=false;
  try{new MatLegacyTable();}catch(error){tableOutsideDiRejects=/NG0203|injection context/.test(String(error));}
  const tableAngularDiConstruction=tableOutsideDiRejects&&tableConstructionObservations.length===2
    &&tableConstructionObservations.every(row=>Object.values(row).every(value=>value===true));
  const suppliedDiffers=TestBed.inject(IterableDiffers);
  let definitionCallerDestroyed=0;
  const suppliedTable={originalMarker:true,ngOnDestroy(){definitionCallerDestroyed++;}};
  const manualColumn=new MatLegacyColumnDef(suppliedTable);
  manualColumn.name='Original column';
  const definitionConstructorObservations=[{name:'MatLegacyColumnDef',
    manual_table:manualColumn._table===suppliedTable,
    manual_identity:manualColumn instanceof MatLegacyColumnDef&&manualColumn instanceof CdkColumnDef,
    original_name:manualColumn.name==='Original column'&&manualColumn.cssClassFriendlyName==='Original-column',
    node_table:fixture.componentInstance.gridColumn._table===booleanTable}];
  for(const [Owned,Peer,nodeDefinition,expectedTable] of [
    [MatLegacyHeaderRowDef,CdkHeaderRowDef,fixture.componentInstance.originalStickyHeader,textTable],
    [MatLegacyFooterRowDef,CdkFooterRowDef,fixture.componentInstance.originalStickyFooter,booleanTable],
    [MatLegacyRowDef,CdkRowDef,fixture.componentInstance.originalRowDefinition,textTable],
  ] as const){
    const manual=new Owned(nodeDefinition.template,suppliedDiffers,suppliedTable);
    manual.columns=['a','b'];manual.ngOnChanges({columns:new SimpleChange(undefined,manual.columns,true)});
    manual.getColumnsDiff();manual.columns=['b','c'];
    const changes=manual.getColumnsDiff(),added=[],removed=[];
    changes?.forEachAddedItem(item=>added.push(item.item));
    changes?.forEachRemovedItem(item=>removed.push(item.item));
    definitionConstructorObservations.push({name:Owned.name,
      manual_table:manual._table===suppliedTable,
      manual_identity:manual instanceof Owned&&manual instanceof Peer,
      original_name:manual.template===nodeDefinition.template&&added.join(',')==='c'&&removed.join(',')==='a',
      node_table:nodeDefinition._table===expectedTable});
  }
  const tableDefinitionOriginalConstructors=definitionConstructorObservations.length===4
    &&definitionCallerDestroyed===0
    &&definitionConstructorObservations.every(row=>Object.entries(row).every(([key,value])=>key==='name'||value===true));
  const rawOwnershipObservation=fixture.componentInstance.rawDefinitionHosts.toArray().map(ref=>{
    const node=getDebugNode(ref.nativeElement)!;
    const nearest=node.injector.get(CdkTable);
    const definitions=[node.injector.get(CdkColumnDef,null,{self:true}),node.injector.get(CdkHeaderRowDef,null,{self:true}),
      node.injector.get(CdkFooterRowDef,null,{self:true}),node.injector.get(CdkRowDef,null,{self:true})].filter(Boolean);
    return definitions.length===1&&definitions[0]!._table===nearest;
  });
  const rawTable=fixture.nativeElement.querySelector('#raw-owned-table');
  const rawPeerTable=rawTable?.querySelector('#raw-peer-table');
  const tableOutletAndDefinitionOwnership=rawOwnershipObservation.length===6&&rawOwnershipObservation.every(Boolean)
    &&rawTable?.querySelector('tbody > tr > td')?.firstChild?.textContent.trim()==='Outer'
    &&rawTable?.querySelector('thead > tr > th')?.textContent.trim()==='Header'
    &&rawTable?.querySelector('tfoot > tr > td')?.textContent.trim()==='Footer'
    &&rawPeerTable?.querySelector('tbody > tr > td')?.textContent.trim()==='Inner';
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
  let borrowedTableDestroyed=0,borrowedOptionsDestroyed=0;
  const borrowedTable={ngOnDestroy:()=>borrowedTableDestroyed++} as unknown as CdkTable<any>;
  const borrowedOptions={...ORIGINAL_TEXT_OPTIONS,ngOnDestroy:()=>borrowedOptionsDestroyed++};
  const borrowedColumn=new MatLegacyTextColumn(borrowedTable,borrowedOptions);
  const constructorBorrowedProviderLifecycle=(borrowedColumn as any)._table===borrowedTable
    &&(borrowedColumn as any)._options===borrowedOptions
    &&borrowedTableDestroyed===0&&borrowedOptionsDestroyed===0;

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
  const suppliedNoDataTemplate=fixture.componentInstance.originalNoDataTemplate;
  const nodeNoDataRow=fixture.componentInstance.originalNoDataRow;
  const manualNoDataRow=new MatLegacyNoDataRow(suppliedNoDataTemplate);
  const noDataView=manualNoDataRow.templateRef.createEmbeddedView({});noDataView.detectChanges();
  const labelHost=fixture.componentInstance;
  const suppliedClosestTab={originalMarker:true};
  const manualLabel=new MatLegacyTabLabel(labelHost.originalTabLabelTemplate,
    labelHost.originalTabLabelContainer,suppliedClosestTab);
  const labelView=manualLabel.templateRef.createEmbeddedView({});labelView.detectChanges();
  const tabLabelObservation={
    manual_template:manualLabel.templateRef===labelHost.originalTabLabelTemplate,
    manual_container:manualLabel.viewContainerRef===labelHost.originalTabLabelContainer,
    manual_closest:manualLabel._closestTab===suppliedClosestTab,
    manual_parent:manualLabel instanceof MatLegacyTabLabel&&manualLabel instanceof MatTabLabel&&manualLabel instanceof CdkPortal,
    node_parent:labelHost.originalTabLabel instanceof MatTabLabel&&labelHost.originalTabLabel instanceof CdkPortal,
    node_closest:labelHost.originalTabLabel._closestTab===labelHost.originalLabelTab,
    node_token:labelHost.originalLabelTabToken===labelHost.originalLabelTab,
    node_label:labelHost.originalLabelTab.templateLabel===labelHost.originalTabLabel,
    embedded_label:labelView.rootNodes.map(node=>node.textContent||'').join('').trim()==='One',
  };
  labelView.destroy();
  const tabLabelOriginalConstructor=Object.values(tabLabelObservation).every(value=>value===true);
  const noDataRowObservation={manual_argument_identity:manualNoDataRow.templateRef===suppliedNoDataTemplate,
    manual_owned_identity:manualNoDataRow instanceof MatLegacyNoDataRow,
    manual_peer_identity:manualNoDataRow instanceof CdkNoDataRow,
    prototype_identity:Object.getPrototypeOf(manualNoDataRow)===MatLegacyNoDataRow.prototype,
    parent_constructor_identity:Object.getPrototypeOf(MatLegacyNoDataRow)===CdkNoDataRow,
    explicit_legacy_initialization:JSON.stringify(manualNoDataRow._contentClassNames)===JSON.stringify(['mat-no-data-row']),
    historical_cell_classes:manualNoDataRow._cellClassNames.length===0
      &&nodeNoDataRow._cellClassNames.length===0,
    historical_member:manualNoDataRow._contentClassName==='mat-no-data-row'
      &&nodeNoDataRow._contentClassName==='mat-no-data-row',
    node_template_anchor:nodeNoDataRow.templateRef.elementRef.nativeElement===suppliedNoDataTemplate.elementRef.nativeElement,
    embedded_view_text:noDataView.rootNodes.map(node=>node.textContent||'').join('').trim()==='Empty grid probe',
    rendered_legacy_row:false,
    rendered_legacy_cell:false};
  noDataView.destroy();
  fixture.componentInstance.constructorGridData=[];
  // The public fixture API must dirty the host before checking changed bindings
  // on both supported Angular lines (including a zoneless TestBed default).
  fixture.changeDetectorRef.markForCheck();fixture.detectChanges();
  await sleep(20);fixture.detectChanges();
  noDataRowObservation.rendered_legacy_row=fixture.nativeElement.querySelector('#constructor-grid .mat-no-data-row')?.textContent.trim()==='Empty grid probe';
  noDataRowObservation.rendered_legacy_cell=fixture.nativeElement.querySelector('#constructor-grid .mat-no-data-row .cdk-cell')?.className==='cdk-cell';
  const noDataRowOriginalConstructor=Object.values(noDataRowObservation).every(value=>value===true);
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
  const menuNodes=fixture.debugElement.queryAll(By.directive(MatLegacyMenuItem));
  const normalMenuNode=menuNodes.find(node=>node.nativeElement.id==='menu-item');
  const disabledMenuNode=menuNodes.find(node=>node.nativeElement.id==='menu-disabled');
  const noRippleMenuNode=menuNodes.find(node=>node.nativeElement.id==='menu-no-ripple');
  const normalMenuItem=normalMenuNode?.injector.get(MatLegacyMenuItem);
  const manualMenuElement=win.document.createElement('button');
  const manualMenuItem=new MatLegacyMenuItem(new ElementRef(manualMenuElement));
  const menuManualConstruction=manualMenuItem._getHostElement()===manualMenuElement
    &&manualMenuItem.role==='menuitem'&&manualMenuItem._getTabIndex()==='0';
  manualMenuItem.ngOnDestroy();
  const menuItemConstruction=!!normalMenuItem && normalMenuItem instanceof MatLegacyMenuItem
    && !(normalMenuItem instanceof MatMenuItem)
    && Object.is(normalMenuNode!.injector.get(MatMenuItem),normalMenuItem)
    && normalMenuNode!.injector.get(MAT_LEGACY_MENU_PANEL)===normalMenuItem._parentMenu
    && normalMenuItem.disabled===false && normalMenuItem.disableRipple===false
    && disabledMenuNode?.injector.get(MatLegacyMenuItem).disabled===true
    && noRippleMenuNode?.injector.get(MatLegacyMenuItem).disableRipple===true && menuManualConstruction;
  await menu.close();
  fixture.detectChanges();
  await sleep(20);

  const lazyMenu=await loader.getHarness(MatLegacyMenuHarness.with({selector:'#lazy-menu-trigger'}));
  const lazyState=fixture.componentInstance.lazyMenuLifetime;
  const lazyInitial=fixture.componentInstance.lazyMenu.items.length===0&&lazyState.created===0&&lazyState.destroyed===0;
  const lazyTrigger=fixture.debugElement.query(By.css('#lazy-menu-trigger')).injector.get(MatLegacyMenuTrigger);
  const otherLazyTrigger=fixture.debugElement.query(By.css('#lazy-menu-other-trigger')).injector.get(MatLegacyMenuTrigger);
  const menuLazyObservation={execution:'packed-angular-testbed-dom',
    public_menu:fixture.componentInstance.lazyMenu instanceof MatLegacyMenu,
    public_triggers:lazyTrigger instanceof MatLegacyMenuTrigger&&otherLazyTrigger instanceof MatLegacyMenuTrigger,
    phases:[] as any[],first_events:[] as boolean[],second_events:[] as boolean[],
    recreated_items:false,transferred_items_recreated:false,subscriptions_closed:false};
  const menuSubscriptions=[lazyTrigger.menuOpened.subscribe(()=>menuLazyObservation.first_events.push(true)),
    lazyTrigger.menuClosed.subscribe(()=>menuLazyObservation.first_events.push(false)),
    otherLazyTrigger.menuOpened.subscribe(()=>menuLazyObservation.second_events.push(true)),
    otherLazyTrigger.menuClosed.subscribe(()=>menuLazyObservation.second_events.push(false))];
  const settleLazyMenu=async()=>{fixture.changeDetectorRef.markForCheck();fixture.detectChanges();await fixture.whenStable();fixture.changeDetectorRef.markForCheck();fixture.changeDetectorRef.detectChanges();fixture.detectChanges();};
  const menuSnapshot=(phase:string)=>({phase,items:fixture.componentInstance.lazyMenu.items.length,
    created:lazyState.created,destroyed:lazyState.destroyed,
    connected_items:fixture.componentInstance.lazyMenu.items.filter(item=>item._getHostElement().isConnected).length,
    first_open:lazyTrigger.menuOpen,second_open:otherLazyTrigger.menuOpen,
    panel_connected:document.getElementById(fixture.componentInstance.lazyMenu.panelId)?.isConnected===true});
  menuLazyObservation.phases.push(menuSnapshot('initial'));
  await lazyMenu.open();await settleLazyMenu();
  const firstLazyItem=fixture.componentInstance.lazyMenu.items.first;
  const lazyFirstOpen=await lazyMenu.isOpen()&&fixture.componentInstance.lazyMenu.items.length===2
    &&lazyState.created===2&&lazyState.destroyed===0;
  menuLazyObservation.phases.push(menuSnapshot('first-open'));
  await lazyMenu.close();await settleLazyMenu();
  const lazyFirstClose=!(await lazyMenu.isOpen())&&fixture.componentInstance.lazyMenu.items.length===0
    &&lazyState.created===2&&lazyState.destroyed===2;
  menuLazyObservation.phases.push(menuSnapshot('first-close'));
  await lazyMenu.open();await settleLazyMenu();
  const lazyReopen=await lazyMenu.isOpen()&&fixture.componentInstance.lazyMenu.items.length===2
    &&fixture.componentInstance.lazyMenu.items.first!==firstLazyItem&&lazyState.created===4&&lazyState.destroyed===2;
  menuLazyObservation.recreated_items=fixture.componentInstance.lazyMenu.items.first!==firstLazyItem;
  menuLazyObservation.phases.push(menuSnapshot('reopen'));
  await lazyMenu.close();await settleLazyMenu();
  const lazySecondClose=!(await lazyMenu.isOpen())&&fixture.componentInstance.lazyMenu.items.length===0
    &&lazyState.created===4&&lazyState.destroyed===4;
  const lazyMenuLifecycle=lazyInitial&&lazyFirstOpen&&lazyFirstClose&&lazyReopen&&lazySecondClose;
  menuLazyObservation.phases.push(menuSnapshot('second-close'));
  await lazyMenu.open();await settleLazyMenu();
  const beforeTransferItems=fixture.componentInstance.lazyMenu.items.toArray();
  menuLazyObservation.phases.push(menuSnapshot('transfer-before'));
  otherLazyTrigger.openMenu();await settleLazyMenu();
  menuLazyObservation.transferred_items_recreated=fixture.componentInstance.lazyMenu.items.toArray()
    .every(item=>!beforeTransferItems.includes(item));
  menuLazyObservation.phases.push(menuSnapshot('transfer-after'));
  await fixture.whenStable();fixture.detectChanges();
  menuLazyObservation.phases.push(menuSnapshot('transfer-settled'));
  otherLazyTrigger.closeMenu();await settleLazyMenu();
  menuLazyObservation.phases.push(menuSnapshot('transfer-close'));
  for(const subscription of menuSubscriptions)subscription.unsubscribe();
  menuLazyObservation.subscriptions_closed=menuSubscriptions.every(subscription=>subscription.closed);

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

  // Record the actual owned directive's eager container before any show().
  const tip = await loader.getHarness(MatLegacyTooltipHarness.with({selector: '#tip'}));
  const tipNode=fixture.debugElement.query(By.css('#tip'));
  const actualTooltip=tipNode.injector.get(MatLegacyTooltip),tipFields=actualTooltip as any;
  const eagerTipContainer=tipFields._viewContainerRef as ViewContainerRef;
  const tooltipContainerObservation={execution:'packed-angular-testbed-dom',eager:tooltipEagerObservation,
    public_directive:actualTooltip instanceof MatLegacyTooltip,
    eager_before_show:!!eagerTipContainer&&tipFields._portal==null&&tipFields._overlayRef==null&&tipFields._tooltipInstance==null,
    eager_node_container:eagerTipContainer instanceof ViewContainerRef&&eagerTipContainer.element.nativeElement===tipNode.nativeElement,
    initial_container_views:eagerTipContainer.length,cycles:[] as any[],same_host_after_cycles:false};
  let firstTipPortal:any,firstTipOverlay:any,tipVisible=false,tipText='';
  for(let cycle=0;cycle<2;cycle++){
    await tip.show();fixture.detectChanges();await sleep(20);fixture.detectChanges();
    const portal=tipFields._portal,overlay=tipFields._overlayRef,instance=tipFields._tooltipInstance;
    if(cycle===0){firstTipPortal=portal;firstTipOverlay=overlay;}
    const tooltipElement=overlay.overlayElement.querySelector('.mat-tooltip') as HTMLElement|null;
    const visible=await tip.isOpen(),text=visible?await tip.getTooltipText():'';
    if(cycle===0){tipVisible=visible;tipText=text;}
    const shown={public_portal:portal instanceof ComponentPortal,public_component:instance instanceof LegacyTooltipComponent,
      same_eager_container:portal.viewContainerRef===eagerTipContainer&&tipFields._viewContainerRef===eagerTipContainer,
      same_portal:portal===firstTipPortal,same_overlay:overlay===firstTipOverlay,
      container_views:eagerTipContainer.length,overlay_attached:overlay.hasAttached(),overlay_connected:overlay.overlayElement.isConnected,
      tooltip_connected:tooltipElement?.isConnected===true,visible,text};
    await tip.hide();fixture.detectChanges();await sleep(250);fixture.detectChanges();
    const hidden={overlay_attached:overlay.hasAttached(),tooltip_connected:tooltipElement?.isConnected===true,
      instance_released:tipFields._tooltipInstance===null,visible:await tip.isOpen(),
      container_views:eagerTipContainer.length,same_eager_container:tipFields._viewContainerRef===eagerTipContainer};
    tooltipContainerObservation.cycles.push({cycle,shown,hidden});
  }
  tooltipContainerObservation.same_host_after_cycles=fixture.debugElement.query(By.css('#tip')).nativeElement===tipNode.nativeElement;

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
  // #29783/#29795: forms must not overwrite an individual disabled input.
  await fixture.whenStable();fixture.detectChanges();
  const templateChip=fixture.debugElement.query(By.css('#disabled-template-chip')).injector.get(MatLegacyChip);
  const individualChip=fixture.debugElement.query(By.css('#disabled-individual-chip')).injector.get(MatLegacyChip);
  const inheritedChip=fixture.debugElement.query(By.css('#disabled-inherited-chip')).injector.get(MatLegacyChip);
  const disabledList=fixture.debugElement.query(By.css('[data-closeout-list="disabled-reactive"]')).injector.get(MatLegacyChipList);
  const chipDisabledInitial=templateChip.disabled&&individualChip.disabled&&!inheritedChip.disabled;
  const chipNodes=['#disabled-template-chip','#disabled-individual-chip','#disabled-inherited-chip']
    .map(selector=>fixture.nativeElement.querySelector(selector) as HTMLElement);
  const templateListNode=fixture.debugElement.query(By.css('[data-closeout-list="disabled-template"]'));
  const templateList=templateListNode.injector.get(MatLegacyChipList);
  const chipDisabledObservation={execution:'packed-angular-testbed-dom',phases:[] as any[],
    public_chips:[templateChip,individualChip,inheritedChip].every(chip=>chip instanceof MatLegacyChip),
    public_lists:templateList instanceof MatLegacyChipList&&disabledList instanceof MatLegacyChipList,
    template_value_accessor:templateListNode.injector.get(NgModel).valueAccessor===templateList,
    reactive_value_accessor:disabledList.ngControl?.valueAccessor===disabledList,same_nodes_after_cycles:false};
  const chipSnapshot=(phase:string)=>({phase,template_disabled:templateChip.disabled,individual_disabled:individualChip.disabled,
    inherited_disabled:inheritedChip.disabled,list_disabled:disabledList.disabled,
    form_disabled:fixture.componentInstance.disabledChipControl.disabled,
    template_aria:chipNodes[0].getAttribute('aria-disabled'),individual_aria:chipNodes[1].getAttribute('aria-disabled'),
    inherited_aria:chipNodes[2].getAttribute('aria-disabled')});
  chipDisabledObservation.phases.push(chipSnapshot('initial'));
  fixture.componentInstance.disabledChipControl.disable();fixture.detectChanges();
  const chipDisabledDuring=individualChip.disabled&&inheritedChip.disabled&&disabledList.disabled;
  chipDisabledObservation.phases.push(chipSnapshot('form-disabled'));
  fixture.componentInstance.disabledChipControl.enable();fixture.detectChanges();
  const chipDisabledAfter=individualChip.disabled&&!inheritedChip.disabled&&!disabledList.disabled;
  chipDisabledObservation.phases.push(chipSnapshot('form-enabled'));
  chipDisabledObservation.same_nodes_after_cycles=['#disabled-template-chip','#disabled-individual-chip','#disabled-inherited-chip']
    .every((selector,index)=>fixture.nativeElement.querySelector(selector)===chipNodes[index]&&chipNodes[index].isConnected);
  const chipDisabledDom=fixture.nativeElement.querySelector('#disabled-individual-chip').getAttribute('aria-disabled')==='true'
    &&fixture.nativeElement.querySelector('#disabled-inherited-chip').getAttribute('aria-disabled')==='false';
  const chipDisabledIsolation=chipDisabledInitial&&chipDisabledDuring&&chipDisabledAfter&&chipDisabledDom;
  const selectionList=fixture.debugElement.query(By.css('#selection-comparator-list')).injector.get(MatLegacySelectionList);
  const selectionOptions=selectionList.options.toArray();
  selectionList.selectedOptions.compareWith=(a,b)=>a.value===b.value;
  selectionList.selectedOptions.setSelection(selectionOptions[0]);fixture.detectChanges();
  // Pass a structurally compatible comparator value through the public peer model.
  // It must resolve back to the original real option instance and keep node state.
  selectionList.selectedOptions.setSelection({value:'one'} as typeof selectionOptions[number]);fixture.detectChanges();
  const selectionComparatorExposure=selectionList.selectedOptions.selected.length===1
    &&selectionList.selectedOptions.selected[0]===selectionOptions[0]
    &&selectionOptions[0].selected&&!selectionOptions[1].selected
    &&fixture.nativeElement.querySelector('#selection-comparator-list mat-list-option').getAttribute('aria-selected')==='true';
  const comparableSelectionList=fixture.debugElement.query(By.css('#selection-comparator-comparable-list')).injector.get(MatLegacySelectionList);
  const selectionComparator=await observePackedSelectionComparator(fixture,selectionList,comparableSelectionList);
  const bidiNode=fixture.debugElement.query(By.css('#bidi-legacy-scope'));
  const bidiField=fixture.debugElement.query(By.css('#bidi-legacy-field'));
  const bidiInput=bidiField.query(By.css('input'));
  const scopedDir=bidiNode.injector.get(Dir);
  const bidiInitial=scopedDir.value==='rtl'&&bidiNode.nativeElement.getAttribute('dir')==='rtl'
    &&bidiField.injector.get(Directionality)===scopedDir&&bidiInput.injector.get(Directionality)===scopedDir
    &&fixture.componentInstance.legacyDirectionChanges===0;
  fixture.componentRef.setInput('legacyDirection','ltr');fixture.changeDetectorRef.markForCheck();fixture.detectChanges();await fixture.whenStable();
  const bidiUpdated=scopedDir.value==='ltr'&&bidiNode.nativeElement.getAttribute('dir')==='ltr'
    &&bidiField.injector.get(Directionality).value==='ltr'&&bidiInput.injector.get(Directionality).value==='ltr'
    &&fixture.componentInstance.legacyDirectionChanges===1;
  fixture.detectChanges();
  const legacyBidiScope=bidiInitial&&bidiUpdated&&fixture.componentInstance.legacyDirectionChanges===1&&isolatedLegacyBidi.okay;
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
  const ownedViewport=TestBed.inject(_LegacyViewport);
  const viewportNodes=fixture.debugElement.queryAll(By.css('mat-select, mat-tab-header'));
  const viewportShared=viewportNodes.length>=2
    && viewportNodes.every(node=>node.injector.get(_LegacyViewport)===ownedViewport)
    && ownedViewport.getViewportSize().width===window.innerWidth
    && ownedViewport.getViewportSize().height===window.innerHeight;
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
  const valueAccessors=await observePackedValueAccessors();
  const tableOnPush=await observePackedTableOnPush();
  const detailedPackedBehaviorsOkay=[packedChipDisabledCase(chipDisabledObservation),
    packedMenuLazyCase(menuLazyObservation),packedTooltipContainerCase(tooltipContainerObservation),
    packedLegacyBidiScopeCase(isolatedLegacyBidi.observed),packedSelectionComparatorCase(selectionComparator.observed),
    packedNativeDateConstructorCase(nativeDateConstructorObservation),packedNativeDateProviderCase(nativeDateProviderObservation)]
    .every(row=>row.result==='pass');
  const out = {
    chipDisabledObservation,menuLazyObservation,tooltipContainerObservation,isolatedLegacyBidi:isolatedLegacyBidi.observed,
    selectionComparatorObservation:selectionComparator.observed,
    nativeDateConstructorObservation,nativeDateProviderObservation,
    valueAccessorRegistration:valueAccessors.rows,
    tableOnPushRendering:tableOnPush.observed,
    radioIdentity:radioIdentity.observed,
    generatedIdentity:generatedIdentity.observed,
    selectScrollDetach:selectScrollDetach.observed,
    menuItemToken:menuItemToken.observed,
    selectFocusClick:selectFocusClick.observed,
    ok:
      detailedPackedBehaviorsOkay && text === 'Go' &&
      isOpen === false &&
      dialogText.includes('Hello dialog') &&
      dialogsAfter.length === 0 &&
      menuOpen === true && menuItemConstruction && lazyMenuLifecycle &&
      snackText.includes('Snack message') &&
      tipVisible === true &&
      tipText.includes('Tip text') &&
      selectOpened === true &&
      selectClosed === true &&
      tabCount === 2 &&
      selected === 'Two' && viewportShared && nativeDateConstructor && nativeDateProvider && chipTabIndex === 6 && radioTabIndex === 8 && chipBackspaceRelease && chipRepeatedEvents && chipDisabledIsolation && selectionComparatorExposure && legacyBidiScope && errorLiveRegion && formFieldTokenIsolation && progressLocationAndDefaults && commonModuleBehavior && checkboxAttribute && slideToggleAttribute && sliderAttribute && tabLinkAttribute && peerIconLiteralSanitization && checkboxNodeFactoryContext && peerStepperAbstractControl && tooltipOriginalEagerDependencies && cellDefinitionOriginalConstructors && cellOriginalConstructors && textColumnOriginalConstructor && tabContentOriginalConstructor && noDataRowOriginalConstructor && constructorBorrowedProviderLifecycle && tableOriginalStickyBehavior && tableOriginalBooleanInputs && tableRecycleRowIdentity && tableDefinitionOriginalConstructors && tableAngularDiConstruction && tableOutletAndDefinitionOwnership && tabLabelOriginalConstructor && radioIdentity.okay && generatedIdentity.okay && selectScrollDetach.okay && menuItemToken.okay && selectFocusClick.okay && tableOnPush.okay && valueAccessors.okay && engineFreeAnimationPolicy,
    buttonText: text,
    selectIsOpen: isOpen,
    dialogText,
    dialogsAfterClose: dialogsAfter.length,
    menuOpen,
    menuItemConstruction,
    lazyMenuLifecycle,
    viewportShared,
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
    chipDisabledIsolation,
    selectionComparatorExposure,
    legacyBidiScope,
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
    noDataRowOriginalConstructor, noDataRowObservation,
    constructorBorrowedProviderLifecycle, borrowedTableDestroyed, borrowedOptionsDestroyed,
    tableOriginalStickyBehavior, stickyObservations,
    tableOriginalBooleanInputs, tableBooleanObservations,
    tableRecycleRowIdentity, recycleObservations,
    tableDefinitionOriginalConstructors, definitionConstructorObservations, definitionCallerDestroyed,
    tableAngularDiConstruction, tableConstructionObservations, tableOutsideDiRejects,
    tableOutletAndDefinitionOwnership, rawOwnershipObservation,
    tabLabelOriginalConstructor, tabLabelObservation,
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
    engineFreeAnimationPolicy,
    animationsProvider: 'MATERIAL_ANIMATIONS + ANIMATION_MODULE_TYPE',
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
    // Emit imported JavaScript assertion modules alongside the generated probes.
    tsconfig.compilerOptions.allowJs = true;
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
      assertEngineFreeHarnessInputs(bundle.receipt.inputs);
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
