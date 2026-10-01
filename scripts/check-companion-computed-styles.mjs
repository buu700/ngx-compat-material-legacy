#!/usr/bin/env node
/**
 * Render a bounded companion slice in headless Chromium and capture
 * getComputedStyle CSS custom-property rows after applying
 * all-current-companion-bridges.
 *
 * Slice: badge, divider, icon, toolbar (main / Chromium / zoneful).
 * Does not claim RC-05-A02 / G06–G08 or full thirteen-companion coverage.
 *
 *   node scripts/check-companion-computed-styles.mjs --tarball <path>
 *   node scripts/check-companion-computed-styles.mjs --run <run.json>
 */
import {createHash} from 'node:crypto';
import {spawn, spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {
  existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, writeFileSync, cpSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {parseLegacyArgs, resolveLibraryFromRun, sha256File} from './resolve-run-library.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = join(root, 'compatibility/rc/reports/companion-computed-styles.json');
const require = createRequire(join(root, 'package.json'));
const sass = require('sass');
const esbuild = require('esbuild');

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
  runId = resolved.runId;
} else if (tarballArg) {
  tarball = tarballArg;
} else {
  fail(2, '--tarball or --run is required');
}
if (!existsSync(tarball)) fail(2, `Missing tarball: ${tarball}`);

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
const debugPort = Number(process.env.COMPANION_CDP_PORT || 9334);

const slice = [
  {
    component: 'badge',
    host_id: 'badge-host',
    tokens: ['background-color', 'text-color'],
  },
  {
    component: 'divider',
    host_id: 'divider-host',
    tokens: ['color'],
  },
  {
    component: 'icon',
    host_id: 'icon-host',
    tokens: ['color'],
  },
  {
    component: 'toolbar',
    host_id: 'toolbar-host',
    tokens: ['container-background-color', 'container-text-color'],
  },
];

const consumer = mkdtempSync(join(tmpdir(), 'ngx-compat-companion-computed-'));
const installTarball = join(consumer, 'library.tgz');
writeFileSync(installTarball, readFileSync(tarball));
writeFileSync(join(consumer, 'package.json'), JSON.stringify({
  name: 'ngx-compat-companion-computed',
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
if (relative(realpathSync(consumer), installed).startsWith('..')) {
  fail(1, `Library resolved outside the consumer: ${installed}`);
}

const loadPaths = [
  installed,
  join(consumer, 'node_modules'),
  join(consumer, 'node_modules/.pnpm/node_modules'),
  root,
  join(root, 'node_modules'),
  join(root, 'node_modules/.pnpm/node_modules'),
];
const themeScss = `
@use 'sass:meta';
@use '@ngx-compat/material-legacy' as legacy;
$primary: legacy.define-palette(legacy.$indigo-palette);
$accent: legacy.define-palette(legacy.$pink-palette, A200, A100, A400);
$warn: legacy.define-palette(legacy.$red-palette);
$theme: legacy.define-light-theme((
  color: (primary: $primary, accent: $accent, warn: $warn),
  typography: legacy.define-legacy-typography-config(),
  density: 0
));
html, body { margin: 0; }
.theme-root {
  @include legacy.all-current-companion-bridges($theme);
}
`;
let bridgeCss;
try {
  const compiled = sass.compileString(themeScss, {
    loadPaths,
    style: 'expanded',
    url: pathToFileURL(join(consumer, 'companion-computed.scss')),
    silenceDeprecations: ['if-function', 'global-builtin', 'color-functions', 'import'],
  });
  const external = compiled.loadedUrls
    .map((url) => url.pathname)
    .filter((pathname) => pathname.includes('/node_modules/@material/') || pathname.includes('/@material+'));
  if (external.length) fail(1, `Sass loaded external @material files: ${external.slice(0, 8).join(', ')}`);
  bridgeCss = compiled.css;
} catch (err) {
  fail(1, `Sass compile failed: ${err}`);
}
if (!bridgeCss.includes('--mat-badge-background-color')) {
  fail(1, 'Compiled theme missing badge background token');
}
writeFileSync(join(consumer, 'theme.css'), bridgeCss);

mkdirSync(join(consumer, 'src'), {recursive: true});
writeFileSync(join(consumer, 'src/main.ts'), `import 'zone.js';
import {Component, NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {MatBadgeModule} from '@angular/material/badge';
import {MatDividerModule} from '@angular/material/divider';
import {MatIconModule} from '@angular/material/icon';
import {MatToolbarModule} from '@angular/material/toolbar';

@Component({
  standalone: false,
  selector: 'lab-root',
  template: \`
    <div class="theme-root" id="theme-root">
      <span id="badge-host" matBadge="7" matBadgeOverlap="false">Badge</span>
      <mat-divider id="divider-host"></mat-divider>
      <mat-icon id="icon-host" color="primary" fontIcon="home">home</mat-icon>
      <mat-toolbar id="toolbar-host" color="primary"><span>Toolbar</span></mat-toolbar>
    </div>
  \`,
})
export class LabRoot {}

@NgModule({
  imports: [BrowserModule, MatBadgeModule, MatDividerModule, MatIconModule, MatToolbarModule],
  declarations: [LabRoot],
  bootstrap: [LabRoot],
})
export class LabModule {}

platformBrowserDynamic().bootstrapModule(LabModule).catch(err => {
  const node = document.createElement('pre');
  node.id = 'bootstrap-error';
  node.textContent = String(err && err.stack || err);
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
mkdirSync(join(consumer, 'dist'), {recursive: true});
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
if (bundle.includes('ɵɵngDeclare') || /(?:from|require\()\s*['"]@angular\/compiler['"]/.test(bundle)) {
  fail(1, 'bundle still contains partial declarations or compiler imports');
}

writeFileSync(join(consumer, 'dist/theme.css'), bridgeCss);
writeFileSync(
  join(consumer, 'dist/index.html'),
  `<!doctype html><html><head><link rel="stylesheet" href="/theme.css"></head><body><lab-root></lab-root><script src="/app.js"></script></body></html>\n`,
);

const server = createServer((req, res) => {
  const file = req.url === '/' ? 'index.html' : req.url.split('?')[0].replace(/^\//, '');
  try {
    const body = readFileSync(join(consumer, 'dist', file));
    const headers = {
      'content-type': file.endsWith('.js')
        ? 'text/javascript'
        : file.endsWith('.css')
          ? 'text/css'
          : 'text/html',
    };
    res.writeHead(200, headers);
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const {port} = server.address();
const pageUrl = `http://127.0.0.1:${port}/`;
const chromeDir = mkdtempSync(join(tmpdir(), 'ngx-compat-chrome-companion-'));
const chrome = spawn(chromeBin, [
  '--headless=new',
  `--remote-debugging-port=${debugPort}`,
  '--user-data-dir=' + chromeDir,
  '--no-sandbox',
  '--disable-gpu',
  pageUrl,
], {stdio: ['ignore', 'ignore', 'pipe']});
let chromeLog = '';
chrome.stderr.on('data', (chunk) => { chromeLog += chunk; });

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
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
if (!version) fail(1, `Chromium did not open debugging port ${debugPort}\n${chromeLog.slice(-1000)}`);
const targets = await jsonGet(`http://127.0.0.1:${debugPort}/json/list`);
const page = targets.find((target) => target.type === 'page');
if (!page) fail(1, 'Chromium opened no page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolveOpen, reject) => {
  ws.addEventListener('open', resolveOpen);
  ws.addEventListener('error', reject);
});
let nextId = 0;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
  else waiter.resolve(message.result);
});
function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolveSend, reject) => {
    pending.set(id, {resolve: resolveSend, reject});
    ws.send(JSON.stringify({id, method, params}));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || JSON.stringify(result.exceptionDetails));
  }
  return result.result?.value;
}

