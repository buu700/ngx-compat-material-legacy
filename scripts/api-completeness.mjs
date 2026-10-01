#!/usr/bin/env node
/**
 * Packed primary/testing export completeness vs authentic Material 16.2.14
 * legacy public-api barrels, plus structural member-name signature evidence.
 *
 *   node scripts/api-completeness.mjs --tarball <path>
 *   node scripts/api-completeness.mjs --run <run.json>
 *
 * Applies F04 recipe-removal exceptions and the reviewed export-name allowlist.
 * Does not claim G02.
 */
import {existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {parseLegacyArgs, resolveLibraryFromRun, sha256File} from './resolve-run-library.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const exceptionsPath = join(root, 'compatibility/compatibility-exceptions.json');
const allowlistPath = join(root, 'compatibility/rc/api/export-name-allowlist.json');
const reportPath = join(root, 'compatibility/rc/reports/api-completeness.json');
const baselineTag = process.env.REFERENCE_BASELINE_TAG || 'baseline/angular-components-16.2.x';

function resolveReferenceRoot() {
  const envRoot = process.env.REFERENCE_MATERIAL_SRC;
  if (envRoot && existsSync(envRoot)) return resolve(envRoot);
  const sibling = join(root, '../reference/angular-components/src/material');
  if (existsSync(sibling)) return sibling;
  // CI / hosts without the sibling checkout: export legacy barrels from the
  // immutable baseline tag preserved in this repository.
  const cache = join(root, 'artifacts/local/ref-material-16.2.14');
  const marker = join(cache, '.baseline-tag');
  const materialRoot = join(cache, 'src/material');
  if (!(existsSync(marker) && readFileSync(marker, 'utf8').trim() === baselineTag
    && existsSync(join(materialRoot, 'legacy-button/public-api.ts')))) {
    rmSync(cache, {recursive: true, force: true});
    mkdirSync(cache, {recursive: true});
    const archived = spawnSync('git', ['archive', baselineTag, 'src/material'], {
      cwd: root,
      encoding: 'buffer',
      maxBuffer: 64 * 1024 * 1024,
    });
    if (archived.status !== 0) {
      fail(2, `Unable to export ${baselineTag}:src/material (${archived.stderr?.toString() || 'git archive failed'})`);
    }
    const extracted = spawnSync('tar', ['-x', '-C', cache], {input: archived.stdout, cwd: root});
    if (extracted.status !== 0) fail(2, 'Failed to extract baseline material sources');
    writeFileSync(marker, baselineTag + '\n');
  }
  return materialRoot;
}

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
if (!existsSync(allowlistPath)) fail(2, `Missing allowlist: ${allowlistPath}`);
const refRoot = resolveReferenceRoot();
if (!existsSync(refRoot)) fail(2, `Missing 16.2.14 reference sources: ${refRoot}`);

function resolveSpecifier(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  for (const candidate of [`${base}.ts`, join(base, 'index.ts'), base]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

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
        // Named re-exports do not pull sibling exports from the target module.
        continue;
      }
      if (st.moduleSpecifier && !st.exportClause) {
        // export * from './mod'
        const spec = st.moduleSpecifier.text;
        if (!spec.startsWith('.')) continue;
        const next = resolveSpecifier(real, spec);
        if (next) {
          for (const n of collectExports(next, seen)) names.add(n);
        }
      }
      continue;
    }
    const mods = st.modifiers ?? [];
    const isExport = mods.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!isExport) continue;
    if (st.name && (ts.isClassDeclaration(st) || ts.isFunctionDeclaration(st)
      || ts.isInterfaceDeclaration(st) || ts.isEnumDeclaration(st)
      || ts.isTypeAliasDeclaration(st))) {
      names.add(st.name.text);
    }
    if (ts.isVariableStatement(st)) {
      for (const decl of st.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) names.add(decl.name.text);
      }
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

