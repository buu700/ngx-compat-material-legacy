/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {rippleHydrationComponentFixture} from './ripple-hydration-component-fixture.mjs';
import {publicRippleNativeEventsOkay} from './ripple-native-event-probe.mjs';
import {publicRippleReplayOkay} from './ripple-public-replay-probe.mjs';

/** Exact supported-floor application inputs. Installation/build belong to the packed runner. */
export function rippleHydrationApplication(line, runtime) {
  if (!['main', '21.x'].includes(line)) throw Error('Unknown hydration line');
  if (!['zoneful', 'zoneless'].includes(runtime)) throw Error('Unknown hydration runtime');
  const main = line === 'main', zoneful = runtime === 'zoneful';
  const core = main ? '22.1.7' : '21.2.23';
  const dependencies = Object.fromEntries(['build', 'cli', 'common', 'compiler', 'compiler-cli', 'core',
    'forms', 'platform-browser', 'platform-server', 'router', 'ssr'].map(name => ['@angular/' + name, core]));
  Object.assign(dependencies, {'@angular/cdk': main ? core : '21.2.14', '@angular/material': main ? core : '21.2.14',
    rxjs: '7.5.5', tslib: '2.8.1', typescript: main ? '6.0.2' : '5.9.2', '@types/node': '26.6.1',
    beasties: main ? '0.4.3' : '0.4.1'});
  if (zoneful) dependencies['zone.js'] = main ? '0.16.3' : '0.15.1';
  const providers = `provideClientHydration(withEventReplay()), provideRouter([]),
    ${zoneful ? 'provideZoneChangeDetection' : 'provideZonelessChangeDetection'}()`;
  const files = {
    'src/component.ts': `import {Component, ViewChild, ElementRef, NgZone, inject, signal} from '@angular/core';
import {Platform} from '@angular/cdk/platform';
import {MatLegacyRipple, MatLegacyRippleModule, LegacyRippleRenderer, legacyGetEventTarget} from '@ngx-compat/material-legacy/legacy-core';
${rippleHydrationComponentFixture}`,
    'src/config.ts': `import {provideZoneChangeDetection, provideZonelessChangeDetection} from '@angular/core';
import {provideRouter} from '@angular/router';
import {provideClientHydration, withEventReplay} from '@angular/platform-browser';
export const config = {providers: [${providers}]};`,
    'src/main.ts': `import {bootstrapApplication} from '@angular/platform-browser';
import {RippleHydrationLab} from './component';
import {config} from './config';
const lab = window as Window & {__hydrationGateReady?: boolean; __startHydration?: () => boolean;
  __hydrationSnapshot?: () => ReturnType<RippleHydrationLab['snapshot']>; __destroyHydration?: () => void;
  __hydrationFailure?: string; __hydrationBootstrapped?: boolean; __hydrationDestroyed?: boolean};
let start!: () => void;
const gate = new Promise<void>(resolve => {start = resolve;});
let started = false;
lab.__startHydration = () => {if (started) return false; started = true; start(); return true;};
lab.__hydrationGateReady = true;
gate.then(() => bootstrapApplication(RippleHydrationLab, config)).then(app => {
  const component = app.components[0].instance as RippleHydrationLab;
  lab.__hydrationSnapshot = () => component.snapshot();
  lab.__destroyHydration = () => {app.destroy(); lab.__hydrationDestroyed = true;};
  lab.__hydrationBootstrapped = true;
}).catch(error => {lab.__hydrationFailure = String(error);});`,
    'src/main.server.ts': `import {mergeApplicationConfig} from '@angular/core';
import {bootstrapApplication, BootstrapContext} from '@angular/platform-browser';
import {provideServerRendering, withRoutes, RenderMode} from '@angular/ssr';
import {RippleHydrationLab} from './component';
import {config} from './config';
const serverConfig = mergeApplicationConfig(config, {providers: [provideServerRendering(withRoutes([{path: '**', renderMode: RenderMode.Server}]))]});
export default (context: BootstrapContext) => bootstrapApplication(RippleHydrationLab, serverConfig, context);`,
    'src/server.ts': `import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse} from '@angular/ssr/node';
const engine = new AngularNodeAppEngine({allowedHosts: ['127.0.0.1']});
const browser = new URL('../browser/', import.meta.url);
const handler = createNodeRequestHandler(async (req, res) => {
  try {
    const path = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
    if (/^\\/[A-Za-z0-9_.-]+\\.(js|css)$/.test(path)) {
      const bytes = await readFile(fileURLToPath(new URL(path.slice(1), browser)));
      res.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : 'text/css');
      res.end(bytes); return;
    }
    const response = await engine.handle(req);
    if (response) await writeResponseToNodeResponse(response, res);
    else {res.statusCode = 404; res.end('Missing route');}
  } catch (error) {res.statusCode = 500; res.end(String(error));}
});
export const reqHandler = handler;
if (isMainModule(import.meta.url)) {
  const server = createServer((req, res) => {void handler(req, res);});
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    if (!address || typeof address === 'string') throw Error('Missing loopback address');
    console.log('__HYDRATION_ORIGIN__http://127.0.0.1:' + address.port);
  });
}`,
    'src/index.html': '<!doctype html><html><head><meta charset="utf-8"><base href="/"></head><body><ripple-hydration-lab></ripple-hydration-lab></body></html>\n',
  };
  const tsconfig = {compilerOptions: {target: 'ES2022', module: 'ES2022', moduleResolution: 'bundler',
    experimentalDecorators: true, strict: true, skipLibCheck: false, types: ['node'], lib: ['ES2022', 'DOM']},
  files: ['src/main.ts', 'src/main.server.ts', 'src/server.ts'],
  angularCompilerOptions: {strictTemplates: true, compilationMode: 'full'}};
  if (main) tsconfig.compilerOptions.ignoreDeprecations = '6.0';
  const angular = {version: 1, cli: {analytics: false}, projects: {replay: {projectType: 'application', root: '', sourceRoot: 'src',
    architect: {build: {builder: '@angular/build:application', options: {browser: 'src/main.ts', server: 'src/main.server.ts',
      ssr: {entry: 'src/server.ts'}, outputMode: 'server', outputPath: 'dist', index: 'src/index.html', tsConfig: 'tsconfig.json',
      polyfills: zoneful ? ['zone.js'] : [], optimization: false, sourceMap: false, outputHashing: 'none', prerender: false}}}}}};
  return {line, runtime, dependencies, files, tsconfig, angular};
}

