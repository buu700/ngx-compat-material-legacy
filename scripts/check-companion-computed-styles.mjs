#!/usr/bin/env node
/**
 * Render the thirteen current companions and capture computed tokens for
 * light, dark, rtl, density, and typography.
 *
 *   node scripts/check-companion-computed-styles.mjs --tarball <path>
 *   node scripts/check-companion-computed-styles.mjs --tarball <main.tgz> --tarball-21x <21.tgz>
 *   node scripts/check-companion-computed-styles.mjs --run <run.json>
 *
 * Coverage stays slice. Empty historical dimensions are recorded as absence.
 * Does not claim RC-05-A02 / G06–G08.
 */
import {spawn, spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {
  existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {parseLegacyArgs, resolveLibraryFromRun, sha256File} from './resolve-run-library.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const defaultReport = join(root, 'compatibility/rc/reports/companion-computed-styles.json');
const require = createRequire(join(root, 'package.json'));

export const COMPANIONS = [
  'badge', 'bottom-sheet', 'button-toggle', 'datepicker', 'divider', 'expansion',
  'grid-list', 'icon', 'sidenav', 'stepper', 'sort', 'toolbar', 'tree',
];
export const DIMENSIONS = ['base', 'color', 'typography', 'density'];
export const STATES = ['light', 'dark', 'rtl', 'density', 'typography'];

const slice = [
  {component: 'badge', host_id: 'badge-host', tokens: ['background-color', 'text-color']},
  {component: 'divider', host_id: 'divider-host', tokens: ['color']},
  {component: 'icon', host_id: 'icon-host', tokens: ['color']},
  {component: 'toolbar', host_id: 'toolbar-host', tokens: ['container-background-color', 'container-text-color']},
  {component: 'sort', host_id: 'sort-host', tokens: ['arrow-color']},
  {component: 'grid-list', host_id: 'grid-list-host', tokens: ['tile-header-primary-text-size', 'tile-footer-primary-text-size']},
  {component: 'button-toggle', host_id: 'button-toggle-host', tokens: ['background-color', 'text-color']},
  {component: 'bottom-sheet', host_id: 'bottom-sheet-host', tokens: ['container-background-color', 'container-text-color']},
  {component: 'datepicker', host_id: 'datepicker-host', tokens: ['calendar-container-background-color', 'calendar-container-text-color']},
  {component: 'expansion', host_id: 'expansion-host', tokens: ['container-background-color', 'header-text-color']},
  {component: 'sidenav', host_id: 'sidenav-host', tokens: ['container-background-color', 'container-text-color']},
  {component: 'stepper', host_id: 'stepper-host', tokens: ['container-color', 'header-label-text-color']},
  {component: 'tree', host_id: 'tree-host', tokens: ['container-background-color', 'node-text-color']},
];

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

export function classifyDimension(tokenKey) {
  const token = String(tokenKey || '').toLowerCase();
  if (/(font|text-size|text-weight|line-height|tracking|typography)/.test(token)) return 'typography';
  if (/(height|density|size(?!-text)|container-shape|shape$)/.test(token) && !/color|font|text/.test(token)) {
    return 'density';
  }
  if (/(color|background|opacity|shadow|elevation|outline|divider)/.test(token)) return 'color';
  if (/(shape|elevation|shadow|container)/.test(token)) return 'base';
  return 'base';
}

export function assessCompanionEvidence(components) {
  const errors = [];
  if (!Array.isArray(components)) {
    return {ok: false, errors: ['companion evidence is missing'], rows: []};
  }
  for (const name of COMPANIONS) {
    if (!components.some(row => row && row.component === name)) errors.push(`missing companion ${name}`);
  }
  const rows = [];
  const seen = new Set();
  let colorChanged = false;
  let densityChanged = false;
  let typographyChanged = false;
  let rtlOk = false;
  let ltrOk = false;
  for (const component of components) {
    if (!component || seen.has(component.component)) continue;
    seen.add(component.component);
    if (!COMPANIONS.includes(component.component)) {
      errors.push(`unexpected companion ${component.component}`);
      continue;
    }
    if (!component.host_present) errors.push(`${component.component}: host missing`);
    if (component.direction_rtl === 'rtl') rtlOk = true;
    if (component.direction_ltr === 'ltr') ltrOk = true;
    const grouped = {base: [], color: [], typography: [], density: []};
    for (const [token, fact] of Object.entries(component.tokens || {})) {
      const dimension = classifyDimension(token);
      const entry = {
        token,
        css_var: `--mat-${component.component}-${token}`,
        light: fact?.light || '',
        dark: fact?.dark || '',
        density: fact?.density || '',
        typography: fact?.typography || '',
      };
      entry.changed_dark = Boolean(entry.light && entry.dark && entry.light !== entry.dark);
      entry.changed_density = Boolean(entry.light && entry.density && entry.light !== entry.density);
      entry.changed_typography = Boolean(entry.light && entry.typography && entry.light !== entry.typography);
      grouped[dimension].push(entry);
      if (dimension === 'color' && entry.changed_dark) colorChanged = true;
      if (dimension === 'density' && entry.changed_density) densityChanged = true;
      if (dimension === 'typography' && entry.changed_typography) typographyChanged = true;
    }
    const dimensions = {};
    for (const dimension of DIMENSIONS) {
      const tokens = grouped[dimension];
      dimensions[dimension] = tokens.length
        ? {present: true, tokens}
        : {present: false, evidence: `no emitted ${dimension} token`};
    }
    rows.push({
      component: component.component,
      host_present: Boolean(component.host_present),
      states: {
        light: {direction: component.direction_ltr || ''},
        dark: {direction: component.direction_ltr || ''},
        rtl: {direction: component.direction_rtl || ''},
        density: {changed: grouped.density.some(token => token.changed_density)},
        typography: {changed: grouped.typography.some(token => token.changed_typography)},
      },
      dimensions,
    });
  }
  if (!colorChanged) errors.push('dark theme did not change a color token');
  if (!densityChanged) errors.push('density theme did not change a density token');
  if (!typographyChanged) errors.push('typography theme did not change a typography token');
  if (!rtlOk) errors.push('rtl direction was not rtl');
  if (!ltrOk) errors.push('ltr direction was not ltr');
  rows.sort((a, b) => COMPANIONS.indexOf(a.component) - COMPANIONS.indexOf(b.component));
  return {ok: errors.length === 0, errors, rows};
}

function exactVersion(spec, fallback) {
  const match = String(spec || '').match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : fallback;
}

function readPackedPackage(tarball) {
  const result = spawnSync('tar', ['-xOzf', tarball, 'package/package.json'], {encoding: 'utf8'});
  if (result.status !== 0) fail(1, (result.stderr || 'unable to read packed package.json').slice(-500));
  return JSON.parse(result.stdout);
}

function versionsFor(pkg) {
  const peers = pkg.peerDependencies || {};
  const core = exactVersion(peers['@angular/core'], '22.1.7');
  const major = Number(core.split('.')[0]);
  return {
    core,
    cdk: exactVersion(peers['@angular/cdk'], major >= 22 ? '22.1.7' : '21.2.14'),
    material: exactVersion(peers['@angular/material'], major >= 22 ? '22.1.7' : '21.2.14'),
    common: core,
    compiler: core,
    forms: core,
    platformBrowser: core,
    rxjs: '7.8.2',
    typescript: major >= 22 ? '6.0.3' : '5.9.2',
    zone: major >= 22 ? '0.16.3' : '0.15.1',
    tslib: '2.8.1',
  };
}

function extractComponentVars(css, component) {
  const prefix = `--mat-${component}-`;
  const found = new Set();
  const re = new RegExp(`${prefix.replace(/-/g, '\\-')}([a-z0-9-]+)\\s*:`, 'g');
  let match;
  while ((match = re.exec(css))) found.add(match[1]);
  return [...found].sort();
}

function themeSource() {
  return `
@use '@ngx-compat/material-legacy' as legacy with ($theme-ignore-duplication-warnings: true);
$primary: legacy.define-palette(legacy.$indigo-palette);
$accent: legacy.define-palette(legacy.$pink-palette, A200, A100, A400);
$warn: legacy.define-palette(legacy.$red-palette);
$color: (primary: $primary, accent: $accent, warn: $warn);
$default-type: legacy.define-legacy-typography-config();
$custom-type: legacy.define-legacy-typography-config(
  $body-1: legacy.define-typography-level(22px, 28px, 400),
  $title: legacy.define-typography-level(30px, 36px, 500)
);
$light: legacy.define-light-theme((color: $color, typography: $default-type, density: 0));
$dark: legacy.define-dark-theme((color: $color, typography: $default-type, density: 0));
$dense: legacy.define-light-theme((color: $color, typography: $default-type, density: -2));
$typed: legacy.define-light-theme((color: $color, typography: $custom-type, density: 0));
html, body { margin: 0; }
.theme-light { @include legacy.all-current-companion-bridges($light); }
.theme-dark { @include legacy.all-current-companion-bridges($dark); }
.theme-dense { @include legacy.all-current-companion-bridges($dense); }
.theme-type { @include legacy.all-current-companion-bridges($typed); }
`;
}

function parseArgs(argv) {
  let tarball21 = null;
  let out = defaultReport;
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--tarball-21x' || arg === '--out') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) fail(2, `${arg} requires a path`);
      if (arg === '--tarball-21x') tarball21 = resolve(value);
      else out = resolve(value);
      i += 1;
      continue;
    }
    rest.push(arg);
  }
  const parsed = parseLegacyArgs(rest);
  if (parsed.unknown.length) fail(2, `Unknown argument: ${parsed.unknown[0]}`);
  return {tarball21, out, ...parsed};
}

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

