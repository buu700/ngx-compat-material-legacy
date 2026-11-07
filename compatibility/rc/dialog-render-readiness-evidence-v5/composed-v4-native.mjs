#!/usr/bin/env node
/**
 * Exercise initial focus and same-origin iframe reinsertion using a packed legacy dialog.
 *
 *   node scripts/browser-dialog-focus-reinsert.mjs --tarball <path> [--zoneless]
 */
import {dialogTitleLifetimeFixture, legacyDialogTitleLifetimeNativeOkay} from '/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy/scripts/dialog-title-lifetime-fixture.mjs';
import {npmToolingOptions} from '/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy/scripts/npm-tooling-options.mjs';
import {browserPeerVersions,browserLibraryLine,readBrowserPackedPackage,browserConsumerDependencies,browserCompilerOptions} from '/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy/scripts/browser-peer-versions.mjs';
import {createHash} from 'node:crypto';
import {legacySelectFontNativeOkay, observeLegacySelectFontNative} from '/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy/scripts/legacy-select-font-native-contract.mjs';
import {announcedChromeEndpoint,debuggerMatchesChild} from '/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy/scripts/chromium-debug-endpoint.mjs';
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
import {existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, writeFileSync, readdirSync, symlinkSync, copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = '/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy';
let reportPath = '/home/parallels/.codex/closeout-state/2026-11-07-recovery/c04-qualification/dialog-readiness-decision/evidence/composed-v4-zoneful.json';
const esbuild = createRequire(join(root, 'package.json'))('esbuild');

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

let tarball = null;
let describeInstall = false;
let reducedMotion = false;
let zoneless = false;
let enabledMotion = false;
let csp = false;
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i] === '--describe-install') {describeInstall = true;continue;}
  if (process.argv[i] === '--enabled-motion') { enabledMotion = true; continue; }
  if (process.argv[i] === '--zoneless') {
    zoneless = true;
    reportPath = '/home/parallels/.codex/closeout-state/2026-11-07-recovery/c04-qualification/dialog-readiness-decision/evidence/composed-v4-zoneless.json';
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
if (enabledMotion && !zoneless) fail(2, '--enabled-motion requires --zoneless');
if (enabledMotion) reportPath = '/home/parallels/.codex/closeout-state/2026-11-07-recovery/c04-qualification/dialog-readiness-decision/evidence/fix-v10-motion.json';
const expectedLine = browserLibraryLine(JSON.parse(readFileSync(join(root, 'projects/ngx-material-legacy/package.json'), 'utf8')));
const versions = browserPeerVersions(readBrowserPackedPackage(tarball), {rxjsProfile: 'current', expectedLine});
if (describeInstall) {
  console.log(JSON.stringify({versions, dependencies: browserConsumerDependencies(versions, {zoneless, librarySpec: `file:${tarball}`}), compilerOptions: browserCompilerOptions(versions)}));
  process.exit(0);
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
const chromeBin = resolveChromeBin();

const consumer = mkdtempSync(join(tmpdir(), 'ngx-compat-dialog-browser-'));
const installTarball = join(consumer, 'library.tgz');
writeFileSync(installTarball, readFileSync(tarball));
writeFileSync(join(consumer, 'package.json'), JSON.stringify({
  name: 'ngx-compat-dialog-browser',
  private: true,
  dependencies: browserConsumerDependencies(versions, {zoneless, librarySpec: `file:${installTarball}`}),
}, null, 2));
writeFileSync(join(consumer, '.npmrc'), 'install-links=true\nfund=false\naudit=false\n');
const env = {...process.env, NODE_OPTIONS: ''};
delete env.NODE_PATH;
const install = spawnSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock'], npmToolingOptions({
  cwd: consumer, encoding: 'utf8', timeout: 180000, env,
}, ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock']));
if (install.status !== 0) fail(1, (install.stderr || install.stdout || 'npm install failed').slice(-2000));
const installed = realpathSync(join(consumer, 'node_modules/@ngx-compat/material-legacy'));
if (relative(realpathSync(consumer), installed).startsWith('..')) fail(1, `Library resolved outside the consumer: ${installed}`);

mkdirSync(join(consumer, 'src'), {recursive: true});
writeFileSync(join(consumer, 'src/main.ts'), `${zoneless ? '' : `import 'zone.js';
`}import {afterNextRender, ApplicationRef, CSP_NONCE, ChangeDetectionStrategy, Component, Injector, NgModule, NgZone, TemplateRef, ViewChild, inject, signal${zoneless ? ', provideZonelessChangeDetection' : ', provideZoneChangeDetection'}} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';
import {MatLegacyRadioModule} from '@ngx-compat/material-legacy/legacy-radio';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {MATERIAL_ANIMATIONS} from '@angular/material/core';
import {MAT_LEGACY_DIALOG_DATA, MatLegacyDialog, MatLegacyDialogModule} from '@ngx-compat/material-legacy/legacy-dialog';
import {MatLegacySelectModule} from '@ngx-compat/material-legacy/legacy-select';

${dialogTitleLifetimeFixture}

@Component({standalone:false, selector:'dialog-body', template:'<div id="dialog-body"><button id="disabled" disabled>disabled</button><button id="first">first</button><button id="second">second</button></div>'})
export class DialogBody {}
@Component({standalone:false, selector:'radio-body', template:'<mat-radio-group [(ngModel)]="selected"><mat-radio-button id="one" value="one">one</mat-radio-button><mat-radio-button id="two" value="two">two</mat-radio-button></mat-radio-group>'})
export class RadioBody { selected = 'two'; }
@Component({standalone:false, selector:'empty-body', template:'<div id="dialog-body">empty</div>'})
export class EmptyBody {}
@Component({standalone:false, selector:'lab-root', template:'<button *ngFor="let kind of kinds" [id]="kind" (click)="open($event, kind)">{{kind}}</button>'})
export class LabRoot {
  kinds = ['radio','direct','blur','shadow','closed','frame','reinsert','opened','recapture','quick','destroy','exit-race','exit-join','closed-early','delayed','recapture-post'];
  private dialog = inject(MatLegacyDialog); private zone = inject(NgZone); private app = inject(ApplicationRef); private injector = inject(Injector);
  open(event: MouseEvent, kind: string) {
    const log = (window as any).__events;
    let frame: HTMLIFrameElement | undefined; let shadow: ShadowRoot | undefined;
    if (kind === 'frame' || kind === 'reinsert') {
      frame=document.createElement('iframe'); frame.id='test-frame'; document.body.appendChild(frame);
      frame.contentDocument!.body.innerHTML='<button id=frame-opener>open</button><button id=frame-second>second</button>';
      (frame.contentDocument!.getElementById('frame-opener') as HTMLElement).focus();
    }
    if (kind === 'shadow' || kind === 'closed' || kind === 'closed-early') {
      const host=document.createElement('div'); host.id='shadow-host'; shadow=host.attachShadow({mode:kind.startsWith('closed') ? 'closed' : 'open'});
      shadow.innerHTML='<button id=shadow-opener>open</button><button id=shadow-second>second</button>';
      shadow.addEventListener('focusin', e=>log.push({type:'shadow-focus',id:(e.target as HTMLElement).id}));
      document.body.appendChild(host); (shadow.getElementById('shadow-opener') as HTMLElement).focus();
    }
    log.push({type:'click',kind,trusted:event.isTrusted,stable:this.zone.isStable});
    const ref = this.dialog.open(kind === 'radio' ? RadioBody : DialogBody, {autoFocus:'first-tabbable', disableClose:kind === 'recapture' || kind === 'recapture-post', delayFocusTrap:kind === 'delayed', enterAnimationDuration:'0ms', exitAnimationDuration:kind.startsWith('exit-') ? '500ms' : '0ms'});
    (window as any).__labRef=ref;
    if (kind.startsWith('exit-')) ref._containerInstance._animationStateChanged.subscribe(event => log.push({type:'container-event',state:event.state}));
    ref.afterOpened().subscribe({next:()=>{
      log.push({type:'afterOpened',kind,active:document.activeElement?.id, inner:frame?.contentDocument?.activeElement?.id});
      if(kind === 'closed') (shadow?.getElementById('shadow-second') as HTMLElement)?.focus();
      if(kind === 'opened') document.getElementById('second')?.focus();
      if(kind === 'recapture-post') {document.getElementById(kind)?.focus();const host=document.createElement('div');host.id='inside-shadow-host';document.getElementById('dialog-body')!.appendChild(host);const root=host.attachShadow({mode:'open'});root.innerHTML='<button id=inside-shadow-choice>choice</button>';const backdrop=document.querySelector<HTMLElement>('.cdk-overlay-backdrop');log.push({type:'post-recapture-backdrop',present:!!backdrop});backdrop?.click();(root.getElementById('inside-shadow-choice') as HTMLElement).focus();log.push({type:'shadow-choice',id:'inside-shadow-choice'});}
    }, complete:()=>log.push({type:'afterOpenedComplete',kind})});
    ref.afterClosed().subscribe(() => log.push({type:'closed',kind,at:performance.now(),active:document.activeElement?.id,anchors:document.querySelectorAll('.cdk-focus-trap-anchor').length}));
    if (kind === 'direct') document.getElementById('second')?.focus();
    if (kind === 'blur') {document.getElementById(kind)?.blur(); document.getElementById(kind)?.focus();}
    if (kind === 'shadow' || kind === 'closed-early') (shadow?.getElementById('shadow-second') as HTMLElement)?.focus();
    if (kind === 'frame' || kind === 'reinsert') {
      if (kind === 'reinsert') {const old=frame!.contentDocument;frame!.remove();document.body.appendChild(frame!);log.push({type:'frame-replaced',replaced:frame!.contentDocument!==old});frame!.contentDocument!.body.innerHTML='<button id=frame-second>second</button>';}
      (frame!.contentDocument!.getElementById('frame-second') as HTMLElement).focus();
      log.push({type:'frame-chosen',inner:frame!.contentDocument!.activeElement?.id});
    }
    if (kind === 'recapture') {document.getElementById(kind)?.focus();const backdrop=document.querySelector<HTMLElement>('.cdk-overlay-backdrop');log.push({type:'recapture-backdrop',present:!!backdrop});backdrop?.click();document.getElementById('second')?.focus();}
    log.push({type:'opened',kind,stable:this.zone.isStable,active:document.activeElement?.id,anchors:document.querySelectorAll('.cdk-focus-trap-anchor').length});
    if (kind.startsWith('exit-')) afterNextRender({mixedReadWrite:()=>{if (kind === 'exit-join') {log.push({type:'forced-open-completion'});(ref._containerInstance as any)._openAnimationDone(0);}log.push({type:'race-close',kind,at:performance.now()});ref.close();}}, {injector:this.injector});
    if (kind === 'quick') {log.push({type:'close-called',kind});ref.close();}
    if (kind === 'destroy') {log.push({type:'destroy-called',kind});this.app.destroy();}
  }
}

@NgModule({
  imports: [BrowserModule, FormsModule, MatLegacyDialogModule, MatLegacySelectModule, MatLegacyRadioModule],
  declarations: [LabRoot, DialogBody, EmptyBody, RadioBody],
  bootstrap: [LabRoot],
  providers: [...((window as unknown as {__cspNonce?: string}).__cspNonce ? [{provide: CSP_NONCE, useValue: (window as unknown as {__cspNonce: string}).__cspNonce}] : []), ${zoneless ? 'provideZonelessChangeDetection(), ' : ''}{provide: MATERIAL_ANIMATIONS, useValue: {animationsDisabled: ${enabledMotion ? 'false' : 'true'}}}],
})
export class LabModule {}

platformBrowserDynamic().bootstrapModule(LabModule${zoneless ? '' : ', {applicationProviders:[provideZoneChangeDetection()]}' }).catch(err => {
  const node = document.createElement('pre');
  node.id = 'bootstrap-error';
  node.textContent = String(err);
  document.body.appendChild(node);
});
`);
writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify({
  compilerOptions: browserCompilerOptions(versions),
  files: ['src/main.ts'],
  angularCompilerOptions: {compilationMode: 'full', strictTemplates: true},
}, null, 2));
const ngc = join(consumer, 'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js');
const compiled = spawnSync(process.execPath, [ngc, '-p', 'tsconfig.json'], {
  cwd: consumer, encoding: 'utf8', timeout: 180000, env,
});
if (compiled.status !== 0) fail(1, `${compiled.stdout || ''}\n${compiled.stderr || ''}`.slice(-2500));

