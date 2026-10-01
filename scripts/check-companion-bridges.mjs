#!/usr/bin/env node
/**
 * Compile the thirteen public companion bridges and the owned-only aggregate.
 *
 * Beyond mixin-name mapping (map-companion-bridges.mjs) and sass-seal values:
 * inventorialize emitted --mat-* CSS custom properties per companion against
 * the owned $*-allowed token lists, classify dimension coverage heuristically,
 * prove owned-only does not leak companion tokens, and prove a current M3
 * icon theme block is unchanged beside owned-only.
 *
 * Does not render components or claim G06–G08 / RC-05-A02.
 *
 *   node scripts/check-companion-bridges.mjs
 *   node scripts/check-companion-bridges.mjs --line21 <worktree>
 */
import {createRequire} from 'node:module';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
const sass = require('sass');
const reportPath = path.join(root, 'compatibility/rc/reports/companion-bridge-tokens.json');
const mapReportPath = path.join(root, 'compatibility/rc/reports/companion-bridges.json');

const names = [
  'badge', 'bottom-sheet', 'button-toggle', 'datepicker', 'divider', 'expansion',
  'grid-list', 'icon', 'sidenav', 'stepper', 'sort', 'toolbar', 'tree',
];

let line21 = '/workspace/ngx-compat/material-21';
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (arg === '--line21') {
    const value = process.argv[i + 1];
    if (!value || value.startsWith('-')) {
      console.error('--line21 requires a path');
      process.exit(2);
    }
    line21 = path.resolve(value);
    i += 1;
    continue;
  }
  console.error(`Unknown argument: ${arg}`);
  process.exit(2);
}

const loadPaths = [
  root,
  path.join(root, 'node_modules'),
  path.join(root, 'node_modules/.pnpm/node_modules'),
];

const theme = `
  $primary: legacy.define-palette(legacy.$indigo-palette);
  $accent: legacy.define-palette(legacy.$pink-palette, A200, A100, A400);
  $warn: legacy.define-palette(legacy.$red-palette);
  $theme: legacy.define-light-theme((
    color: (primary: $primary, accent: $accent, warn: $warn),
    typography: legacy.define-legacy-typography-config(),
    density: 0
  ));
`;

function compile(body) {
  const result = sass.compileString(
    `@use 'projects/ngx-material-legacy' as legacy;\n@use '@angular/material' as mat;\n${body}`,
    {
      loadPaths,
      style: 'expanded',
      url: pathToFileURL(path.join(root, 'companion-bridge-check.scss')),
      silenceDeprecations: ['if-function', 'global-builtin', 'color-functions', 'import'],
    },
  );
  const external = result.loadedUrls
    .map((url) => url.pathname)
    .filter((pathname) => pathname.includes('/node_modules/@material/') || pathname.includes('/@material+'));
  if (external.length) {
    console.error('Sass loaded external @material files:', external.slice(0, 8).join(', '));
    process.exit(1);
  }
  return result.css;
}

function parseAllowedLists(source) {
  const out = {};
  const re = /\$([a-z0-9-]+)-allowed:\s*\((.*?)\);/gs;
  let match;
  while ((match = re.exec(source))) {
    const component = match[1];
    const tokens = match[2]
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    out[component] = tokens;
  }
  return out;
}

function classifyDimension(tokenKey) {
  const t = tokenKey.toLowerCase();
  if (/(font|text-size|text-weight|line-height|tracking|typography)/.test(t)) return 'typography';
  if (/(height|density|size(?!-text)|container-shape|shape$)/.test(t) && !/color|font|text/.test(t)) {
    return 'density';
  }
  if (/(color|background|opacity|shadow|elevation|outline|divider)/.test(t)) return 'color';
  if (/(shape|elevation|shadow|container)/.test(t)) return 'base';
  return 'base';
}