/** Public member names from a class/interface declaration via the TS parser. */
function memberNamesFromDeclare(block) {
  const wrapped = block.startsWith('declare ') ? block : `declare ${block}`;
  const source = ts.createSourceFile('pack-shape.d.ts', wrapped, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const members = new Set();
  for (const st of source.statements) {
    if (!ts.isClassDeclaration(st) && !ts.isInterfaceDeclaration(st)) continue;
    for (const member of st.members || []) {
      if (!member.name) continue;
      let name = null;
      if (ts.isIdentifier(member.name)) name = member.name.text;
      else if (ts.isStringLiteral(member.name)) name = member.name.text;
      if (!name || name.startsWith('ɵ') || name === 'constructor') continue;
      const mods = member.modifiers ?? [];
      if (mods.some(m => m.kind === ts.SyntaxKind.PrivateKeyword)) continue;
      members.add(name);
    }
  }
  return [...members].sort();
}

function extractDeclareBlock(dtsText, name) {
  const patterns = [
    new RegExp(`declare\\s+abstract\\s+class\\s+${name}\\b[\\s\\S]*?\\n\\}`, 'm'),
    new RegExp(`declare\\s+class\\s+${name}\\b[\\s\\S]*?\\n\\}`, 'm'),
    new RegExp(`declare\\s+interface\\s+${name}\\b[\\s\\S]*?\\n\\}`, 'm'),
    new RegExp(`declare\\s+function\\s+${name}\\b[\\s\\S]*?;`, 'm'),
    new RegExp(`declare\\s+const\\s+${name}\\b[\\s\\S]*?;`, 'm'),
    new RegExp(`(?:export\\s+)?type\\s+${name}\\b[\\s\\S]*?;`, 'm'),
  ];
  for (const re of patterns) {
    const m = dtsText.match(re);
    if (m) return m[0];
  }
  return null;
}

function sourceSymbolShape(file, symbolName, seen = new Set()) {
  const real = resolve(file);
  if (seen.has(real) || !existsSync(real)) return null;
  seen.add(real);
  const text = readFileSync(real, 'utf8');
  const source = ts.createSourceFile(real, text, ts.ScriptTarget.Latest, true);

  function shapeFromNode(node) {
    if (ts.isFunctionDeclaration(node) || ts.isVariableStatement(node)) {
      return {kind: 'function-or-const', members: [symbolName]};
    }
    if (ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) {
      return {kind: 'type-or-enum', members: [symbolName]};
    }
    if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
      const members = [];
      for (const member of node.members || []) {
        if (!member.name || !ts.isIdentifier(member.name)) continue;
        const n = member.name.text;
        if (n.startsWith('ɵ')) continue;
        const mods = member.modifiers ?? [];
        if (mods.some(m => m.kind === ts.SyntaxKind.PrivateKeyword)) continue;
        members.push(n);
      }
      return {
        kind: ts.isClassDeclaration(node) ? 'class' : 'interface',
        members: [...new Set(members)].sort(),
      };
    }
    return null;
  }

  for (const st of source.statements) {
    if (st.name && st.name.text === symbolName) {
      const shape = shapeFromNode(st);
      if (shape) return shape;
    }
    if (ts.isVariableStatement(st)) {
      for (const decl of st.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === symbolName) {
          return {kind: 'function-or-const', members: [symbolName]};
        }
      }
    }
    if (ts.isExportDeclaration(st) && st.moduleSpecifier && st.exportClause
      && ts.isNamedExports(st.exportClause)) {
      for (const el of st.exportClause.elements) {
        const exported = (el.name ?? el.propertyName).text;
        if (exported !== symbolName) continue;
        const spec = st.moduleSpecifier.text;
        if (!spec.startsWith('.')) {
          return {kind: 'peer-reexport', members: [symbolName]};
        }
        const localName = (el.propertyName ?? el.name).text;
        const next = resolveSpecifier(real, spec);
        if (!next) return {kind: 'unresolved', members: [symbolName]};
        // Search the target file for localName.
        const nested = sourceSymbolShape(next, localName, seen);
        return nested;
      }
    }
    if (ts.isExportDeclaration(st) && st.moduleSpecifier && !st.exportClause) {
      const spec = st.moduleSpecifier.text;
      if (!spec.startsWith('.')) continue;
      const next = resolveSpecifier(real, spec);
      if (!next) continue;
      const nested = sourceSymbolShape(next, symbolName, seen);
      if (nested) return nested;
    }
  }
  return null;
}