const linkerRequire = createRequire(join(consumer, 'node_modules/@angular/compiler-cli/package.json'));
const babelVersion=JSON.parse(readFileSync(linkerRequire.resolve('@babel/core/package.json'),'utf8')).version;if(babelVersion!=='8.0.1') fail(1,'wrong Babel '+babelVersion);const {transformSync} = linkerRequire('@babel/core');
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
const cspNonce = 'rc07csp';
const cspHeader = `default-src 'none'; script-src 'nonce-${cspNonce}'; style-src 'nonce-${cspNonce}'`;
const violationListener = `<script nonce="${cspNonce}">window.__cspViolations=[];document.addEventListener('securitypolicyviolation',event=>{window.__cspViolations.push(event.violatedDirective+' '+(event.sample||event.blockedURI||''));});</script>`;
writeFileSync(join(consumer, 'dist/index.html'), csp
  ? `<!doctype html><html><body><lab-root></lab-root>${violationListener}<script nonce="${cspNonce}">window.__cspNonce=${JSON.stringify(cspNonce)};</script><script nonce="${cspNonce}" src="/app.js"></script></body></html>\n`
  : `<!doctype html><html><body><lab-root></lab-root><script src="/app.js"></script></body></html>\n`);
writeFileSync(join(consumer, 'dist/missing.html'), `<!doctype html><html><body><lab-root></lab-root>${violationListener}<script nonce="${cspNonce}" src="/app.js"></script></body></html>\n`);

