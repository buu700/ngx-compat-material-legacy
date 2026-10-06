/**
 * Packed rendered M2/M3 coexistence for m3-coexistence.
 *
 * One Chromium page renders current peer components and the packed library's
 * legacy components from a fresh consumer install of the identified tarball.
 * The page holds every stylesheet that check-m3-inclusion-order.mjs compiles
 * (now compiled from the packed library) as a separately switchable <style>,
 * and reads computed properties of consuming elements:
 *
 *   inclusion-order      current probes under each order equal current-only;
 *                        legacy probes equal legacy-only; each -only sheet
 *                        visibly themes its own family and leaves the other
 *                        family unthemed.
 *   nested-theme-scope   M3 outer scope and the nested legacy scope keep the
 *                        current-only / legacy-only values; current controls
 *                        inside the nested legacy scope stay M3.
 *   lazy-body-overlay    overlays created after first render in body
 *                        .cdk-overlay-container panes take the M3 / legacy
 *                        values; in-tree controls stay unthemed.
 *   *-shared-scope       ripple, focus indicator and pseudo-checkbox in each
 *                        shared scope are unchanged when the other scope's
 *                        shared styles are present, and visibly themed. An
 *                        unscoped legacy-core sheet (contamination) must
 *                        change a current shared value.
 *
 * Pure assessment (assessRendered) has no browser dependency.
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  buildLab, installConsumer, readPackedPackage, versionsFor, withChromium,
} from './check-companion-computed-styles.mjs';
import {
  currentSharedSource, lazyOverlaySource, legacySharedSource, nestedThemeSource, themePrelude, themeSource,
} from './check-m3-inclusion-order.mjs';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SILENCE = ['if-function', 'global-builtin', 'color-functions', 'import'];

export const ORDER_IDS = ['current-only', 'legacy-only', 'current-then-legacy', 'legacy-then-current'];

/** Switchable stylesheets: id -> SCSS. Order sheets are scoped to .order as in the compile check. */
export function sheetSources() {
  const out = {};
  for (const order of ORDER_IDS) out[`order-${order}`] = themeSource(order);
  out.nested = nestedThemeSource();
  out.lazy = lazyOverlaySource();
  out['shared-current'] = currentSharedSource();
  out['shared-legacy'] = legacySharedSource();
  out['shared-leak'] = unscopedLegacySharedSource();
  return out;
}

/**
 * Rendered contamination fixture: the legacy shared-style mixins emitted at the
 * document root instead of inside .legacy-shared-scope. Unlike the compile
 * check's unscoped legacy-core fixture (whose rules match current output
 * byte for byte and so cannot change a rendered value), this one must visibly
 * restyle the current scope's focus indicator and pseudo-checkbox.
 */
export function unscopedLegacySharedSource() {
  return `${themePrelude()}
@include legacy.ripple();
@include legacy.strong-focus-indicators();
@include legacy.pseudo-checkbox-legacy-size();
@include legacy.pseudo-checkbox-theme($m2);
`;
}

/** Probes: key -> {family, group, css (inside a probe host), pseudo, properties}. */
export const PROBES = {
  'cur-button': {family: 'current', group: 'order', css: '.p-button', properties: ['background-color', 'color']},
  'cur-checkbox': {family: 'current', group: 'order', css: '.p-checkbox .mdc-checkbox__background', properties: ['background-color', 'border-top-color']},
  'cur-toggle': {family: 'current', group: 'order', css: '.p-toggle .mdc-switch__handle', pseudo: '::after', properties: ['background-color']},
  'cur-pseudo': {family: 'current', group: 'shared', css: '.p-pseudo', properties: ['background-color', 'width']},
  'cur-ripple': {family: 'current', group: 'shared', css: '.p-ripple .mat-ripple-element', properties: ['position', 'border-top-left-radius', 'background-color']},
  'cur-focus': {family: 'current', group: 'shared', css: '.p-focus.mat-focus-indicator, .p-focus .mat-focus-indicator', pseudo: '::before', properties: ['display', 'border-top-color', 'border-top-width', 'border-top-style']},
  'leg-button': {family: 'legacy', group: 'order', css: '.p-button', properties: ['background-color', 'color']},
  'leg-checkbox': {family: 'legacy', group: 'order', css: '.p-checkbox .mat-checkbox-background', properties: ['background-color']},
  'leg-toggle': {family: 'legacy', group: 'order', css: '.p-toggle .mat-slide-toggle-thumb', properties: ['background-color']},
  'leg-pseudo': {family: 'legacy', group: 'shared', css: '.p-pseudo', properties: ['background-color', 'width']},
  'leg-ripple': {family: 'legacy', group: 'shared', css: '.p-ripple .mat-ripple-element', properties: ['position', 'border-top-left-radius', 'background-color']},
  'leg-focus': {family: 'legacy', group: 'shared', css: '.p-focus.mat-focus-indicator, .p-focus .mat-focus-indicator', pseudo: '::before', properties: ['display', 'border-top-color', 'border-top-width', 'border-top-style']},
};

