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
import {existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, lstatSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {dirname, join, relative, resolve} from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {parseLegacyArgs, resolveLibraryFromRun, sha256File} from './resolve-run-library.mjs';
import {extractLibraryPackage} from './resolve-run-library.mjs';
import {
  deriveSurface,
  caseGroups,
  readDts,
  observeDeclarations,
  loadDifferences,
  summarizeDiscrepancies,
  negativeResults,
  bindingProblems,
} from './api-surface.mjs';
import {observeRuntimeDi} from './api-di-observe.mjs';

// verify-lite imports this module before node_modules exists. Load the parser
// on first use so compareContracts can be unit-tested without typescript.
const require = createRequire(import.meta.url);
let typescriptModule;
function loadTypescript() {
  if (!typescriptModule) typescriptModule = require('typescript');
  return typescriptModule;
}
const ts = new Proxy({}, {
  get(_target, property) {
    const loaded = loadTypescript();
    const value = loaded[property];
    return typeof value === 'function' ? value.bind(loaded) : value;
  },
});

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

export function normalizeType(type) {
  return String(type || '')
    .replace(/import\([^)]*\)\./g, '')
    .replace(/\s+/g, '');
}

function decoratorsOf(node) {
  if (typeof ts.getDecorators === 'function') return ts.getDecorators(node) || [];
  return node.decorators || [];
}

function paramFact(param, sourceFile) {
  let inject = '';
  for (const decorator of decoratorsOf(param)) {
    const expr = decorator.expression;
    if (!ts.isCallExpression(expr)) continue;
    const called = expr.expression.getText(sourceFile);
    if (called === 'Inject' || called.endsWith('.Inject')) {
      inject = expr.arguments[0] ? normalizeType(expr.arguments[0].getText(sourceFile)) : '';
    }
  }
  return {
    type: normalizeType(param.type ? param.type.getText(sourceFile) : ''),
    inject,
    optional: Boolean(param.questionToken),
  };
}

export function contractFromText(text, fileName, name) {
  const sourceFile = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let node = null;
  for (const statement of sourceFile.statements) {
    if ((ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement))
      && statement.name && statement.name.text === name) {
      node = statement;
      break;
    }
  }
  if (!node) return null;
  const ctor = (node.members || []).find(member => ts.isConstructorDeclaration(member));
  const methods = [];
  for (const member of node.members || []) {
    if (!ts.isMethodDeclaration(member) && !ts.isMethodSignature(member)) continue;
    if (!member.name || !ts.isIdentifier(member.name)) continue;
    const methodName = member.name.text;
    if (methodName.startsWith('_') || methodName.startsWith('ɵ')) continue;
    const mods = member.modifiers ?? [];
    if (mods.some(mod => mod.kind === ts.SyntaxKind.PrivateKeyword || mod.kind === ts.SyntaxKind.ProtectedKeyword)) continue;
    methods.push({
      name: methodName,
      params: (member.parameters || []).map(param => normalizeType(param.type ? param.type.getText(sourceFile) : '')),
    });
  }
  methods.sort((a, b) => a.name.localeCompare(b.name) || a.params.join().localeCompare(b.params.join()));
  return {
    kind: ts.isInterfaceDeclaration(node) ? 'interface' : 'class',
    constructor: ctor ? ctor.parameters.map(param => paramFact(param, sourceFile)) : null,
    methods,
  };
}

export function compareContracts(refContract, packContract) {
  if (!refContract || !packContract) {
    return {di_status: 'skipped', method_status: 'skipped', missing_methods: [], extra_methods: []};
  }
  const refCtor = refContract.constructor;
  const packCtor = packContract.constructor;
  let diStatus = 'absent';
  if (refCtor && packCtor) {
    const same = refCtor.length === packCtor.length
      && refCtor.every((param, index) => param.type === packCtor[index].type);
    diStatus = same ? 'match' : 'mismatch';
  } else if (refCtor || packCtor) {
    diStatus = 'one-sided';
  }
  const refMethods = refContract.methods.map(method => `${method.name}(${method.params.join(',')})`);
  const packMethods = packContract.methods.map(method => `${method.name}(${method.params.join(',')})`);
  const missing = refMethods.filter(method => !packMethods.includes(method));
  const extra = packMethods.filter(method => !refMethods.includes(method));
  return {
    di_status: diStatus,
    ref_constructor: refCtor,
    pack_constructor: packCtor,
    method_status: missing.length || extra.length ? 'mismatch' : 'match',
    missing_methods: missing,
    extra_methods: extra,
  };
}

