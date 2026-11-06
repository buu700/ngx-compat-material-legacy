#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {npmToolingOptions} from './npm-tooling-options.mjs';
import {spawn, spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {parseLegacyArgs, resolveLibraryFromRun, sha256File} from './resolve-run-library.mjs';
import {rippleHydrationApplication, rippleHydrationReplayOkay} from './ripple-hydration-application.mjs';
import {observePublicRippleNativeEvents} from './ripple-native-event-probe.mjs';
import {withChromium} from './browser-required-cells.mjs';
import {installPublicRippleReplayObserver, markPublicRippleReplayPhase, snapshotPublicRippleReplayObserver,
  cleanupPublicRippleReplayObserver} from './ripple-public-replay-probe.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sleep = ms => new Promise(resolveWait => setTimeout(resolveWait, ms));
const hash = value => createHash('sha256').update(value).digest('hex');

export async function observeHydrationReplay(driver) {
  const {evaluate, pointerClick} = driver;
  const wait = async (expression, message) => {
    for (let i = 0; i < 100; i++) {
      const error = await evaluate('window.__hydrationFailure || ""');
      if (error) throw Error(error);
      if (await evaluate(expression)) return;
      await sleep(25);
    }
    throw Error(message);
  };
  await wait('window.__hydrationGateReady === true', 'Client bootstrap gate absent');
  try {
  const before = await evaluate(`(() => {
    window.__hydrationNative = []; window.__hydrationErrors = [];
    window.__hydrationErrorListener = event => {
      if (window.__rippleNativeFaultActive !== true) window.__hydrationErrors.push(String(event.error || event.message));
    };
    window.addEventListener('error', window.__hydrationErrorListener);
    window.__hydrationNativeListener = event => {if (event.target?.id === 'replay-peer') window.__hydrationNative.push({type:event.type, trusted:event.isTrusted, target_id:event.target.id});};
    ['mousedown','mouseup','click'].forEach(type => document.addEventListener(type, window.__hydrationNativeListener, true));
    window.__hydrationSSRButton = document.getElementById('replay-peer');
    const box = window.__hydrationSSRButton.getBoundingClientRect();
    return {before_bootstrap:window.__hydrationBootstrapped !== true,
      server_hydration_metadata:!!document.querySelector('ripple-hydration-lab[ngh]') && !!document.getElementById('ng-state'),
      point:{x:box.x+box.width/2,y:box.y+box.height/2}};
  })()`);
  const publicBefore = await installPublicRippleReplayObserver(driver);
  await pointerClick(before.point);
  await pointerClick(publicBefore.point);
  const captured = await evaluate(`(() => {
    ['mousedown','mouseup','click'].forEach(type => document.removeEventListener(type, window.__hydrationNativeListener, true));
    return {events:window.__hydrationNative, still_before:window.__hydrationBootstrapped !== true};
  })()`);
  await markPublicRippleReplayPhase(driver, 'replay');
  if (await evaluate('window.__startHydration()') !== true) throw Error('Bootstrap gate already released');
  await wait('window.__hydrationSnapshot?.().clicks === 1', 'Captured event was not replayed');
  await wait('window.__hydrationSnapshot?.().native_replay_deliveries?.length === 3', 'Public peer Angular replay delivery missing');
  const replayed = await evaluate('window.__hydrationSnapshot()');
  const publicReplayed = await snapshotPublicRippleReplayObserver(driver);
  const reused = await evaluate('window.__hydrationSSRButton === document.getElementById("replay-peer")');
  await pointerClick(before.point);
  await wait('window.__hydrationSnapshot?.().clicks === 2', 'Live interaction missing');
  const live = await evaluate('window.__hydrationSnapshot()');
  await markPublicRippleReplayPhase(driver, 'live');
  await pointerClick(publicBefore.point);
  await wait('window.__hydrationSnapshot?.().native_replay_deliveries?.length === 6', 'Public peer live Angular delivery missing');
  const publicLive = await snapshotPublicRippleReplayObserver(driver);
  const native_peer_events = await observePublicRippleNativeEvents(driver);
  await evaluate('window.__destroyHydration()');
  await wait('document.querySelectorAll(".mat-ripple-element").length === 0', 'Ripple nodes survived destruction');
  const publicCleanup = await cleanupPublicRippleReplayObserver(driver);
  const cleanup = await evaluate(`(() => {
    window.removeEventListener('error', window.__hydrationErrorListener);
    return {destroyed:window.__hydrationDestroyed === true,
      remaining_ripple_nodes:document.querySelectorAll('.mat-ripple-element').length, window_errors:window.__hydrationErrors};
  })()`);
  return {...before, before_bootstrap:before.before_bootstrap && captured.still_before,
    captured_native:captured.events, replayed, live, native_peer_events, ssr_button_reused:reused,
    public_peer_replay:{...publicBefore,replayed:publicReplayed,live:publicLive,...publicCleanup}, ...cleanup};
  } finally {
    try {await cleanupPublicRippleReplayObserver(driver);} finally {
    await evaluate(`(() => {
      ['mousedown','mouseup','click'].forEach(type => document.removeEventListener(type, window.__hydrationNativeListener, true));
      if (window.__hydrationErrorListener) window.removeEventListener('error', window.__hydrationErrorListener);
      if (window.__destroyHydration && !window.__hydrationDestroyed) window.__destroyHydration();
    })()`);
    }
  }
}

async function build(tarball, line, runtime) {
  const spec = rippleHydrationApplication(line, runtime);
  const consumer = mkdtempSync(join(tmpdir(), 'ngx-hydration-replay-'));
  writeFileSync(join(consumer, 'library.tgz'), readFileSync(tarball));
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({name:'ngx-hydration-replay', private:true,
    type:'module', dependencies:{...spec.dependencies, '@ngx-compat/material-legacy':'file:./library.tgz'}}, null, 2));
  writeFileSync(join(consumer, '.npmrc'), 'install-links=true\nfund=false\naudit=false\n');
  for (const [path, source] of Object.entries(spec.files)) {mkdirSync(dirname(join(consumer,path)), {recursive:true}); writeFileSync(join(consumer,path), source);}
  writeFileSync(join(consumer, 'angular.json'), JSON.stringify(spec.angular, null, 2));
  writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify(spec.tsconfig, null, 2));
  const env = {...process.env, NODE_OPTIONS:'', NG_CLI_ANALYTICS:'false'}; delete env.NODE_PATH;
  const install = spawnSync('npm', ['install','--ignore-scripts','--no-audit','--no-fund','--package-lock'],
    npmToolingOptions({cwd:consumer, env, encoding:'utf8', timeout:300000}, ['install','--ignore-scripts','--no-audit','--no-fund','--package-lock']));
  if (install.status !== 0) throw Error((install.stderr || install.stdout || 'Install failed').slice(-4000));
  for (const [name, version] of Object.entries(spec.dependencies)) {
    const actual = JSON.parse(readFileSync(join(consumer, 'node_modules',name,'package.json'))).version;
    if (actual !== version) throw Error(`Installed ${name}@${actual}, expected ${version}`);
  }
  const compile = spawnSync(process.execPath, ['node_modules/@angular/cli/bin/ng.js','build','replay'],
    {cwd:consumer, env, encoding:'utf8', timeout:300000});
  if (compile.status !== 0) throw Error((compile.stdout + compile.stderr).slice(-5000));
  return {consumer, spec, env, lock_sha256:sha256File(join(consumer,'package-lock.json')),
    source_sha256:Object.fromEntries(Object.entries(spec.files).map(([path,source]) => [path,hash(source)]))};
}