/** Regions: id -> {host selector for current probes, host selector for legacy probes}. */
export const REGIONS = {
  order: {current: '#order > cur-probes', legacy: '#order > leg-probes'},
  plain: {current: '#plain > cur-probes', legacy: '#plain > leg-probes'},
  'nested-outer': {current: '#nested > cur-probes', legacy: null},
  'nested-inner': {current: '#nested-inner > cur-probes', legacy: '#nested-inner > leg-probes'},
  'overlay-m3': {current: '.lazy-m3-overlay cur-probes', legacy: null},
  'overlay-m2': {current: null, legacy: '.lazy-m2-overlay leg-probes'},
  'shared-current': {current: '#shared-cur > cur-probes', legacy: null},
  'shared-legacy': {current: null, legacy: '#shared-leg > leg-probes'},
};

/** Sheet configurations read in one page, in stylesheet order. */
export const CONFIGS = {
  none: [],
  ...Object.fromEntries(ORDER_IDS.map((order) => [`order-${order}`, [`order-${order}`]])),
  nested: ['nested'],
  lazy: ['lazy'],
  'shared-current': ['shared-current'],
  'shared-legacy': ['shared-legacy'],
  'shared-both': ['shared-current', 'shared-legacy'],
  'shared-current-leak': ['shared-current', 'shared-leak'],
};

export const CASES = {
  'inclusion-order': ORDER_IDS,
  'nested-lazy-overlay': ['nested-theme-scope', 'lazy-body-overlay'],
  'shared-style-boundary': ['current-shared-scope', 'legacy-shared-scope'],
};

function probeKeys(family, group) {
  return Object.keys(PROBES).filter((key) => PROBES[key].family === family && PROBES[key].group === group);
}

/** values[config][region][probe] = {found, values: {property: value}} */
function read(values, config, region, probe) {
  return values?.[config]?.[region]?.[probe] ?? null;
}

function compare(values, label, [configA, regionA], [configB, regionB], probes, {expect}) {
  const checks = [];
  for (const probe of probes) {
    const a = read(values, configA, regionA, probe);
    const b = read(values, configB, regionB, probe);
    const found = Boolean(a?.found && b?.found);
    const props = PROBES[probe].properties.map((property) => ({
      property,
      observed: a?.values?.[property] ?? null,
      reference: b?.values?.[property] ?? null,
    }));
    const same = found && props.every((p) => typeof p.observed === 'string' && p.observed !== '' && p.observed === p.reference);
    const differs = found && props.some((p) => p.observed !== p.reference);
    const ok = expect === 'equal' ? same : differs;
    checks.push({label, probe, expect, observed: `${configA}/${regionA}`, reference: `${configB}/${regionB}`, found, ok, properties: props});
  }
  return checks;
}