function loadRefContract(file, symbolName, seen = new Set()) {
  const real = resolve(file);
  if (seen.has(real) || !existsSync(real)) return null;
  seen.add(real);
  const text = readFileSync(real, 'utf8');
  const direct = contractFromText(text, real, symbolName);
  if (direct) return direct;
  const source = ts.createSourceFile(real, text, ts.ScriptTarget.Latest, true);
  for (const statement of source.statements) {
    if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier) continue;
    const spec = statement.moduleSpecifier.text;
    if (!spec.startsWith('.')) continue;
    const next = resolveSpecifier(real, spec);
    if (!next) continue;
    if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) {
        const exported = (element.name ?? element.propertyName).text;
        if (exported !== symbolName) continue;
        const localName = (element.propertyName ?? element.name).text;
        return loadRefContract(next, localName, seen);
      }
    } else if (!statement.exportClause) {
      const nested = loadRefContract(next, symbolName, seen);
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


const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const {runPath, tarball: tarballArg, unknown} = parseLegacyArgs(process.argv.slice(2));
  if (unknown.length) fail(2, `Unknown argument: ${unknown[0]}`);
  const refRoot = resolveReferenceRoot();
  const surface = deriveSurface(refRoot);
  const groups = caseGroups(surface);
  const derivedCount = groups['export-contract'].length + groups['typescript-signatures'].length + groups['runtime-di-identity'].length;
  console.log(`api-completeness: derived ${derivedCount} cases from the historical public API before reading the packed artifact`);

  let tarball;
  let library = null;
  if (runPath) {
    const resolved = resolveLibraryFromRun(runPath);
    tarball = resolved.tarball;
    library = {sha256: resolved.digest, bytes: resolved.bytes, runId: resolved.runId};
  } else if (tarballArg) {
    tarball = tarballArg;
    if (!existsSync(tarball)) fail(2, `Missing tarball: ${tarball}`);
    const bytes = lstatSync(tarball).size;
    library = {sha256: sha256File(tarball), bytes, runId: null};
  } else {
    fail(2, '--tarball or --run is required');
  }
  const extracted = extractLibraryPackage(tarball, {parentDir: join(root, 'artifacts/local/api-di-consumer')});
  const differences = loadDifferences();
  const allowlist = JSON.parse(readFileSync(allowlistPath, 'utf8'));
  const declared = observeDeclarations(surface, readDts(extracted.packageRoot), differences, allowlist);
  const diRows = await observeRuntimeDi(extracted.packageRoot, surface.symbols);
  const diRecords = JSON.parse(readFileSync(join(root, 'compatibility/rc/api/di-differences.json'), 'utf8')).differences || [];
  const diSettled = diRows.map(row => settleDi(row, diRecords));
  const summary = summarizeDiscrepancies(declared.observations);
  const exportFails = [
    ...declared.entryResults.filter(item => item.result !== 'pass'),
    ...declared.observations.filter(item => item.export_result !== 'pass'),
  ];
  const signatureFails = declared.observations.filter(item => item.signature_result !== 'pass');
  const diFails = diSettled.filter(item => item.result !== 'pass');
  const sealed = exportFails.length === 0 && signatureFails.length === 0 && diFails.length === 0 && summary.open.length === 0;
  const detail = {
    schema_version: 1,
    check_id: 'api-completeness',
    role: 'diagnostic api-completeness detail; acceptance is the coordinator report',
    result: sealed ? 'pass' : 'fail',
    g02_claim: 'not-passed',
    derived_cases: derivedCount,
    open_discrepancies: summary.open.length,
    recorded_differences: summary.recorded.length + diSettled.filter(item => item.status === 'intentional-legacy-difference').length,
    export_failures: exportFails.slice(0, 20),
    signature_failures: signatureFails.slice(0, 20).map(item => item.symbol.symbol_id),
    di_failures: diFails.slice(0, 20).map(item => ({
      symbol_id: item.symbol.symbol_id,
      problems: item.problems,
      observation_context: 'environment-injector factory invocation; no component node attribute context',
      factory_outcome: item.factory_outcome ?? null,
      factory_error: item.factory_error ?? null,
      constructor_attributes: item.constructor_attributes || [],
      observed: item.observed,
      original_factory_kind: item.original_factory_kind ?? null,
      original_inherited_factory: item.original_inherited_factory ?? null,
    })),
  };
  mkdirSync(dirname(reportPath), {recursive: true});
  writeFileSync(reportPath, `${JSON.stringify(detail, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: sealed,
    open_discrepancies: summary.open.length,
    export_failures: exportFails.length,
    signature_failures: signatureFails.length,
    di_failures: diFails.length,
    di_mismatches: detail.di_failures,
    signature_failure_symbols: detail.signature_failures,
    open_discrepancy_details: summary.open.slice(0,20),
  }, null, 2));
  const request = coordinatorRequest();
  if (request && request.error) fail(2, `api-completeness: refusing acceptance report: ${request.error}`);
  if (request) {
    const accepted = writeAcceptance(request, surface, groups, declared, diSettled, summary, library, sealed);
    if (!accepted) fail(1, 'api-completeness observations were not accepted');
  } else if (!sealed) {
    fail(1, 'api-completeness not sealed');
  }
}

function settleDi(row, records) {
  const historical = row.symbol.shape.token
    ? `token ${row.symbol.shape.tokenDescription || ''}`
    : row.symbol.shape.originalFactory?.deps_kind === 'invalid' ? 'original-non-injectable-factory'
    : (row.symbol.shape.diParams || []).filter(param=>!param.attribute).map(param => `${param.ident}${param.optional ? '?' : ''}`).join('|');
  const owned = row.observed.join('|');
  if (!row.problems.length) {
    return {...row, result: 'pass', status: 'match', historical, owned};
  }
  const record = records.find(item => item.symbol_id === row.symbol.symbol_id
    && item.historical === historical
    && item.owned === owned
    && item.classification === 'intentional-legacy-difference'
    && item.rationale);
  if (record) return {...row, result: 'pass', status: 'intentional-legacy-difference', historical, owned, rationale: record.rationale};
  return {...row, result: 'fail', status: 'mismatch', historical, owned};
}

function gitValue(args) {
  const result = spawnSync(gitBin(), args, {cwd: root, encoding: 'utf8'});
  return result.status === 0 ? result.stdout.trim() : '';
}

function gitBin() {
  return 'git';
}

function coordinatorRequest() {
  const names = ['RC_CHECK_ID', 'RC_RUN_ID', 'RC_INVOCATION_ID', 'RC_EVIDENCE_BINDING', 'RC_ASSERTION_OUTPUT_DIR'];
  const present = names.filter(name => process.env[name]);
  if (present.length === 0) return null;
  if (present.length !== names.length) return {error: `incomplete coordinator environment: ${present.join(', ')}`};
  if (process.env.RC_CHECK_ID !== 'api-completeness') return {error: 'RC_CHECK_ID is not api-completeness'};
  const invocation = process.env.RC_INVOCATION_ID;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,191}$/.test(invocation)) return {error: 'invalid invocation identity'};
  let binding;
  try {
    binding = JSON.parse(process.env.RC_EVIDENCE_BINDING);
  } catch {
    return {error: 'RC_EVIDENCE_BINDING is not JSON'};
  }
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) return {error: 'binding is not an object'};
  if (binding.run_id !== process.env.RC_RUN_ID) return {error: 'binding run_id does not match RC_RUN_ID'};
  const outputDir = process.env.RC_ASSERTION_OUTPUT_DIR;
  if (!outputDir || !existsSync(outputDir)) return {error: 'assertion output directory is missing'};
  const stat = lstatSync(outputDir);
  if (!stat.isDirectory() || stat.isSymbolicLink()) return {error: 'assertion output directory is not a real directory'};
  if (!outputDir.endsWith(join('evidence', 'api-completeness', invocation))) return {error: 'assertion directory is not check-owned'};
  return {
    binding,
    invocation,
    runId: process.env.RC_RUN_ID,
    outputDir,
    runDir: resolve(outputDir, '..', '..', '..'),
    line: binding.source_line,
  };
}

function writeAcceptance(request, surface, groups, declared, diSettled, summary, library, sealed) {
  const commit = gitValue(['rev-parse', 'HEAD']);
  const tree = gitValue(['rev-parse', 'HEAD^{tree}']);
  const context = {
    source_clean: request.binding.source_clean === true,
    source_commit: request.binding.source_commit,
    source_tree: request.binding.source_tree,
    observed_commit: commit,
    observed_tree: tree,
    library_sha256: library.sha256,
    library_bytes: library.bytes,
    artifact_sha256: library.sha256,
    artifact_bytes: library.bytes,
    line: request.line,
  };
  const identity = bindingProblems(context);
  const sampleSignature = declared.observations.find(item => item.signature && item.signature.reported_signatures) || declared.observations[0];
  const negatives = negativeResults({
    symbol: sampleSignature.symbol,
    signature: sampleSignature.signature,
    context,
    tokenMatch: true,
  });
  const cases = [];
  for (const entry of declared.entryResults) cases.push({case_id: entry.case_id, result: entry.result, detail: entry.problems || []});
  for (const item of declared.observations) {
    cases.push({case_id: item.symbol.export_id, result: item.export_result, detail: item.export_problems});
    cases.push({
      case_id: item.symbol.signature_id,
      result: item.signature_result,
      detail: item.signature.rows || [],
      comparison: item.signature.comparison,
    });
    if (item.symbol.di_id) {
      const di = diSettled.find(row => row.symbol.symbol_id === item.symbol.symbol_id);
      cases.push({case_id: item.symbol.di_id, result: di ? di.result : 'fail', detail: di ? di.problems : ['missing di observation'], status: di && di.status});
    }
  }
  cases.push(...negatives.map(item => ({case_id: item.case_id, result: item.result, detail: item.problems})));
  const expected = [
    ...groups['export-contract'],
    ...groups['typescript-signatures'],
    ...groups['runtime-di-identity'],
  ];
  const byId = new Map(cases.map(item => [item.case_id, item]));
  const coverageMismatch = expected.length !== byId.size || expected.some(id => !byId.has(id));
  const matrix = JSON.parse(readFileSync(join(root, 'compatibility/rc/matrices/full-verify.json'), 'utf8'));
  const row = matrix.checks.find(item => item.check_id === 'api-completeness');
  const matrixMismatch = JSON.stringify(row.acceptance.cases_by_line['21.x']) !== JSON.stringify(groups)
    || row.acceptance.cases_by_line.main['export-contract'] !== null
    || row.acceptance.cases_by_line.main['typescript-signatures'] !== null
    || row.acceptance.cases_by_line.main['runtime-di-identity'] !== null;
  const failed = cases.filter(item => item.result !== 'pass').map(item => item.case_id);
  const accepted = sealed && identity.length === 0 && !coverageMismatch && !matrixMismatch && failed.length === 0 && request.line === '21.x';
  const assertion = {
    kind: 'api-completeness-observations',
    check_id: 'api-completeness',
    run_id: request.runId,
    invocation_id: request.invocation,
    library_sha256: library.sha256,
    source_clean: context.source_clean,
    open_discrepancies: summary.open,
    recorded_signature_differences: summary.recorded,
    recorded_di_differences: diSettled.filter(item => item.status === 'intentional-legacy-difference').map(item => ({
      symbol_id: item.symbol.symbol_id,
      historical: item.historical,
      owned: item.owned,
      rationale: item.rationale,
    })),
    note: 'Cases were derived from historical public-api barrels before this tarball was read. Name-only comparison is rejected. Discrepancy rows are intentional-legacy-difference records, not matches.',
    cases,
  };
  const assertionPath = join(request.outputDir, 'api-observations.json');
  const assertionBytes = Buffer.from(`${JSON.stringify(assertion, null, 2)}\n`);
  writeFileSync(assertionPath, assertionBytes);
  const {createHash} = require('node:crypto');
  const relativeAssertion = relative(request.runDir, assertionPath).split('\\').join('/');
  const output = {path: relativeAssertion, sha256: createHash('sha256').update(assertionBytes).digest('hex'), bytes: assertionBytes.length};
  const ordered = expected.map(id => byId.get(id)).filter(Boolean);
  const report = {
    schema_version: 1,
    template: false,
    run_id: request.runId,
    check_id: 'api-completeness',
    line: request.line,
    invocation_id: request.invocation,
    binding: request.binding,
    coverage: accepted ? 'complete' : 'incomplete',
    result: accepted ? 'pass' : 'fail',
    exit_code: accepted ? 0 : 1,
    subject_kind: 'artifact',
    subject_ids: ['library'],
    artifacts: {library: {sha256: library.sha256, bytes: library.bytes}},
    expected_case_ids: expected,
    discovered_case_ids: expected,
    executed_case_ids: expected,
    passed_case_ids: ordered.filter(item => item.result === 'pass').map(item => item.case_id),
    failed_case_ids: failed,
    skipped_case_ids: [],
    unresolved_case_ids: [],
    exceptions: [],
    passed: ordered.filter(item => item.result === 'pass').length,
    failed: failed.length,
    skipped: 0,
    outputs: [output],
    case_results: ordered.map(item => ({
      case_id: item.case_id,
      result: item.result,
      kind: 'assertion',
      output_paths: [relativeAssertion],
    })),
    command: ['node', 'scripts/api-completeness.mjs', '--run', request.runId],
    limitations: accepted ? [] : [
      coverageMismatch ? 'observations did not cover the derived roster' : '',
      matrixMismatch ? 'matrix roster is not the derived roster' : '',
      identity.join('; '),
    ].filter(Boolean),
  };
  if (!accepted) report.coverage = 'incomplete';
  mkdirSync(join(request.runDir, 'reports'), {recursive: true});
  writeFileSync(join(request.runDir, 'reports', 'api-completeness.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`api-completeness: bound ${expected.length} cases; open discrepancies ${summary.open.length}; accepted=${accepted}`);
  return accepted;
}
