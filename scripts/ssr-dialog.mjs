#!/usr/bin/env node
/**
 * Server-render the dialog page without a browser document.
 *
 *   node scripts/ssr-dialog.mjs --tarball <path>
 */
import {createHash} from 'node:crypto';
import {spawn, spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = join(root, 'compatibility/rc/reports/ssr-dialog.json');
const esbuild = createRequire(join(root, 'package.json'))('esbuild');

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

let tarball = null;
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i] === '--tarball') {
    const value = process.argv[i + 1];
    if (!value || value.startsWith('-')) fail(2, '--tarball requires a path');
    tarball = resolve(value);
    i += 1;
    continue;
  }
  fail(2, `Unknown argument: ${process.argv[i]}`);
}
if (!tarball) fail(2, '--tarball is required');

const consumer = mkdtempSync(join(tmpdir(), 'ngx-compat-ssr-'));
const installTarball = join(consumer, 'library.tgz');
writeFileSync(installTarball, readFileSync(tarball));
writeFileSync(join(consumer, 'package.json'), JSON.stringify({
  name: 'ngx-compat-ssr-dialog',
  private: true,
  dependencies: {
    '@angular/cdk': '22.1.7',
    '@angular/common': '22.1.7',
    '@angular/compiler': '22.1.7',
    '@angular/compiler-cli': '22.1.7',
    '@angular/core': '22.1.7',
    '@angular/forms': '22.1.7',
    '@angular/material': '22.1.7',
    '@angular/platform-browser': '22.1.7',
    '@angular/platform-server': '22.1.7',
    '@ngx-compat/material-legacy': `file:${installTarball}`,
    rxjs: '7.8.2',
    tslib: '2.8.1',
    typescript: '6.0.3',
  },
}, null, 2));
writeFileSync(join(consumer, '.npmrc'), 'install-links=true\nfund=false\naudit=false\n');
const env = {...process.env, NODE_OPTIONS: ''};
delete env.NODE_PATH;
const install = spawnSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock'], {
  cwd: consumer, encoding: 'utf8', timeout: 180000, env,
});
if (install.status !== 0) fail(1, (install.stderr || install.stdout || 'npm install failed').slice(-2000));

mkdirSync(join(consumer, 'src'), {recursive: true});
writeFileSync(join(consumer, 'src/main.ts'), `import {Component, NgModule, provideZonelessChangeDetection} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {renderModule} from '@angular/platform-server';
import {MatLegacySelectModule} from '@ngx-compat/material-legacy/legacy-select';

@Component({
  standalone: false,
  selector: 'lab-root',
  template: '<button id="open" type="button">Open</button><mat-select id="choice"><mat-option value="a">A</mat-option></mat-select>',
})
export class LabRoot {}

@NgModule({
  imports: [BrowserModule, MatLegacySelectModule],
  declarations: [LabRoot],
  bootstrap: [LabRoot],
  providers: [provideZonelessChangeDetection()],
})
export class LabModule {}

const beforeDocument = typeof (globalThis as unknown as {document?: unknown}).document;
const html = await renderModule(LabModule, {
  document: '<!doctype html><html><body><lab-root></lab-root></body></html>',
});
await new Promise(resolve => setTimeout(resolve, 50));
const afterDocument = typeof (globalThis as unknown as {document?: unknown}).document;
const nodeProcess = (globalThis as unknown as {process: {stdout: {write(value: string): void}; _getActiveHandles(): Array<{constructor?: {name?: string}}>}}).process;
const timers = nodeProcess._getActiveHandles()
  .map(handle => handle.constructor?.name)
  .filter(name => name === 'Timeout' || name === 'Immediate');
nodeProcess.stdout.write('\\n__SSR__' + JSON.stringify({html, beforeDocument, afterDocument, timers}));
`);
writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify({
  compilerOptions: {
    target: 'ES2022',
    module: 'ES2022',
    moduleResolution: 'bundler',
    experimentalDecorators: true,
    strict: true,
    skipLibCheck: true,
    lib: ['ES2022', 'DOM'],
    rootDir: 'src',
    outDir: 'out',
    types: [],
    ignoreDeprecations: '6.0',
  },
  files: ['src/main.ts'],
  angularCompilerOptions: {compilationMode: 'full', strictTemplates: true},
}, null, 2));
const ngc = join(consumer, 'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js');
const compiled = spawnSync(process.execPath, [ngc, '-p', 'tsconfig.json'], {
  cwd: consumer, encoding: 'utf8', timeout: 180000, env,
});
if (compiled.status !== 0) fail(1, `${compiled.stdout || ''}\n${compiled.stderr || ''}`.slice(-2500));

const linkerRequire = createRequire(join(consumer, 'node_modules/@angular/compiler-cli/package.json'));
const {transformSync} = linkerRequire('@babel/core');
const linkerPlugin = linkerRequire('@angular/compiler-cli/linker/babel').default;
const {needsLinking} = linkerRequire('@angular/compiler-cli/linker');
await esbuild.build({
  absWorkingDir: consumer,
  entryPoints: ['out/main.js'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: 'dist/server.mjs',
  logLevel: 'silent',
  plugins: [{
    name: 'ng-linker',
    setup(build) {
      build.onLoad({filter: /\.m?js$/}, args => {
        const source = readFileSync(args.path, 'utf8');
        if (!source.includes('ɵɵngDeclare')) return null;
        if (!needsLinking(args.path, source)) return null;
        const linked = transformSync(source, {
          filename: args.path,
          compact: false,
          configFile: false,
          babelrc: false,
          plugins: [[linkerPlugin, {linkerJitMode: false}]],
        });
        return {contents: linked.code, loader: 'js'};
      });
    },
  }],
});

const rendered = spawn(process.execPath, ['dist/server.mjs'], {cwd: consumer, env});
let stdout = '';
let stderr = '';
rendered.stdout.on('data', chunk => { stdout += chunk; });
rendered.stderr.on('data', chunk => { stderr += chunk; });
const exitCode = await new Promise(resolve => rendered.on('close', resolve));
let payload = null;
const marker = stdout.lastIndexOf('__SSR__');
try { payload = JSON.parse(marker >= 0 ? stdout.slice(marker + 7) : stdout); } catch { payload = null; }
const html = payload?.html || '';
const report = {
  schema_version: 1,
  role: 'server render of the dialog page',
  tarball_sha256: createHash('sha256').update(readFileSync(tarball)).digest('hex'),
  exit: exitCode,
  document_before: payload?.beforeDocument ?? null,
  document_after: payload?.afterDocument ?? null,
  timers: payload?.timers ?? null,
  has_open_button: html.includes('id="open"'),
  has_select: html.includes('id="choice"') || html.includes('mat-select'),
  has_dialog_overlay: html.includes('mat-dialog-container'),
  error: payload ? (exitCode === 0 ? null : stderr.slice(-1500)) : (stdout + stderr).slice(-1500),
  limitations: [
    'The overlay is not opened on the server. The HTML is the closed page.',
    'Zone.js is not installed.',
    'This is not RC-07-A04.',
  ],
};
mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  exit: exitCode,
  has_open_button: report.has_open_button,
  has_select: report.has_select,
  document_after: report.document_after,
  timers: report.timers,
}, null, 2));
if (exitCode !== 0 || report.document_before !== 'undefined' || report.document_after !== 'undefined' || !report.has_open_button || !report.has_select || (report.timers || []).length !== 0) {
  if (stderr) console.error(stderr.slice(-1500));
  process.exit(1);
}