/** Pure: per-case results from rendered values. */
export function assessRendered(values) {
  const results = {};
  const C = ['order-current-only', 'order'];
  const L = ['order-legacy-only', 'order'];
  const U = ['none', 'order'];
  const curOrder = probeKeys('current', 'order');
  const legOrder = probeKeys('legacy', 'order');
  const curShared = probeKeys('current', 'shared');
  const legShared = probeKeys('legacy', 'shared');
  const add = (id, group, checks, extra = {}) => {
    const failed = checks.filter((c) => !c.ok);
    const reasons = failed.map((c) => `${c.label}: ${c.probe} ${c.expect === 'equal' ? 'differs from' : 'does not differ from'} ${c.reference}${c.found ? '' : ' (not rendered)'}`);
    const negative = extra.contamination_negative;
    if (negative && negative.detected !== true) reasons.push(`contamination negative not detected: ${negative.fixture}`);
    results[id] = {case_id: id, group, result: reasons.length || !checks.length ? 'fail' : 'pass', reasons, checks, ...extra};
  };
  add('current-only', 'inclusion-order', [
    ...compare(values, 'M3 themes current controls', C, U, curOrder, {expect: 'differ'}),
    ...compare(values, 'current-only leaves legacy controls unthemed', ['order-current-only', 'order'], U, legOrder, {expect: 'equal'}),
  ]);
  add('legacy-only', 'inclusion-order', [
    ...compare(values, 'legacy aggregate themes legacy controls', L, U, legOrder, {expect: 'differ'}),
    ...compare(values, 'legacy-only leaves current controls unthemed', ['order-legacy-only', 'order'], U, curOrder, {expect: 'equal'}),
  ]);
  for (const order of ['current-then-legacy', 'legacy-then-current']) {
    add(order, 'inclusion-order', [
      ...compare(values, 'current controls equal current-only', [`order-${order}`, 'order'], C, curOrder, {expect: 'equal'}),
      ...compare(values, 'legacy controls equal legacy-only', [`order-${order}`, 'order'], L, legOrder, {expect: 'equal'}),
    ]);
  }
  add('nested-theme-scope', 'nested-lazy-overlay', [
    ...compare(values, 'outer M3 scope equals current-only', ['nested', 'nested-outer'], C, curOrder, {expect: 'equal'}),
    ...compare(values, 'nested legacy scope equals legacy-only', ['nested', 'nested-inner'], L, legOrder, {expect: 'equal'}),
    ...compare(values, 'current controls inside the legacy scope stay M3', ['nested', 'nested-inner'], C, curOrder, {expect: 'equal'}),
  ]);
  add('lazy-body-overlay', 'nested-lazy-overlay', [
    ...compare(values, 'lazy M3 overlay equals current-only', ['lazy', 'overlay-m3'], C, curOrder, {expect: 'equal'}),
    ...compare(values, 'lazy legacy overlay equals legacy-only', ['lazy', 'overlay-m2'], L, legOrder, {expect: 'equal'}),
    ...compare(values, 'overlay themes stay out of in-tree current controls', ['lazy', 'plain'], ['none', 'plain'], curOrder, {expect: 'equal'}),
    ...compare(values, 'overlay themes stay out of in-tree legacy controls', ['lazy', 'plain'], ['none', 'plain'], legOrder, {expect: 'equal'}),
  ]);
  const leak = compare(values, 'unscoped legacy shared-style contamination', ['shared-current-leak', 'shared-current'], ['shared-current', 'shared-current'], curShared, {expect: 'differ'});
  const leakDetected = leak.some((c) => c.ok);
  add('current-shared-scope', 'shared-style-boundary', [
    ...compare(values, 'current shared styles theme the current scope', ['shared-current', 'shared-current'], ['none', 'shared-current'], ['cur-pseudo'], {expect: 'differ'}),
    ...compare(values, 'legacy shared styles leave the current scope unchanged', ['shared-both', 'shared-current'], ['shared-current', 'shared-current'], curShared, {expect: 'equal'}),
  ], {contamination_negative: {fixture: 'legacy ripple, strong-focus-indicators and pseudo-checkbox mixins emitted at the document root after the current shared scope', detected: leakDetected, rostered: false, checks: leak}});
  add('legacy-shared-scope', 'shared-style-boundary', [
    ...compare(values, 'legacy shared styles theme the legacy scope', ['shared-legacy', 'shared-legacy'], ['none', 'shared-legacy'], ['leg-pseudo', 'leg-focus'], {expect: 'differ'}),
    ...compare(values, 'current shared styles leave the legacy scope unchanged', ['shared-both', 'shared-legacy'], ['shared-legacy', 'shared-legacy'], legShared, {expect: 'equal'}),
  ]);
  return results;
}

