/**
 * Packed CSP page on Chromium plus one server process per public import,
 * testing import, and render family. Hydration is not claimed. The WebKit
 * sandbox is not involved; this check does not launch WebKitGTK.
 */
import {createHash} from 'node:crypto';
import {spawn, spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {PUBLIC_ENTRIES, RENDER_FAMILIES, SURFACES} from './csp-ssr-roster.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const POLICY_NONCE = 'cspssrnonce';
export const CSP_SSR_MARKER = '__CSPSSR__';
const HASH_STYLE = 'body{background-color:rgb(4,5,6)}';
const BAD_STYLE = 'body{background-color:rgb(1,2,3)}';
const MISMATCH_STYLE = 'body{background-color:rgb(7,8,9)}';
const NONCE_POLICY = `default-src 'none'; script-src 'nonce-${POLICY_NONCE}'; style-src 'nonce-${POLICY_NONCE}'`;

function styleHash(text) {
  return createHash('sha256').update(text).digest('base64');
}

const HASH_POLICY = `default-src 'none'; script-src 'nonce-${POLICY_NONCE}'; style-src 'sha256-${styleHash(HASH_STYLE)}'`;

/** An overlay is open only when its marker survives outside style and script text. */
export function serverOverlayOpen(html, markers) {
  const markup = String(html ?? '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  return (markers || []).every(marker => markup.includes(marker));
}

function chromeBin() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  for (const candidate of ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable']) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error('missing required engine');
}

function packageJson() {
  return JSON.stringify({
    name: 'ngx-compat-csp-ssr',
    private: true,
    dependencies: {
      '@angular/cdk': '21.2.14',
      '@angular/common': '21.2.23',
      '@angular/compiler': '21.2.23',
      '@angular/compiler-cli': '21.2.23',
      '@angular/core': '21.2.23',
      '@angular/forms': '21.2.23',
      '@angular/material': '21.2.14',
      '@angular/platform-browser': '21.2.23',
      '@angular/platform-browser-dynamic': '21.2.23',
      '@angular/platform-server': '21.2.23',
      '@ngx-compat/material-legacy': `file:${join('library.tgz')}`,
      rxjs: '7.8.2',
      tslib: '2.8.1',
      typescript: '5.9.2',
      'zone.js': '0.15.1',
    },
  }, null, 2);
}

async function installConsumer(tarball) {
  const consumer = mkdtempSync(join(tmpdir(), 'ngx-csp-ssr-'));
  writeFileSync(join(consumer, 'library.tgz'), readFileSync(tarball));
  writeFileSync(join(consumer, 'package.json'), packageJson().replace('file:library.tgz', `file:${join(consumer, 'library.tgz')}`));
  writeFileSync(join(consumer, '.npmrc'), 'install-links=true\nfund=false\naudit=false\n');
  const env = {...process.env, NODE_OPTIONS: ''};
  delete env.NODE_PATH;
  const install = spawnSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock'], {
    cwd: consumer, encoding: 'utf8', timeout: 180000, env,
  });
  if (install.status !== 0) throw new Error((install.stderr || install.stdout || 'npm install failed').slice(-2000));
  return {consumer, env};
}

function compile(consumer, env, files, outDir) {
  writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022', module: 'ES2022', moduleResolution: 'bundler', experimentalDecorators: true,
      strict: true, skipLibCheck: true, lib: ['ES2022', 'DOM'], rootDir: 'src', outDir, types: [],
    },
    files,
    angularCompilerOptions: {compilationMode: 'full', strictTemplates: true},
  }, null, 2));
  const ngc = join(consumer, 'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js');
  const compiled = spawnSync(process.execPath, [ngc, '-p', 'tsconfig.json'], {cwd: consumer, encoding: 'utf8', timeout: 240000, env});
  if (compiled.status !== 0) throw new Error(`${compiled.stdout || ''}\n${compiled.stderr || ''}`.slice(-2500));
}

