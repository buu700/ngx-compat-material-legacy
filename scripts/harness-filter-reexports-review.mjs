/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Bounded public filter declarations and erased caller routes, not harness behavior. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';

const require = createRequire(import.meta.url), ts = require('typescript');
const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const capsuleHash = '6e7205b69715544f50b1bc50f6d567922437d0d3490555810d017a387b32f290';
const seedHash = '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b';
const families = {
  checkbox: ['CheckboxHarnessFilters'], dialog: ['DialogHarnessFilters'],
  'form-field': ['ErrorHarnessFilters', 'FormFieldHarnessFilters'],
  input: ['InputHarnessFilters', 'NativeOptionHarnessFilters', 'NativeSelectHarnessFilters'],
  menu: ['MenuHarnessFilters', 'MenuItemHarnessFilters'], paginator: ['PaginatorHarnessFilters'],
  'progress-bar': ['ProgressBarHarnessFilters'], 'progress-spinner': ['ProgressSpinnerHarnessFilters'],
  radio: ['RadioButtonHarnessFilters', 'RadioGroupHarnessFilters'],
  'slide-toggle': ['SlideToggleHarnessFilters'], 'snack-bar': ['SnackBarHarnessFilters'],
  table: ['CellHarnessFilters', 'RowHarnessFilters', 'TableHarnessFilters', 'MatTableHarnessColumnsText', 'MatRowHarnessColumnsText'],
  tooltip: ['TooltipHarnessFilters'],
};
const changed = new Set(['InputHarnessFilters', 'NativeSelectHarnessFilters', 'MenuHarnessFilters']);
const printer = ts.createPrinter({removeComments: true});
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source).trim();
const parse = (path, text) => {const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0); return source;};
const exported = (source, name) => source.statements.some(node => node.name?.text === name && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword))
  || source.statements.some(node => ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause) && node.exportClause.elements.some(item => item.name.text === name));
const contract = (node, source) => print(node, source).replace(/^(?:(?:export|declare) )+/, '');
const moduleName = family => '@angular/material/' + family + '/testing';

function loadModels(root) {
  const bytes = readFileSync(join(root, 'compatibility/rc/harness-filter-reexport-subjects.json'));
  assert.equal(hash(bytes), capsuleHash, 'filter subject capsule changed');
  return JSON.parse(bytes).subjects.map(subject => {
    const sources = new Map(subject.members.map(member => {
      const compressed = readFileSync(join(root, member.path)); assert.equal(hash(compressed), member.gzip_sha256);
      const raw = gunzipSync(compressed); assert.equal(hash(raw), member.sha256); assert.equal(raw.length, member.bytes);
      return [member.archive_member.replace(/^package\//, ''), raw.toString()];
    }));
    const pkg = JSON.parse(sources.get('package.json')); assert.equal(pkg.name, '@angular/material'); assert.equal(pkg.version, subject.version);
    const declarations = [...sources].filter(([path]) => path.endsWith('.d.ts')).map(([path, text]) => parse(path, text));
    const contracts = {}, aliases = {};
    for (const [family, names] of Object.entries(families)) {
      const entry = declarations.find(d => './' + d.fileName === pkg.exports['./' + family + '/testing'].types); assert.ok(entry);
      for (const name of names) {
        assert.ok(exported(entry, name), 'missing public filter export ' + name);
        const owners = declarations.filter(d => d.statements.some(n => (ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) && n.name.text === name));
        assert.equal(owners.length, 1, 'ambiguous filter declaration');
        const owner = owners[0], node = owner.statements.find(n => n.name?.text === name);
        for (const part of [node, ...(node.members ?? [])]) assert.ok(!ts.getJSDocTags(part).some(t => ['deprecated', 'docs-private', 'breaking-change', 'experimental'].includes(t.tagName.text)), 'unstable public filter');
        contracts[name] = contract(node, owner);
        if (subject.line === 'original') {
          const legacy = declarations.find(d => './' + d.fileName === pkg.exports['./legacy-' + family + '/testing'].types); assert.ok(legacy);
          const imports = legacy.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text === moduleName(family))
            .flatMap(n => n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings) ? n.importClause.namedBindings.elements : [])
            .filter(n => (n.propertyName || n.name).text === name);
          assert.equal(imports.length, 1); const alias = imports[0].name.text; assert.ok(exported(legacy, alias)); aliases[name] = alias;
        }
      }
    }
    return {subject, sources, contracts, aliases};
  });
}