function labSource() {
  return `import 'zone.js';
import {Component, NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {MatBadgeModule} from '@angular/material/badge';
import {MatBottomSheetModule} from '@angular/material/bottom-sheet';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatNativeDateModule} from '@angular/material/core';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatDividerModule} from '@angular/material/divider';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatGridListModule} from '@angular/material/grid-list';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatSortModule} from '@angular/material/sort';
import {MatStepperModule} from '@angular/material/stepper';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatTreeFlatDataSource, MatTreeFlattener, MatTreeModule} from '@angular/material/tree';
import {FlatTreeControl} from '@angular/cdk/tree';

interface TreeNode { name: string; children?: TreeNode[]; }
interface FlatNode { expandable: boolean; name: string; level: number; }

@Component({
  standalone: false,
  selector: 'lab-root',
  template: \`
    <div class="theme-root theme-light" id="theme-root">
      <span id="badge-host" matBadge="7" matBadgeOverlap="false">Badge</span>
      <mat-divider id="divider-host"></mat-divider>
      <mat-icon id="icon-host" color="primary" fontIcon="home">home</mat-icon>
      <mat-toolbar id="toolbar-host" color="primary"><span>Toolbar</span></mat-toolbar>
      <table matSort>
        <thead>
          <tr>
            <th id="sort-host" mat-sort-header="name">Name</th>
          </tr>
        </thead>
      </table>
      <mat-grid-list id="grid-list-host" cols="1" rowHeight="80px">
        <mat-grid-tile>
          <mat-grid-tile-header>Header</mat-grid-tile-header>
          Tile
          <mat-grid-tile-footer>Footer</mat-grid-tile-footer>
        </mat-grid-tile>
      </mat-grid-list>
      <mat-button-toggle-group id="button-toggle-host">
        <mat-button-toggle value="a" checked>A</mat-button-toggle>
        <mat-button-toggle value="b">B</mat-button-toggle>
      </mat-button-toggle-group>
      <div id="bottom-sheet-host" class="mat-bottom-sheet-container">Bottom sheet host</div>
      <mat-form-field>
        <mat-label>Date</mat-label>
        <input matInput [matDatepicker]="picker" />
        <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
        <mat-datepicker id="datepicker-host" #picker></mat-datepicker>
      </mat-form-field>
      <mat-expansion-panel id="expansion-host" expanded>
        <mat-expansion-panel-header>Expansion</mat-expansion-panel-header>
        Content
      </mat-expansion-panel>
      <mat-sidenav-container>
        <mat-sidenav id="sidenav-host" opened mode="side">Sidenav</mat-sidenav>
        <mat-sidenav-content>Content</mat-sidenav-content>
      </mat-sidenav-container>
      <mat-horizontal-stepper id="stepper-host" linear="false">
        <mat-step label="One"><div>Step one</div></mat-step>
        <mat-step label="Two"><div>Step two</div></mat-step>
      </mat-horizontal-stepper>
      <mat-tree id="tree-host" [dataSource]="dataSource" [treeControl]="treeControl">
        <mat-tree-node *matTreeNodeDef="let node" matTreeNodePadding>{{node.name}}</mat-tree-node>
        <mat-tree-node *matTreeNodeDef="let node; when: hasChild" matTreeNodePadding>
          <button matTreeNodeToggle type="button">{{node.name}}</button>
        </mat-tree-node>
      </mat-tree>
    </div>
  \`,
})
export class LabRoot {
  private _transformer = (node: TreeNode, level: number): FlatNode => ({
    expandable: !!node.children && node.children.length > 0,
    name: node.name,
    level,
  });
  treeControl = new FlatTreeControl<FlatNode>(
    node => node.level,
    node => node.expandable,
  );
  treeFlattener = new MatTreeFlattener(
    this._transformer,
    node => node.level,
    node => node.expandable,
    node => node.children,
  );
  dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);
  hasChild = (_: number, node: FlatNode) => node.expandable;
  constructor() {
    this.dataSource.data = [{name: 'Root', children: [{name: 'Child'}]}];
  }
}

@NgModule({
  imports: [
    BrowserModule,
    MatBadgeModule,
    MatBottomSheetModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatDividerModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatGridListModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatSidenavModule,
    MatSortModule,
    MatStepperModule,
    MatToolbarModule,
    MatTreeModule,
  ],
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
`;
}

