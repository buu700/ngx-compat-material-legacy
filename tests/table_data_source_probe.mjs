/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync, rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync, spawnSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), require = createRequire(import.meta.url);
const ts = require('typescript'), esbuild = require('esbuild');
const read = p => readFileSync(join(root, p), 'utf8'), hash = b => createHash('sha256').update(b).digest('hex');
const sourcePath = 'projects/ngx-material-legacy/legacy-table/internal/table-data-source-base.ts';
const numberPath = 'projects/ngx-material-legacy/legacy-core/internal/coercion/number-property.ts';
const facadePath = 'projects/ngx-material-legacy/legacy-table/table-data-source.ts';
const originalRoot = 'reference/material-16.2.14/table-data-source/';
const provenance = JSON.parse(read(originalRoot + 'provenance.json'));
for (const file of provenance.files) assert.equal(hash(read(originalRoot + file.path)), file.sha256);
const original = read(originalRoot + 'table-data-source.ts'), source = read(sourcePath), numeric = read(numberPath);
const parse = (name, text) => ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
const printer = ts.createPrinter({removeComments: true});
const retained = text => {const ast = parse('table.ts', text.replaceAll('_isNumberValue', 'legacyIsNumberValue'));
  return ast.statements.filter(n => !ts.isImportDeclaration(n) && n.name?.text !== 'MatTableDataSource')
    .map(n => printer.printNode(ts.EmitHint.Unspecified, n, ast)).join('\n');};
assert.equal(retained(source), retained(original), 'complete historical interfaces/class logic');
assert.equal(retained(read(facadePath)), retained(read(originalRoot + 'legacy-table-data-source.ts')), 'public legacy facade');
const functionBody = (text, name) => {const ast = parse('numeric.ts', text);
  const node = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === name);
  return printer.printNode(ts.EmitHint.Unspecified, node.body, ast);};
