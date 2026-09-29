#!/usr/bin/env node
/**
 * Compare legacy-core's source export names with the packed .d.ts graph.
 *
 * Uses the TypeScript parser for source barrels and the type checker for the
 * packed declaration file. A name match is not a signature, overload, or
 * historical-golden comparison.
 *
 *   node scripts/compare-core-declarations.mjs [--line21 <worktree>]
 */
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packedDts = join(
  root,
  'dist/ngx-material-legacy/types/ngx-compat-material-legacy-legacy-core.d.ts',
);
const mainApi = join(root, 'projects/ngx-material-legacy/legacy-core/public-api.ts');
const outPath = join(root, 'compatibility/rc/reports/core-declarations.json');

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

let line21 = '/home/parallels/ngx-compat-material-legacy-21';
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (arg === '--line21') {
    const value = process.argv[i + 1];
    if (!value || value.startsWith('-')) fail(2, '--line21 requires a path');
    line21 = resolve(value);
    i += 1;
    continue;
  }
  fail(2, `Unknown argument: ${arg}`);
}

function resolveSpecifier(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  for (const candidate of [base, `${base}.ts`, join(base, 'index.ts')]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function exportedName(element) {
  return (element.name ?? element.propertyName).text;
}

function collectSourceExports(file, seen = new Set()) {
  const real = resolve(file);
  if (seen.has(real)) return new Set();
  seen.add(real);
  const text = readFileSync(real, 'utf8');
  const source = ts.createSourceFile(real, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const names = new Set();
  for (const statement of source.statements) {
    const modifiers = statement.modifiers ?? [];
    const isExport = modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword);
    if (isExport && (ts.isClassDeclaration(statement) || ts.isFunctionDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isEnumDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) && statement.name) {
      names.add(statement.name.text);
    }
    if (isExport && ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text);
      }
    }
    if (!ts.isExportDeclaration(statement)) continue;
    if (!statement.moduleSpecifier) {
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) names.add(exportedName(element));
      }
      continue;
    }
    const spec = statement.moduleSpecifier.text;
    if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) names.add(exportedName(element));
      continue;
    }
    if (!spec.startsWith('.')) continue;
    const next = resolveSpecifier(real, spec);
    if (!next) {
      names.add(`UNRESOLVED:${spec}`);
      continue;
    }
    for (const name of collectSourceExports(next, seen)) names.add(name);
  }
  return names;
}

function packedExports(dtsPath) {
  const program = ts.createProgram([dtsPath], {
    noLib: true,
    noResolve: true,
    target: ts.ScriptTarget.ES2022,
  });
  const source = program.getSourceFile(dtsPath);
  const checker = program.getTypeChecker();
  const moduleSymbol = checker.getSymbolAtLocation(source);
  if (!moduleSymbol) fail(1, 'Type checker did not see the packed legacy-core module');
  return checker.getExportsOfModule(moduleSymbol).map(symbol => symbol.name).sort();
}

if (!existsSync(packedDts)) fail(2, `Missing packed declarations: ${packedDts}`);
if (!existsSync(mainApi)) fail(2, `Missing source barrel: ${mainApi}`);

const sourceNames = [...collectSourceExports(mainApi)].sort();
const packedNames = packedExports(packedDts);
const sourceSet = new Set(sourceNames);
const packedSet = new Set(packedNames);
const missingFromPack = sourceNames.filter(name => !packedSet.has(name));
const extraInPack = packedNames.filter(name => !sourceSet.has(name));

const line21Api = join(line21, 'projects/ngx-material-legacy/legacy-core/public-api.ts');
let line21Report = {present: false};
if (existsSync(line21Api)) {
  const line21Names = [...collectSourceExports(line21Api)].sort();
  const line21Set = new Set(line21Names);
  line21Report = {
    present: true,
    path: line21Api,
    export_count: line21Names.length,
    only_on_main: sourceNames.filter(name => !line21Set.has(name)),
    only_on_21: line21Names.filter(name => !sourceSet.has(name)),
    packed_dts: null,
  };
}

const identity = spawnSync(process.execPath, [join(root, 'scripts/f02-f03/core-alias-identity-smoke.mjs')], {
  cwd: root,
  encoding: 'utf8',
});
let identityReport = {ok: false, error: (identity.stderr || identity.stdout || '').slice(-500)};
try {
  identityReport = JSON.parse(identity.stdout);
} catch {
  identityReport = {ok: false, exit_code: identity.status, stdout: (identity.stdout || '').slice(-500)};
}

const report = {
  schema_version: 1,
  role: 'legacy-core declaration name comparison',
  source_barrel: 'projects/ngx-material-legacy/legacy-core/public-api.ts',
  packed_dts: 'dist/ngx-material-legacy/types/ngx-compat-material-legacy-legacy-core.d.ts',
  source_export_count: sourceNames.length,
  packed_export_count: packedNames.length,
  missing_from_pack: missingFromPack,
  extra_in_pack: extraInPack,
  names_match: missingFromPack.length === 0 && extraInPack.length === 0,
  identity_smoke: identityReport,
  line_21: line21Report,
  limitations: [
    'Compares exported names only. It does not compare signatures, overloads, generics, or a historical golden.',
    'The 21.x side is source text. This run does not pack that line.',
    'This is not RC-03-A01 and not a G02 gate.',
  ],
};
mkdirSync(dirname(outPath), {recursive: true});
writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  names_match: report.names_match,
  source_export_count: report.source_export_count,
  packed_export_count: report.packed_export_count,
  missing_from_pack: missingFromPack,
  extra_in_pack: extraInPack,
  line_21_only_on_main: line21Report.only_on_main ?? null,
  line_21_only_on_21: line21Report.only_on_21 ?? null,
}, null, 2));
process.exit(report.names_match && identityReport.ok ? 0 : 1);