const server = createServer((req, res) => {
  const file = req.url === '/' ? 'index.html' : req.url.split('?')[0].replace(/^\//, '');
  try {
    const body = readFileSync(join(consumer, 'dist', file));
    const headers = {'content-type': file.endsWith('.js') ? 'text/javascript' : 'text/html'};
    if (csp) headers['content-security-policy'] = cspHeader;
    res.writeHead(200, headers);
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const {port} = server.address();
const pageUrl = `http://127.0.0.1:${port}/${csp ? 'missing.html' : ''}`;
const chromeDir = mkdtempSync(join(tmpdir(), 'ngx-compat-chrome-'));
const requestedDebugPort = Number(process.env.CDP_PORT || '0');
let debugPort = 0;
const chrome = spawn(chromeBin, [

  '--headless=new',
  '--remote-debugging-port=' + String(requestedDebugPort),
  '--user-data-dir=' + chromeDir,
  '--no-sandbox',
  '--disable-gpu',
  pageUrl,
], {stdio: ['ignore', 'ignore', 'pipe']});
let chromeLog = '';
chrome.on('error', e => { chromeLog += String(e); }); chrome.stderr.on('data', chunk => { chromeLog += chunk; });

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function jsonGet(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.json();
}
let version = null;
for (let i = 0; i < 80; i += 1) {
  try {
    const endpoint=announcedChromeEndpoint(chromeLog,requestedDebugPort);
    if(!endpoint){await sleep(100);continue;}
    const observed=await jsonGet(`http://127.0.0.1:${endpoint.port}/json/version`);
    if(!debuggerMatchesChild(observed,endpoint))throw Error('debugger does not belong to the browser child');
    version=observed;debugPort=endpoint.port;break;
  } catch {
    await sleep(250);
  }
}
if (!version) {
  server.close();
  fail(1, `Chromium did not open a debugging port\n${chromeLog.slice(-1000)}`);
}
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
  const result = await send('Runtime.evaluate', {expression, returnByValue: true});
  return result.result?.value;
}

let report = {schema_version:1, role:'Bounded native packed legacy dialog focus lifecycle',line:expectedLine,zoneless,tarball_sha256:createHash('sha256').update(readFileSync(tarball)).digest('hex'),browser:version.Browser,consumer,cases:[],error:null};
async function click(id){ const pt=await evaluate(`(() => { const r=document.getElementById('${id}').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};})()`); await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...pt}); await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...pt}); }
async function waitFor(expr){for(let i=0;i<80;i++){if(await evaluate(expr))return;await sleep(25)}throw Error('Timed out: '+expr)}
async function escape(){await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});}
try {
 await send('Runtime.enable');await send('Page.enable');
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__events=[];window.__errors=[];window.addEventListener('error',e=>window.__errors.push(String(e.message)));document.addEventListener('focusin',e=>window.__events.push({type:'focus',id:e.target.id||e.target.tagName,radioHost:e.target.closest?.('mat-radio-button')?.id||null,insideDialog:!!e.target.closest?.('mat-dialog-container'),checked:e.target instanceof HTMLInputElement?e.target.checked:null,trusted:e.isTrusted}),true);`});
 await send('Page.reload',{ignoreCache:true});await waitFor('!!document.getElementById("radio")');report.zone_global=await evaluate('typeof Zone');report.bundle_has_zone=bundleHasZone;
 for(const kind of (enabledMotion ? ['exit-race','exit-join'] : zoneless ? ['radio','direct','blur','shadow','closed','frame','reinsert','opened','recapture','closed-early','delayed','recapture-post','quick','destroy'] : ['radio','closed','closed-early','delayed','recapture-post','quick','destroy'])) {
  await evaluate('window.__events=[]');await click(kind);
  if(kind!=='quick' && kind!=='destroy' && !kind.startsWith('exit-')){
   await waitFor('window.__events.some(e=>e.type==="afterOpenedComplete")');
   if(kind==='recapture-post') await sleep(100);
   const opened=await evaluate(`({active:document.activeElement?.id,inner:document.getElementById('test-frame')?.contentDocument?.activeElement?.id,radios:[...document.querySelectorAll('input[type=radio]')].map(x=>({id:x.id,checked:x.checked,active:x===document.activeElement})),anchors:document.querySelectorAll('.cdk-focus-trap-anchor').length,events:window.__events})`);
   await evaluate('window.__labRef.close()');await waitFor('!document.querySelector("mat-dialog-container")');
   const after=await evaluate(`({active:document.activeElement?.id,anchors:document.querySelectorAll('.cdk-focus-trap-anchor').length,events:window.__events,errors:window.__errors})`);
   report.cases.push({kind,opened,after});
  } else {
   await waitFor('!document.querySelector("mat-dialog-container") && window.__events.some(e=>e.type==="closed")');await sleep(100);
   const after=await evaluate(`({active:document.activeElement?.id,anchors:document.querySelectorAll('.cdk-focus-trap-anchor').length,events:window.__events,errors:window.__errors})`);report.cases.push({kind,after});
  }
  await evaluate('document.getElementById("test-frame")?.remove();document.getElementById("shadow-host")?.remove()');
 }

} catch(e){report.error=String(e)} finally {
 ws.close();
 try {
  const actual = await jsonGet(`http://127.0.0.1:${debugPort}/json/version`);
  if (actual.webSocketDebuggerUrl !== version.webSocketDebuggerUrl) throw Error('Browser identity changed before close');
  const browserWs = new WebSocket(actual.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{browserWs.addEventListener('open',resolve,{once:true});browserWs.addEventListener('error',reject,{once:true});});
  browserWs.send(JSON.stringify({id:1,method:'Browser.close'}));
  await Promise.race([new Promise(resolve=>chrome.once('exit',resolve)), sleep(5000).then(()=>{throw Error('Browser did not exit after Browser.close')})]);
  browserWs.close();
 } catch(e) {report.error = (report.error ? report.error+'; ' : '')+'browser cleanup: '+String(e);}
 server.close();
}
const get = kind => report.cases.find(x=>x.kind===kind);
const events = kind => get(kind)?.after.events || [];
const after = (kind, type, id, forbidden='first') => {const e=events(kind);const n=e.findIndex(x=>x.type===type && (id===undefined||x.id===id));return n>=0 && !e.slice(n+1).some(x=>x.type==='focus'&&x.id===forbidden)};
const exitOkay = kind => after(kind,'race-close') && !events(kind).some(e=>e.type==='focus'&&e.id==='first') && !events(kind).some(e=>e.type==='container-event'&&e.state==='opened') && events(kind).some(e=>e.type==='container-event'&&e.state==='closing') && events(kind).some(e=>e.type==='closed') && !events(kind).some(e=>e.type==='afterOpened') && events(kind).filter(e=>e.type==='afterOpenedComplete').length===1;
report.assertions=enabledMotion ? {
  trusted_clicks:['exit-race','exit-join'].every(kind=>events(kind).some(e=>e.type==='click'&&e.trusted&&e.stable)),
  closed_during_pending_focus:exitOkay('exit-race'),
  pending_opened_join_cancelled:exitOkay('exit-join') && events('exit-join').some(e=>e.type==='forced-open-completion'),
  nonzero_exit:['exit-race','exit-join'].every(kind=>events(kind).find(e=>e.type==='closed')?.at - events(kind).find(e=>e.type==='race-close')?.at >= 250),
  no_errors:['exit-race','exit-join'].every(kind=>get(kind)?.after.errors.length===0 && get(kind)?.after.anchors===0),
} : {
 trusted_clicks:report.cases.length===(zoneless?14:7)&&report.cases.every(x=>x.after.events.some(e=>e.type==='click'&&e.trusted)),
 early_closed_choice:after('closed-early','shadow-focus','shadow-second') && events('closed-early').some(e=>e.type==='afterOpened'),
 closed_choice_after_opened:after('closed','shadow-focus','shadow-second') && events('closed').findIndex(e=>e.type==='afterOpened') < events('closed').findIndex(e=>e.type==='shadow-focus'&&e.id==='shadow-second'),
 delayed_open_eventually:events('delayed').some(e=>e.type==='afterOpened'),
 post_open_recapture_preserves_choice:after('recapture-post','shadow-choice','inside-shadow-choice') && get('recapture-post')?.opened.active==='inside-shadow-host' && events('recapture-post').some(e=>e.type==='post-recapture-backdrop'&&e.present) && events('recapture-post').some(e=>e.type==='afterOpened'),
 selected_radio:get('radio')?.opened.radios.some(x=>x.checked&&x.active&&x.id==='two-input') && !events('radio').some(e=>e.type==='focus'&&(e.id==='one-input'||e.radioHost==='one')),
 lifecycle:report.cases.every(x=>x.after.anchors===0&&!x.after.errors.length&&events(x.kind).filter(e=>e.type==='afterOpenedComplete').length===1),
 quick_close:after('quick','close-called') && events('quick').some(e=>e.type==='closed'),
 destroy:after('destroy','destroy-called') && events('destroy').some(e=>e.type==='closed'),
 runtime:zoneless?(report.zone_global==='undefined'&&!bundleHasZone):(report.zone_global==='function'&&bundleHasZone),
 ...(zoneless ? {
  application_choice:after('direct','focus','second'), blur_return:after('blur','focus','blur'),
  open_shadow:after('shadow','shadow-focus','shadow-second'), closed_after_opened:after('closed','shadow-focus','shadow-second') && events('closed').findIndex(e=>e.type==='afterOpened') < events('closed').findIndex(e=>e.type==='shadow-focus'&&e.id==='shadow-second'),
  same_origin_frame:get('frame')?.opened.inner==='frame-second', replacement_document:get('reinsert')?.opened.inner==='frame-second'&&events('reinsert').some(e=>e.type==='frame-replaced'&&e.replaced)&&events('reinsert').some(e=>e.type==='afterOpened'&&e.inner==='frame-second'),
  after_opened_choice:after('opened','focus','second'), recapture_choice:after('recapture','focus','second') && events('recapture').some(e=>e.type==='recapture-backdrop'&&e.present) && events('recapture').some(e=>e.type==='afterOpened'),
 } : {})};
report.limitations=['Chromium packed-artifact focus lifecycle only; cross-origin frames and closed-shadow choices before afterOpened are not qualified.'];
const output=reportPath;mkdirSync(dirname(output), {recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,assertions:report.assertions,error:report.error}));if(report.error||Object.values(report.assertions).some(x=>!x))process.exitCode=1;

process.exit(process.exitCode || 0);