let error = null;
let rows = [];
let hostsPresent = false;
try {
  await send('Runtime.enable');
  await send('Page.enable');
  for (let i = 0; i < 80 && !(await evaluate('!!document.getElementById("theme-root") || !!document.getElementById("bootstrap-error")')); i += 1) {
    await sleep(100);
  }
  if (await evaluate('!!document.getElementById("bootstrap-error")')) {
    throw new Error(await evaluate('document.getElementById("bootstrap-error").textContent'));
  }
  hostsPresent = await evaluate(JSON.stringify(slice.map((s) => s.host_id)) +
    '.every(id => !!document.getElementById(id))');
  if (!hostsPresent) throw new Error('companion hosts missing from DOM');

  rows = await evaluate(`(() => {
    const slice = ${JSON.stringify(slice)};
    const theme = document.getElementById('theme-root');
    const themeStyle = getComputedStyle(theme);
    function meaningful(value) {
      const v = (value || '').trim();
      return Boolean(v) && v !== 'inherit' && v !== 'initial' && v !== 'unset';
    }
    return slice.map(item => {
      const host = document.getElementById(item.host_id);
      const hostStyle = getComputedStyle(host);
      const token_rows = item.tokens.map(token => {
        const prop = '--mat-' + item.component + '-' + token;
        const fromTheme = themeStyle.getPropertyValue(prop).trim();
        const fromHost = hostStyle.getPropertyValue(prop).trim();
        const resolved = meaningful(fromHost) ? fromHost : (meaningful(fromTheme) ? fromTheme : '');
        return {
          token,
          css_var: prop,
          theme_root_computed: fromTheme,
          host_computed: fromHost,
          resolved_computed: resolved,
          non_empty: Boolean(resolved),
        };
      });
      return {
        component: item.component,
        host_id: item.host_id,
        host_tag: host.tagName.toLowerCase(),
        host_class: host.className,
        token_rows,
        all_tokens_non_empty: token_rows.every(row => row.non_empty),
      };
    });
  })()`);
} catch (err) {
  error = String(err && err.stack || err);
} finally {
  try { ws.close(); } catch {}
  chrome.kill();
  server.close();
}

const allOk = !error && Array.isArray(rows) && rows.length === slice.length
  && rows.every((row) => row.all_tokens_non_empty);

const report = {
  schema_version: 1,
  role: 'companion bridge rendered computed-style slice (not G07)',
  check_id: 'companion-computed-styles',
  run_id: runId,
  tarball_sha256: sha256File(tarball),
  browser: version?.Browser || null,
  peer_material_version: '22.1.7',
  slice_components: slice.map((s) => s.component),
  rows,
  hosts_present: hostsPresent,
  result: allOk ? 'pass' : 'fail',
  g06_g07_g08_claim: 'not-passed',
  error,
  limitations: [
    'Only badge, divider, icon, and toolbar were rendered on main/Chromium/zoneful.',
    'Captures getComputedStyle CSS custom properties after all-current-companion-bridges; not full dimension matrix or peer M2 oracle equality.',
    'Remaining companions, 21.x line, density/typography/dark/RTL state grids remain not-executed.',
    'Does not claim RC-05-A02 / G06–G08.',
  ],
};
mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  ok: allOk,
  components: slice.map((s) => s.component),
  rows: (rows || []).map((r) => ({
    component: r.component,
    all_tokens_non_empty: r.all_tokens_non_empty,
    tokens: (r.token_rows || []).map((t) => [t.css_var, t.resolved_computed || t.host_computed || t.theme_root_computed]),
  })),
  report: relative(root, reportPath),
  error,
}, null, 2));
if (!allOk) process.exit(1);
