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
import {npmToolingOptions} from './npm-tooling-options.mjs';
import {browserPeerVersions,browserLibraryLine,readBrowserPackedPackage,browserConsumerDependencies,browserCompilerOptions} from './browser-peer-versions.mjs';
import {createHash} from 'node:crypto';
import {withChromium} from './check-companion-computed-styles.mjs';
import {observeLegacyCoreHighContrast,legacyCoreHighContrastOkay} from './legacy-core-high-contrast-contract.mjs';
import {observeRippleColorBinding,rippleColorBindingOkay} from './ripple-color-binding-observation.mjs';
import {PEER_ICON_TT_CSP, peerIconTtOkay} from './peer-icon-tt-admission.mjs';
import {progressCspStyleOkay} from './progress-csp-style-contract.mjs';
import {formFieldStateTokensOkay} from './form-field-state-style-observation.mjs';
import {contentObserverNativeFixture, installContentObserverNativeTrace, contentObserverNativeOkay} from './content-observer-native-contract.mjs';
import {readMediaMatcherPeer} from './media-matcher-peer-identity.mjs';
import {spawnSync as __spawnSyncForWs} from 'node:child_process';
if (typeof globalThis.WebSocket !== 'function') {
  // Local Node 20 shells need the experimental flag; CI/Chainman Node 22+ has WebSocket.
  const relaunch = __spawnSyncForWs(process.execPath, ['--experimental-websocket', ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(relaunch.status ?? 1);
}

import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let reportPath = join(root, 'compatibility/rc/reports/browser-surface-families.json');
const esbuild = createRequire(join(root, 'package.json'))('esbuild');

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

let tarball = null;
let describeInstall = false;
let zoneless = false;
let explicitReport = false;
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i] === '--describe-install') {describeInstall = true;continue;}
  if (process.argv[i] === '--zoneless') {
    zoneless = true;
    if (!explicitReport) reportPath = join(root, 'compatibility/rc/reports/browser-surface-families-zoneless.json');
    continue;
  }
  if (process.argv[i] === '--out') {
    const value = process.argv[i + 1];
    if (!value || value.startsWith('-')) fail(2, '--out requires a path');
    reportPath = resolve(value);
    explicitReport = true;
    i += 1;
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

const consumer = mkdtempSync(join(tmpdir(), 'ngx-compat-surface-families-'));
const installTarball = join(consumer, 'library.tgz');
writeFileSync(installTarball, readFileSync(tarball));
writeFileSync(join(consumer, 'package.json'), JSON.stringify({
  name: 'ngx-compat-surface-families-browser',
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

// Record the actual installed public peer export identities alongside native observations.
const observerPeerRoot = join(consumer, 'node_modules/@angular/cdk');
const observerPeerPackage = JSON.parse(readFileSync(join(observerPeerRoot, 'package.json'), 'utf8'));
const observerPeerExports = observerPeerPackage.exports['./observers'];
const observerPublicMember = member => {
  if (typeof member !== 'string' || !member.startsWith('./') || member.split('/').includes('..')) throw Error('invalid public observer export path');
  return readFileSync(join(observerPeerRoot, member));
};
const contentObserverPeer = {
  package: observerPeerPackage.name, version: observerPeerPackage.version,
  runtime_member: observerPeerExports.default.replace(/^\.\//, ''),
  runtime_sha256: createHash('sha256').update(observerPublicMember(observerPeerExports.default)).digest('hex'),
  types_member: observerPeerExports.types.replace(/^\.\//, ''),
  types_sha256: createHash('sha256').update(observerPublicMember(observerPeerExports.types)).digest('hex'),
};

const mediaMatcherPeer = readMediaMatcherPeer(consumer);

// Compile the exported ordinary and legacy progress-bar themes from the packed
// consumer. The historical IE-only data URI stays intact; the guard requires modern dots and CSP enforcement.
const progressSass = createRequire(join(root, 'package.json'))('sass');
const progressCss = progressSass.compileString(`
@use 'sass:map';
@use '@ngx-compat/material-legacy' as legacy;
$primary: legacy.define-palette(legacy.$indigo-palette);
$accent: legacy.define-palette(legacy.$pink-palette, A200, A100, A400);
$theme: legacy.define-light-theme((color: (primary: $primary, accent: $accent)));
@include legacy.core();
@include legacy.ripple-theme($theme);
#ripple-color-root, .ripple-color-scope {width:48px;height:48px;}
#ripple-color-modern {--mat-ripple-color:rgba(210,80,60,.3);}
$ripple-custom: map.set(legacy.get-color-config($theme), foreground, base, #4f7082);
$ripple-variable: map.set(legacy.get-color-config($theme), foreground, base, var(--custom-foreground));
#ripple-color-custom { @include legacy.ripple-color($ripple-custom); }
#ripple-color-variable { --custom-foreground:rgb(70,30,90); @include legacy.ripple-color($ripple-variable); }
.mat-menu-submenu-icon { @include legacy.private-menu-common-item-submenu-icon(legacy.$private-menu-common-side-padding); }
#core-contrast-ripple { width:48px; height:48px; }
#core-contrast-menu { color:rgb(1,2,3); forced-color-adjust:none; }
#core-contrast-canvas { color:CanvasText; }
@include legacy.progress-bar-theme($theme);
@include legacy.legacy-progress-bar-theme($theme);
@include legacy.form-field-theme($theme);
$dark-theme: legacy.define-dark-theme((color: (primary: $primary, accent: $accent)));
#ripple-color-dark { @include legacy.ripple-color($dark-theme); }
// A zero-specificity theme scope lets the peer's equally specific structural
// wrapper rule consume the token; the historical host rule still covers hints.
:where(#peer-form-hover-dark-theme) { @include legacy.form-field-color($dark-theme); }
`, {loadPaths:[join(consumer,'node_modules')],url:pathToFileURL(join(consumer,'progress-csp.scss')),
  silenceDeprecations:['if-function','global-builtin','color-functions','import']}).css;

mkdirSync(join(consumer, 'src'), {recursive: true});
writeFileSync(join(consumer, 'src/main.ts'), `${zoneless ? '' : `import 'zone.js';
`}import {Component, NgModule, NgZone, ViewChild, inject${zoneless ? ', provideZonelessChangeDetection' : ', provideZoneChangeDetection'}} from '@angular/core';
import {BrowserModule, DomSanitizer} from '@angular/platform-browser';
import {MatIconModule, MatIconRegistry} from '@angular/material/icon';
import {MediaMatcher} from '@angular/cdk/layout';
import {Platform} from '@angular/cdk/platform';
import {MatLegacyRipple,MatLegacyRippleModule,LegacyRippleRenderer,LegacyRippleRef,LegacyRippleState} from '@ngx-compat/material-legacy/legacy-core';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {MATERIAL_ANIMATIONS,MatRipple,MatRippleModule} from '@angular/material/core';
import {MatLegacyButtonModule} from '@ngx-compat/material-legacy/legacy-button';
import {MatLegacyCardModule} from '@ngx-compat/material-legacy/legacy-card';
import {MatLegacyProgressBarModule} from '@ngx-compat/material-legacy/legacy-progress-bar';
import {MatLegacyProgressSpinnerModule} from '@ngx-compat/material-legacy/legacy-progress-spinner';

@Component({
  standalone: false,
  selector: 'peer-progress-csp',
  template: \`
    <mat-form-field id="peer-form-hover" appearance="fill"><mat-label>Peer field</mat-label><input matInput><mat-hint>Peer hint area</mat-hint></mat-form-field>
    <div id="peer-form-hover-dark-theme"><mat-form-field id="peer-form-hover-dark" appearance="fill"><mat-label>Dark peer field</mat-label><input matInput><mat-hint>Dark peer hint area</mat-hint></mat-form-field></div>
    <mat-progress-bar id="peer-progress-determinate" mode="determinate" [value]="40"></mat-progress-bar>
    <mat-progress-bar id="peer-progress-buffer" mode="buffer" [value]="40" [bufferValue]="65"></mat-progress-bar>
    <mat-progress-bar id="peer-progress-query" mode="query"></mat-progress-bar>
    <mat-progress-bar id="peer-progress-indeterminate" mode="indeterminate"></mat-progress-bar>
  \`,
})
export class PeerProgressCsp {}
@NgModule({imports:[MatProgressBarModule,MatFormFieldModule,MatInputModule],declarations:[PeerProgressCsp],exports:[PeerProgressCsp]})
export class PeerProgressCspModule {}

@Component({
  standalone: false,
  selector: 'lab-root',
  template: \`
    <closeout-content-observer></closeout-content-observer>
    <button mat-button id="peer-icon-button"><mat-icon svgIcon="closeout-native-tt"></mat-icon>Icon</button>
    <button id="button-default" mat-button type="button">Default</button>
    <button id="button-disabled" mat-button type="button" disabled>Disabled</button>
    <button id="button-focus" mat-raised-button type="button">Focus me</button>

    <div id="core-contrast-ripple" class="mat-ripple"></div>
    <div id="ripple-color-root" matRipple #rippleRoot="matRipple"></div>
    <div id="ripple-color-dark" class="ripple-color-scope"><div matRipple #rippleDark="matRipple"></div></div>
    <div id="ripple-color-custom" class="ripple-color-scope"><div matRipple #rippleCustom="matRipple"></div></div>
    <div id="ripple-color-variable" class="ripple-color-scope"><div matRipple #rippleVariable="matRipple"></div></div>
    <div id="ripple-color-modern" class="ripple-color-scope"><div matRipple #rippleModern="matRipple"></div></div>
    <button id="core-contrast-focus" class="mat-focus-indicator" type="button">Core focus</button>
    <svg id="core-contrast-menu" class="mat-menu-submenu-icon" viewBox="0 0 5 10"><path d="M0 0l5 5-5 5z"/></svg>
    <span id="core-contrast-canvas">Canvas text</span>
    <mat-card id="card-default">
      <mat-card-title>Title</mat-card-title>
      <mat-card-content>Content</mat-card-content>
    </mat-card>

    <mat-progress-bar id="progress-bar-default" mode="determinate" [value]="40"></mat-progress-bar>
    <mat-progress-bar id="legacy-progress-buffer" mode="buffer" [value]="40" [bufferValue]="65"></mat-progress-bar>
    <peer-progress-csp></peer-progress-csp>
    <mat-progress-spinner id="progress-spinner-default" mode="determinate" [value]="55" diameter="48"></mat-progress-spinner>
  \`,
})
export class LabRoot {
  @ViewChild('rippleRoot') rippleRoot!:MatLegacyRipple;
  @ViewChild('rippleDark') rippleDark!:MatLegacyRipple;
  @ViewChild('rippleCustom') rippleCustom!:MatLegacyRipple;
  @ViewChild('rippleVariable') rippleVariable!:MatLegacyRipple;
  @ViewChild('rippleModern') rippleModern!:MatRipple;
  constructor() {
    const ngZone=inject(NgZone),platform=inject(Platform);
    (window as any).__closeoutAngularZoneEntered=ngZone.run(() => NgZone.isInAngularZone());
    const refs: LegacyRippleRef[]=[];
    let fallback: LegacyRippleRef | null=null;
    const launch=() => {
      const host=document.getElementById('core-contrast-ripple');
      if(!host)throw Error('core contrast ripple host missing');
      const renderer=new LegacyRippleRenderer({rippleDisabled:false,rippleConfig:{}},ngZone,host,platform);
      const ref=renderer.fadeInRipple(0,0,{centered:true,radius:12,persistent:true,animation:{enterDuration:60,exitDuration:60}});
      refs.push(ref);return ref;
    };
    const snapshot=(ref:LegacyRippleRef) => ({state:LegacyRippleState[ref.state],connected:ref.element.isConnected});
    (window as any).__closeoutCoreContrast={
      exercise:() => {
        const ref=launch(),steps=[snapshot(ref)];
        const focus=document.getElementById('core-contrast-focus');
        const menu=document.getElementById('core-contrast-menu');
        const canvas=document.getElementById('core-contrast-canvas');
        const styles={found:!!focus&&!!menu&&!!canvas,ripple_display:getComputedStyle(ref.element).display,
          focus_display:focus?getComputedStyle(focus,'::before').display:null,
          submenu_fill:menu?getComputedStyle(menu).fill:null,canvas_color:canvas?getComputedStyle(canvas).color:null};
        // Exercise the real renderer's public event completion and fade-out
        // paths in every style mode; this does not claim elapsed animation timing.
        ref.element.dispatchEvent(new Event('transitionend'));steps.push(snapshot(ref));
        ref.fadeOut();steps.push(snapshot(ref));
        ref.element.dispatchEvent(new Event('transitionend'));steps.push(snapshot(ref));
        return {...styles,lifecycle:steps.map(s=>s.state),connected:steps.map(s=>s.connected)};
      },
      startFallback:() => {fallback=launch();return {initial_state:LegacyRippleState[fallback.state],initial_connected:fallback.element.isConnected};},
      readFallback:() => ({final_state:fallback?LegacyRippleState[fallback.state]:null,final_connected:fallback?.element.isConnected??null}),
      cleanup:() => {for(const ref of refs){ref.fadeOut();ref.element.dispatchEvent(new Event('transitioncancel'));}}
    };
    (window as any).__closeoutRippleColor={
      sharedPublicIdentity:MatLegacyRipple===MatRipple&&MatLegacyRippleModule===MatRippleModule,
      exercise:(explicit:boolean) => [
        ['root',this.rippleRoot],['dark',this.rippleDark],['custom',this.rippleCustom],
        ['variable',this.rippleVariable],['modern',this.rippleModern]
      ].map(([id,value]) => {
        const ripple=value as MatRipple;
        const ref=ripple.launch({persistent:true,centered:true,radius:12,
          animation:{enterDuration:0,exitDuration:0},...(explicit?{color:'rgb(5,6,7)'}:{})});
        const style=getComputedStyle(ref.element);
        const row={id,shared_public_instance:ripple instanceof MatRipple,connected:ref.element.isConnected,
          background:style.backgroundColor,opacity:style.opacity,position:style.position,radius:style.borderRadius};
        ref.fadeOut();return {...row,removed:!ref.element.isConnected};
      }),
      remainingElements:() => document.querySelectorAll('[id^="ripple-color-"] .mat-ripple-element').length
    };
    (window as any).__closeoutMediaMatcher=inject(MediaMatcher);
    inject(MatIconRegistry).addSvgIconLiteral('closeout-native-tt',inject(DomSanitizer).bypassSecurityTrustHtml(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><path d="M0 0h8v8H0z"/></svg>'));
  }
}

${contentObserverNativeFixture()}
@NgModule({
  imports: [
    BrowserModule,
    ObserverLegacyTabsModule,
    MatIconModule,
    MatLegacyRippleModule,
    PeerProgressCspModule,
    MatLegacyButtonModule,
    MatLegacyCardModule,
    MatLegacyProgressBarModule,
    MatLegacyProgressSpinnerModule,
  ],
  declarations: [LabRoot, ContentObserverNativeProbe],
  bootstrap: [LabRoot],
  providers: [${zoneless ? 'provideZonelessChangeDetection(), ' : ''}{provide: MATERIAL_ANIMATIONS, useValue: {animationsDisabled: true}}],
})
export class LabModule {}

platformBrowserDynamic().bootstrapModule(LabModule${zoneless ? '' : ', {applicationProviders:[provideZoneChangeDetection()]}'}).catch(err => {
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
  `<!doctype html><html><head><link rel="stylesheet" href="/progress.css"></head><body><lab-root></lab-root><script src="/app.js"></script></body></html>\n`);

writeFileSync(join(consumer,'dist/progress.css'),progressCss);

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
const families = {
  button: {present: false, disabled_class: false, focused: false},
  card: {present: false},
  'progress-bar': {present: false, value_reflected: false},
  'progress-spinner': {present: false, value_reflected: false},
};
let error = null;
let diagnostic = null;
let zoneGlobal = null;
let angularZoneEntered = null;
let peerIconTt = null;
let peerMediaMatcher = null;
let progressCsp = null;
let peerFormHover = null;
let coreHighContrast = null;
let rippleColorBinding = null;
let contentObserver = null;

let version = null;
await withChromium(join(consumer, 'dist'), async ({send, browser}) => {
  version = {Browser: browser};
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: false});
    return result.result?.value;
  };
  const waitFor = async (predicateExpr, attempts = 50, delayMs = 100) => {
    for (let i = 0; i < attempts; i += 1) {
      if (await evaluate(predicateExpr)) return true;
      await sleep(delayMs);
    }
    return false;
  };

try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(${installContentObserverNativeTrace.toString()})();` + 'window.__errors=[];window.__ttViolations=[];window.__cspDetails=[];window.addEventListener("error",e=>window.__errors.push(String(e.message)));window.addEventListener("securitypolicyviolation",e=>{window.__ttViolations.push(e.violatedDirective);window.__cspDetails.push({directive:e.violatedDirective,blocked:e.blockedURI});});',
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

  progressCsp = await evaluate(`(() => {
    const modes={};
    for(const mode of ['determinate','buffer','query','indeterminate']){
      const host=document.getElementById('peer-progress-'+mode);
      const dots=host?.querySelector('.mdc-linear-progress__buffer-dots');
      const style=dots?getComputedStyle(dots):null;
      modes[mode]={present:!!host,dots_present:!!dots,background_image:style?.backgroundImage??null,
        mask_image:style?.maskImage??null,background_color:style?.backgroundColor??null};
    }
    return {modes,ie11_media_matches:matchMedia('all and (-ms-high-contrast: none), (-ms-high-contrast: active)').matches,
      legacy_buffer_inline_svg:!!document.querySelector('#legacy-progress-buffer svg pattern circle'),
      positive_violations:(window.__cspDetails||[]).filter(row=>row.directive==='img-src')};
  })()`);
  // One intentionally blocked data image confirms this actual browser enforces
  // img-src 'none'; keep its violation separate from the positive observations.
  await evaluate(`(() => {const image=new Image();image.src='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E';})()`);
  await sleep(100);
  progressCsp.negative_data_image_blocked = await evaluate(`(window.__cspDetails||[]).some(row=>row.directive==='img-src'&&row.blocked==='data')`);
  progressCsp.compiled_css_sha256 = createHash('sha256').update(progressCss).digest('hex');
  progressCsp.historical_data_uri_retained = progressCss.includes('data:image/svg+xml');

  // Actual pointer hover on the current companion, with the packed historical
  // form-field theme loaded. A changed selector is not inferred from ancestry.
  await send('Emulation.setEmulatedMedia',{features:[{name:'hover',value:'hover'}]});
  const hoverOpacity = (id = 'peer-form-hover') => evaluate(`(() => {
    const host=document.getElementById(${JSON.stringify(id)});
    const overlay=host?.querySelector('.mat-mdc-form-field-focus-overlay');
    const style=overlay?getComputedStyle(overlay):null;
    const token=name=>style?.getPropertyValue('--mat-form-field-'+name).trim()??null;
    return {present:!!host,overlay_present:!!overlay,host_hovered:!!host?.matches(':hover'),
      wrapper_hovered:!!host?.querySelector('.mat-mdc-text-field-wrapper')?.matches(':hover'),
      focused:!!host?.classList.contains('mat-focused'),opacity:style?.opacity??null,
      background_color:style?.backgroundColor??null,state_layer_color:token('state-layer-color'),
      hover_token:token('hover-state-layer-opacity'),focus_token:token('focus-state-layer-opacity')};
  })()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});
  await sleep(200);
  peerFormHover={baseline:await hoverOpacity(),hover_media:await evaluate('matchMedia("(hover: hover)").matches')};
  for(const [name,selector] of [['wrapper','.mat-mdc-text-field-wrapper'],['hint','.mat-mdc-form-field-subscript-wrapper']]){
    const point=await evaluate(`(() => {const rect=document.querySelector('#peer-form-hover '+${JSON.stringify(selector)})?.getBoundingClientRect();return rect&&{x:rect.x+rect.width/2,y:rect.y+rect.height/2,width:rect.width,height:rect.height};})()`);
    if(point&&point.width>0&&point.height>0){
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x,y:point.y});
      await sleep(200);
      peerFormHover[name]={point,...await hoverOpacity()};
    }else peerFormHover[name]={point,error:'No measurable hover target'};
  }
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});
  peerFormHover.compiled_theme_css_sha256=createHash('sha256').update(progressCss).digest('hex');

  // The finite source repair must be consumed by the actual public peer. Keep
  // the authentic historical host-hover behavior over the hint area, test both
  // ink tones, and prove that changing a token changes the computed opacity.
  peerFormHover.state_token_scenarios=[];
  for(const id of ['peer-form-hover','peer-form-hover-dark']){
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});
    await sleep(200);
    const row={id,baseline:await hoverOpacity(id)};
    let wrapperPoint;
    for(const [name,selector] of [['wrapper','.mat-mdc-text-field-wrapper'],['hint','.mat-mdc-form-field-subscript-wrapper']]){
      const point=await evaluate(`(() => {const rect=document.querySelector('#'+${JSON.stringify(id)}+' '+${JSON.stringify(selector)})?.getBoundingClientRect();return rect&&{x:rect.x+rect.width/2,y:rect.y+rect.height/2,width:rect.width,height:rect.height};})()`);
      if(point&&point.width>0&&point.height>0){
        await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x,y:point.y});
        await sleep(200);
        row[name]={point,...await hoverOpacity(id)};
        if(name==='wrapper')wrapperPoint=point;
      }else row[name]={point,error:'No measurable state target'};
    }
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});
    await evaluate(`document.querySelector('#'+${JSON.stringify(id)}+' input').focus()`);
    await sleep(200);
    row.focus=await hoverOpacity(id);
    await evaluate(`document.querySelector('#'+${JSON.stringify(id)}+' input').blur()`);
    if(wrapperPoint){
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:wrapperPoint.x,y:wrapperPoint.y});
      await evaluate(`document.getElementById(${JSON.stringify(id)}).style.setProperty('--mat-form-field-hover-state-layer-opacity','0.73')`);
      await sleep(200);
      row.negative=await hoverOpacity(id);
      await evaluate(`document.getElementById(${JSON.stringify(id)}).style.removeProperty('--mat-form-field-hover-state-layer-opacity')`);
      await sleep(200);
      row.restored=await hoverOpacity(id);
    }
    peerFormHover.state_token_scenarios.push(row);
  }
  peerFormHover.state_tokens_okay=formFieldStateTokensOkay(peerFormHover.state_token_scenarios);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});

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

  coreHighContrast=await observeLegacyCoreHighContrast({send,evaluate,waitFor});
  rippleColorBinding=await observeRippleColorBinding({evaluate});
  rippleColorBinding.compiled_theme_css_sha256=createHash('sha256').update(progressCss).digest('hex');

  if (!await waitFor('!!window.__closeoutContentObserver')) throw new Error('owned observer fixture not initialized');
  const observerResult = await send('Runtime.evaluate', {
    expression: 'window.__closeoutContentObserver.exercise()', returnByValue: true, awaitPromise: true,
  });
  if (observerResult.exceptionDetails) throw new Error('native content observer execution failed');
  contentObserver = observerResult.result?.value ?? null;

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
  angularZoneEntered = await evaluate('window.__closeoutAngularZoneEntered');
} catch (err) {
  error = String(err);
}
}, {debugPort: Number(process.env.CDP_PORT || '0'), chromiumArgs: [], requireAnnouncedEndpoint: true,
  responseHeaders: {'content-security-policy': PEER_ICON_TT_CSP + "; img-src 'none'"}});

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
  ? (zoneGlobal === 'undefined' && bundleHasZone === false && angularZoneEntered === false)
  : (zoneGlobal === 'function' && bundleHasZone === true && angularZoneEntered === true);
const ok =
  !error
  && zoneOk
  && peerIconTtOkay(peerIconTt)
  && progressCspStyleOkay(progressCsp)
  && formFieldStateTokensOkay(peerFormHover?.state_token_scenarios)
  && legacyCoreHighContrastOkay(coreHighContrast)
  && rippleColorBindingOkay(rippleColorBinding)
  && contentObserverNativeOkay(contentObserver, zoneless)
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
  angular_zone_entered: angularZoneEntered,
  families,
  peer_icon_tt: peerIconTt,
  peer_media_matcher: peerMediaMatcher,
  media_matcher_peer: mediaMatcherPeer,
  progress_csp: progressCsp,
  peer_form_hover: peerFormHover,
  core_high_contrast: coreHighContrast,
  ripple_color_binding: rippleColorBinding,
  content_observer: contentObserver,
  content_observer_peer: contentObserverPeer,
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
    'Button credit is presence + mat-button-disabled class + focus on raised button; variants/keyboard not exercised. Supplemental owned-core ripple event states and high-contrast fallback run separately and earn no matrix credit or elapsed enabled-motion timing proof.',
    'Card credit is host+title presence; actions/images/subtitle/footer not exercised.',
    'Progress-bar credit is host presence + aria-valuenow for determinate mode; buffer/query/indeterminate motion not exercised.',
    'Progress-spinner credit is host presence + aria-valuenow for determinate mode; indeterminate SVG animation not exercised.',
    'Success is not copied to unexecuted cells.',
    'Peer icon TT probe uses actual Chromium require-trusted-types-for enforcement and an allowed Angular policy list; this is not a full script/style/network CSP matrix or arbitrary SVG trust audit.',
    'Public MediaMatcher unsafe-query diagnostic uses one fixed reversible CSS marker; it earns no acceptance/matrix credit and does not establish an owned input path or security clearance.',
    'Fixed indigo M2 progress guard requires dots only in current buffer mode, the expected radial gradient and color, retained legacy inline SVG and IE-only data URI, zero positive image violations and an enforced blocked-data-image negative. No additional matrix cells or complete CSP/motion qualification are credited.',
    'Current form-field state check requires light/dark baseline, wrapper/hint hover, focus, token consumption negative and restoration with packed exported Sass. Historical selectors are retained; no additional matrix cells, full Sass or general style qualification are credited.',
    'Ripple color guard consumes packed root/scoped/light/dark/custom/CSS-variable Sass through shared public MatRipple, challenges late public styles and token consumption, and preserves explicit colors and a separate modern color scope. This earns no full Sass/peer-floor/motion/matrix credit.',
    'Content observer diagnostic uses native records, the public peer and actual owned legacy header notification/text guard plus subscription/destroy/reobserve teardown in this Chromium runtime. It earns no new matrix cells or whole native/AT/motion/floor equivalence.',
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
  angular_zone_entered: angularZoneEntered,
  families,
  peer_icon_tt: peerIconTt,
  peer_media_matcher: peerMediaMatcher,
  media_matcher_peer: mediaMatcherPeer,
  progress_csp: progressCsp,
  peer_form_hover: peerFormHover,
  core_high_contrast: coreHighContrast,
  ripple_color_binding: rippleColorBinding,
  content_observer: contentObserver,
  content_observer_peer: contentObserverPeer,
  error,
  credited_cell_ids: report.credited_cell_ids,
}, null, 2));
process.exit(ok ? 0 : 1);