function baseFilterContract(root) {
  const bytes = readFileSync(join(root, 'compatibility/rc/component-harness-public-subjects.json'));
  assert.equal(hash(bytes), '4379f0c1121a731ea7024b2c24af0c0b2f54d1a900d424162f34c4870d1889ff', 'base filter subject capsule changed');
  const capsule = JSON.parse(bytes), values = [];
  for (const subject of capsule.subjects) for (const member of subject.members.filter(m => m.archive_member.endsWith('.d.ts'))) {
    const raw = gunzipSync(readFileSync(join(root, member.path))); assert.equal(hash(raw), member.sha256);
    const source = parse(member.archive_member, raw.toString());
    for (const node of source.statements) if (ts.isInterfaceDeclaration(node) && node.name.text === 'BaseHarnessFilters') values.push(contract(node, source));
  }
  assert.equal(values.length, 3); assert.equal(new Set(values).size, 1); return values[0];
}

function compileContracts(root, models, base, aliases, ownedMenu) {
  const virtual = join(root, '__filter_reexport_types__'), files = new Map(), stableNames = Object.values(families).flat().filter(n => !changed.has(n));
  const original = models.find(m => m.subject.line === 'original');
  for (const model of models) {
    const declarations = [base, ...stableNames.map(n => model.contracts[n])].map(s => 'export ' + s).join('\n');
    files.set(join(virtual, model.subject.line + '.ts'), declarations);
  }
  files.set(join(virtual, 'cdk.ts'), 'export ' + base);
  files.set(join(virtual, 'owned-menu.ts'), ownedMenu.replace("'@angular/cdk/testing'", "'./cdk'"));
  const consumer = ["import type * as Original from './original';", "import type * as Main from './main';", "import type * as Line21 from './21.x';",
    "import type {LegacyMenuHarnessFilters} from './owned-menu';", "import type {BaseHarnessFilters} from './cdk';", original.contracts.MenuHarnessFilters.replace('MenuHarnessFilters', 'OriginalMenuFilters')];
  for (const name of stableNames) {
    consumer.push(`declare let original_${name}:Original.${name};`, `let main_${name}:Main.${name}=original_${name};`, `let line21_${name}:Line21.${name}=original_${name};`,
      `original_${name}=main_${name};`, `original_${name}=line21_${name};`);
  }
  for (const [name, alias] of Object.entries(aliases).filter(([name]) => stableNames.includes(name) && name !== 'MatRowHarnessColumnsText')) {
    files.set(join(virtual, alias + '.ts'), `export {${name} as ${alias}} from './main';`);
    consumer.push(`import type {${alias}} from './${alias}';`, `declare let alias_${name}:${alias};`, `original_${name}=alias_${name};`, `alias_${name}=original_${name};`);
  }
  consumer.push('declare let oldMenu:OriginalMenuFilters;', 'declare let ownedMenu:LegacyMenuHarnessFilters;', 'oldMenu=ownedMenu;', 'ownedMenu=oldMenu;',
    "const supported:LegacyMenuHarnessFilters={selector:'.trigger',ancestor:'.parent',triggerText:/Open/};",
    '// @ts-expect-error Unsupported modern icon predicate is absent from the historical filter.', "const icon:LegacyMenuHarnessFilters={triggerIconName:'menu'};",
    '// @ts-expect-error Historical text filter accepts string or RegExp.', 'const text:LegacyMenuHarnessFilters={triggerText:true};',
    '// @ts-expect-error The public base selector remains a string.', 'const selector:LegacyMenuHarnessFilters={selector:1};',
    '// @ts-expect-error The public base ancestor remains a string.', 'const ancestor:LegacyMenuHarnessFilters={ancestor:null};');
  const code = consumer.join('\n'), entry = join(virtual, 'consumer.ts'); files.set(entry, code);
  const options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, strict: true, skipLibCheck: false, noEmit: true};
  const host = ts.createCompilerHost(options), read = host.readFile.bind(host), exists = host.fileExists.bind(host);
  host.readFile = path => files.get(path) ?? read(path); host.fileExists = path => files.has(path) || exists(path);
  host.directoryExists = path => [...files.keys()].some(f => f.startsWith(path + '/')) || ts.sys.directoryExists(path);
  const program = ts.createProgram([entry], options, host), diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {getCanonicalFileName: p => p, getCurrentDirectory: () => virtual, getNewLine: () => '\n'}));
  return {compiler: ts.version, compiler_sha256: hash(readFileSync(require.resolve('typescript'))), strict: true, skip_lib_check: false,
    declaration_contracts: stableNames.length, public_aliases: 18, negative_checks: 4, fixture_sha256: hash(code), scope: 'Authentic extracted public erased declarations and aliases, not full Angular or packed consumer execution'};
}

