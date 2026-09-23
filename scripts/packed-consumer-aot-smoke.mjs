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
 *   node scripts/packed-consumer-aot-smoke.mjs [--tarball path] [--skip-harness]
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
const defaultTarball = join(
  root,
  'compatibility/pack-proof/ngx-compat-material-legacy-22.0.0-rc.0.tgz',
);

const args = process.argv.slice(2);
const skipHarness = args.includes('--skip-harness');
const tarballArgIdx = args.indexOf('--tarball');
const tarball =
  tarballArgIdx >= 0 ? resolve(args[tarballArgIdx + 1]) : defaultTarball;

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

import 'zone.js';
import '@angular/compiler';
import {Component} from '@angular/core';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import {getTestBed, TestBed} from '@angular/core/testing';
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {provideNoopAnimations} from '@angular/platform-browser/animations';
import {MatLegacyButtonModule} from '@ngx-compat/material-legacy/legacy-button';
import {MatLegacyButtonHarness} from '@ngx-compat/material-legacy/legacy-button/testing';
import {MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';
import {MatLegacySelectModule} from '@ngx-compat/material-legacy/legacy-select';
import {MatLegacySelectHarness} from '@ngx-compat/material-legacy/legacy-select/testing';
import {MatLegacyDialogModule} from '@ngx-compat/material-legacy/legacy-dialog';

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

@Component({
  standalone: true,
  imports: [
    MatLegacyButtonModule,
    MatLegacyFormFieldModule,
    MatLegacySelectModule,
    MatLegacyDialogModule,
  ],
  template: \`
    <button mat-button id="h">Go</button>
    <mat-form-field>
      <mat-label>Choice</mat-label>
      <mat-select>
        <mat-option value="a">A</mat-option>
      </mat-select>
    </mat-form-field>
  \`,
})
class HarnessHost {}

async function main() {
  TestBed.configureTestingModule({
    imports: [HarnessHost],
    providers: [provideNoopAnimations()],
  });
  const fixture = TestBed.createComponent(HarnessHost);
  fixture.detectChanges();
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const button = await loader.getHarness(MatLegacyButtonHarness);
  const text = await button.getText();
  const select = await loader.getHarness(MatLegacySelectHarness);
  const isOpen = await select.isOpen();
  const out = {
    ok: text === 'Go' && isOpen === false,
    buttonText: text,
    selectIsOpen: isOpen,
    harnesses: ['MatLegacyButtonHarness', 'MatLegacySelectHarness'],
    dialogModuleLoaded: !!MatLegacyDialogModule,
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
        entries: ['legacy-button/testing', 'legacy-select/testing', 'legacy-dialog (module load)'],
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
