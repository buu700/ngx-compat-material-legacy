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
import {join} from 'node:path';
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
    const paths = new Map([...new Set([...selected.map(([module]) => module),
      ...(model.line === 'original' ? ['@angular/material/legacy-input'] : [])])].map(module =>
      [module, join(model.root, 'node_modules', cdkModuleTypePublicRoute(model, module, 'types').key)]));
    const options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
      types: [], noEmit: true, strict: true, skipLibCheck: false};
    const program = ts.createProgram([...paths.values()], options), checker = program.getTypeChecker();
    function exported(module, name) {
      const source = program.getSourceFile(paths.get(module)); assert.ok(source);
      const owner = checker.getSymbolAtLocation(source); assert.ok(owner);
      const symbol = checker.getExportsOfModule(owner).find(symbol => symbol.name === name); assert.ok(symbol, 'missing public SDK export ' + module + ':' + name);
      const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
      assert.ok(target.declarations?.length, 'unresolved public SDK alias'); return target;
    }
    const symbols = selected.map(([module, name]) => {
      const symbol = exported(module, name), tags = symbol.getJsDocTags(checker).map(tag => tag.name);
      if (model.line !== 'original') assert.ok(tags.every(tag => !['deprecated', 'docs-private', 'breaking-change', 'experimental', 'developerPreview'].includes(tag)), 'unstable current SDK export ' + name);
      const declarations = symbol.declarations.map(node => {
        const source = node.getSourceFile(), key = source.fileName.slice(join(model.root, 'node_modules').length + 1);
        assert.equal(hash(source.text), hash(model.sources.get(key)), 'declaration outside authenticated SDK');
        return {key, sha256: hash(source.text), kind: ts.SyntaxKind[node.kind]};
      });
      return {module, name, tags, declarations};
    });
    let originalLegacyTokenAlias = null;
    if (model.line === 'original') {
      assert.equal(exported('@angular/material/legacy-input', 'MAT_LEGACY_INPUT_VALUE_ACCESSOR'),
        exported('@angular/material/input', 'MAT_INPUT_VALUE_ACCESSOR'));
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
  namespace_declaration_analysis_only: true, actual_owned_caller_compilation_or_runtime_executed: false,
  source_closures: 0, actual_native_packed_AOT_or_full_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({line: report.invocation_line, SDK_worlds: subjects.length, public_exports: subjects.reduce((count, s) => count + s.public_type_exports_found, 0),
  stable_current: 14, original_legacy_token_declaration_alias_identity: true, corruptions_rejected: controls.length, source_closures: 0}));