async function bundleBrowser(consumer) {
  const linkerRequire = createRequire(join(consumer, 'node_modules/@angular/compiler-cli/package.json'));
  const {transformSync} = linkerRequire('@babel/core');
  const linkerPlugin = linkerRequire('@angular/compiler-cli/linker/babel').default;
  const {needsLinking} = linkerRequire('@angular/compiler-cli/linker');
  const esbuild = createRequire(join(root, 'package.json'))('esbuild');
  await esbuild.build({
    absWorkingDir: consumer,
    entryPoints: ['out/csp-ssr-consumer.js'],
    bundle: true, format: 'iife', platform: 'browser', outfile: 'dist/app.js', logLevel: 'silent',
    plugins: [{
      name: 'ng-linker',
      setup(build) {
        build.onLoad({filter: /\.m?js$/}, args => {
          const source = readFileSync(args.path, 'utf8');
          if (!source.includes('ɵɵngDeclare') || !needsLinking(args.path, source)) return null;
          const linked = transformSync(source, {
            filename: args.path, compact: false, configFile: false, babelrc: false,
            plugins: [[linkerPlugin, {linkerJitMode: false}]],
          });
          return {contents: linked.code, loader: 'js'};
        });
      },
    }],
  });
}

function listener() {
  return `<script nonce="${POLICY_NONCE}">window.__cspViolations=[];document.addEventListener('securitypolicyviolation',event=>{window.__cspViolations.push(event.violatedDirective+' '+(event.sample||event.blockedURI||''));});window.__policyNonce=${JSON.stringify(POLICY_NONCE)};</script>`;
}

function writePages(consumer) {
  mkdirSync(join(consumer, 'dist'), {recursive: true});
  const app = `${listener()}<script nonce="${POLICY_NONCE}" src="/app.js"></script>`;
  const shell = body => `<!doctype html><html><head>${listener()}</head><body>${body}</body></html>\n`;
  writeFileSync(join(consumer, 'dist/correct.html'), `<!doctype html><html><body><csp-root></csp-root>${listener()}<script nonce="${POLICY_NONCE}">window.__cspNonce=${JSON.stringify(POLICY_NONCE)};</script>${app.replace(listener(), '')}</body></html>\n`);
  writeFileSync(join(consumer, 'dist/missing.html'), `<!doctype html><html><body><csp-root></csp-root>${app}</body></html>\n`);
  writeFileSync(join(consumer, 'dist/wrong.html'), `<!doctype html><html><body><csp-root></csp-root>${listener()}<script nonce="${POLICY_NONCE}">window.__cspNonce="wrong-nonce";</script><script nonce="${POLICY_NONCE}" src="/app.js"></script></body></html>\n`);
  writeFileSync(join(consumer, 'dist/inline.html'), shell(`<style>${BAD_STYLE}</style><script>window.__inlineScriptRan=1</script><script nonce="${POLICY_NONCE}">window.__appBooted=1</script>`));
  writeFileSync(join(consumer, 'dist/hash.html'), shell(`<style>${HASH_STYLE}</style><script nonce="${POLICY_NONCE}">window.__appBooted=1</script>`));
  writeFileSync(join(consumer, 'dist/hash-bad.html'), shell(`<style>${MISMATCH_STYLE}</style><script nonce="${POLICY_NONCE}">window.__appBooted=1</script>`));
}