export function labSource() {
  return `
import 'zone.js';
import {AfterViewInit, Component, Injector, ViewChild, inject, provideZoneChangeDetection} from '@angular/core';
import {bootstrapApplication} from '@angular/platform-browser';
import {Overlay} from '@angular/cdk/overlay';
import {ComponentPortal} from '@angular/cdk/portal';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MATERIAL_ANIMATIONS, MatPseudoCheckboxModule, MatRipple, MatRippleModule} from '@angular/material/core';
import {MatLegacyButtonModule} from '@ngx-compat/material-legacy/legacy-button';
import {MatLegacyCheckboxModule} from '@ngx-compat/material-legacy/legacy-checkbox';
import {MatLegacySlideToggleModule} from '@ngx-compat/material-legacy/legacy-slide-toggle';
import {MatLegacyPseudoCheckboxModule, MatLegacyRipple, MatLegacyRippleModule} from '@ngx-compat/material-legacy/legacy-core';

@Component({
  standalone: true,
  selector: 'cur-probes',
  imports: [MatButtonModule, MatCheckboxModule, MatSlideToggleModule, MatPseudoCheckboxModule, MatRippleModule],
  template: \`
    <button matButton="filled" class="p-button">Current</button>
    <mat-checkbox class="p-checkbox" [checked]="true">Current</mat-checkbox>
    <mat-slide-toggle class="p-toggle" [checked]="true">Current</mat-slide-toggle>
    <mat-pseudo-checkbox class="p-pseudo" state="checked"></mat-pseudo-checkbox>
    <div class="p-ripple" matRipple style="position: relative; width: 40px; height: 40px; overflow: hidden"></div>
    <button matButton="filled" class="p-focus cdk-keyboard-focused">Focus</button>\`,
})
export class CurProbes implements AfterViewInit {
  @ViewChild(MatRipple) ripple!: MatRipple;
  ngAfterViewInit() { this.ripple.launch({persistent: true, centered: true, animation: {enterDuration: 0, exitDuration: 0}}); }
}

@Component({
  standalone: true,
  selector: 'leg-probes',
  imports: [MatLegacyButtonModule, MatLegacyCheckboxModule, MatLegacySlideToggleModule, MatLegacyPseudoCheckboxModule, MatLegacyRippleModule],
  template: \`
    <button mat-raised-button color="primary" class="p-button">Legacy</button>
    <mat-checkbox class="p-checkbox" [checked]="true">Legacy</mat-checkbox>
    <mat-slide-toggle class="p-toggle" [checked]="true">Legacy</mat-slide-toggle>
    <mat-pseudo-checkbox class="p-pseudo" state="checked"></mat-pseudo-checkbox>
    <div class="p-ripple" matRipple style="position: relative; width: 40px; height: 40px; overflow: hidden"></div>
    <button mat-raised-button class="p-focus cdk-keyboard-focused">Focus</button>\`,
})
export class LegProbes implements AfterViewInit {
  @ViewChild(MatLegacyRipple) ripple!: MatLegacyRipple;
  ngAfterViewInit() { this.ripple.launch({persistent: true, centered: true, animation: {enterDuration: 0, exitDuration: 0}}); }
}

@Component({standalone: true, selector: 'lazy-current', imports: [CurProbes], template: '<cur-probes></cur-probes>'})
export class LazyCurrent {}
@Component({standalone: true, selector: 'lazy-legacy', imports: [LegProbes], template: '<leg-probes></leg-probes>'})
export class LazyLegacy {}

@Component({
  standalone: true,
  selector: 'lab-root',
  imports: [CurProbes, LegProbes],
  template: \`
    <div id="order" class="order"><cur-probes></cur-probes><leg-probes></leg-probes></div>
    <div id="plain"><cur-probes></cur-probes><leg-probes></leg-probes></div>
    <div id="nested" class="app-nested"><cur-probes></cur-probes>
      <div id="nested-inner" class="legacy-nested"><leg-probes></leg-probes><cur-probes></cur-probes></div>
    </div>
    <div id="shared-cur" class="current-shared-scope"><cur-probes></cur-probes></div>
    <div id="shared-leg" class="legacy-shared-scope"><leg-probes></leg-probes></div>\`,
})
export class LabRoot implements AfterViewInit {
  private overlay = inject(Overlay);
  private injector = inject(Injector);
  ngAfterViewInit() {
    // Body overlays created after the first render (lazy), outside the in-tree scopes.
    setTimeout(() => {
      this.overlay.create({panelClass: 'lazy-m3-overlay'}).attach(new ComponentPortal(LazyCurrent, null, this.injector));
      this.overlay.create({panelClass: 'lazy-m2-overlay'}).attach(new ComponentPortal(LazyLegacy, null, this.injector));
      setTimeout(() => { (window as any).__m3Ready = true; }, 300);
    }, 50);
  }
}

bootstrapApplication(LabRoot, {
  providers: [provideZoneChangeDetection(), {provide: MATERIAL_ANIMATIONS, useValue: {animationsDisabled: true}}],
}).catch(err => {
  const node = document.createElement('pre');
  node.id = 'bootstrap-error';
  node.textContent = String(err && err.stack || err);
  document.body.appendChild(node);
});
`;
}