function packSymbolShape(dtsText, name) {
  const block = extractDeclareBlock(dtsText, name);
  if (!block) {
    // May only appear in export { Name } as a re-export without local declare.
    if (new RegExp(`\\b${name}\\b`).test(dtsText)) {
      return {kind: 'reexport-or-alias', members: [name]};
    }
    return null;
  }
  if (block.startsWith('declare function') || block.startsWith('declare const')
    || block.startsWith('type ') || block.startsWith('export type')) {
    return {kind: 'function-const-or-type', members: [name]};
  }
  return {
    kind: block.includes('interface') ? 'interface' : 'class',
    members: memberNamesFromDeclare(block),
  };
}

const exceptions = JSON.parse(readFileSync(exceptionsPath, 'utf8'));
const allowlist = JSON.parse(readFileSync(allowlistPath, 'utf8'));
const allowedExtras = new Map((allowlist.extras || []).map(e => [e.name, e]));

const removedSymbols = new Set();
for (const ex of exceptions.exceptions || []) {
  if (ex.disposition === 'removed-with-native-migration' && typeof ex.symbol_or_selector === 'string') {
    for (const part of ex.symbol_or_selector.split('/')) {
      const cleaned = part.trim().replace(/\s+/g, '');
      if (cleaned) removedSymbols.add(cleaned);
    }
  }
}
for (const name of [
  'matLegacyDialogAnimations', 'matDialogAnimations', 'defaultParams',
  'matLegacyFormFieldAnimations', 'matFormFieldAnimations',
  'matLegacyMenuAnimations', 'matMenuAnimations', 'fadeInLegacyItems', 'transformLegacyMenu',
  'fadeInItems', 'transformMenu',
  'matLegacySelectAnimations', 'matSelectAnimations',
  'matLegacySnackBarAnimations', 'matSnackBarAnimations',
  'matLegacyTabsAnimations', 'matTabsAnimations',
  'matLegacyTooltipAnimations', 'matTooltipAnimations',
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
const signatureRows = [];
let signatureMismatchTotal = 0;
let signatureCompared = 0;

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
    let dtsText = '';
    if (member) {
      const extracted = spawnSync('tar', ['-xOf', tarball, member], {
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
      });
      if (extracted.status !== 0) fail(1, `unable to read ${member}`);
      dtsText = extracted.stdout;
      packNames = [...packExportNames(dtsText)].sort();
    }
    const missing = refNames.filter(n => !packNames.includes(n) && !removedSymbols.has(n));
    const rawExtra = packNames.filter(n => !refNames.includes(n));
    const allowedExtra = [];
    const extra = [];
    for (const name of rawExtra) {
      if (allowedExtras.has(name)) allowedExtra.push(name);
      else extra.push(name);
    }
    unclassifiedMissing += missing.length;
    unclassifiedExtra += extra.length;

    const shared = refNames.filter(n => packNames.includes(n) && !removedSymbols.has(n));
    const familySig = [];
    for (const name of shared) {
      const packShape = packSymbolShape(dtsText, name);
      const refShape = sourceSymbolShape(refPath, name);
      signatureCompared += 1;
      if (!packShape || !refShape) {
        familySig.push({
          name,
          status: 'skipped',
          reason: !packShape ? 'no-pack-declare' : 'no-ref-declare',
        });
        continue;
      }
      // Peer re-exports and aliases: name presence is the contract for this cell.
      if (refShape.kind === 'peer-reexport' || packShape.kind === 'reexport-or-alias'
        || refShape.kind === 'function-or-const' || packShape.kind === 'function-const-or-type'
        || refShape.kind === 'type-or-enum') {
        familySig.push({name, status: 'name-only', pack_kind: packShape.kind, ref_kind: refShape.kind});
        continue;
      }
      const packSet = new Set(packShape.members);
      const refSet = new Set(refShape.members);
      // Ignore Angular private/protected underscore implementation details that
      // 16.2.14 source exposes as protected but pack .d.ts may omit or rename.
      const refPublic = [...refSet].filter(m => !m.startsWith('_'));
      const packPublic = [...packSet].filter(m => !m.startsWith('_'));
      const missingMembers = refPublic.filter(m => !packSet.has(m));
      const extraMembers = packPublic.filter(m => !refSet.has(m) && !m.startsWith('ng'));
      const status = missingMembers.length === 0 ? 'match' : 'mismatch';
      if (status === 'mismatch') signatureMismatchTotal += 1;
      familySig.push({
        name,
        status,
        pack_kind: packShape.kind,
        ref_kind: refShape.kind,
        missing_members: missingMembers,
        extra_members: extraMembers,
      });
    }
    const mismatches = familySig.filter(s => s.status === 'mismatch');
    signatureRows.push({
      family: fam,
      kind,
      compared: familySig.length,
      mismatch_count: mismatches.length,
      // Keep mismatch details only; full per-symbol traces stay out of the committed report.
      mismatches,
    });

    rows.push({
      family: fam,
      kind,
      packed_member: member || null,
      ref_count: refNames.length,
      pack_count: packNames.length,
      missing,
      extra,
      allowed_extra: allowedExtra,
    });
  }
}

