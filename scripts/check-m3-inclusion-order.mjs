#!/usr/bin/env node
/**
 * Compile current M3 all-component-themes and legacy all-legacy-component-themes
 * in both inclusion orders.
 *
 *   node scripts/check-m3-inclusion-order.mjs
 *   node scripts/check-m3-inclusion-order.mjs --tarball <main.tgz> --tarball-21x <21.tgz> --material-21x <node_modules>
 *
 * Workspace mode uses this checkout and its installed @angular/material.
 * A tarball is extracted and compiled against the material root for that line.
 * This does not claim G07. A fresh main workspace compile also runs
 * nested-theme-scope, lazy-body-overlay, and the two shared-style scopes.
 * 21.x m3 groups stay unexecuted. implemented stays false.
 * A coordinator invocation on main writes one assertion file per executed case.
 * Deliberate contamination fixtures must fail and are not rostered.
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const defaultReport = join(root, 'compatibility/rc/reports/m3-inclusion-order.json');
const M3_MARKER = '--mat-app-background-color';
const M2_MARKER = '.mat-raised-button';

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

function parseArgs(argv) {
  const args = {tarball: null, tarball21: null, material21: null, out: defaultReport};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) fail(2, `${arg} requires a path`);
      i += 1;
      return resolve(value);
    };
    if (arg === '--tarball') args.tarball = next();
    else if (arg === '--tarball-21x') args.tarball21 = next();
    else if (arg === '--material-21x') args.material21 = next();
    else if (arg === '--out') args.out = next();
    else fail(2, `Unknown argument: ${arg}`);
  }
  if (args.tarball21 && !args.material21) fail(2, '--tarball-21x requires --material-21x');
  return args;
}

function sha256File(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function materialVersion(nodeModules) {
  const pkg = join(nodeModules, '@angular/material/package.json');
  if (!existsSync(pkg)) fail(1, `Missing @angular/material under ${nodeModules}`);
  return JSON.parse(readFileSync(pkg, 'utf8')).version;
}

function stagePackage(tarball) {
  const dir = mkdtempSync(join(tmpdir(), 'ngx-inclusion-'));
  const extracted = spawnSync('tar', ['-xzf', tarball, '-C', dir], {encoding: 'utf8'});
  if (extracted.status !== 0) fail(1, extracted.stderr || 'unable to extract tarball');
  const nm = join(dir, 'nm', 'node_modules', '@ngx-compat');
  mkdirSync(nm, {recursive: true});
  symlinkSync(join(dir, 'package'), join(nm, 'material-legacy'));
  return join(dir, 'nm', 'node_modules');
}

function loadSass() {
  return createRequire(join(root, 'package.json'))('sass');
}

function compileCss(source, loadPaths, urlName) {
  const sass = loadSass();
  const result = sass.compileString(source, {
    loadPaths,
    style: 'expanded',
    url: pathToFileURL(join(root, urlName)),
    silenceDeprecations: ['if-function', 'global-builtin', 'color-functions', 'import'],
  });
  const external = result.loadedUrls
    .map(url => url.pathname)
    .filter(pathname => pathname.includes('/node_modules/@material/') || pathname.includes('/@material+'));
  if (external.length) fail(1, `Sass loaded external @material files: ${external.slice(0, 4).join(', ')}`);
  return result.css;
}

function themePrelude() {
  return `
@use '@ngx-compat/material-legacy' as legacy with ($theme-ignore-duplication-warnings: true);
@use '@angular/material' as mat;
$primary: legacy.define-palette(legacy.$indigo-palette);
$accent: legacy.define-palette(legacy.$pink-palette, A200, A100, A400);
$warn: legacy.define-palette(legacy.$red-palette);
$m2: legacy.define-light-theme((
  color: (primary: $primary, accent: $accent, warn: $warn),
  typography: legacy.define-legacy-typography-config(),
  density: 0
));
$m3: mat.define-theme((
  color: (theme-type: light, primary: mat.$azure-palette, tertiary: mat.$blue-palette)
));
`;
}

function themeSource(order) {
  const current = '@include mat.all-component-themes($m3);';
  const legacy = '@include legacy.all-legacy-component-themes($m2);';
  const body = order === 'current-only' ? current
    : order === 'legacy-only' ? legacy
    : order === 'current-then-legacy' ? `${current}\n  ${legacy}`
    : `${legacy}\n  ${current}`;
  return `${themePrelude()}\n.order { ${body} }\n`;
}

function nestedThemeSource() {
  return `${themePrelude()}
.app-nested {
  @include mat.all-component-themes($m3);
  .legacy-nested {
    @include legacy.all-legacy-component-themes($m2);
  }
}
`;
}

function lazyInitialSource() {
  return `${themePrelude()}
.app-nested {
  @include mat.all-component-themes($m3);
}
`;
}

function lazyOverlaySource() {
  return `${themePrelude()}
body .cdk-overlay-container .lazy-m3-overlay {
  @include mat.all-component-themes($m3);
}
body .cdk-overlay-container .lazy-m2-overlay {
  @include legacy.all-legacy-component-themes($m2);
}
`;
}

function currentSharedSource() {
  return `${themePrelude()}
.current-shared-scope {
  @include mat.ripple();
  @include mat.strong-focus-indicators-structure();
  @include mat.pseudo-checkbox-theme($m3);
}
`;
}

function legacySharedSource() {
  return `${themePrelude()}
.legacy-shared-scope {
  @include legacy.ripple();
  @include legacy.strong-focus-indicators();
  @include legacy.legacy-core();
  @include legacy.pseudo-checkbox-legacy-size();
  @include legacy.pseudo-checkbox-theme($m2);
}
`;
}

function groupedControlSource() {
  return `
@use '@angular/material' as mat;
.mat-mdc-raised-button,
.mat-raised-button {
  @include mat.strong-focus-indicators-structure();
}
`;
}

function unscopedLegacyCoreSource() {
  return `
@use '@ngx-compat/material-legacy' as legacy;
@include legacy.legacy-core();
`;
}

export function orderFacts(css) {
  const m3 = css.indexOf(M3_MARKER);
  const m2 = css.indexOf(M2_MARKER);
  return {
    bytes: css.length,
    m3_marker: M3_MARKER,
    m2_marker: M2_MARKER,
    m3_index: m3,
    m2_index: m2,
    m3_present: m3 >= 0,
    m2_present: m2 >= 0,
  };
}

export function lineErrors(line, compiled) {
  const currentOnly = compiled['current-only'];
  const legacyOnly = compiled['legacy-only'];
  const currentFirst = compiled['current-then-legacy'];
  const legacyFirst = compiled['legacy-then-current'];
  const errors = [];
  if (!currentOnly?.m3_present || currentOnly?.m2_present) {
    errors.push(`${line}: current theme marker is not distinct`);
  }
  if (!legacyOnly?.m2_present || legacyOnly?.m3_present) {
    errors.push(`${line}: legacy theme marker is not distinct`);
  }
  if (!(currentFirst?.m3_present && currentFirst?.m2_present && currentFirst.m3_index < currentFirst.m2_index)) {
    errors.push(`${line}: current-then-legacy did not emit M3 before M2`);
  }
  if (!(legacyFirst?.m3_present && legacyFirst?.m2_present && legacyFirst.m2_index < legacyFirst.m3_index)) {
    errors.push(`${line}: legacy-then-current did not emit M2 before M3`);
  }
  return errors;
}

export const NESTED_OUTER = 'app-nested';
export const NESTED_LEGACY = 'legacy-nested';
export const LAZY_M3_SCOPE = 'lazy-m3-overlay';
export const LAZY_M2_SCOPE = 'lazy-m2-overlay';
export const CURRENT_SCOPE = 'current-shared-scope';
export const LEGACY_SCOPE = 'legacy-shared-scope';
export const M3_PSEUDO_MARKER = '--mat-pseudo-checkbox-full-selected-icon-color';
export const CURRENT_M3_CONTROL = 'mat-mdc-raised-button';
export const SHARED_SELECTOR_NAMES = Object.freeze([
  'mat-ripple',
  'mat-ripple-element',
  'mat-focus-indicator',
  'mat-mdc-focus-indicator',
  'mat-pseudo-checkbox',
]);

export const NESTED_LAZY_OVERLAY_IDS = Object.freeze([
  'nested-theme-scope',
  'lazy-body-overlay',
]);

export const SHARED_STYLE_BOUNDARY_IDS = Object.freeze([
  'current-shared-scope',
  'legacy-shared-scope',
]);

function snippet(selector) {
  const flat = selector.replace(/\s+/g, ' ').trim();
  return flat.length > 160 ? `${flat.slice(0, 157)}...` : flat;
}

function hasClass(selector, name) {
  return new RegExp(`\\.${name}(?![A-Za-z0-9_-])`).test(selector);
}

function hasType(selector, name) {
  return new RegExp(`(^|[^A-Za-z0-9_-])${name}(?![A-Za-z0-9_-])`).test(selector);
}

export function splitSelectors(prelude) {
  const parts = [];
  let current = '';
  let depth = 0;
  for (const ch of prelude) {
    if (ch === '(') depth += 1;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

export function parseStyleRules(css) {
  const rules = [];
  const length = css.length;
  function walk(start, end) {
    let pos = start;
    while (pos < end) {
      const brace = css.indexOf('{', pos);
      if (brace < 0 || brace >= end) break;
      const prelude = css.slice(pos, brace).trim();
      let depth = 1;
      let cursor = brace + 1;
      while (cursor < end && depth > 0) {
        const ch = css[cursor];
        if (ch === '{') depth += 1;
        else if (ch === '}') depth -= 1;
        cursor += 1;
      }
      const innerStart = brace + 1;
      const innerEnd = cursor - 1;
      if (prelude.startsWith('@')) {
        walk(innerStart, innerEnd);
      } else if (prelude) {
        rules.push({
          prelude,
          selectors: splitSelectors(prelude),
          body: css.slice(innerStart, innerEnd),
        });
      }
      pos = cursor;
    }
  }
  walk(0, length);
  return rules;
}

function m2Selectors(rules) {
  return rules.flatMap(rule => rule.selectors.filter(selector => hasClass(selector, 'mat-raised-button')));
}

function markerRules(rules) {
  return rules.filter(rule => rule.body.includes(M3_MARKER));
}

export function nestedThemeScopeErrors(css) {
  const rules = parseStyleRules(css);
  const errors = [];
  const m3 = markerRules(rules);
  const outer = m3.some(rule => rule.selectors.some(selector => hasClass(selector, NESTED_OUTER) && !hasClass(selector, NESTED_LEGACY)));
  if (!outer) errors.push('nested-theme-scope: M3 marker is not on the outer nested scope');
  if (m3.some(rule => rule.selectors.some(selector => hasClass(selector, NESTED_LEGACY)))) {
    errors.push('nested-theme-scope: M3 marker landed in the nested legacy scope');
  }
  const legacySelectors = m2Selectors(rules);
  if (legacySelectors.length === 0) errors.push('nested-theme-scope: legacy marker was not compiled');
  for (const selector of legacySelectors) {
    if (!hasClass(selector, NESTED_OUTER) || !hasClass(selector, NESTED_LEGACY)) {
      errors.push(`nested-theme-scope: legacy marker escaped the nested legacy scope (${snippet(selector)})`);
      break;
    }
  }
  for (const rule of rules) {
    const currentControl = rule.selectors.some(selector => hasClass(selector, CURRENT_M3_CONTROL) || hasClass(selector, 'mat-mdc-focus-indicator'));
    const legacyControl = rule.selectors.some(selector => hasClass(selector, 'mat-raised-button'));
    if (currentControl && legacyControl) {
      errors.push(`nested-theme-scope: shared selector would restyle a current M3 control (${snippet(rule.prelude)})`);
      break;
    }
  }
  return errors;
}

export function nestedThemeScopeFacts(css) {
  const rules = parseStyleRules(css);
  const m3Selectors = markerRules(rules).flatMap(rule => rule.selectors);
  const legacySelectors = m2Selectors(rules);
  return {
    bytes: css.length,
    m3_marker: M3_MARKER,
    m2_marker: M2_MARKER,
    m3_selectors: [...new Set(m3Selectors.map(snippet))],
    m2_selector_count: legacySelectors.length,
    m2_selector_example: legacySelectors.length ? snippet(legacySelectors[0]) : null,
    m3_on_outer_scope: m3Selectors.some(selector => hasClass(selector, NESTED_OUTER) && !hasClass(selector, NESTED_LEGACY)),
    m3_in_legacy_scope: m3Selectors.some(selector => hasClass(selector, NESTED_LEGACY)),
    m2_confined_to_legacy_scope: legacySelectors.length > 0 && legacySelectors.every(selector => hasClass(selector, NESTED_OUTER) && hasClass(selector, NESTED_LEGACY)),
  };
}

function overlayConfined(selector) {
  return hasType(selector, 'body')
    && hasClass(selector, 'cdk-overlay-container')
    && hasClass(selector, LAZY_M2_SCOPE)
    && !hasClass(selector, LAZY_M3_SCOPE);
}

export function lazyBodyOverlayErrors(initialCss, lazyCss) {
  const errors = [];
  const initialRules = parseStyleRules(initialCss);
  const lazyRules = parseStyleRules(lazyCss);
  const initialM3 = markerRules(initialRules);
  if (!initialM3.some(rule => rule.selectors.some(selector => hasClass(selector, NESTED_OUTER)))) {
    errors.push('lazy-body-overlay: initial stylesheet is missing the M3 marker on .app-nested');
  }
  if (m2Selectors(initialRules).length) {
    errors.push('lazy-body-overlay: initial stylesheet emitted the legacy marker before the lazy sheet');
  }
  const lazyM3 = markerRules(lazyRules);
  const overlayM3 = lazyM3.some(rule => rule.selectors.some(selector => hasType(selector, 'body')
    && hasClass(selector, 'cdk-overlay-container')
    && hasClass(selector, LAZY_M3_SCOPE)
    && !hasClass(selector, LAZY_M2_SCOPE)));
  if (!overlayM3) errors.push('lazy-body-overlay: M3 marker is not on the body-level overlay selector');
  if (lazyM3.some(rule => rule.selectors.some(selector => hasClass(selector, LAZY_M2_SCOPE)))) {
    errors.push('lazy-body-overlay: M3 marker landed in the legacy overlay scope');
  }
  const legacySelectors = m2Selectors(lazyRules);
  if (!legacySelectors.length) errors.push('lazy-body-overlay: lazy stylesheet did not compile the legacy marker');
  for (const selector of legacySelectors) {
    if (!overlayConfined(selector)) {
      errors.push(`lazy-body-overlay: legacy marker is not confined to the body overlay scope (${snippet(selector)})`);
      break;
    }
  }
  const combined = `${initialCss}\n${lazyCss}`;
  const m3Index = combined.indexOf(M3_MARKER);
  const m2Index = combined.indexOf(M2_MARKER);
  if (!(m3Index >= 0 && m2Index > initialCss.length && m3Index < m2Index)) {
    errors.push('lazy-body-overlay: lazy legacy sheet was not ordered after the initial M3 sheet');
  }
  for (const rule of lazyRules) {
    const currentControl = rule.selectors.some(selector => hasClass(selector, CURRENT_M3_CONTROL));
    const legacyControl = rule.selectors.some(selector => hasClass(selector, 'mat-raised-button'));
    if (currentControl && legacyControl) {
      errors.push(`lazy-body-overlay: shared selector would restyle a current M3 control (${snippet(rule.prelude)})`);
      break;
    }
  }
  return errors;
}

export function lazyBodyOverlayFacts(initialCss, lazyCss) {
  const initialRules = parseStyleRules(initialCss);
  const lazyRules = parseStyleRules(lazyCss);
  const legacySelectors = m2Selectors(lazyRules);
  const combined = `${initialCss}\n${lazyCss}`;
  return {
    initial_bytes: initialCss.length,
    lazy_bytes: lazyCss.length,
    m3_marker: M3_MARKER,
    m2_marker: M2_MARKER,
    initial_m3_selectors: [...new Set(markerRules(initialRules).flatMap(rule => rule.selectors).map(snippet))],
    initial_m2_present: m2Selectors(initialRules).length > 0,
    lazy_m3_selectors: [...new Set(markerRules(lazyRules).flatMap(rule => rule.selectors).map(snippet))],
    m2_selector_count: legacySelectors.length,
    m2_selector_example: legacySelectors.length ? snippet(legacySelectors[0]) : null,
    body_overlay_selector: 'body .cdk-overlay-container',
    m3_overlay_scope: `.${LAZY_M3_SCOPE}`,
    m2_overlay_scope: `.${LAZY_M2_SCOPE}`,
    m3_index: combined.indexOf(M3_MARKER),
    m2_index: combined.indexOf(M2_MARKER),
    lazy_loaded_after_initial: combined.indexOf(M2_MARKER) > initialCss.length,
  };
}

function selectorsWith(rules, name) {
  return rules.flatMap(rule => rule.selectors.filter(selector => hasClass(selector, name)));
}

export function sharedStyleBoundaryErrors(currentCss, legacyCss) {
  const errors = [];
  const currentRules = parseStyleRules(currentCss);
  const legacyRules = parseStyleRules(legacyCss);
  const currentNeeds = ['mat-ripple', 'mat-ripple-element', 'mat-focus-indicator'];
  for (const name of currentNeeds) {
    const found = selectorsWith(currentRules, name);
    if (!found.length || found.some(selector => !hasClass(selector, CURRENT_SCOPE) || hasClass(selector, LEGACY_SCOPE))) {
      errors.push(`shared-style-boundary: current selector .${name} is not confined to .${CURRENT_SCOPE}`);
    }
  }
  const currentPseudo = currentRules.filter(rule => rule.body.includes(M3_PSEUDO_MARKER));
  if (!currentPseudo.some(rule => rule.selectors.some(selector => hasClass(selector, CURRENT_SCOPE) && !hasClass(selector, LEGACY_SCOPE)))) {
    errors.push(`shared-style-boundary: current scope is missing ${M3_PSEUDO_MARKER}`);
  }
  for (const name of ['mat-mdc-focus-indicator', 'mat-pseudo-checkbox']) {
    if (selectorsWith(currentRules, name).length) {
      errors.push(`shared-style-boundary: legacy selector .${name} landed in the current compilation scope`);
    }
  }
  if (currentCss.includes(`.${LEGACY_SCOPE}`)) {
    errors.push('shared-style-boundary: legacy scope class landed in the current compilation');
  }
  const legacyNeeds = ['mat-ripple', 'mat-focus-indicator', 'mat-pseudo-checkbox', 'mat-mdc-focus-indicator'];
  for (const name of legacyNeeds) {
    const found = selectorsWith(legacyRules, name);
    if (!found.length) {
      errors.push(`shared-style-boundary: legacy compilation is missing .${name}`);
      continue;
    }
    for (const selector of found) {
      if (!hasClass(selector, LEGACY_SCOPE) || hasClass(selector, CURRENT_SCOPE)) {
        errors.push(`shared-style-boundary: legacy selector .${name} is not confined to .${LEGACY_SCOPE} (${snippet(selector)})`);
        break;
      }
    }
  }
  if (legacyCss.includes(M3_PSEUDO_MARKER)) {
    errors.push(`shared-style-boundary: current marker ${M3_PSEUDO_MARKER} landed in the legacy compilation`);
  }
  if (legacyCss.includes(`.${CURRENT_SCOPE}`)) {
    errors.push('shared-style-boundary: current scope class landed in the legacy compilation');
  }
  return errors;
}

export function sharedStyleFacts(css, scope) {
  const rules = parseStyleRules(css);
  const present = {};
  for (const name of SHARED_SELECTOR_NAMES) {
    const found = selectorsWith(rules, name);
    present[`.${name}`] = {
      count: found.length,
      example: found.length ? snippet(found[0]) : null,
      confined_to_scope: found.length ? found.every(selector => hasClass(selector, scope)) : null,
    };
  }
  return {
    bytes: css.length,
    scope: `.${scope}`,
    selectors: present,
    m3_pseudo_marker: M3_PSEUDO_MARKER,
    m3_pseudo_marker_present: css.includes(M3_PSEUDO_MARKER),
  };
}

function compileWorkspaceExtensions(loadPaths) {
  const nestedCss = compileCss(nestedThemeSource(), loadPaths, 'nested-theme-scope.scss');
  const initialCss = compileCss(lazyInitialSource(), loadPaths, 'lazy-initial.scss');
  const lazyCss = compileCss(lazyOverlaySource(), loadPaths, 'lazy-body-overlay.scss');
  const currentCss = compileCss(currentSharedSource(), loadPaths, 'current-shared-scope.scss');
  const legacyCss = compileCss(legacySharedSource(), loadPaths, 'legacy-shared-scope.scss');
  const groupedCss = compileCss(groupedControlSource(), loadPaths, 'nested-contamination.scss');
  const leakCss = compileCss(unscopedLegacyCoreSource(), loadPaths, 'shared-contamination.scss');
  const nestedErrors = nestedThemeScopeErrors(nestedCss);
  const lazyErrors = lazyBodyOverlayErrors(initialCss, lazyCss);
  const sharedErrors = sharedStyleBoundaryErrors(currentCss, legacyCss);
  const nestedNegative = nestedThemeScopeErrors(`${nestedCss}\n${groupedCss}`);
  const sharedNegative = sharedStyleBoundaryErrors(currentCss, `${legacyCss}\n${leakCss}`);
  const errors = [...nestedErrors, ...lazyErrors, ...sharedErrors];
  const nestedRejected = nestedNegative.some(error => error.includes('shared selector would restyle a current M3 control'));
  const sharedRejected = sharedNegative.some(error => error.includes('.mat-mdc-focus-indicator') && error.includes('not confined'));
  if (!nestedRejected) errors.push('nested-lazy-overlay: contamination negative was not rejected');
  if (!sharedRejected) errors.push('shared-style-boundary: contamination negative was not rejected');
  return {
    errors,
    nested_theme_scope: nestedThemeScopeFacts(nestedCss),
    lazy_body_overlay: lazyBodyOverlayFacts(initialCss, lazyCss),
    current_shared_scope: sharedStyleFacts(currentCss, CURRENT_SCOPE),
    legacy_shared_scope: sharedStyleFacts(legacyCss, LEGACY_SCOPE),
    contamination_negatives: {
      'nested-lazy-overlay': {
        rejected: nestedRejected,
        rostered: false,
        fixture: 'compiled mat.strong-focus-indicators-structure under a shared .mat-mdc-raised-button, .mat-raised-button selector and appended it to the nested theme',
        errors: nestedNegative,
      },
      'shared-style-boundary': {
        rejected: sharedRejected,
        rostered: false,
        fixture: 'compiled unscoped legacy.legacy-core and appended it to the legacy shared-style scope',
        errors: sharedNegative,
      },
    },
  };
}

function compileLine({line, loadPaths, sourceKind, tarball}) {
  const orders = ['current-only', 'legacy-only', 'current-then-legacy', 'legacy-then-current'];
  const compiled = {};
  for (const order of orders) {
    compiled[order] = orderFacts(compileCss(themeSource(order), loadPaths, `inclusion-${line}-${order}.scss`));
  }
  return {
    line,
    source_kind: sourceKind,
    tarball_sha256: tarball ? sha256File(tarball) : null,
    material_version: materialVersion(loadPaths.find(path => existsSync(join(path, '@angular/material/package.json')))),
    orders: compiled,
    errors: lineErrors(line, compiled),
  };
}


export const INCLUSION_ORDER_IDS = Object.freeze([
  'current-only',
  'legacy-only',
  'current-then-legacy',
  'legacy-then-current',
]);

export function orderPassed(order, facts) {
  if (!facts) return false;
  if (order === 'current-only') return facts.m3_present === true && facts.m2_present === false;
  if (order === 'legacy-only') return facts.m2_present === true && facts.m3_present === false;
  if (order === 'current-then-legacy') {
    return facts.m3_present === true && facts.m2_present === true && facts.m3_index < facts.m2_index;
  }
  if (order === 'legacy-then-current') {
    return facts.m3_present === true && facts.m2_present === true && facts.m2_index < facts.m3_index;
  }
  return false;
}

export function writeInclusionOrderAssertions(outputDir, line) {
  if (line?.line !== 'main' || line?.source_kind !== 'workspace') {
    throw new Error('inclusion-order assertions are only the fresh main workspace compile');
  }
  if (!Array.isArray(line.errors) || line.errors.length !== 0) {
    throw new Error('refusing to emit inclusion-order assertions for a failed compile');
  }
  const orders = line.orders;
  if (!orders || INCLUSION_ORDER_IDS.some(id => !orders[id]) || Object.keys(orders).length !== INCLUSION_ORDER_IDS.length) {
    throw new Error('inclusion-order compile did not record exactly the four executed orders');
  }
  const written = [];
  for (const id of INCLUSION_ORDER_IDS) {
    if (!orderPassed(id, orders[id])) {
      throw new Error(`refusing to emit a pass assertion for ${id}`);
    }
    const facts = orders[id];
    const body = {
      case_id: id,
      result: 'pass',
      kind: 'assertion',
      line: 'main',
      source_kind: 'workspace',
      material_version: line.material_version,
      bytes: facts.bytes,
      m3_marker: facts.m3_marker,
      m2_marker: facts.m2_marker,
      m3_index: facts.m3_index,
      m2_index: facts.m2_index,
      m3_present: facts.m3_present,
      m2_present: facts.m2_present,
      group: 'inclusion-order',
      g07_claim: 'not-passed',
      not_executed: {
        '21.x': null,
      },
    };
    const name = `${id}.json`;
    writeFileSync(join(outputDir, name), `${JSON.stringify(body, null, 2)}\n`);
    written.push(name);
  }
  return written;
}

function extensionReady(line) {
  const extensions = line?.extensions;
  if (!extensions || extensions.errors?.length) return false;
  const negatives = extensions.contamination_negatives;
  return negatives?.['nested-lazy-overlay']?.rejected === true
    && negatives?.['nested-lazy-overlay']?.rostered === false
    && negatives?.['shared-style-boundary']?.rejected === true
    && negatives?.['shared-style-boundary']?.rostered === false;
}

export function writeExtensionAssertions(outputDir, line) {
  if (line?.line !== 'main' || line?.source_kind !== 'workspace') {
    throw new Error('extended m3 assertions are only the fresh main workspace compile');
  }
  if (!extensionReady(line)) {
    throw new Error('refusing to emit extended m3 assertions without a rejected contamination negative');
  }
  const extensions = line.extensions;
  const cases = [
    ['nested-lazy-overlay', 'nested-theme-scope', extensions.nested_theme_scope],
    ['nested-lazy-overlay', 'lazy-body-overlay', extensions.lazy_body_overlay],
    ['shared-style-boundary', 'current-shared-scope', extensions.current_shared_scope],
    ['shared-style-boundary', 'legacy-shared-scope', extensions.legacy_shared_scope],
  ];
  if (cases.some(([, id, facts]) => !facts)) {
    throw new Error('extended m3 compile did not record every executed case');
  }
  const written = [];
  for (const [group, id, facts] of cases) {
    const body = {
      case_id: id,
      group,
      result: 'pass',
      kind: 'assertion',
      line: 'main',
      source_kind: 'workspace',
      material_version: line.material_version,
      g07_claim: 'not-passed',
      not_executed: {'21.x': null},
      ...facts,
    };
    const name = `${id}.json`;
    writeFileSync(join(outputDir, name), `${JSON.stringify(body, null, 2)}\n`);
    written.push(name);
  }
  return written;
}

function assertionOutputDir() {
  const names = ['RC_CHECK_ID', 'RC_RUN_ID', 'RC_INVOCATION_ID', 'RC_EVIDENCE_BINDING', 'RC_ASSERTION_OUTPUT_DIR'];
  const present = names.filter(name => process.env[name]);
  if (present.length === 0) return null;
  if (present.length !== names.length || process.env.RC_CHECK_ID !== 'm3-coexistence') {
    fail(2, 'm3-coexistence: incomplete coordinator environment');
  }
  const invocation = process.env.RC_INVOCATION_ID;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,191}$/.test(invocation)) {
    fail(2, 'm3-coexistence: invalid invocation identity');
  }
  let binding;
  try {
    binding = JSON.parse(process.env.RC_EVIDENCE_BINDING);
  } catch {
    fail(2, 'm3-coexistence: RC_EVIDENCE_BINDING is not JSON');
  }
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) {
    fail(2, 'm3-coexistence: binding is not an object');
  }
  if (binding.source_line === '21.x') return null;
  if (binding.source_line !== 'main') fail(2, 'm3-coexistence: binding source line is not main');
  const outputDir = process.env.RC_ASSERTION_OUTPUT_DIR;
  let stat;
  try {
    stat = lstatSync(outputDir);
  } catch {
    fail(2, 'm3-coexistence: assertion output directory is missing');
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail(2, 'm3-coexistence: assertion output directory is not a real directory');
  }
  if (!outputDir.endsWith(join('evidence', 'm3-coexistence', invocation))) {
    fail(2, 'm3-coexistence: assertion directory is not check-owned');
  }
  return outputDir;
}

function main(argv) {
  const args = parseArgs(argv);
  const workspaceModules = [
    join(root, 'node_modules'),
    join(root, 'node_modules/.pnpm/node_modules'),
  ];
  const lines = [];
  if (args.tarball) {
    lines.push(compileLine({
      line: 'main',
      loadPaths: [stagePackage(args.tarball), ...workspaceModules],
      sourceKind: 'tarball',
      tarball: args.tarball,
    }));
  } else {
    const loadPaths = [root, ...workspaceModules];
    const line = compileLine({
      line: 'main',
      loadPaths,
      sourceKind: 'workspace',
      tarball: null,
    });
    line.extensions = compileWorkspaceExtensions(loadPaths);
    line.errors = [...line.errors, ...line.extensions.errors];
    lines.push(line);
  }
  if (args.tarball21) {
    lines.push(compileLine({
      line: '21.x',
      loadPaths: [stagePackage(args.tarball21), args.material21, join(args.material21, '.pnpm/node_modules')],
      sourceKind: 'tarball',
      tarball: args.tarball21,
    }));
  }
  const errors = lines.flatMap(line => line.errors);
  const workspaceMain = lines.find(line => line.line === 'main' && line.source_kind === 'workspace' && line.extensions);
  const report = {
    schema_version: 1,
    role: 'M2 and M3 inclusion-order compile',
    check_id: 'm3-coexistence',
    coverage: 'slice',
    implemented: false,
    lines,
    executed_case_ids: workspaceMain ? {
      'inclusion-order': [...INCLUSION_ORDER_IDS],
      'nested-lazy-overlay': [...NESTED_LAZY_OVERLAY_IDS],
      'shared-style-boundary': [...SHARED_STYLE_BOUNDARY_IDS],
      '21.x': null,
    } : {
      'inclusion-order': [...INCLUSION_ORDER_IDS],
      'nested-lazy-overlay': null,
      'shared-style-boundary': null,
      '21.x': null,
    },
    result: errors.length ? 'fail' : 'pass',
    g07_claim: 'not-passed',
    limitations: workspaceMain ? [
      'Fresh main workspace compile of the four inclusion orders.',
      'nested-theme-scope keeps the M3 marker on .app-nested and the legacy marker under .legacy-nested.',
      'lazy-body-overlay compiles a second stylesheet after the initial theme and confines markers to body .cdk-overlay-container scopes.',
      'current-shared-scope and legacy-shared-scope are separate compilations. Shared ripple, focus, and pseudo-checkbox selectors must stay in the compilation that emitted them.',
      'Contamination fixtures are rejected and are not rostered.',
      '21.x m3 groups stay null. implemented stays false. Does not mark m3-coexistence accepted. Does not claim G07.',
    ] : [
      'Both include orders compile and the theme markers follow that order.',
      'Tarball invocation does not execute nested, lazy, overlay, or shared-style cases.',
      '21.x m3 groups stay null. implemented stays false. Does not mark m3-coexistence accepted. Does not claim G07.',
    ],
  };
  mkdirSync(dirname(args.out), {recursive: true});
  writeFileSync(args.out, JSON.stringify(report, null, 2) + '\n');
  let assertion_files = null;
  const outputDir = assertionOutputDir();
  if (outputDir) {
    const mainLine = lines.find(line => line.line === 'main' && line.source_kind === 'workspace');
    if (!mainLine) fail(2, 'm3-coexistence: main workspace compile did not run');
    if (errors.length === 0) {
      try {
        assertion_files = [
          ...writeInclusionOrderAssertions(outputDir, mainLine),
          ...writeExtensionAssertions(outputDir, mainLine),
        ];
      } catch (error) {
        fail(1, error instanceof Error ? error.message : String(error));
      }
    }
  }
  console.log(JSON.stringify({
    ok: errors.length === 0,
    assertion_files,
    lines: lines.map(line => ({
      line: line.line,
      source_kind: line.source_kind,
      material_version: line.material_version,
      current_then_legacy: line.orders['current-then-legacy'].m3_index < line.orders['current-then-legacy'].m2_index,
      legacy_then_current: line.orders['legacy-then-current'].m2_index < line.orders['legacy-then-current'].m3_index,
      extended: Boolean(line.extensions) && line.extensions.errors.length === 0,
    })),
    contamination_rejected: workspaceMain ? {
      'nested-lazy-overlay': workspaceMain.extensions.contamination_negatives['nested-lazy-overlay'].rejected,
      'shared-style-boundary': workspaceMain.extensions.contamination_negatives['shared-style-boundary'].rejected,
    } : null,
    errors,
  }));
  return errors.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