function extractComponentVars(css, component) {
  const prefix = `--mat-${component}-`;
  const found = new Set();
  const re = new RegExp(`${prefix.replace(/-/g, '\\-')}([a-z0-9-]+)\\s*:`, 'g');
  let match;
  while ((match = re.exec(css))) {
    found.add(match[1]);
  }
  return [...found].sort();
}

const bridgeSource = readFileSync(
  path.join(root, 'projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss'),
  'utf8',
);
const allowed = parseAllowedLists(bridgeSource);
if (Object.keys(allowed).length !== 13) {
  console.error(`Expected 13 $*-allowed lists, found ${Object.keys(allowed).length}`);
  process.exit(1);
}

const bridges = compile(`${theme}\n.bridges { @include legacy.all-current-companion-bridges($theme); }`);
const historical = compile(`${theme}\n.historical { @include legacy.all-legacy-component-themes($theme); }`);
const owned = compile(`${theme}\n.owned { @include legacy.all-owned-component-themes($theme); }`);

const smokeTokens = [
  '--mat-icon-color',
  '--mat-divider-color',
  '--mat-toolbar-container-background-color',
  '--mat-badge-background-color',
  '--mat-sort-arrow-color',
  '--mat-tree-container-background-color',
];
const missingSmoke = smokeTokens.filter((token) => !bridges.includes(token));
if (missingSmoke.length) {
  console.error('Bridge CSS missing smoke tokens:', missingSmoke.join(', '));
  process.exit(1);
}
const historicalMissing = smokeTokens.filter((token) => !historical.includes(token));
if (historicalMissing.length) {
  console.error('Historical aggregate is missing companion override tokens:', historicalMissing.join(', '));
  process.exit(1);
}
if (!historical.includes('.mat-raised-button') && !historical.includes('.mat-button')) {
  console.error('Historical aggregate dropped legacy-owned button selectors.');
  process.exit(1);
}
const leaked = smokeTokens.filter((token) => owned.includes(token));
if (leaked.length) {
  console.error('Owned-only aggregate emitted current companion tokens:', leaked.join(', '));
  process.exit(1);
}

const m3 = `
  $m3: mat.define-theme((
    color: (
      theme-type: light,
      primary: mat.$azure-palette,
      tertiary: mat.$blue-palette
    )
  ));
`;
const currentOnly = compile(`${m3}\n.current { @include mat.icon-theme($m3); }`);
const besideOwned = compile(
  `${theme}\n${m3}\n.current { @include mat.icon-theme($m3); }\n.owned { @include legacy.all-owned-component-themes($theme); }`,
);
const currentBlock = (css) => {
  const start = css.indexOf('.current {');
  const end = css.indexOf('\n}', start);
  return css.slice(start, end + 2);
};
if (currentBlock(currentOnly) !== currentBlock(besideOwned)) {
  console.error('Owned-only aggregate changed the current M3 icon theme block.');
  process.exit(1);
}
if (!bridges.includes('.bridges') || !owned.includes('.owned')) {
  console.error('Expected selector wrappers were not emitted.');
  process.exit(1);
}

function peerMaterial(materialRoot) {
  if (!existsSync(path.join(materialRoot, '_index.scss'))) return {present: false};
  const index = readFileSync(path.join(materialRoot, '_index.scss'), 'utf8');
  const version = JSON.parse(readFileSync(path.join(materialRoot, 'package.json'), 'utf8')).version;
  return {
    present: true,
    version,
    rows: names.map((name) => ({
      component: name,
      public_name: `${name}-overrides`,
      forwarded: index.includes(`${name}-overrides`),
    })),
  };
}

const mainPeer = peerMaterial(path.join(root, 'node_modules/@angular/material'));
const line21Peer = peerMaterial(path.join(line21, 'node_modules/@angular/material'));