function indexHtml(sheetIds) {
  const styles = sheetIds.map((id) => `<link rel="stylesheet" id="sheet-${id}" href="/sheet-${id}.css" media="not all">`).join('\n');
  return `<!doctype html><html><head>
<style>*, *::before, *::after { transition: none !important; animation: none !important; } html, body { margin: 0; }</style>
${styles}
</head><body><lab-root></lab-root><script src="/app.js"></script></body></html>
`;
}

function pageReader() {
  return `(() => {
  const probes = ${JSON.stringify(PROBES)};
  const regions = ${JSON.stringify(REGIONS)};
  window.__m3 = {
    use(ids) {
      for (const link of document.querySelectorAll('link[id^="sheet-"]')) link.media = 'not all';
      // Enable in the requested order by moving the links to the end of <head>.
      for (const id of ids) {
        const link = document.getElementById('sheet-' + id);
        document.head.appendChild(link);
        link.media = 'all';
      }
      return [...document.querySelectorAll('link[id^="sheet-"]')].filter((l) => l.media === 'all').map((l) => l.id);
    },
    read() {
      const out = {};
      for (const [region, hosts] of Object.entries(regions)) {
        out[region] = {};
        for (const [key, probe] of Object.entries(probes)) {
          const hostSel = hosts[probe.family];
          if (!hostSel) continue;
          const host = document.querySelector(hostSel);
          const el = host ? host.querySelector(probe.css) : null;
          if (!el) { out[region][key] = {found: false, values: {}}; continue; }
          const style = getComputedStyle(el, probe.pseudo || null);
          out[region][key] = {found: true, values: Object.fromEntries(probe.properties.map((p) => [p, style.getPropertyValue(p).trim()]))};
        }
      }
      return out;
    },
  };
  return true;
})()`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Render the packed tarball and return {values, results, environment}. */
export async function renderM3Coexistence({tarball, debugPort = 9336}) {
  const versions = versionsFor(readPackedPackage(tarball));
  const {consumer, env} = installConsumer(tarball, versions);
  const nodeModules = join(consumer, 'node_modules');
  const sass = createRequire(join(root, 'package.json'))('sass');
  const sources = sheetSources();
  await buildLab(consumer, env, versions, labSource());
  const dist = join(consumer, 'dist');
  mkdirSync(dist, {recursive: true});
  const compiled = {};
  for (const [id, scss] of Object.entries(sources)) {
    const css = sass.compileString(scss, {loadPaths: [nodeModules], style: 'expanded', silenceDeprecations: SILENCE,
      url: new URL(`file://${join(consumer, `m3-${id}.scss`)}`)}).css;
    writeFileSync(join(dist, `sheet-${id}.css`), css);
    compiled[id] = css.length;
  }
  writeFileSync(join(dist, 'index.html'), indexHtml(Object.keys(sources)));
  return withChromium(dist, async ({evaluate, browser}) => {
    for (let i = 0; i < 200; i += 1) {
      if (await evaluate('window.__m3Ready === true || !!document.getElementById("bootstrap-error")')) break;
      await sleep(100);
    }
    if (await evaluate('!!document.getElementById("bootstrap-error")')) {
      throw new Error(await evaluate('document.getElementById("bootstrap-error").textContent'));
    }
    if (!(await evaluate('window.__m3Ready === true'))) throw new Error('m3 lab did not become ready');
    await evaluate(pageReader());
    const values = {};
    const applied = {};
    for (const [config, ids] of Object.entries(CONFIGS)) {
      applied[config] = await evaluate(`window.__m3.use(${JSON.stringify(ids)})`);
      await evaluate('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))');
      values[config] = await evaluate('window.__m3.read()');
    }
    return {browser, versions, compiled_bytes: compiled, applied, values, results: assessRendered(values)};
  }, {debugPort});
}