export async function withServer(built, callback) {
  const child = spawn(process.execPath, ['dist/server/server.mjs'], {cwd:built.consumer, env:built.env, stdio:['ignore','pipe','pipe']});
  const closed = new Promise(done => child.once('close', done));
  let output = '', errors = '';
  child.stdout.on('data', bytes => {output += bytes;}); child.stderr.on('data', bytes => {errors += bytes;});
  try {
    let origin;
    for (let i=0; i<200; i++) {
      origin = output.match(/__HYDRATION_ORIGIN__(http:\/\/127\.0\.0\.1:\d+)/)?.[1];
      if (origin) break;
      if (child.exitCode !== null || child.signalCode !== null) throw Error((output + errors).slice(-3000));
      await sleep(25);
    }
    if (!origin) throw Error('SSR server did not announce loopback origin');
    await callback(origin);
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await closed;
  }
}

export async function runRippleHydrationReplay({tarball, runId=null, reportPath}) {
  const packed = spawnSync('tar',['-xOzf',tarball,'package/package.json'],{encoding:'utf8'});
  if (packed.status !== 0) throw Error('Unreadable library tarball');
  const pkg = JSON.parse(packed.stdout), major = Number(pkg.peerDependencies?.['@angular/core']?.match(/\d+/)?.[0]);
  const line = major === 22 ? 'main' : major === 21 ? '21.x' : null;
  if (!line) throw Error('Unsupported packed peer line');
  const report = {schema_version:1, line, run_id:runId, tarball_sha256:sha256File(tarball),
    producer_sha256:sha256File(fileURLToPath(import.meta.url)), node:process.version, results:[],
    scope:'Packed strict AOT public CLI SSR/client build at exact current peers and Rx7.5.5. Trusted Chromium pre-bootstrap input and genuine replay through the owned helper/renderer. Public MatRipple creation is separate from directive-only native input. A separate no-launch Angular-handler host distinguishes genuine public-peer replay from ordinary native capture. A controlled native composedPath fault records the missing21 minimum guard; no private inherited-fix claim or10db3 closure is made. No full Node/Rx/browser matrix or new release matrix cells.'};
  try {
    for (const runtime of ['zoneful','zoneless']) {
      const built = await build(tarball,line,runtime);
      await withServer(built, async origin => {
        await withChromium(origin, async driver => {
          const observed = {...await observeHydrationReplay(driver), runtime};
          report.results.push({runtime, dependencies:built.spec.dependencies, lock_sha256:built.lock_sha256,
            source_sha256:built.source_sha256, browser:driver.browser, ...observed, ok:rippleHydrationReplayOkay(observed, line)});
          if (!rippleHydrationReplayOkay(observed, line)) throw Error(`Hydration replay contract failed: ${runtime}`);
        });
      });
    }
    report.ok = report.results.length === 2 && report.results.every(row=>row.ok);
  } catch (error) {report.ok=false; report.error=String(error);}
  mkdirSync(dirname(reportPath),{recursive:true}); writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
  return report;
}

export async function main(args) {
  const parsed = parseLegacyArgs(args);
  if (parsed.unknown.length || parsed.family || (!parsed.runPath && !parsed.tarball)) throw Error('--run or --tarball is required; no unknown arguments');
  const artifact = parsed.runPath ? resolveLibraryFromRun(parsed.runPath,{tarball:parsed.tarball}) : {tarball:resolve(parsed.tarball),runId:null};
  const reportPath = parsed.runPath ? join(dirname(resolve(parsed.runPath)), 'ripple-hydration-replay.json')
    : join(root,'compatibility/rc/reports/ripple-hydration-replay.json');
  const report = await runRippleHydrationReplay({...artifact,reportPath});
  console.log(JSON.stringify({ok:report.ok, report:reportPath, error:report.error})); return report.ok ? 0 : 1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(code=>{process.exitCode=code;}).catch(error=>{console.error(String(error));process.exitCode=2;});
}