function startServer(consumer) {
  const policies = new Map([
    ['/correct.html', NONCE_POLICY],
    ['/missing.html', NONCE_POLICY],
    ['/wrong.html', NONCE_POLICY],
    ['/inline.html', NONCE_POLICY],
    ['/hash.html', HASH_POLICY],
    ['/hash-bad.html', HASH_POLICY],
    ['/app.js', NONCE_POLICY],
  ]);
  const server = createServer((req, res) => {
    const path = (req.url || '/').split('?')[0];
    const file = path === '/' ? 'correct.html' : path.replace(/^\//, '');
    try {
      const body = readFileSync(join(consumer, 'dist', file));
      const headers = {'content-type': file.endsWith('.js') ? 'text/javascript' : 'text/html'};
      const policy = policies.get(path === '/' ? '/correct.html' : path);
      if (policy) headers['content-security-policy'] = policy;
      res.writeHead(200, headers);
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({server, origin: `http://127.0.0.1:${server.address().port}`})));
}

async function withChromium(origin, visit) {
  const bin = chromeBin();
  let port = Number(process.env.CSP_SSR_CDP_PORT || '0');
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('invalid CSP_SSR_CDP_PORT');
  const userData = mkdtempSync(join(tmpdir(), 'ngx-csp-chrome-'));
  const chrome = spawn(bin, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${userData}`,
    '--no-sandbox', '--disable-gpu', 'about:blank',
  ], {stdio: ['ignore', 'ignore', 'pipe']});
  let log = '';
  chrome.stderr.on('data', chunk => { log += chunk; });
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  let version = null;
  for (let i = 0; i < 80 && !version; i += 1) {
    try {
      if (!port) {
        const activePort = join(userData, 'DevToolsActivePort');
        const selected = Number(readFileSync(activePort, 'utf8').split('\n')[0]);
        if (!Number.isInteger(selected) || selected < 1 || selected > 65535) throw new Error('invalid owned debugging port');
        port = selected;
      }
      const observed = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
      // A fixed port may belong to another process. Connect only after this
      // child announces the same unique browser debugger endpoint on stderr.
      if (typeof observed.webSocketDebuggerUrl === 'string' &&
          log.includes('DevTools listening on '+observed.webSocketDebuggerUrl)) version = observed;
      else await sleep(250);
    } catch { await sleep(250); }
  }
  if (!version) {
    chrome.kill();
    throw new Error(`Chromium did not open a debugging port ${log.slice(-400)}`);
  }
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find(target => target.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve); ws.addEventListener('error', reject); });
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
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, {resolve, reject});
    ws.send(JSON.stringify({id, method, params}));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', {expression, returnByValue: true});
    return result.result?.value;
  };
  try {
    await send('Runtime.enable');
    await send('Page.enable');
    return await visit({send, evaluate, version, sleep, origin});
  } finally {
    ws.close();
    chrome.kill();
  }
}

async function readReady(evaluate, sleep) {
  for (let i = 0; i < 40; i += 1) {
    const state = await evaluate('document.documentElement.dataset.cspReady || ""');
    if (state === 'error') throw new Error(await evaluate('(document.getElementById("bootstrap-error") || {}).textContent || "bootstrap error"'));
    if (state === '1') return;
    await sleep(100);
  }
  throw new Error('csp page did not publish');
}

function nonceObservation(surface, raw, unsafeInline) {
  return {
    engine: 'chromium',
    unsafeInline,
    clientOnly: false,
    hydration: false,
    opened: !!(raw && raw.opened && raw.opened[surface]),
    styleSrcViolations: raw ? raw.styleSrcViolations : -1,
    scriptSrcViolations: raw ? raw.scriptSrcViolations : -1,
    stylesWithPolicyNonce: raw ? raw.stylesWithPolicyNonce : 0,
    spinnerNonce: raw ? raw.spinnerNonce : '',
    spinnerRules: raw ? raw.spinnerRules : -1,
    rejectedStyles: raw && typeof raw.rejectedStyles === 'number' ? raw.rejectedStyles : -1,
  };
}

async function runBrowser(consumer) {
  const {server, origin} = await startServer(consumer);
  const observations = {};
  try {
    await withChromium(origin, async driver => {
      const unsafe = value => value.includes('unsafe-inline');
      const pages = [
        ['correct', `${origin}/correct.html?mode=correct`, NONCE_POLICY],
        ['missing', `${origin}/missing.html?mode=missing`, NONCE_POLICY],
        ['wrong', `${origin}/wrong.html?mode=wrong`, NONCE_POLICY],
      ];
      for (const surface of SURFACES) {
        const rawByMode = {};
        for (const [mode, url] of pages) {
          const separator = url.includes('?') ? '&' : '?';
          await driver.send('Page.navigate', {url: `${url}${separator}surface=${encodeURIComponent(surface)}`});
          await readReady(driver.evaluate, driver.sleep);
          rawByMode[mode] = await driver.evaluate('window.__cspResult || null');
        }
        observations[`csp-ssr/21.x/chromium/nonce-and-negative/${surface}/correct-nonce`] = nonceObservation(surface, rawByMode.correct, unsafe(NONCE_POLICY));
        observations[`csp-ssr/21.x/chromium/nonce-and-negative/${surface}/missing-nonce`] = nonceObservation(surface, rawByMode.missing, unsafe(NONCE_POLICY));
        observations[`csp-ssr/21.x/chromium/nonce-and-negative/${surface}/wrong-nonce`] = nonceObservation(surface, rawByMode.wrong, unsafe(NONCE_POLICY));
      }
      await driver.send('Page.navigate', {url: `${origin}/inline.html`});
      for (let i = 0; i < 30 && !(await driver.evaluate('window.__appBooted === 1 || (window.__cspViolations || []).length > 0')); i += 1) await driver.sleep(50);
      const inline = await driver.evaluate(`JSON.stringify({
        appBooted: window.__appBooted === 1,
        inlineScriptRan: window.__inlineScriptRan === 1,
        inlineStyleApplied: getComputedStyle(document.body).backgroundColor === 'rgb(1, 2, 3)',
        styleSrcViolations: (window.__cspViolations || []).filter(item => item.startsWith('style-src')).length,
        scriptSrcViolations: (window.__cspViolations || []).filter(item => item.startsWith('script-src')).length
      })`);
      const inlineObs = JSON.parse(inline);
      const driverValue = await driver.evaluate('1+1===2');
      const policyBase = {engine: 'chromium', unsafeInline: unsafe(NONCE_POLICY), hydration: false};
      observations['csp-ssr/21.x/chromium/nonce-and-negative/policy/unapproved-inline-script'] = {...policyBase, ...inlineObs};
      observations['csp-ssr/21.x/chromium/nonce-and-negative/policy/unapproved-inline-style'] = {...policyBase, ...inlineObs};
      observations['csp-ssr/21.x/chromium/nonce-and-negative/policy/driver-not-application-script'] = {
        ...policyBase, driverEvaluated: driverValue === true, inlineScriptRan: inlineObs.inlineScriptRan, scriptSrcViolations: inlineObs.scriptSrcViolations,
      };
      await driver.send('Page.navigate', {url: `${origin}/hash.html`});
      for (let i = 0; i < 30 && !(await driver.evaluate('window.__appBooted === 1')); i += 1) await driver.sleep(50);
      const hashOk = JSON.parse(await driver.evaluate(`JSON.stringify({
        hashStyleApplied: getComputedStyle(document.body).backgroundColor === 'rgb(4, 5, 6)',
        styleSrcViolations: (window.__cspViolations || []).filter(item => item.startsWith('style-src')).length
      })`));
      observations['csp-ssr/21.x/chromium/nonce-and-negative/policy/style-hash-match'] = {
        engine: 'chromium', unsafeInline: unsafe(HASH_POLICY), hydration: false, ...hashOk,
      };
      await driver.send('Page.navigate', {url: `${origin}/hash-bad.html`});
      for (let i = 0; i < 30 && !(await driver.evaluate('window.__appBooted === 1 || (window.__cspViolations || []).length > 0')); i += 1) await driver.sleep(50);
      const hashBad = JSON.parse(await driver.evaluate(`JSON.stringify({
        hashStyleApplied: getComputedStyle(document.body).backgroundColor === 'rgb(7, 8, 9)',
        styleSrcViolations: (window.__cspViolations || []).filter(item => item.startsWith('style-src')).length
      })`));
      observations['csp-ssr/21.x/chromium/nonce-and-negative/policy/style-hash-mismatch'] = {
        engine: 'chromium', unsafeInline: unsafe(HASH_POLICY), hydration: false, ...hashBad,
      };
    });
  } finally {
    server.close();
  }
  return observations;
}

const RENDER = {
  'dialog-host': {
    imports: `import {MatLegacyDialog, MatLegacyDialogModule} from '@ngx-compat/material-legacy/legacy-dialog';`,
    modules: 'MatLegacyDialogModule',
    extra: 'constructor(private dialog: MatLegacyDialog) {}',
    template: '<button id="dialog-host" type="button">Open</button>',
    marker: 'dialog-host',
    overlayMarkers: ['mat-dialog-container'],
  },
  'menu-host': {
    imports: `import {MatLegacyMenuModule} from '@ngx-compat/material-legacy/legacy-menu';`,
    modules: 'MatLegacyMenuModule',
    extra: '',
    template: '<button id="menu-host" type="button" [matMenuTriggerFor]="menu">Menu</button><mat-menu #menu="matMenu"><button mat-menu-item type="button">Item</button></mat-menu>',
    marker: 'menu-host',
    overlayMarkers: ['mat-menu-panel'],
  },
  select: {
    imports: `import {MatLegacySelectModule} from '@ngx-compat/material-legacy/legacy-select';`,
    modules: 'MatLegacySelectModule',
    extra: '',
    template: '<mat-select id="choice"><mat-option value="a">A</mat-option></mat-select>',
    marker: 'mat-select',
  },
  'tooltip-host': {
    imports: `import {MatLegacyTooltipModule} from '@ngx-compat/material-legacy/legacy-tooltip';`,
    modules: 'MatLegacyTooltipModule',
    extra: '',
    template: '<button id="tip" type="button" matTooltip="Hello">Tip</button>',
    marker: 'id="tip"',
    overlayMarkers: ['mat-tooltip', 'cdk-overlay'],
  },
  'snack-host': {
    imports: `import {MatLegacySnackBar, MatLegacySnackBarModule} from '@ngx-compat/material-legacy/legacy-snack-bar';`,
    modules: 'MatLegacySnackBarModule',
    extra: 'constructor(private snack: MatLegacySnackBar) {}',
    template: '<button id="snack-host" type="button">Snack</button>',
    marker: 'snack-host',
    overlayMarkers: ['snack-bar-container'],
  },
  'form-field': {
    imports: `import {MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';\nimport {MatLegacyInputModule} from '@ngx-compat/material-legacy/legacy-input';`,
    modules: 'MatLegacyFormFieldModule, MatLegacyInputModule',
    extra: '',
    template: '<mat-form-field id="field"><input matInput></mat-form-field>',
    marker: 'mat-form-field',
  },
  tabs: {
    imports: `import {MatLegacyTabsModule} from '@ngx-compat/material-legacy/legacy-tabs';`,
    modules: 'MatLegacyTabsModule',
    extra: '',
    template: '<mat-tab-group id="tabs"><mat-tab label="One">One</mat-tab></mat-tab-group>',
    marker: 'mat-tab-group',
  },
  'progress-spinner': {
    imports: `import {MatLegacyProgressSpinnerModule} from '@ngx-compat/material-legacy/legacy-progress-spinner';`,
    modules: 'MatLegacyProgressSpinnerModule',
    extra: '',
    template: '<mat-progress-spinner id="spinner" mode="determinate" value="40"></mat-progress-spinner>',
    marker: 'mat-progress-spinner',
  },
  autocomplete: {
    imports: `import {MatLegacyAutocompleteModule} from '@ngx-compat/material-legacy/legacy-autocomplete';\nimport {MatLegacyInputModule} from '@ngx-compat/material-legacy/legacy-input';`,
    modules: 'MatLegacyAutocompleteModule, MatLegacyInputModule',
    extra: '',
    template: '<input id="auto" [matAutocomplete]="auto"><mat-autocomplete #auto="matAutocomplete"><mat-option value="a">A</mat-option></mat-autocomplete>',
    marker: 'mat-autocomplete',
  },
  checkbox: {
    imports: `import {MatLegacyCheckboxModule} from '@ngx-compat/material-legacy/legacy-checkbox';`,
    modules: 'MatLegacyCheckboxModule',
    extra: '',
    template: '<mat-checkbox id="check">Yes</mat-checkbox>',
    marker: 'mat-checkbox',
  },
  button: {
    imports: `import {MatLegacyButtonModule} from '@ngx-compat/material-legacy/legacy-button';`,
    modules: 'MatLegacyButtonModule',
    extra: '',
    template: '<button id="button" mat-button type="button">Go</button>',
    marker: 'id="button"',
  },
  radio: {
    imports: `import {MatLegacyRadioModule} from '@ngx-compat/material-legacy/legacy-radio';`,
    modules: 'MatLegacyRadioModule',
    extra: '',
    template: '<mat-radio-group id="radio"><mat-radio-button value="a">A</mat-radio-button></mat-radio-group>',
    marker: 'mat-radio-group',
  },
  list: {
    imports: `import {MatLegacyListModule} from '@ngx-compat/material-legacy/legacy-list';`,
    modules: 'MatLegacyListModule',
    extra: '',
    template: '<mat-list id="list"><mat-list-item>One</mat-list-item></mat-list>',
    marker: 'mat-list',
  },
  card: {
    imports: `import {MatLegacyCardModule} from '@ngx-compat/material-legacy/legacy-card';`,
    modules: 'MatLegacyCardModule',
    extra: '',
    template: '<mat-card id="card"><mat-card-content>Card</mat-card-content></mat-card>',
    marker: 'mat-card',
  },
  paginator: {
    imports: `import {MatLegacyPaginatorModule} from '@ngx-compat/material-legacy/legacy-paginator';`,
    modules: 'MatLegacyPaginatorModule',
    extra: '',
    template: '<mat-paginator id="pages" [length]="10" [pageSize]="5"></mat-paginator>',
    marker: 'mat-paginator',
  },
  'progress-bar': {
    imports: `import {MatLegacyProgressBarModule} from '@ngx-compat/material-legacy/legacy-progress-bar';`,
    modules: 'MatLegacyProgressBarModule',
    extra: '',
    template: '<mat-progress-bar id="bar" mode="determinate" value="40"></mat-progress-bar>',
    marker: 'mat-progress-bar',
  },
};

function epilogue(payloadExpr) {
  return `
const payload = ${payloadExpr};
await new Promise(resolve => setTimeout(resolve, 40));
const nodeProcess = (globalThis as unknown as {process: {stdout: {write(value: string): void}; _getActiveHandles(): Array<{constructor?: {name?: string}}>}}).process;
const timers = nodeProcess._getActiveHandles().map(handle => {
  const name = handle && handle.constructor && handle.constructor.name;
  return typeof name === 'string' ? name : '';
}).filter(name => name === 'Timeout' || name === 'Immediate').length;
const host = globalThis as unknown as {__cspDocumentBefore?: string; __cspWindowBefore?: string};
nodeProcess.stdout.write('\\n__CSPSSR__' + JSON.stringify({
  ...payload,
  documentBefore: host.__cspDocumentBefore,
  windowBefore: host.__cspWindowBefore,
  documentAfter: typeof globalThis.document,
  windowAfter: typeof globalThis.window,
  timers,
  exitCode: 0,
}));
`;
}

function writeServerSources(consumer) {
  mkdirSync(join(consumer, 'src'), {recursive: true});
  const files = [];
  for (const entry of PUBLIC_ENTRIES) {
    for (const kind of ['import', 'testing']) {
      const name = `${kind}-${entry}.ts`;
      const specifier = kind === 'import'
        ? `@ngx-compat/material-legacy/${entry}`
        : `@ngx-compat/material-legacy/${entry}/testing`;
      writeFileSync(join(consumer, 'src', name), `import '${specifier}';\n${epilogue(`{serverImport: true, renderedOnServer: false, clientOnly: false, hydration: false, threw: false}`)}\n`);
      files.push(`src/${name}`);
    }
  }
  for (const family of RENDER_FAMILIES) {
    const spec = RENDER[family];
    if (!spec) throw new Error(`missing render template ${family}`);
    const name = `render-${family}.ts`;
    writeFileSync(join(consumer, 'src', name), `${spec.imports}
import {Component, NgModule${spec.extra ? '' : ''}} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {renderModule} from '@angular/platform-server';

@Component({standalone: false, selector: 'lab-root', template: ${JSON.stringify(spec.template)}})
export class LabRoot { ${spec.extra} }

@NgModule({imports: [BrowserModule, ${spec.modules}], declarations: [LabRoot], bootstrap: [LabRoot]})
export class LabModule {}

function overlayOpen(html: string, markers: string[]): boolean {
  const markup = String(html ?? '')
    .replace(/<style\\b[^>]*>[\\s\\S]*?<\\/style>/gi, '')
    .replace(/<script\\b[^>]*>[\\s\\S]*?<\\/script>/gi, '');
  return markers.every(marker => markup.includes(marker));
}
const html = await renderModule(LabModule, {document: '<!doctype html><html><head></head><body><lab-root></lab-root></body></html>'});
${epilogue(`{renderedOnServer: true, clientOnly: false, hydration: false, threw: false, marker: html.includes(${JSON.stringify(spec.marker)}), overlayOpened: ${spec.overlayMarkers ? `overlayOpen(html, ${JSON.stringify(spec.overlayMarkers)})` : 'false'}}`)}\n`);
    files.push(`src/${name}`);
  }
  return files;
}

async function bundleServer(consumer, files) {
  const linkerRequire = createRequire(join(consumer, 'node_modules/@angular/compiler-cli/package.json'));
  const {transformSync} = linkerRequire('@babel/core');
  const linkerPlugin = linkerRequire('@angular/compiler-cli/linker/babel').default;
  const {needsLinking} = linkerRequire('@angular/compiler-cli/linker');
  const esbuild = createRequire(join(root, 'package.json'))('esbuild');
  const entryPoints = files.map(file => join('server-out', file.replace(/^src\//, '').replace(/\.ts$/, '.js')));
  await esbuild.build({
    absWorkingDir: consumer,
    entryPoints, bundle: true, format: 'esm', platform: 'node', outdir: 'server-dist', logLevel: 'silent', splitting: false,
    plugins: [{
      name: 'ng-linker',
      setup(build) {
        build.onLoad({filter: /\.m?js$/}, args => {
          const source = readFileSync(args.path, 'utf8');
          if (!source.includes('ɵɵngDeclare') || !needsLinking(args.path, source)) return null;
          const linked = transformSync(source, {
            filename: args.path, compact: false, configFile: false, babelrc: false,
            plugins: [[linkerPlugin, {linkerJitMode: false}]],
          });
          return {contents: linked.code, loader: 'js'};
        });
      },
    }],
  });
}

function firstJsonValue(source) {
  let index = 0;
  while (index < source.length && /\s/.test(source[index])) index += 1;
  if (index >= source.length || (source[index] !== '{' && source[index] !== '[')) return {ok: false, error: 'invalid-payload'};
  const open = source[index];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let end = index; end < source.length; end += 1) {
    const char = source[end];
    if (inString) {
      if (escape) escape = false;
      else if (char === '\\') escape = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === open) depth += 1;
    else if (char === close) {
      depth -= 1;
      if (depth === 0) {
        try {
          return {ok: true, value: JSON.parse(source.slice(index, end + 1))};
        } catch {
          return {ok: false, error: 'malformed-json'};
        }
      }
    }
  }
  return {ok: false, error: 'malformed-json'};
}

function payloadShape(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (typeof value.timers !== 'number' || !Number.isFinite(value.timers) || value.timers < 0) return false;
  for (const key of ['documentBefore', 'windowBefore', 'documentAfter', 'windowAfter']) {
    if (typeof value[key] !== 'string') return false;
  }
  return true;
}

export function parseCspSsrStdout(stdout) {
  const text = String(stdout ?? '');
  const starts = [];
  let from = 0;
  while (from <= text.length) {
    const at = text.indexOf(CSP_SSR_MARKER, from);
    if (at < 0) break;
    starts.push(at);
    from = at + CSP_SSR_MARKER.length;
  }
  if (starts.length === 0) return {ok: false, error: 'missing-frame', payload: null};
  if (starts.length > 1) return {ok: false, error: 'conflicting-frames', payload: null};
  const parsed = firstJsonValue(text.slice(starts[0] + CSP_SSR_MARKER.length));
  if (!parsed.ok) return {ok: false, error: parsed.error, payload: null};
  if (!payloadShape(parsed.value)) return {ok: false, error: 'invalid-payload', payload: null};
  return {ok: true, error: null, payload: parsed.value};
}

export function serverObservation(result) {
  const code = result?.code ?? 1;
  if (!result || result.ok !== true || !result.payload) {
    return {
      framingError: result?.error || 'missing-frame',
      threw: true,
      exitCode: code,
      renderedOnServer: false,
      clientOnly: false,
      hydration: false,
      documentBefore: 'undefined',
      windowBefore: 'undefined',
      documentAfter: 'undefined',
      windowAfter: 'undefined',
    };
  }
  return {...result.payload, exitCode: code, threw: code !== 0 || result.payload.threw === true};
}

function runProcess(preload, bundle, env) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, ['--import', pathToFileURL(preload).href, bundle], {cwd: dirname(bundle), env});
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('close', code => {
      const parsed = parseCspSsrStdout(stdout);
      resolve({code: code ?? 1, ...parsed, stderr: stderr.slice(-500)});
    });
  });
}

async function runServers(consumer, env) {
  const files = writeServerSources(consumer);
  compile(consumer, env, files, 'server-out');
  await bundleServer(consumer, files);
  const preload = join(consumer, 'preload.mjs');
  writeFileSync(preload, 'globalThis.__cspDocumentBefore = typeof globalThis.document;\nglobalThis.__cspWindowBefore = typeof globalThis.window;\n');
  const observations = {};
  const jobs = [];
  for (const entry of PUBLIC_ENTRIES) {
    jobs.push([`csp-ssr/21.x/server/dom-free-server-and-leaks/import/${entry}`, join(consumer, 'server-dist', `import-${entry}.js`)]);
    jobs.push([`csp-ssr/21.x/server/dom-free-server-and-leaks/testing/${entry}`, join(consumer, 'server-dist', `testing-${entry}.js`)]);
  }
  for (const family of RENDER_FAMILIES) {
    jobs.push([`csp-ssr/21.x/server/dom-free-server-and-leaks/render/${family}`, join(consumer, 'server-dist', `render-${family}.js`)]);
  }
  for (const [id, bundle] of jobs) {
    const result = await runProcess(preload, bundle, env);
    observations[id] = serverObservation(result);
    if (result.code !== 0) console.error(`csp-ssr ${id} exit ${result.code} ${result.stderr}`);
  }
  return observations;
}

export async function executeCspSsr(tarball) {
  const {consumer, env} = await installConsumer(tarball);
  mkdirSync(join(consumer, 'src'), {recursive: true});
  writeFileSync(join(consumer, 'src/csp-ssr-consumer.ts'), readFileSync(join(root, 'scripts/csp-ssr-consumer.ts')));
  compile(consumer, env, ['src/csp-ssr-consumer.ts'], 'out');
  await bundleBrowser(consumer);
  writePages(consumer);
  const browser = await runBrowser(consumer);
  const server = await runServers(consumer, env);
  return {...browser, ...server};
}

export function evidenceOf(observation) {
  if (!observation || typeof observation !== 'object') return '';
  const keys = ['opened', 'styleSrcViolations', 'scriptSrcViolations', 'spinnerNonce', 'spinnerRules', 'rejectedStyles', 'inlineScriptRan', 'inlineStyleApplied', 'hashStyleApplied', 'driverEvaluated', 'marker', 'timers', 'documentBefore', 'exitCode', 'framingError'];
  return keys.filter(key => observation[key] !== undefined).map(key => `${key}=${observation[key]}`).join(' ');
}
