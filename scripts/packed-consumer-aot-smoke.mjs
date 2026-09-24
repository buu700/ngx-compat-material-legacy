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
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

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
const tarballArgIdx = args.indexOf('--tarball');
const tarball =
  tarballArgIdx >= 0 ? resolve(args[tarballArgIdx + 1]) : null;

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function run(cmd, cmdlineArgs, opts = {}) {
  const res = spawnSync(cmd, cmdlineArgs, {
    encoding: 'utf8',
    ...opts,
  });
  return res;
}

if (!tarball) {
  console.error(
    'F00/F01: --tarball <path> is required. Committed pack-proof .tgz is historical-unbound and must not be a silent default. Build/pack current source first (see scripts/pack-library.mjs), then pass its path.',
  );
  console.error(`Historical unbound (traceability only): ${historicalUnboundTarball}`);
  process.exit(2);
}
if (!existsSync(tarball)) {
  console.error(`Missing tarball: ${tarball}. Build/pack first.`);
  process.exit(2);
}

const consumer = mkdtempSync(join(tmpdir(), 'ngx-compat-aot-harness_'));
const result = {
  schema_version: 1,
  captured_at: new Date().toISOString(),
  tarball: {path: tarball, sha256: sha256File(tarball)},
  consumer_dir: consumer,
  aot: {status: 'pending'},
  harness: {status: skipHarness ? 'skipped' : 'pending'},
  errors: [],
};

try {
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
      '@ngx-compat/material-legacy': `file:${tarball}`,
      rxjs: '7.8.2',
      tslib: '2.8.1',
      typescript: '6.0.3',
      'zone.js': '0.16.3',
      jsdom: '26.1.0',
    },
  };
  writeFileSync(join(consumer, 'package.json'), JSON.stringify(pkg, null, 2));

  const install = run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: consumer,
    timeout: 180000,
  });
  if (install.status !== 0) {
    result.errors.push('npm install failed');
    result.aot = {status: 'fail', stderr: (install.stderr || '').slice(-2000)};
    throw new Error('install failed');
  }

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
          strict: false,
          skipLibCheck: true,
          lib: ['ES2022', 'DOM'],
          rootDir: 'src',
          outDir: 'out-tsc',
          declaration: false,
          importHelpers: true,
          useDefineForClassFields: false,
          ignoreDeprecations: '6.0',
        },
        files: ['src/app.module.ts', 'src/main.ts'],
        angularCompilerOptions: {
          enableIvy: true,
          compilationMode: 'full',
          strictTemplates: false,
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
    env: {...process.env, NODE_OPTIONS: ''},
  });
  const aotOk =
    aot.status === 0 &&
    existsSync(join(consumer, 'out-tsc/app.module.js'));
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
    writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
    const aot2 = run(process.execPath, [ngcCmd, '-p', 'tsconfig.json'], {
      cwd: consumer,
      timeout: 180000,
      env: {...process.env, NODE_OPTIONS: ''},
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
      const harness = run(process.execPath, ['out-tsc/harness-runtime.js'], {
        cwd: consumer,
        timeout: 120000,
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


  result.status = result.errors.length ? 'fail' : 'ok';
} catch (err) {
  result.status = 'fail';
  result.errors.push(String(err && err.message ? err.message : err));
} finally {
  writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
  // Keep consumer on failure for debugging; remove on success to save disk.
  if (result.status === 'ok') {
    try {
      rmSync(consumer, {recursive: true, force: true});
      result.consumer_dir = '(removed after success)';
      writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
    } catch {
      /* ignore */
    }
  }
}

console.log(JSON.stringify({status: result.status, errors: result.errors, outPath}, null, 2));
process.exit(result.status === 'ok' ? 0 : 1);
