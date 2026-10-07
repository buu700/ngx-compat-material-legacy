#!/usr/bin/env node
/**
 * Chromium PR-slice for legacy surface families: button, card, progress-bar,
 * and progress-spinner.
 *
 * Asserts honest family/state cells: button default+disabled+focused, card/
 * progress-bar/progress-spinner default. Supports --zoneless (no Zone.js;
 * provideZoneless ChangeDetection). Does not fan success into unexecuted
 * engines or states. Does not claim G10.
 *
 *   node scripts/browser-surface-families.mjs --tarball <path>
 *   node scripts/browser-surface-families.mjs --tarball <path> --zoneless
 */
import {createHash} from 'node:crypto';
import {PEER_ICON_TT_CSP, peerIconTtOkay} from './peer-icon-tt-admission.mjs';
import {spawnSync as __spawnSyncForWs} from 'node:child_process';
if (typeof globalThis.WebSocket !== 'function') {
  // Local Node 20 shells need the experimental flag; CI/Chainman Node 22+ has WebSocket.
  const relaunch = __spawnSyncForWs(process.execPath, ['--experimental-websocket', ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(relaunch.status ?? 1);
}

import {spawn, spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let reportPath = join(root, 'compatibility/rc/reports/browser-surface-families.json');
const esbuild = createRequire(join(root, 'package.json'))('esbuild');

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

let tarball = null;
let zoneless = false;
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i] === '--zoneless') {
    zoneless = true;
    reportPath = join(root, 'compatibility/rc/reports/browser-surface-families-zoneless.json');
    continue;
  }
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

function resolveChromeBin() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  for (const candidate of [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  fail(1, 'No Chrome/Chromium binary found; set CHROME_BIN');
}
const chromeBin = resolveChromeBin();

const consumer = mkdtempSync(join(tmpdir(), 'ngx-compat-surface-families-'));
const installTarball = join(consumer, 'library.tgz');
writeFileSync(installTarball, readFileSync(tarball));
writeFileSync(join(consumer, 'package.json'), JSON.stringify({
  name: 'ngx-compat-surface-families-browser',
  private: true,
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
    ...(zoneless ? {} : {'zone.js': '0.16.3'}),
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
writeFileSync(join(consumer, 'src/main.ts'), `${zoneless ? '' : `import 'zone.js';
`}import {Component, NgModule, inject${zoneless ? ', provideZonelessChangeDetection' : ''}} from '@angular/core';
import {BrowserModule, DomSanitizer} from '@angular/platform-browser';
import {MatIconModule, MatIconRegistry} from '@angular/material/icon';
import {MediaMatcher} from '@angular/cdk/layout';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {MATERIAL_ANIMATIONS} from '@angular/material/core';
import {MatLegacyButtonModule} from '@ngx-compat/material-legacy/legacy-button';
import {MatLegacyCardModule} from '@ngx-compat/material-legacy/legacy-card';
import {MatLegacyProgressBarModule} from '@ngx-compat/material-legacy/legacy-progress-bar';
import {MatLegacyProgressSpinnerModule} from '@ngx-compat/material-legacy/legacy-progress-spinner';

@Component({
  standalone: false,
  selector: 'lab-root',
  template: \`
    <button mat-button id="peer-icon-button"><mat-icon svgIcon="closeout-native-tt"></mat-icon>Icon</button>
    <button id="button-default" mat-button type="button">Default</button>
    <button id="button-disabled" mat-button type="button" disabled>Disabled</button>
    <button id="button-focus" mat-raised-button type="button">Focus me</button>

    <mat-card id="card-default">
      <mat-card-title>Title</mat-card-title>
      <mat-card-content>Content</mat-card-content>
    </mat-card>

    <mat-progress-bar id="progress-bar-default" mode="determinate" [value]="40"></mat-progress-bar>
    <mat-progress-spinner id="progress-spinner-default" mode="determinate" [value]="55" diameter="48"></mat-progress-spinner>
  \`,
})
export class LabRoot {
  constructor() {
    (window as any).__closeoutMediaMatcher=inject(MediaMatcher);
    inject(MatIconRegistry).addSvgIconLiteral('closeout-native-tt',inject(DomSanitizer).bypassSecurityTrustHtml(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><path d="M0 0h8v8H0z"/></svg>'));
  }
}

@NgModule({
  imports: [
    BrowserModule,
    MatIconModule,
    MatLegacyButtonModule,
    MatLegacyCardModule,
    MatLegacyProgressBarModule,
    MatLegacyProgressSpinnerModule,
  ],
  declarations: [LabRoot],
  bootstrap: [LabRoot],
  providers: [${zoneless ? 'provideZonelessChangeDetection(), ' : ''}{provide: MATERIAL_ANIMATIONS, useValue: {animationsDisabled: true}}],
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
if (compiled.status !== 0) fail(1, `${compiled.stdout || ''}\n${compiled.stderr || ''}`.slice(-3000));

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
const bundleHasZone = bundle.includes('Zone.__symbol__');
if (bundleDeclares || bundleCompilerImport || (zoneless && bundleHasZone)) {
  fail(1, `bundle partial=${bundleDeclares} compiler=${bundleCompilerImport} zone=${bundleHasZone}`);
}
writeFileSync(join(consumer, 'dist/index.html'),
  `<!doctype html><html><body><lab-root></lab-root><script src="/app.js"></script></body></html>\n`);

const server = createServer((req, res) => {
  const file = req.url === '/' ? 'index.html' : req.url.split('?')[0].replace(/^\//, '');
  try {
    const body = readFileSync(join(consumer, 'dist', file));
    res.writeHead(200, {
      'content-type': file.endsWith('.js') ? 'text/javascript' : 'text/html',
      'content-security-policy': PEER_ICON_TT_CSP,
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const {port} = server.address();
const pageUrl = `http://127.0.0.1:${port}/`;
const chromeDir = mkdtempSync(join(tmpdir(), 'ngx-compat-chrome-surface-'));
const debugPort = Number(process.env.CDP_PORT || '9336');
const chrome = spawn(chromeBin, [

  '--headless=new',
  '--remote-debugging-port=' + String(debugPort),
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
    version = await jsonGet(`http://127.0.0.1:${debugPort}/json/version`);
    break;
  } catch {
    await sleep(100);
  }
}
if (!version) fail(1, `Chromium did not open a debugging port\n${chromeLog.slice(-1000)}`);
const targets = await jsonGet(`http://127.0.0.1:${debugPort}/json/list`);
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
  const result = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: false});
  return result.result?.value;
}
async function waitFor(predicateExpr, attempts = 50, delayMs = 100) {
  for (let i = 0; i < attempts; i += 1) {
    if (await evaluate(predicateExpr)) return true;
    await sleep(delayMs);
  }
  return false;
}

const families = {
  button: {present: false, disabled_class: false, focused: false},
  card: {present: false},
  'progress-bar': {present: false, value_reflected: false},
  'progress-spinner': {present: false, value_reflected: false},
};
let error = null;
let diagnostic = null;
let zoneGlobal = null;
let peerIconTt = null;
let peerMediaMatcher = null;

try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.__errors=[];window.__ttViolations=[];window.addEventListener("error",e=>window.__errors.push(String(e.message)));window.addEventListener("securitypolicyviolation",e=>window.__ttViolations.push(e.violatedDirective));',
  });
  await send('Page.reload', {ignoreCache: true});
  await waitFor('!!document.getElementById("button-default") || !!document.getElementById("bootstrap-error")');
  diagnostic = await evaluate('({errors: window.__errors || [], text: document.body.innerText, html: document.body.innerHTML.slice(0, 800)})');
  if (await evaluate('!!document.getElementById("bootstrap-error")')) throw new Error('bootstrap failed');

  const iconRendered = await waitFor(`document.querySelector('#peer-icon-button mat-icon svg path')?.getAttribute('d') === 'M0 0h8v8H0z'`);
  await sleep(100);
  const initialViolations = await evaluate('window.__ttViolations || []');
  peerIconTt = await evaluate(`(() => {
    const available = typeof trustedTypes !== 'undefined';
    let rawLiteralRejected = false, disallowedPolicyRejected = false;
    try { document.createElement('div').innerHTML = '<svg></svg>'; } catch { rawLiteralRejected = true; }
    try { trustedTypes.createPolicy('closeout-disallowed', {createHTML: x => x}); } catch { disallowedPolicyRejected = true; }
    return {available, raw_literal_rejected: rawLiteralRejected, disallowed_policy_rejected: disallowedPolicyRejected};
  })()`);
  await sleep(100);
  const negativeViolations = await evaluate('window.__ttViolations || []');
  Object.assign(peerIconTt, {
    svg_rendered: iconRendered,
    positive_without_violations: Array.isArray(initialViolations) && initialViolations.length === 0,
    negative_directives_observed: Array.isArray(negativeViolations)
      && negativeViolations.includes('require-trusted-types-for') && negativeViolations.includes('trusted-types'),
    observed_negative_directives: negativeViolations,
  });

  // Security diagnostic only: a fixed CSS custom-property marker, no URL or
  // script payload. This tests the public peer path; it earns no matrix credit
  // and does not establish an owned untrusted-input flow or security clearance.
  peerMediaMatcher = await evaluate(`(() => {
    const matcher=window.__closeoutMediaMatcher;
    const marker='--closeout-peer-query-css-probe';
    const query='(min-width: 0px) {html {'+marker+': 1} /*';
    const attemptedRules=[];
    const originalInsert=CSSStyleSheet.prototype.insertRule;
    const before=getComputedStyle(document.documentElement).getPropertyValue(marker).trim();
    let validQuery=null,unsafeQuery=null,error=null,removedRules=0;
    try {
      validQuery=matcher.matchMedia('(min-width: 0px)').matches;
      CSSStyleSheet.prototype.insertRule=function(...args){
        attemptedRules.push(String(args[0]).slice(0,300));
        return originalInsert.apply(this,args);
      };
      unsafeQuery=matcher.matchMedia(query).matches;
    } catch(caught){error=String(caught);}
    finally{CSSStyleSheet.prototype.insertRule=originalInsert;}
    const after=getComputedStyle(document.documentElement).getPropertyValue(marker).trim();
    for(const style of document.querySelectorAll('style')){
      const sheet=style.sheet;if(!sheet)continue;
      for(let index=sheet.cssRules.length-1;index>=0;index--){
        if(sheet.cssRules[index].cssText.includes(marker)){sheet.deleteRule(index);removedRules++;}
      }
    }
    return {available:!!matcher,valid_query_matches:validQuery,unsafe_query_matches:unsafeQuery,
      before_marker:before,after_marker:after,unsafe_query_css_injected:before===''&&after==='1',
      attempted_rules:attemptedRules,removed_probe_rules:removedRules,
      cleanup_marker:getComputedStyle(document.documentElement).getPropertyValue(marker).trim(),error};
  })()`);

  // Button default + disabled + focused state cells.
  families.button.present = await waitFor('!!document.querySelector("button#button-default.mat-button, button#button-default[mat-button]")');
  families.button.disabled_class = await waitFor(
    '!!document.querySelector("button#button-disabled.mat-button-disabled")',
  );
  await evaluate(`(() => {
    const button = document.getElementById("button-focus");
    button.focus();
    button.dispatchEvent(new Event("focusin", {bubbles: true}));
  })()`);
  families.button.focused = await waitFor(
    'document.activeElement && document.activeElement.id === "button-focus"',
  );

  // Card default.
  families.card.present = await waitFor(
    '!!document.querySelector("mat-card#card-default.mat-card") && !!document.querySelector("mat-card#card-default mat-card-title")',
  );

  // Progress-bar default (determinate value reflected via aria-valuenow).
  families['progress-bar'].present = await waitFor('!!document.querySelector("mat-progress-bar#progress-bar-default.mat-progress-bar")');
  families['progress-bar'].value_reflected = await waitFor(
    '(() => { const el = document.querySelector("mat-progress-bar#progress-bar-default"); return el && el.getAttribute("aria-valuenow") === "40"; })()',
  );

  // Progress-spinner default (determinate value via aria-valuenow).
  families['progress-spinner'].present = await waitFor(
    '!!document.querySelector("mat-progress-spinner#progress-spinner-default.mat-progress-spinner")',
  );
  families['progress-spinner'].value_reflected = await waitFor(
    '(() => { const el = document.querySelector("mat-progress-spinner#progress-spinner-default"); return el && el.getAttribute("aria-valuenow") === "55"; })()',
  );

  zoneGlobal = await evaluate('typeof Zone === "undefined" ? "undefined" : typeof Zone');
} catch (err) {
  error = String(err);
} finally {
  ws.close();
  chrome.kill();
  server.close();
}

