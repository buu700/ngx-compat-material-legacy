#!/usr/bin/env node
/**
 * Packed primary/testing export-name completeness vs authentic Material 16.2.14
 * legacy public-api barrels. Signature/overload/generics comparison is NOT done.
 *
 *   node scripts/api-completeness.mjs --tarball <path>
 *   node scripts/api-completeness.mjs --run <run.json>
 *
 * Applies F04 recipe-removal exceptions from compatibility/compatibility-exceptions.json.
 * Unclassified missing/extra names fail. Does not claim G02.
 */
import {existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {parseLegacyArgs, resolveLibraryFromRun, sha256File} from './resolve-run-library.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const refRoot = process.env.REFERENCE_MATERIAL_SRC
  || join(root, '../reference/angular-components/src/material');
const exceptionsPath = join(root, 'compatibility/compatibility-exceptions.json');
const reportPath = join(root, 'compatibility/rc/reports/api-completeness.json');

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

const {runPath, tarball: tarballArg, unknown} = parseLegacyArgs(process.argv.slice(2));
if (unknown.length) fail(2, `Unknown argument: ${unknown[0]}`);
let tarball;
let runId = null;
if (runPath) {
  const resolved = resolveLibraryFromRun(runPath);
  tarball = resolved.tarball;
  runId = resolved.runId;
} else if (tarballArg) {
  tarball = tarballArg;
} else {
  fail(2, '--tarball or --run is required');
}
if (!existsSync(tarball)) fail(2, `Missing tarball: ${tarball}`);
if (!existsSync(refRoot)) fail(2, `Missing 16.2.14 reference sources: ${refRoot}`);

function collectExports(file, seen = new Set()) {
  const real = resolve(file);
  if (seen.has(real) || !existsSync(real)) return new Set();
  seen.add(real);
  const text = readFileSync(real, 'utf8');
  const source = ts.createSourceFile(real, text, ts.ScriptTarget.Latest, true);
  const names = new Set();
  for (const st of source.statements) {
    if (ts.isExportDeclaration(st)) {
      if (st.exportClause && ts.isNamedExports(st.exportClause)) {
        for (const el of st.exportClause.elements) {
          names.add((el.name ?? el.propertyName).text);
        }
      }
      if (st.moduleSpecifier) {
        const spec = st.moduleSpecifier.text;
        const base = resolve(dirname(real), spec);
        for (const c of [`${base}.ts`, join(base, 'index.ts'), base]) {
          if (existsSync(c)) {
            for (const n of collectExports(c, seen)) names.add(n);
            break;
          }
        }
      }
    }
    const mods = st.modifiers ?? [];
    if (mods.some(m => m.kind === ts.SyntaxKind.ExportKeyword) && st.name) {
      names.add(st.name.text);
    }
  }
  return names;
}

function packExportNames(dtsText) {
  const names = new Set();
  for (const m of dtsText.matchAll(/\bexport\s+(?:declare\s+)?(?:abstract\s+)?(?:class|interface|type|const|function|enum)\s+(\w+)/g)) {
    names.add(m[1]);
  }
  for (const block of dtsText.matchAll(/\bexport\s+(?:type\s+)?\{([^}]+)\}/gs)) {
    for (const token of block[1].split(',')) {
      const t = token.replace(/^\s*type\s+/, '').trim();
      if (!t) continue;
      names.add(t.split(/\s+as\s+/).pop().trim());
    }
  }
  return names;
}

const exceptions = JSON.parse(readFileSync(exceptionsPath, 'utf8'));
const removedSymbols = new Set();
for (const ex of exceptions.exceptions || []) {
  if (ex.disposition === 'removed-with-native-migration' && typeof ex.symbol_or_selector === 'string') {
    for (const part of ex.symbol_or_selector.split('/')) {
      const cleaned = part.trim().replace(/\s+/g, '');
      if (cleaned) removedSymbols.add(cleaned);
    }
  }
}
// Canonical recipe names observed missing from pack after F04.
for (const name of [
  'matLegacyDialogAnimations', 'matDialogAnimations', 'defaultParams',
  'matLegacyFormFieldAnimations', 'matFormFieldAnimations',
  'matLegacyMenuAnimations', 'matMenuAnimations', 'fadeInLegacyItems', 'transformLegacyMenu',
  'fadeInItems', 'transformMenu',
  'matLegacySelectAnimations', 'matSelectAnimations',
  'matLegacySnackBarAnimations', 'matSnackBarAnimations',
  'matLegacyTabsAnimations', 'matTabsAnimations',
]) {
  removedSymbols.add(name);
}

const listing = spawnSync('tar', ['-tzf', tarball], {encoding: 'utf8'});
if (listing.status !== 0) fail(1, listing.stderr || 'tar listing failed');
const members = listing.stdout.split('\n').filter(Boolean);

const families = readdirSync(refRoot).filter(n => n.startsWith('legacy-')).sort();
const rows = [];
let unclassifiedMissing = 0;
let unclassifiedExtra = 0;

for (const fam of families) {
  for (const kind of ['primary', 'testing']) {
    const refPath = kind === 'primary'
      ? join(refRoot, fam, 'public-api.ts')
      : join(refRoot, fam, 'testing', 'public-api.ts');
    if (!existsSync(refPath)) continue;
    const refNames = [...collectExports(refPath)].sort();
    const needle = kind === 'primary'
      ? `ngx-compat-material-legacy-${fam}.d.ts`
      : `ngx-compat-material-legacy-${fam}-testing.d.ts`;
    const member = members.find(n => n.endsWith(`/${needle}`) || n.endsWith(needle));
    let packNames = [];
    if (member) {
      const extracted = spawnSync('tar', ['-xOf', tarball, member], {encoding: 'utf8', maxBuffer: 32 * 1024 * 1024});
      if (extracted.status !== 0) fail(1, `unable to read ${member}`);
      packNames = [...packExportNames(extracted.stdout)].sort();
    }
    const missing = refNames.filter(n => !packNames.includes(n) && !removedSymbols.has(n));
    // Extras are informational; motion helpers / MatCommonModule need explicit allowlist before green.
    const extra = packNames.filter(n => !refNames.includes(n));
    unclassifiedMissing += missing.length;
    unclassifiedExtra += extra.length;
    rows.push({
      family: fam,
      kind,
      packed_member: member || null,
      ref_count: refNames.length,
      pack_count: packNames.length,
      missing,
      extra,
    });
  }
}

const ok = unclassifiedMissing === 0 && rows.every(r => r.packed_member);
// Extra names intentionally keep this check failing until an allowlist exists.
const sealed = ok && unclassifiedExtra === 0;

const report = {
  schema_version: 1,
  role: 'packed vs 16.2.14 export-name completeness (not signatures)',
  check_id: 'api-completeness',
  run_id: runId,
  tarball_sha256: sha256File(tarball),
  reference_root: refRoot,
  families: families.length,
  rows,
  unclassified_missing_total: unclassifiedMissing,
  unclassified_extra_total: unclassifiedExtra,
  recipe_removals_applied: [...removedSymbols].sort(),
  result: sealed ? 'pass' : 'fail',
  limitations: [
    'Compares export names only; not constructors, overloads, generics, protected members, or DI identity.',
    'Unclassified extras (motion helpers, MatCommonModule, underscore bases, factories) block sealing.',
    'Does not claim G02.',
  ],
};

mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  ok: sealed,
  missing: unclassifiedMissing,
  extra: unclassifiedExtra,
  families: families.length,
}, null, 2));
if (!sealed) {
  fail(1, `api-completeness not sealed: missing=${unclassifiedMissing} extra=${unclassifiedExtra}`);
}