function sleep(ms) { return new Promise((resolveSleep) => setTimeout(resolveSleep, ms)); }

async function renderLine({tarball, line, runId}) {
  const pkg = readPackedPackage(tarball);
  const versions = versionsFor(pkg);
  const consumer = mkdtempSync(join(tmpdir(), 'ngx-compat-companion-computed-'));
  const installTarball = join(consumer, 'library.tgz');
  writeFileSync(installTarball, readFileSync(tarball));
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({
    name: 'ngx-compat-companion-computed',
    private: true,
    dependencies: {
      '@angular/cdk': versions.cdk,
      '@angular/common': versions.common,
      '@angular/compiler': versions.compiler,
      '@angular/compiler-cli': versions.compiler,
      '@angular/core': versions.core,
      '@angular/forms': versions.forms,
      '@angular/material': versions.material,
      '@angular/platform-browser': versions.platformBrowser,
      '@angular/platform-browser-dynamic': versions.platformBrowser,
      '@ngx-compat/material-legacy': `file:${installTarball}`,
      rxjs: versions.rxjs,
      tslib: versions.tslib,
      typescript: versions.typescript,
      'zone.js': versions.zone,
    },
  }, null, 2));
  writeFileSync(join(consumer, '.npmrc'), 'install-links=true\nfund=false\naudit=false\n');
  const env = {...process.env, NODE_OPTIONS: ''};
  delete env.NODE_PATH;
  const install = spawnSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock'], {
    cwd: consumer, encoding: 'utf8', timeout: 300000, env,
  });
  if (install.status !== 0) fail(1, (install.stderr || install.stdout || 'npm install failed').slice(-2000));
  const installed = realpathSync(join(consumer, 'node_modules/@ngx-compat/material-legacy'));
  if (relative(realpathSync(consumer), installed).startsWith('..')) {
    fail(1, `Library resolved outside the consumer: ${installed}`);
  }
  const materialPkg = JSON.parse(readFileSync(join(consumer, 'node_modules/@angular/material/package.json'), 'utf8'));
  const sass = require('sass');
  const loadPaths = [
    installed,
    join(consumer, 'node_modules'),
    join(consumer, 'node_modules/.pnpm/node_modules'),
    root,
    join(root, 'node_modules'),
    join(root, 'node_modules/.pnpm/node_modules'),
  ];
  let bridgeCss;
  try {
    const compiled = sass.compileString(themeSource(), {
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
  const requiredCss = [
    '--mat-badge-background-color',
    '--mat-sort-arrow-color',
    '--mat-button-toggle-background-color',
    '--mat-grid-list-tile-header-primary-text-size',
    '--mat-bottom-sheet-container-background-color',
    '--mat-datepicker-calendar-container-background-color',
    '--mat-expansion-container-background-color',
    '--mat-sidenav-container-background-color',
    '--mat-stepper-container-color',
    '--mat-tree-container-background-color',
    '--mat-toolbar-standard-height',
    '--mat-toolbar-title-text-size',
    '--mat-tree-node-text-size',
  ];
  for (const token of requiredCss) {
    if (!bridgeCss.includes(token)) fail(1, `Compiled theme missing ${token}`);
  }
  const specs = slice.map((item) => {
    const tokens = new Set([...item.tokens, ...extractComponentVars(bridgeCss, item.component)]);
    return {component: item.component, host_id: item.host_id, tokens: [...tokens].sort()};
  });

  mkdirSync(join(consumer, 'src'), {recursive: true});
  writeFileSync(join(consumer, 'src/main.ts'), labSource());
  const compilerOptions = {
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
  };
  if (Number(versions.typescript.split('.')[0]) >= 6) compilerOptions.ignoreDeprecations = '6.0';
  writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify({
    compilerOptions,
    files: ['src/main.ts'],
    angularCompilerOptions: {compilationMode: 'full', strictTemplates: true},
  }, null, 2));
  const ngc = join(consumer, 'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js');
  const compiled = spawnSync(process.execPath, [ngc, '-p', 'tsconfig.json'], {
    cwd: consumer, encoding: 'utf8', timeout: 300000, env,
  });
  if (compiled.status !== 0) fail(1, `${compiled.stdout || ''}\n${compiled.stderr || ''}`.slice(-2500));

  const esbuild = require('esbuild');
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
    '<!doctype html><html><head><link rel="stylesheet" href="/theme.css"></head><body><lab-root></lab-root><script src="/app.js"></script></body></html>\n',
  );

  const server = createServer((req, res) => {
    const file = req.url === '/' ? 'index.html' : req.url.split('?')[0].replace(/^\//, '');
    try {
      const body = readFileSync(join(consumer, 'dist', file));
      const headers = {
        'content-type': file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html',
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
  const chromeBin = resolveChromeBin();
  const debugPort = Number(process.env.COMPANION_CDP_PORT || 9334);
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
  let ws;
  try {
    async function jsonGet(url) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${url} ${response.status}`);
      return response.json();
    }
    let version = null;
    for (let i = 0; i < 80 && !version; i += 1) {
      try {
        version = await jsonGet(`http://127.0.0.1:${debugPort}/json/version`);
      } catch {
        await sleep(250);
      }
    }
    if (!version) throw new Error(`Chromium did not open debugging port ${debugPort}\n${chromeLog.slice(-1000)}`);
    const targets = await jsonGet(`http://127.0.0.1:${debugPort}/json/list`);
    const page = targets.find((target) => target.type === 'page');
    if (!page) throw new Error('Chromium opened no page');
    ws = new WebSocket(page.webSocketDebuggerUrl);
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
    await send('Runtime.enable');
    await send('Page.enable');
    for (let i = 0; i < 80 && !(await evaluate('!!document.getElementById("theme-root") || !!document.getElementById("bootstrap-error")')); i += 1) {
      await sleep(100);
    }
    if (await evaluate('!!document.getElementById("bootstrap-error")')) {
      throw new Error(await evaluate('document.getElementById("bootstrap-error").textContent'));
    }
    const hostsPresent = await evaluate(`${JSON.stringify(specs.map((item) => item.host_id))}.every(id => !!document.getElementById(id))`);
    if (!hostsPresent) throw new Error('companion hosts missing from DOM');
    async function readState(className, dir) {
      return evaluate(`(() => {
        const root = document.getElementById('theme-root');
        root.className = ${JSON.stringify(`theme-root ${className}`)};
        root.setAttribute('dir', ${JSON.stringify(dir)});
        document.documentElement.setAttribute('dir', ${JSON.stringify(dir)});
        const specs = ${JSON.stringify(specs)};
        const rootStyle = getComputedStyle(root);
        const values = {};
        const hosts = {};
        for (const spec of specs) {
          const host = document.getElementById(spec.host_id);
          hosts[spec.host_id] = !!host;
          const hostStyle = host ? getComputedStyle(host) : null;
          const bag = {};
          for (const token of spec.tokens) {
            const prop = '--mat-' + spec.component + '-' + token;
            const fromHost = hostStyle ? hostStyle.getPropertyValue(prop).trim() : '';
            const fromTheme = rootStyle.getPropertyValue(prop).trim();
            const meaningful = (value) => Boolean(value) && value !== 'inherit' && value !== 'initial' && value !== 'unset';
            bag[token] = meaningful(fromHost) ? fromHost : (meaningful(fromTheme) ? fromTheme : '');
          }
          values[spec.component] = bag;
        }
        return {direction: rootStyle.direction, hosts, values};
      })()`);
    }
    const light = await readState('theme-light', 'ltr');
    const dark = await readState('theme-dark', 'ltr');
    const rtl = await readState('theme-light', 'rtl');
    const density = await readState('theme-dense', 'ltr');
    const typography = await readState('theme-type', 'ltr');
    const captured = specs.map((spec) => {
      const tokens = {};
      for (const token of spec.tokens) {
        tokens[token] = {
          light: light.values[spec.component]?.[token] || '',
          dark: dark.values[spec.component]?.[token] || '',
          density: density.values[spec.component]?.[token] || '',
          typography: typography.values[spec.component]?.[token] || '',
        };
      }
      return {
        component: spec.component,
        host_present: light.hosts[spec.host_id] === true,
        direction_ltr: light.direction,
        direction_rtl: rtl.direction,
        tokens,
      };
    });
    const assessed = assessCompanionEvidence(captured);
    const legacyRows = slice.map((item) => {
      const hostId = item.host_id;
      const tokenRows = item.tokens.map((token) => {
        const resolved = light.values[item.component]?.[token] || '';
        return {
          token,
          css_var: `--mat-${item.component}-${token}`,
          resolved_computed: resolved,
          non_empty: Boolean(resolved),
        };
      });
      return {
        component: item.component,
        host_id: hostId,
        token_rows: tokenRows,
        all_tokens_non_empty: tokenRows.every((row) => row.non_empty),
      };
    });
    const legacyErrors = legacyRows
      .filter((row) => !row.all_tokens_non_empty)
      .map((row) => `${row.component}: light token empty`);
    const errors = [...assessed.errors, ...legacyErrors];
    return {
      browser: version?.Browser || null,
      runId,
      line: {
        line,
        run_id: runId,
        tarball_sha256: sha256File(tarball),
        angular_version: versions.core,
        peer_material_version: materialPkg.version,
        typescript_version: versions.typescript,
        state_names: STATES,
        dimension_names: DIMENSIONS,
        applied_states: {
          light: 'define-light-theme density 0 default typography dir=ltr',
          dark: 'define-dark-theme density 0 default typography dir=ltr',
          rtl: 'define-light-theme density 0 default typography dir=rtl',
          density: 'define-light-theme density -2 default typography dir=ltr',
          typography: 'define-light-theme density 0 body-1 22px title 30px dir=ltr',
        },
        directions: {light: light.direction, dark: dark.direction, rtl: rtl.direction},
        components: assessed.rows,
        rows: legacyRows,
        hosts_present: hostsPresent,
        errors,
        result: errors.length ? 'fail' : 'pass',
      },
    };
  } finally {
    try { ws?.close(); } catch { /* already closed */ }
    chrome.kill();
    await new Promise((resolveExit) => chrome.once('exit', resolveExit));
    server.close();
  }
}

function proof(line) {
  const finds = {color: null, density: null, typography: null};
  for (const component of line.components) {
    for (const dimension of DIMENSIONS) {
      const bucket = component.dimensions[dimension];
      if (!bucket.present) continue;
      for (const token of bucket.tokens) {
        if (!finds.color && token.changed_dark && dimension === 'color') finds.color = token;
        if (!finds.density && token.changed_density && dimension === 'density') finds.density = token;
        if (!finds.typography && token.changed_typography && dimension === 'typography') finds.typography = token;
      }
    }
  }
  return {
    color: finds.color ? {css_var: finds.color.css_var, light: finds.color.light, dark: finds.color.dark} : null,
    density: finds.density ? {css_var: finds.density.css_var, light: finds.density.light, dense: finds.density.density} : null,
    typography: finds.typography ? {css_var: finds.typography.css_var, light: finds.typography.light, custom: finds.typography.typography} : null,
    rtl_direction: line.directions.rtl,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const jobs = [];
  if (args.runPath) {
    const resolved = resolveLibraryFromRun(args.runPath);
    jobs.push({line: 'main', tarball: resolved.tarball, runId: resolved.runId});
  } else if (args.tarball) {
    jobs.push({line: 'main', tarball: args.tarball, runId: null});
  } else {
    fail(2, '--tarball or --run is required');
  }
  if (!existsSync(jobs[0].tarball)) fail(2, `Missing tarball: ${jobs[0].tarball}`);
  if (args.tarball21) {
    if (!existsSync(args.tarball21)) fail(2, `Missing tarball: ${args.tarball21}`);
    jobs.push({line: '21.x', tarball: args.tarball21, runId: null});
  }
  const rendered = [];
  for (const job of jobs) rendered.push(await renderLine(job));
  const lines = rendered.map((item) => item.line);
  const mainLine = lines.find((item) => item.line === 'main') || lines[0];
  const ok = lines.every((item) => item.result === 'pass');
  const report = {
    schema_version: 1,
    role: 'companion bridge rendered computed-style slice (not G07)',
    check_id: 'companion-computed-styles',
    coverage: 'slice',
    run_id: mainLine.run_id,
    tarball_sha256: mainLine.tarball_sha256,
    browser: rendered.find((item) => item.browser)?.browser || null,
    peer_material_version: mainLine.peer_material_version,
    slice_components: COMPANIONS,
    state_names: STATES,
    dimension_names: DIMENSIONS,
    lines: lines.map((item) => ({...item, proof: proof(item)})),
    rows: mainLine.rows,
    hosts_present: lines.every((item) => item.hosts_present),
    result: ok ? 'pass' : 'fail',
    g06_g07_g08_claim: 'not-passed',
    error: ok ? null : lines.flatMap((item) => item.errors.map((error) => `${item.line}: ${error}`)),
    limitations: [
      'Thirteen companions were rendered on Chromium/zoneful for each packed line passed to this command.',
      'States captured in one page: light, dark, rtl, density -2, and typography body-1 22px / title 30px.',
      'Dimensions base, color, typography, and density are recorded from emitted tokens. An empty dimension is authentic absence.',
      'Bottom-sheet uses an in-tree host. Nested themes, lazy content, and body-level overlays are not executed.',
      'Does not claim RC-05-A02 / G06–G08. Coverage stays slice. Full-verify rosters stay null.',
    ],
  };
  mkdirSync(dirname(args.out), {recursive: true});
  writeFileSync(args.out, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({
    ok,
    lines: lines.map((item) => ({
      line: item.line,
      result: item.result,
      peer_material_version: item.peer_material_version,
      angular_version: item.angular_version,
      components: item.components.length,
      errors: item.errors,
    })),
    proof: lines.map((item) => ({line: item.line, ...proof(item)})),
    report: relative(root, args.out),
  }, null, 2));
  if (!ok) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