assert.equal(functionBody(numeric, 'legacyIsNumberValue'), functionBody(read(originalRoot + 'number-property.ts'), '_isNumberValue'));
const rxSubjects = JSON.parse(read('compatibility/rc/table-data-source-rxjs-subjects.json'));
assert.deepEqual(rxSubjects.packages.map(p => p.version), ['6.5.3', '7.5.5']);
const cache = '/home/parallels/.cache/ngx-compat-material-legacy-closeout';
function unpack(archive, metadata, destination) {
  const bytes = readFileSync(archive); assert.equal(hash(bytes), metadata.archive_sha256);
  assert.equal(bytes.length, metadata.archive_bytes);
  assert.equal('sha512-' + createHash('sha512').update(bytes).digest('base64'), metadata.integrity);
  const members = execFileSync('tar', ['-tzvf', archive], {encoding: 'utf8'}).trim().split('\n');
  for (const row of members) {assert.ok(['-', 'd'].includes(row[0])); const path = row.split(/\s+/).at(-1);
    assert.ok(path.startsWith('package/') && !path.split('/').includes('..') && !path.includes('\\'));}
  rmSync(destination, {recursive: true, force: true}); mkdirSync(destination, {recursive: true});
  execFileSync('tar', ['--no-same-owner', '--no-same-permissions', '-xzf', archive, '-C', destination, '--strip-components=1']);
  const manifest = JSON.parse(readFileSync(join(destination, 'package.json')));
  assert.equal(manifest.name, metadata.name); assert.equal(manifest.version, metadata.version);
}
const emit = text => ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ES2022}}).outputText;
const models = prepareMaterialPublicSubjects(root), results = [], types = [], controls = [];
try {
  for (const model of models.models) {
    for (const name of ['@angular/cdk', '@angular/material']) {
      const metadata = model.subject.packages.find(p => p.name === name);
      const archive = name === '@angular/cdk' ? join(cache, 'keycode-subjects', 'cdk-' + metadata.version + '.tgz') :
        model.line === 'original' ? join(cache, 'reference-archives', 'material-16.2.14.tgz') :
          join(cache, 'menu-item-public-subjects', 'material-' + metadata.version + '.tgz');
      unpack(archive, metadata, join(model.root, 'node_modules', name));
    }
    for (const rx of rxSubjects.packages) {
      unpack(join(cache, 'table-data-source-subjects', 'rxjs-' + rx.version + '.tgz'), rx, join(model.root, 'node_modules/rxjs'));
      const chosen = model.line === 'original' ? original : source;
      const adapted = chosen.replace("'@ngx-compat/material-legacy/legacy-core'", "'./numeric.mjs'");
      writeFileSync(join(model.root, 'numeric.mjs'), emit(numeric));
      const facade = (model.line === 'original' ? read(originalRoot + 'legacy-table-data-source.ts') : read(facadePath))
        .replace("'@angular/material/table'", "'./data-source.mjs'")
        .replace("'./internal/table-data-source-base'", "'./data-source.mjs'");
      writeFileSync(join(model.root, 'legacy-data-source.mjs'), emit(facade));
      writeFileSync(join(model.root, 'subject.mjs'), read('tests/table_data_source_subject.mjs'));
      if (model.line !== 'original') {
        const typed = join(model.root, 'data-source.ts'), numericFile = join(model.root, 'numeric.ts');
        writeFileSync(typed, adapted.replace('./numeric.mjs', './numeric')); writeFileSync(numericFile, numeric);
        const compilerOptions = {strict: true, strictPropertyInitialization: false, declaration: true,
          emitDeclarationOnly: true, outDir: join(model.root, 'declarations'), skipLibCheck: false,
          target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
          lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'], types: []};
        const program = ts.createProgram([typed, numericFile], compilerOptions);
        const diagnostics = ts.getPreEmitDiagnostics(program);
        assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {getCanonicalFileName: p => p,
          getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
        const checker = program.getTypeChecker(), imports = [];
        const ast = program.getSourceFile(typed);
        for (const statement of ast.statements.filter(ts.isImportDeclaration)) {
          if (statement.moduleSpecifier.text === './numeric') continue;
          for (const item of statement.importClause.namedBindings.elements) {
            const symbol = checker.getAliasedSymbol(checker.getSymbolAtLocation(item.name)); assert.ok(symbol.declarations?.length);
            const stable = decl => !ts.getJSDocTags(decl).some(t =>
              ['deprecated', 'docs-private', 'experimental'].includes(t.tagName.text));
            if (symbol.declarations.every(ts.isFunctionDeclaration)) assert.ok(symbol.declarations.some(stable), item.name.text);
            else assert.ok(symbol.declarations.every(stable), item.name.text);
            imports.push({module: statement.moduleSpecifier.text, symbol: (item.propertyName || item.name).text});
          }
        }
        for (const role of [['@angular/material/sort', 'MatSort', ['active', 'direction', 'sortChange', 'initialized']],
          ['@angular/cdk/collections', 'DataSource', ['connect', 'disconnect']]]) {
          const binding = ast.statements.filter(ts.isImportDeclaration).find(n => n.moduleSpecifier.text === role[0])
            .importClause.namedBindings.elements.find(n => n.name.text === role[1]);
          const symbol = checker.getAliasedSymbol(checker.getSymbolAtLocation(binding.name));
          const type = checker.getDeclaredTypeOfSymbol(symbol);
          for (const name of role[2]) {const member = type.getProperty(name); assert.ok(member, name);
            for (const decl of member.declarations) assert.ok(!ts.getJSDocTags(decl).some(t =>
              ['deprecated', 'docs-private', 'experimental'].includes(t.tagName.text)), name);}
        }
        const selectedCalls = [];
        function calls(node) {
          if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
            ['combineLatest', 'merge', 'observableOf', 'map'].includes(node.expression.text)) {
            const declaration = checker.getResolvedSignature(node)?.declaration; assert.ok(declaration);
            assert.ok(!ts.getJSDocTags(declaration).some(t => ['deprecated', 'docs-private', 'experimental'].includes(t.tagName.text)), node.getText(ast));
            selectedCalls.push({call: node.expression.text, declaration_sha256: hash(declaration.getText()),
              declaration: declaration.getText()});
          }
          ts.forEachChild(node, calls);
        }
        calls(ast); assert.equal(selectedCalls.length, 10);
        const emitted = program.emit(); assert.equal(emitted.emitSkipped, false); assert.equal(emitted.diagnostics.length, 0);
        const consumer = join(model.root, 'consumer.ts');
        writeFileSync(consumer, `import {_MatTableDataSource, MatTableDataSourcePaginator} from './declarations/data-source';
import {MatSort} from '@angular/material/sort';
import {Subject, of} from 'rxjs';
const paginator: MatTableDataSourcePaginator = {page: new Subject(), initialized: of(undefined),
 pageIndex: 0, pageSize: 10, length: 0, firstPage() {}, lastPage() {}};
const source = new _MatTableDataSource<{id: string}>([{id: 'a'}]);
source.paginator = paginator;
declare const sort: MatSort;
source.sort = sort;
source.filterPredicate = (row, filter) => row.id === filter;
source.sortingDataAccessor = row => row.id;
source.connect().subscribe(rows => rows.map(row => row.id));
source.disconnect();
`);
        const consumerProgram = ts.createProgram([consumer], {...compilerOptions, strictPropertyInitialization: true,
          declaration: false, emitDeclarationOnly: false, noEmit: true});
        const consumerDiagnostics = ts.getPreEmitDiagnostics(consumerProgram);
        assert.equal(consumerDiagnostics.length, 0, ts.formatDiagnostics(consumerDiagnostics, {getCanonicalFileName: p => p,
          getCurrentDirectory: () => model.root, getNewLine: () => '\n'}));
        types.push({line: model.line, rxjs: rx.version, imports, selectedCalls, strict: true, source_strictPropertyInitialization: false,
          consumer_strictPropertyInitialization: true, consumer_declarations: true, skipLibCheck: false,
          compiler: ts.version, compiler_floor_qualified: false, diagnostics: 0});
      }
      const variants = model.line === 'original' ? ['historical'] : ['owned', 'filter-delimiter', 'numeric-null', 'page-clamp', 'in-place-sort', 'leaked-subscription'];
      for (const variant of variants) {
        let code = adapted, numericCode = numeric;
        if (variant === 'filter-delimiter') code = code.replace("+ '◬'", "+ ''");
        if (variant === 'numeric-null') numericCode = numericCode.replace('!isNaN(parseFloat(value as any)) && ', '');
        if (variant === 'page-clamp') code = code.replace('Math.min(paginator.pageIndex, lastPageIndex)', 'paginator.pageIndex');
        if (variant === 'in-place-sort') code = code.replace('this.sortData(data.slice(), this.sort)', 'this.sortData(data, this.sort)');
        if (variant === 'leaked-subscription') code = code.replace('this._renderChangesSubscription?.unsubscribe();', '');
        if (!['historical', 'owned', 'numeric-null'].includes(variant)) assert.notEqual(code, adapted, 'effective mutation');
        writeFileSync(join(model.root, 'data-source.mjs'), emit(code)); writeFileSync(join(model.root, 'numeric.mjs'), emit(numericCode));
        await esbuild.build({entryPoints: [join(model.root, 'subject.mjs')], bundle: true, platform: 'node', format: 'cjs',
          outfile: join(model.root, 'bundle.cjs'), logLevel: 'silent'});
        const run = spawnSync(process.execPath, [join(model.root, 'bundle.cjs')], {encoding: 'utf8', timeout: 20000});
        assert.ok(!run.error, run.error?.message);
        if (['historical', 'owned'].includes(variant)) {
          assert.equal(run.status, 0, run.stderr.slice(-2500));
          results.push({line: model.line, rxjs: rx.version, variant, ...JSON.parse(run.stdout)});
        } else {
          const historical = results.find(r => r.line === 'original' && r.rxjs === rx.version);
          const observation = run.status === 0 ? JSON.parse(run.stdout) : null;
          assert.ok(run.status !== 0 || JSON.stringify(observation.results) !== JSON.stringify(historical.results), variant);
          controls.push({line: model.line, rxjs: rx.version, variant, rejected: true, exit_code: run.status});
        }
      }
    }
  }
  for (const row of results.filter(r => r.variant === 'owned')) assert.deepEqual(row.results,
    results.find(r => r.line === 'original' && r.rxjs === row.rxjs).results, row.line + '/' + row.rxjs);
  assert.deepEqual(results[0].results, results[1].results, 'historical RxJS minima equivalence');
  const report = {schema_version: 1, runtime: {version: process.version, floor_qualified: false},
    sources: [sourcePath, numberPath, facadePath].map(path => ({path, sha256: hash(read(path))})),
    complete_historical_logic_identical: true, numeric_helper_body_identical: true,
    public_subject_capsule_sha256: models.capsule_hash, rxjs_subjects_sha256: hash(read('compatibility/rc/table-data-source-rxjs-subjects.json')),
    rxjs_subjects: rxSubjects.packages, types, results, controls,
    producer_sha256: hash(readFileSync(fileURLToPath(import.meta.url))), worker_sha256: hash(read('tests/table_data_source_subject.mjs')),
    scope: 'Complete original/owned data-source class and genuine public CDK DataSource run with both advertised RxJS minima. MatSort/paginator values are explicit stream/property protocols. Full Angular table/node/template, packed facade, canonical compiler and runtime floors remain unexecuted.',
    g11_claim: 'not-passed'};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({positive_subjects: results.length, observations: results[0].results.length * results.length,
    strict_peer_rxjs_checks: types.length, mutation_controls: controls.length, historical_equivalence: true}));
} finally {models.dispose();}
