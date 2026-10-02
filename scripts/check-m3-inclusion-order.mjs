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
 * This does not claim G07. Nested, lazy, and overlay cases stay unexecuted.
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sass = createRequire(join(root, 'package.json'))('sass');
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

function compileCss(source, loadPaths, urlName) {
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

function themeSource(order) {
  const current = '@include mat.all-component-themes($m3);';
  const legacy = '@include legacy.all-legacy-component-themes($m2);';
  const body = order === 'current-only' ? current
    : order === 'legacy-only' ? legacy
    : order === 'current-then-legacy' ? `${current}\n  ${legacy}`
    : `${legacy}\n  ${current}`;
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
.order { ${body} }
`;
}

function orderFacts(css) {
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

function compileLine({line, loadPaths, sourceKind, tarball}) {
  const orders = ['current-only', 'legacy-only', 'current-then-legacy', 'legacy-then-current'];
  const compiled = {};
  for (const order of orders) {
    compiled[order] = orderFacts(compileCss(themeSource(order), loadPaths, `inclusion-${line}-${order}.scss`));
  }
  const currentOnly = compiled['current-only'];
  const legacyOnly = compiled['legacy-only'];
  const currentFirst = compiled['current-then-legacy'];
  const legacyFirst = compiled['legacy-then-current'];
  const errors = [];
  if (!currentOnly.m3_present || currentOnly.m2_present) errors.push(`${line}: current theme marker is not distinct`);
  if (!legacyOnly.m2_present || legacyOnly.m3_present) errors.push(`${line}: legacy theme marker is not distinct`);
  if (!(currentFirst.m3_present && currentFirst.m2_present && currentFirst.m3_index < currentFirst.m2_index)) {
    errors.push(`${line}: current-then-legacy did not emit M3 before M2`);
  }
  if (!(legacyFirst.m3_present && legacyFirst.m2_present && legacyFirst.m2_index < legacyFirst.m3_index)) {
    errors.push(`${line}: legacy-then-current did not emit M2 before M3`);
  }
  return {
    line,
    source_kind: sourceKind,
    tarball_sha256: tarball ? sha256File(tarball) : null,
    material_version: materialVersion(loadPaths.find(path => existsSync(join(path, '@angular/material/package.json')))),
    orders: compiled,
    errors,
  };
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
    lines.push(compileLine({
      line: 'main',
      loadPaths: [root, ...workspaceModules],
      sourceKind: 'workspace',
      tarball: null,
    }));
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
  const report = {
    schema_version: 1,
    role: 'M2 and M3 inclusion-order compile',
    check_id: 'm3-coexistence',
    coverage: 'slice',
    lines,
    result: errors.length ? 'fail' : 'pass',
    g07_claim: 'not-passed',
    limitations: [
      'Both include orders compile and the theme markers follow that order.',
      'Nested themes, lazy content, and body-level overlays are not executed.',
      'Does not claim G07. The full-verify inclusion-order roster stays null.',
    ],
  };
  mkdirSync(dirname(args.out), {recursive: true});
  writeFileSync(args.out, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({
    ok: errors.length === 0,
    lines: lines.map(line => ({
      line: line.line,
      source_kind: line.source_kind,
      material_version: line.material_version,
      current_then_legacy: line.orders['current-then-legacy'].m3_index < line.orders['current-then-legacy'].m2_index,
      legacy_then_current: line.orders['legacy-then-current'].m2_index < line.orders['legacy-then-current'].m3_index,
    })),
    errors,
  }));
  return errors.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