const rows = [];
const errors = [];
for (const component of names) {
  const allowedKeys = allowed[component] || [];
  const emittedKeys = extractComponentVars(bridges, component);
  const emittedSet = new Set(emittedKeys);
  const present = allowedKeys.filter((k) => emittedSet.has(k));
  const missing = allowedKeys.filter((k) => !emittedSet.has(k));
  const unexpected = emittedKeys.filter((k) => !allowedKeys.includes(k));
  const dimensions = {
    base: false,
    color: false,
    typography: false,
    density: false,
  };
  for (const key of emittedKeys) {
    dimensions[classifyDimension(key)] = true;
  }
  const callsOverride = bridgeSource.includes(`mat.${component}-overrides`);
  const mainForwarded = mainPeer.present
    && mainPeer.rows.find((r) => r.component === component)?.forwarded;
  const line21Forwarded = !line21Peer.present
    ? null
    : line21Peer.rows.find((r) => r.component === component)?.forwarded;

  if (!callsOverride) errors.push(`${component}: bridge does not call mat.${component}-overrides`);
  if (emittedKeys.length === 0) errors.push(`${component}: emitted zero --mat-${component}-* tokens`);
  if (mainForwarded === false) errors.push(`${component}: main peer missing ${component}-overrides forward`);
  if (line21Forwarded === false) errors.push(`${component}: 21.x peer missing ${component}-overrides forward`);

  rows.push({
    component,
    calls_public_override: callsOverride,
    allowed_token_count: allowedKeys.length,
    emitted_token_count: emittedKeys.length,
    allowed_tokens: allowedKeys,
    emitted_tokens: emittedKeys,
    present_allowed_tokens: present,
    missing_allowed_tokens: missing,
    unexpected_emitted_tokens: unexpected,
    dimensions_present: dimensions,
    main_peer_forwards_overrides: mainForwarded ?? false,
    line_21_peer_forwards_overrides: line21Forwarded,
  });
}

const report = {
  schema_version: 1,
  role: 'companion bridge compiled token receipts (not rendered computed styles)',
  check_id: 'companion-bridge-tokens',
  peer_versions: {
    main: mainPeer.present ? mainPeer.version : null,
    line_21: line21Peer.present ? line21Peer.version : null,
  },
  companion_count: names.length,
  rows,
  owned_only_leak_smoke_tokens: leaked,
  m3_icon_theme_unchanged_beside_owned: true,
  historical_aggregate_includes_smoke_tokens: historicalMissing.length === 0,
  bridge_css_bytes: bridges.length,
  owned_css_bytes: owned.length,
  result: errors.length ? 'fail' : 'pass',
  g06_g07_g08_claim: 'not-passed',
  limitations: [
    'Compiled CSS custom-property inventory against owned $*-allowed lists and public *-overrides forwards.',
    'Missing allowed tokens are reported; density-0 theme may omit some density-sensitive keys.',
    'No browser/DOM computed-style rows were captured (not RC-05-A02 / G07).',
    'Does not claim ordered aggregate CSS parity or G06–G08.',
  ],
};

mkdirSync(path.dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');

// Refresh the lighter map report limitations so handoff points at token receipts.
if (existsSync(mapReportPath)) {
  try {
    const map = JSON.parse(readFileSync(mapReportPath, 'utf8'));
    map.token_receipts = 'compatibility/rc/reports/companion-bridge-tokens.json';
    map.limitations = [
      'Name/mixin presence plus compiled token receipts (companion-bridge-tokens.json).',
      'No component was rendered; not RC-05-A02 / G07.',
      'Does not claim G06–G08.',
    ];
    writeFileSync(mapReportPath, JSON.stringify(map, null, 2) + '\n');
  } catch {
    // map report refresh is best-effort; token report is authoritative
  }
}

console.log(JSON.stringify({
  ok: errors.length === 0,
  companions: names.length,
  emitted_total: rows.reduce((n, r) => n + r.emitted_token_count, 0),
  missing_allowed_total: rows.reduce((n, r) => n + r.missing_allowed_tokens.length, 0),
  report: path.relative(root, reportPath),
  errors,
}, null, 2));

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