const unusedAllowlist = [...allowedExtras.keys()].filter(name =>
  !rows.some(r => (r.allowed_extra || []).includes(name) || (r.extra || []).includes(name)
    || (r.missing || []).includes(name)));

const okNames = unclassifiedMissing === 0 && unclassifiedExtra === 0
  && rows.every(r => r.packed_member);
const okSignatures = signatureMismatchTotal === 0;
const sealed = okNames && okSignatures;

const report = {
  schema_version: 1,
  role: 'packed vs 16.2.14 export-name completeness plus structural member signatures',
  check_id: 'api-completeness',
  run_id: runId,
  tarball_sha256: sha256File(tarball),
  reference_root: refRoot,
  allowlist_path: 'compatibility/rc/api/export-name-allowlist.json',
  allowlist_sha256: sha256File(allowlistPath),
  families: families.length,
  rows,
  unclassified_missing_total: unclassifiedMissing,
  unclassified_extra_total: unclassifiedExtra,
  allowed_extra_total: rows.reduce((n, r) => n + (r.allowed_extra?.length || 0), 0),
  unused_allowlist_entries: unusedAllowlist,
  recipe_removals_applied: [...removedSymbols].sort(),
  signatures: {
    compared: signatureCompared,
    mismatches: signatureMismatchTotal,
    rows: signatureRows,
  },
  result: sealed ? 'pass' : 'fail',
  g02_claim: 'not-passed',
  limitations: [
    'Structural member-name comparison for shared class/interface exports; not full overload/generics/protected/DI identity.',
    'Peer re-exports and type/const aliases are name-only in this cell.',
    'Does not claim G02.',
  ],
};

mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  ok: sealed,
  missing: unclassifiedMissing,
  extra: unclassifiedExtra,
  allowed_extra: report.allowed_extra_total,
  signature_compared: signatureCompared,
  signature_mismatches: signatureMismatchTotal,
  families: families.length,
}, null, 2));
if (!sealed) {
  fail(1, `api-completeness not sealed: missing=${unclassifiedMissing} extra=${unclassifiedExtra} signature_mismatches=${signatureMismatchTotal}`);
}