const runtime = zoneless ? 'zoneless' : 'zoneful';
const cells = [
  `pr/main/chromium/${runtime}/button/default`,
  `pr/main/chromium/${runtime}/button/disabled`,
  `pr/main/chromium/${runtime}/button/focused`,
  `pr/main/chromium/${runtime}/card/default`,
  `pr/main/chromium/${runtime}/progress-bar/default`,
  `pr/main/chromium/${runtime}/progress-spinner/default`,
];
const zoneOk = zoneless
  ? (zoneGlobal === 'undefined' && bundleHasZone === false)
  : true;
const ok =
  !error
  && zoneOk
  && peerIconTtOkay(peerIconTt)
  && families.button.present && families.button.disabled_class && families.button.focused
  && families.card.present
  && families['progress-bar'].present && families['progress-bar'].value_reflected
  && families['progress-spinner'].present && families['progress-spinner'].value_reflected;

const report = {
  schema_version: 1,
  role: zoneless
    ? 'zoneless Chromium PR-slice for button/card/progress-bar/progress-spinner (not full matrix)'
    : 'Chromium PR-slice for button/card/progress-bar/progress-spinner (not full matrix)',
  tarball_sha256: createHash('sha256').update(readFileSync(tarball)).digest('hex'),
  browser: version.Browser,
  zoneless,
  bundle_has_zone: bundleHasZone,
  zone_global: zoneGlobal,
  families,
  peer_icon_tt: peerIconTt,
  peer_media_matcher: peerMediaMatcher,
  credited_cell_ids: ok ? cells : [],
  matrix_updated: false,
  error,
  diagnostic: ok ? null : diagnostic,
  limitations: [
    zoneless
      ? 'Only Chromium main-line zoneless button/card/progress-bar/progress-spinner default+disabled/focused cells; Zone.js is not installed.'
      : 'Only Chromium main-line zoneful button/card/progress-bar/progress-spinner default+disabled/focused cells.',
    'Firefox/WebKit, CSP, motion, invalid/RTL/density/dark, and other states stay not-executed.',
    'MATERIAL_ANIMATIONS.animationsDisabled=true for deterministic layout; not enabled-motion proof.',
    'Button credit is presence + mat-button-disabled class + focus on raised button; ripple/variants/keyboard not exercised.',
    'Card credit is host+title presence; actions/images/subtitle/footer not exercised.',
    'Progress-bar credit is host presence + aria-valuenow for determinate mode; buffer/query/indeterminate motion not exercised.',
    'Progress-spinner credit is host presence + aria-valuenow for determinate mode; indeterminate SVG animation not exercised.',
    'Success is not copied to unexecuted cells.',
    'Peer icon TT probe uses actual Chromium require-trusted-types-for enforcement and an allowed Angular policy list; this is not a full script/style/network CSP matrix or arbitrary SVG trust audit.',
    'Public MediaMatcher unsafe-query diagnostic uses one fixed reversible CSS marker; it earns no acceptance/matrix credit and does not establish an owned input path or security clearance.',
    'Does not claim G10.',
  ],
};
mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  browser: version.Browser,
  ok,
  zoneless,
  bundle_has_zone: bundleHasZone,
  zone_global: zoneGlobal,
  families,
  peer_icon_tt: peerIconTt,
  peer_media_matcher: peerMediaMatcher,
  error,
  credited_cell_ids: report.credited_cell_ids,
}, null, 2));
process.exit(ok ? 0 : 1);
