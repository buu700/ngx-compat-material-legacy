#!/usr/bin/env node
/**
 * Open one legacy dialog in headless Chromium and close it with Escape.
 *
 *   node scripts/browser-dialog-escape.mjs --tarball <path>
 */
import {createHash} from 'node:crypto';
import {spawn, spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {mkdtempSync, mkdirSync, readFileSync, realpathSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = join(root, 'compatibility/rc/reports/browser-dialog-escape.json');
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

const consumer = mkdtempSync(join(tmpdir(), 'ngx-compat-dialog-browser-'));
const installTarball = join(consumer, 'library.tgz');
writeFileSync(installTarball, readFileSync(tarball));
writeFileSync(join(consumer, 'package.json'), JSON.stringify({
  name: 'ngx-compat-dialog-browser',
  private: true,
  dependencies: {
    '@angular/cdk': '22.1.7',
    '@angular/common': '22.1.7',
    '@angular/compiler': '22.1.7',
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
  },
}, null, 2));
writeFileSync(join(consumer, '.npmrc'), 'install-links=true\nfund=false\naudit=false\n');
const env = {...process.env, NODE_OPTIONS: ''};
delete env.NODE_PATH;
const install = spawnSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock'], {
  cwd: consumer, encoding: 'utf8', timeout: 180000, env,
});
if (install.status !== 0) fail(1, (install.stderr || install.stdout || 'npm install failed').slice(-2000));
const installed = realpathSync(join(consumer, 'node_modules/@ngx-compat/material-legacy'));
if (relative(realpathSync(consumer), installed).startsWith('..')) fail(1, `Library resolved outside the consumer: ${installed}`);

mkdirSync(join(consumer, 'src'), {recursive: true});
writeFileSync(join(consumer, 'src/main.ts'), `import 'zone.js';
import {Component, NgModule, inject} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {MATERIAL_ANIMATIONS} from '@angular/material/core';
import {MatLegacyDialog, MatLegacyDialogModule} from '@ngx-compat/material-legacy/legacy-dialog';

@Component({
  standalone: false,
  selector: 'dialog-body',
  template: '<p id="dialog-body">Open</p>',
})
export class DialogBody {}

@Component({
  standalone: false,
  selector: 'lab-root',
  template: '<button id="open" type="button" (click)="open()">Open</button>',
})
export class LabRoot {
  private dialog = inject(MatLegacyDialog);
  open() { this.dialog.open(DialogBody); }
}

@NgModule({
  imports: [BrowserModule, MatLegacyDialogModule],
  declarations: [LabRoot, DialogBody],
  bootstrap: [LabRoot],
  providers: [{provide: MATERIAL_ANIMATIONS, useValue: {animationsDisabled: true}}],
})
export class LabModule {}

platformBrowserDynamic().bootstrapModule(LabModule).catch(err => {
  const node = document.createElement('pre');
  node.id = 'bootstrap-error';
  node.textContent = String(err);
  document.body.appendChild(node);
});
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
  format: 'iife',
  outfile: 'dist/app.js',
  platform: 'browser',
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
const bundle = readFileSync(join(consumer, 'dist/app.js'), 'utf8');
const bundleDeclares = bundle.includes('ɵɵngDeclare');
const bundleCompilerImport = /(?:from|require\()\s*['"]@angular\/compiler['"]/.test(bundle);
if (bundleDeclares || bundleCompilerImport) {
  fail(1, `bundle still has partial declarations=${bundleDeclares} compiler import=${bundleCompilerImport}`);
}
writeFileSync(join(consumer, 'dist/index.html'), `<!doctype html><html><body><lab-root></lab-root><script src="/app.js"></script></body></html>\n`);

const server = createServer((req, res) => {
  const file = req.url === '/' ? 'index.html' : req.url.split('?')[0].replace(/^\//, '');
  try {
    const body = readFileSync(join(consumer, 'dist', file));
    res.writeHead(200, {'content-type': file.endsWith('.js') ? 'text/javascript' : 'text/html'});
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const {port} = server.address();
const pageUrl = `http://127.0.0.1:${port}/`;
const chromeDir = mkdtempSync(join(tmpdir(), 'ngx-compat-chrome-'));
const chrome = spawn('/usr/bin/chromium-browser', [
  '--headless=new',
  '--remote-debugging-port=9333',
  '--user-data-dir=' + chromeDir,
  '--no-sandbox',
  '--disable-gpu',
  pageUrl,
], {stdio: ['ignore', 'ignore', 'pipe']});
let chromeLog = '';
chrome.stderr.on('data', chunk => { chromeLog += chunk; });

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function jsonGet(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.json();
}
let version = null;
for (let i = 0; i < 50; i += 1) {
  try {
    version = await jsonGet('http://127.0.0.1:9333/json/version');
    break;
  } catch {
    await sleep(100);
  }
}
if (!version) fail(1, `Chromium did not open a debugging port\n${chromeLog.slice(-1000)}`);
const targets = await jsonGet('http://127.0.0.1:9333/json/list');
const page = targets.find(target => target.type === 'page');
if (!page) fail(1, 'Chromium opened no page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve);
  ws.addEventListener('error', reject);
});
let nextId = 0;
const pending = new Map();
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
  else waiter.resolve(message.result);
});
function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, {resolve, reject});
    ws.send(JSON.stringify({id, method, params}));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {expression, returnByValue: true});
  return result.result?.value;
}
let opened = false;
let closed = false;
let error = null;
let diagnostic = null;
try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.__errors=[];window.addEventListener("error",e=>window.__errors.push(String(e.message)));',
  });
  await send('Page.reload', {ignoreCache: true});
  for (let i = 0; i < 50 && !(await evaluate('!!document.getElementById("open") || !!document.getElementById("bootstrap-error")')); i += 1) await sleep(100);
  diagnostic = await evaluate('({errors: window.__errors || [], text: document.body.innerText, html: document.body.innerHTML.slice(0, 500)})');
  if (await evaluate('!!document.getElementById("bootstrap-error")')) throw new Error('bootstrap failed');
  await evaluate('document.getElementById("open").click()');
  for (let i = 0; i < 50 && !(await evaluate('!!document.getElementById("dialog-body")')); i += 1) await sleep(100);
  opened = await evaluate('!!document.getElementById("dialog-body")');
  await send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27});
  await send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27});
  for (let i = 0; i < 50 && await evaluate('!!document.getElementById("dialog-body")'); i += 1) await sleep(100);
  closed = !(await evaluate('!!document.getElementById("dialog-body")'));
} catch (err) {
  error = String(err);
} finally {
  ws.close();
  chrome.kill();
  server.close();
}
const report = {
  schema_version: 1,
  role: 'one legacy dialog Escape in Chromium',
  tarball_sha256: createHash('sha256').update(readFileSync(tarball)).digest('hex'),
  browser: version.Browser,
  opened,
  closed_by_escape: opened && closed,
  bundle_has_partial_declarations: bundleDeclares,
  bundle_imports_angular_compiler: bundleCompilerImport,
  matrix_updated: false,
  error,
  diagnostic: opened && closed ? null : diagnostic,
  limitations: [
    'One dialog scenario. The declared matrix stays not-executed.',
    'Animations were disabled through MATERIAL_ANIMATIONS.',
    'The app source does not import @angular/compiler. The linker runs while bundling.',
    'This is not RC-07-A03.',
  ],
};
mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({browser: version.Browser, opened, closed_by_escape: report.closed_by_escape}, null, 2));
if (!report.closed_by_escape) process.exit(1);
