/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine namespace declarations only; actual caller compilation/behavior is separate. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join, posix} from 'node:path';
import {cdkModuleTypePublicRoute} from '../scripts/cdk-module-type-public-subjects.mjs';
import {prepareMaterialRemainingPublicSubjects, MATERIAL_REMAINING_SUBJECTS} from '../scripts/material-remaining-caller-public-subjects.mjs';
const ts = createRequire(import.meta.url)('typescript'), root = process.cwd();
const read = path => readFileSync(join(root, path)), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const selected = [['@angular/material/input', 'MatInput'], ['@angular/material/input', 'MAT_INPUT_VALUE_ACCESSOR'],
  ['@angular/material/divider', 'MatDividerModule'], ['@angular/material/divider/testing', 'DividerHarnessFilters'],
  ['@angular/material/divider/testing', 'MatDividerHarness'], ['@angular/material/datepicker/testing', 'MatDatepickerInputHarness'],
  ['@angular/material/datepicker/testing', 'MatDateRangeInputHarness']];
const ledgers = ['compatibility/f10/authored-dependency-dispositions.json',
  'compatibility/f10/authored-dependency-current-dispositions.json', 'compatibility/f10/disposition-ledger/ledger.json'];
const before = ledgers.map(path => hash(read(path))), loaded = prepareMaterialRemainingPublicSubjects(root), subjects = [];
try {
  for (const model of loaded.models) {
    // Namespace discovery needs exact public exports, not generic type
    // instantiation. The separate91-source test performs semantic checking.
    const parsed = new Map(), resolved = new Map(), active = new Set();
    function parse(key) {
      if (!parsed.has(key)) {
        const text = model.sources.get(key); assert.equal(typeof text, 'string');
        const file = ts.createSourceFile(key, text, ts.ScriptTarget.Latest, true);
        assert.equal(file.parseDiagnostics.length, 0); parsed.set(key, file);
      }
      return parsed.get(key);
    }
    function reference(key, spec) {
      if (!spec.startsWith('.')) return cdkModuleTypePublicRoute(model, spec, 'types').key;
      const base = posix.normalize(posix.join(posix.dirname(key), spec.replace(/\.js$/, '.d.ts')));
      assert.ok(!base.split('/').includes('..'));
      const matches = [base, base + '.d.ts', base + '/index.d.ts'].filter(path => model.sources.has(path));
      assert.equal(matches.length, 1); return matches[0];
    }
    function declared(file, name, exportedOnly) {
      const matches = [];
      for (const statement of file.statements) {
        if (exportedOnly && !statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
        const nodes = ts.isVariableStatement(statement) ? statement.declarationList.declarations : [statement];
        for (const node of nodes) if (node.name?.text === name &&
          (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) ||
            ts.isEnumDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)))
          matches.push({key: file.fileName, node, statement, tags: [...new Set([...ts.getJSDocTags(node), ...ts.getJSDocTags(statement)].map(tag => tag.tagName.text))]});
      }
      assert.ok(matches.length <= 1, 'ambiguous selected SDK declaration'); return matches[0] ?? null;
    }
    function resolve(key, name, local = false) {
      const identity = JSON.stringify([key, name, local]);
      if (resolved.has(identity)) return resolved.get(identity);
      if (active.has(identity)) return null;
      active.add(identity);
      try {
        const file = parse(key), candidates = [], direct = declared(file, name, !local);
        if (direct) candidates.push(direct);
        for (const statement of file.statements) {
          if (local && ts.isImportDeclaration(statement) && statement.importClause?.namedBindings && ts.isNamedImports(statement.importClause.namedBindings)) {
            for (const spec of statement.importClause.namedBindings.elements) if (spec.name.text === name) {
              const target = resolve(reference(key, statement.moduleSpecifier.text), (spec.propertyName ?? spec.name).text);
              if (target) candidates.push(target);
            }
          } else if (!local && ts.isExportDeclaration(statement)) {
            if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
              for (const spec of statement.exportClause.elements) if (spec.name.text === name) {
                const target = statement.moduleSpecifier ? resolve(reference(key, statement.moduleSpecifier.text), (spec.propertyName ?? spec.name).text) :
                  resolve(key, (spec.propertyName ?? spec.name).text, true);
                if (target) candidates.push({...target, tags: [...new Set([...target.tags, ...ts.getJSDocTags(spec).map(tag => tag.tagName.text)])]});
              }
            } else if (!statement.exportClause && statement.moduleSpecifier) {
              const target = resolve(reference(key, statement.moduleSpecifier.text), name); if (target) candidates.push(target);
            }
          }
        }
        const unique = new Map(candidates.map(target => [target.key + ':' + target.node.pos, target]));
        assert.ok(unique.size <= 1, 'ambiguous public SDK export');
        const result = [...unique.values()][0] ?? null; resolved.set(identity, result); return result;
      } finally {active.delete(identity);}
    }
    function exported(module, name) {
      const result = resolve(cdkModuleTypePublicRoute(model, module, 'types').key, name);
      assert.ok(result, 'missing exact public SDK export ' + module + ':' + name); return result;
    }
    const symbols = selected.map(([module, name]) => {
      const target = exported(module, name), tags = target.tags;
      if (model.line !== 'original') assert.ok(tags.every(tag => !['deprecated', 'docs-private', 'breaking-change', 'experimental', 'developerPreview'].includes(tag)), 'unstable current SDK export ' + name);
      const source = target.node.getSourceFile(), key = target.key;
      assert.equal(hash(source.text), hash(model.sources.get(key)), 'declaration outside authenticated SDK');
      const declarations = [{key, sha256: hash(source.text), kind: ts.SyntaxKind[target.node.kind]}];
      return {module, name, tags, declarations};
    });
    let originalLegacyTokenAlias = null;
    if (model.line === 'original') {
      const legacy = exported('@angular/material/legacy-input', 'MAT_LEGACY_INPUT_VALUE_ACCESSOR'), shared = exported('@angular/material/input', 'MAT_INPUT_VALUE_ACCESSOR');
      assert.equal(legacy.key, shared.key); assert.equal(legacy.node, shared.node);
      originalLegacyTokenAlias = true;
    }
    subjects.push({line: model.line, public_type_exports_found: symbols.length, symbols,
      original_legacy_token_declaration_alias_identity: originalLegacyTokenAlias,
      raw_additions: model.material_remaining_subject.additions.length,
      runtime_namespace_members: model.material_remaining_subject.closures.runtime.members.length,
      type_namespace_members: model.material_remaining_subject.closures.types.members.length});
  }
} finally {loaded.dispose();}
const capsule = JSON.parse(read(MATERIAL_REMAINING_SUBJECTS));
const controls = [MATERIAL_REMAINING_SUBJECTS, capsule.subjects[0].additions[0].path];
for (const path of controls) {
  const bytes = read(path);
  try {
    writeFileSync(join(root, path), Buffer.concat([bytes, Buffer.from('\n')]));
    assert.throws(() => prepareMaterialRemainingPublicSubjects(root), error => error?.code === 'ERR_ASSERTION');
  } finally {writeFileSync(join(root, path), bytes);}
  const checked = prepareMaterialRemainingPublicSubjects(root); checked.dispose();
}
assert.deepEqual(ledgers.map(path => hash(read(path))), before);
const report = {schema_version: 1, invocation_line: JSON.parse(read('compatibility/rc/material-remaining-caller-prior.json')).line,
  capsule: {path: MATERIAL_REMAINING_SUBJECTS, sha256: hash(read(MATERIAL_REMAINING_SUBJECTS))},
  compiler: ts.version, subjects, current_stable_public_exports: 14, archive_identities_and_SRI_verified: true,
  changed_input_controls_rejected_and_restored: controls.length, canonical_ledgers_unchanged: true,
  namespace_declaration_analysis_only: true, declaration_lookup: 'exact static public exports and aliases;semantic checks live in the91-source probe', actual_owned_caller_compilation_or_runtime_executed: false,
  source_closures: 0, actual_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: report.invocation_line, SDK_worlds: subjects.length, public_exports: subjects.reduce((count, s) => count + s.public_type_exports_found, 0),
  stable_current: 14, original_legacy_token_declaration_alias_identity: true, corruptions_rejected: controls.length, source_closures: 0}));