/** Accept real pre-bootstrap native capture, replay and ordinary post-hydration interaction. */
export function rippleHydrationReplayOkay(row, line) {
  const replay = row?.replayed, live = row?.live;
  const deliveries = replay?.deliveries;
  return ['zoneful', 'zoneless'].includes(row?.runtime)
    && replay?.angular_zone_entered === (row.runtime === 'zoneful')
    && live?.angular_zone_entered === (row.runtime === 'zoneful')
    && publicRippleNativeEventsOkay(row?.native_peer_events, line)
    && publicRippleReplayOkay(row?.public_peer_replay)
    && row?.server_hydration_metadata === true && row?.before_bootstrap === true
    && Array.isArray(row?.captured_native) && row.captured_native.length === 3
    && row.captured_native.map(event => event.type).join(',') === 'mousedown,mouseup,click'
    && row.captured_native.every(event => event.trusted === true && event.target_id === 'replay-peer')
    && row.ssr_button_reused === true && Array.isArray(row.window_errors) && row.window_errors.length === 0
    && replay?.clicks === 1 && replay.actual_peer_directive_present === true && replay.actual_owned_renderer_present === true
    && Array.isArray(deliveries) && deliveries.length === 2 && deliveries.map(event => event.type).join(',') === 'mousedown,click'
    && deliveries.every(event => event.path_threw === true && event.target_id === 'replay-peer' && event.peer_present === true)
    && replay.owned_ripple_launches === 1 && replay.peer_ripple_launches === 1
    && live?.clicks === 2 && Array.isArray(live.deliveries) && live.deliveries.length === 4
    && live.deliveries.slice(2).every(event => event.path_threw === false && event.target_id === 'replay-peer')
    && live.owned_ripple_launches === 2 && live.peer_ripple_launches === 2
    && row.destroyed === true && row.remaining_ripple_nodes === 0;
}