export function reviewHarnessFilterReexports({root = defaultRoot, readSource, compile = true} = {}) {
  const read = path => readSource ? readSource(path) : readFileSync(join(root, path), 'utf8'), models = loadModels(root), original = models.find(m => m.subject.line === 'original');
  const base = baseFilterContract(root), stableNames = Object.values(families).flat().filter(n => !changed.has(n));
  assert.equal(stableNames.length, 19);
  for (const model of models) for (const name of stableNames) assert.equal(model.contracts[name], original.contracts[name], 'retained filter declaration changed');
  const publicCases = [];
  for (const [family, names] of Object.entries(families)) for (const name of names.filter(n => stableNames.includes(n) && n !== 'MatRowHarnessColumnsText')) {
    const file = 'legacy-' + family + '/testing/public-api.ts', source = parse(file, read('projects/ngx-material-legacy/' + file)), alias = original.aliases[name];
    const exports = source.statements.filter(ts.isExportDeclaration).filter(n => n.moduleSpecifier?.text === moduleName(family) && n.exportClause && ts.isNamedExports(n.exportClause))
      .flatMap(n => n.exportClause.elements).filter(n => (n.propertyName || n.name).text === name && n.name.text === alias);
    assert.equal(exports.length, 1, 'historical public alias changed'); publicCases.push({file, module: moduleName(family), symbol: name, alias, candidate_source_sha256: hash(source.text), conclusion: 'stable-public-peer'});
  }
  assert.equal(publicCases.length, 18);
  const menuFile = 'projects/ngx-material-legacy/legacy-menu/testing/menu-harness-filters.ts', menuText = read(menuFile), menu = parse(menuFile, menuText);
  const owned = menu.statements.find(n => ts.isInterfaceDeclaration(n) && n.name.text === 'LegacyMenuHarnessFilters'); assert.ok(owned);
  assert.equal(contract(owned, menu).replace('LegacyMenuHarnessFilters', 'MenuHarnessFilters'), original.contracts.MenuHarnessFilters, 'owned menu filter differs from the tag');
  const harnessFile = 'projects/ngx-material-legacy/legacy-menu/testing/menu-harness.ts', harnessText = read(harnessFile), harness = parse(harnessFile, harnessText);
  const apiFile = 'projects/ngx-material-legacy/legacy-menu/testing/public-api.ts', api = parse(apiFile, read(apiFile));
  for (const source of [harness, api]) for (const node of source.statements.filter(n => ts.isImportDeclaration(n) || ts.isExportDeclaration(n))) {
    if (node.moduleSpecifier?.text === moduleName('menu')) assert.ok(!node.getText(source).includes('MenuHarnessFilters'), 'modern menu filter reintroduced');
  }
  assert.ok(api.statements.some(n => ts.isExportDeclaration(n) && n.moduleSpecifier?.text === './menu-harness-filters' && n.exportClause?.elements?.some(e => e.name.text === 'LegacyMenuHarnessFilters')));
  const cls = harness.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'MatLegacyMenuHarness'), method = cls.members.find(n => ts.isMethodDeclaration(n) && n.name.text === 'with');
  assert.equal(method.parameters.length, 1); assert.equal(method.parameters[0].type.getText(harness), 'LegacyMenuHarnessFilters');
  const compiled = parse('menu.js', ts.transpileModule(harnessText, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: true}}).outputText);
  const tagged = parse('tagged-menu.mjs', original.sources.get('fesm2022/legacy-menu/testing.mjs'));
  const withBody = source => print(source.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'MatLegacyMenuHarness').members.find(n => ts.isMethodDeclaration(n) && n.name.text === 'with').body, source);
  assert.equal(withBody(compiled), withBody(tagged), 'historical menu predicate body changed');
  const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json')); assert.equal(hash(seed), seedHash);
  const uses = JSON.parse(seed).symbol_uses.filter(u => Object.entries(families).some(([family, names]) => u.module === moduleName(family) && names.includes(u.symbol) && !['InputHarnessFilters', 'NativeSelectHarnessFilters'].includes(u.symbol)));
  assert.equal(uses.length, 23);
  const authoredRoot = join(root, 'projects/ngx-material-legacy'), options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext};
  const host = ts.createCompilerHost(options), standardRead = host.readFile.bind(host);
  host.readFile = path => path.startsWith(authoredRoot + '/') ? read('projects/ngx-material-legacy/' + path.slice(authoredRoot.length + 1)) : standardRead(path);
  const program = ts.createProgram([...new Set(uses.map(u => join(authoredRoot, u.file)))], options, host), checker = program.getTypeChecker(), frozenCases = [];
  for (const use of uses) {
    const source = program.getSourceFile(join(authoredRoot, use.file)); assert.ok(source);
    const imports = source.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text === use.module)
      .flatMap(n => n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings) ? n.importClause.namedBindings.elements : [])
      .filter(n => (n.propertyName || n.name).text === use.symbol);
    if (use.symbol === 'MenuHarnessFilters') {assert.equal(imports.length, 0); frozenCases.push({...use, candidate_source_sha256: hash(source.text), conclusion: 'removed-use'}); continue;}
    assert.equal(imports.length, 1); const binding = imports[0], symbol = checker.getSymbolAtLocation(binding.name), references = []; assert.ok(symbol);
    const visit = node => {
      if (ts.isIdentifier(node) && node !== binding.name && node !== binding.propertyName && checker.getSymbolAtLocation(node) === symbol) {
        let parent = node.parent; while (parent && !ts.isTypeNode(parent) && !ts.isStatement(parent)) parent = parent.parent;
        assert.ok(parent && ts.isTypeNode(parent), 'filter imported as a runtime value'); references.push({line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, expression: parent.getText(source)});
      }
      ts.forEachChild(node, visit);
    };
    visit(source); assert.ok(references.length); frozenCases.push({...use, candidate_source_sha256: hash(source.text), conclusion: 'stable-public-peer', references});
  }
  const newBase = {file: 'legacy-menu/testing/menu-harness-filters.ts', module: '@angular/cdk/testing', symbol: 'BaseHarnessFilters', candidate_source_sha256: hash(menuText), conclusion: 'stable-public-peer'};
  assert.equal(menu.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text === '@angular/cdk/testing').flatMap(n => n.importClause.namedBindings.elements).filter(n => n.name.text === 'BaseHarnessFilters').length, 1);
  assert.equal(owned.heritageClauses.length, 1); assert.equal(owned.heritageClauses[0].types[0].expression.text, 'BaseHarnessFilters');
  const manifest = JSON.parse(read('projects/ngx-material-legacy/package.json')), line = manifest.version.startsWith('21.') ? '21.x' : 'main';
  assert.equal(manifest.peerDependencies['@angular/material'], '^' + models.find(m => m.subject.line === line).subject.version);
  return {schema_version: 1, line, frozen_cases: frozenCases, current_cases: [...publicCases, newBase],
    stable_declarations: 19, public_reexports: 18, owned_menu_matches_tag: true, menu_predicate_body_matches_tag: true,
    pending_input_filters: ['InputHarnessFilters', 'NativeSelectHarnessFilters'].map(name => ({symbol: name, original: original.contracts[name], peer: models.find(m => m.subject.line === line).contracts[name], reason: 'Current form-field control filters add label; public class and legacy DOM behavior remain to be reviewed'})),
    type_compilation: compile ? compileContracts(root, models, base, original.aliases, menuText) : null,
    subject_capsule_sha256: capsuleHash, source_override_used: !!readSource, g11_claim: 'not-passed',
    limits: ['Erased declaration/import/reexport boundaries only; runtime harness interactions, rendered legacy DOM, full class API and packed/floor consumers remain separate.']};
}
