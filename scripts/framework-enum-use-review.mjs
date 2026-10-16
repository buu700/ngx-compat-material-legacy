/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Public enum values used in owned Component metadata, not framework behavior qualification. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript'), sha = bytes => createHash('sha256').update(bytes).digest('hex');
const names = ['ChangeDetectionStrategy', 'ViewEncapsulation'];
const seedPath = 'compatibility/f10/authored-dependency-inventory-seed.json';
const seedSha = '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b';
const pins = {original: ['16.2.12', '9d69069557afd77cd5d73764b8520f5f23808ea1d02d667334d8ba64cd13edf8'], main: ['22.1.7', '7501acbb46d23e099b11f7600077f2aa29a0691fac0308ef703a0e89d6d23a41'], '21.x': ['21.2.23', '5a5b49f80e3a10ab8ceceaa259fd0bc7e702edac9166314ba07225b2d2ad65eb']};
const markers = node => ts.getJSDocTags(node).map(tag => tag.tagName.text).filter(name => ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(name));
const parse = (path, text) => {const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(file.parseDiagnostics.length, 0); return file;};

function targetFile(files, from, module) {
  assert.ok(module.startsWith('./'), 'nonlocal enum export dependency');
  const member = resolve(dirname(from), module.replace(/\.js$/, '.d.ts'));
  assert.ok(files.has(member), 'uncaptured enum public export target'); return member;
}
function localBinding(files, path, name, declarationKind, chain) {
  const file = files.get(path); assert.ok(file);
  const declarations = file.statements.filter(node => declarationKind(node) && node.name?.text === name);
  if (declarations.length) {assert.equal(declarations.length, 1); return {file, node: declarations[0], chain};}
  for (const node of file.statements.filter(ts.isImportDeclaration)) {
    if (!node.importClause?.namedBindings || !ts.isNamedImports(node.importClause.namedBindings)) continue;
    const binding = node.importClause.namedBindings.elements.find(item => item.name.text === name);
    if (binding) return publicBinding(files, targetFile(files, path, node.moduleSpecifier.text), (binding.propertyName || binding.name).text, declarationKind, [...chain, node.getText(file)]);
  }
  assert.fail('missing enum local binding ' + name);
}
function publicBinding(files, path, name, declarationKind, chain = []) {
  const file = files.get(path); assert.ok(file); assert.ok(chain.length < 10, 'cyclic enum export');
  for (const node of file.statements.filter(ts.isExportDeclaration)) {
    if (!node.exportClause || !ts.isNamedExports(node.exportClause)) continue;
    const binding = node.exportClause.elements.find(item => item.name.text === name);
    if (!binding) continue;
    assert.deepEqual(markers(binding), [], 'private/deprecated enum export');
    const next = [...chain, node.getText(file)];
    return node.moduleSpecifier
      ? publicBinding(files, targetFile(files, path, node.moduleSpecifier.text), (binding.propertyName || binding.name).text, declarationKind, next)
      : localBinding(files, path, (binding.propertyName || binding.name).text, declarationKind, next);
  }
  const declaration = file.statements.find(node => declarationKind(node) && node.name?.text === name
    && node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword));
  assert.ok(declaration, 'missing stable public enum export ' + name);
  return {file, node: declaration, chain: [...chain, declaration.getText(file)]};
}
function runtimeBinding(files, path, name, chain = []) {
  const file = files.get(path); assert.ok(file); assert.ok(chain.length < 10);
  for (const node of file.statements.filter(ts.isExportDeclaration)) {
    if (!node.exportClause || !ts.isNamedExports(node.exportClause)) continue;
    const binding = node.exportClause.elements.find(item => item.name.text === name);
    if (!binding) continue;
    const next = [...chain, node.getText(file)];
    if (node.moduleSpecifier) {
      const target = resolve(dirname(path), node.moduleSpecifier.text); assert.ok(files.has(target));
      return runtimeBinding(files, target, (binding.propertyName || binding.name).text, next);
    }
    const local = (binding.propertyName || binding.name).text;
    const variableIndex = file.statements.findIndex(node => ts.isVariableStatement(node)
      && node.declarationList.declarations.some(declaration => declaration.name.getText(file) === local));
    if (variableIndex >= 0) return {file, variable: file.statements[variableIndex], expression: file.statements[variableIndex + 1], name: local, chain: next};
    for (const imported of file.statements.filter(ts.isImportDeclaration)) {
      if (!imported.importClause?.namedBindings || !ts.isNamedImports(imported.importClause.namedBindings)) continue;
      const b = imported.importClause.namedBindings.elements.find(item => item.name.text === local);
      if (b) {const target = resolve(dirname(path), imported.moduleSpecifier.text); assert.ok(files.has(target)); return runtimeBinding(files, target, (b.propertyName || b.name).text, [...next, imported.getText(file)]);}
    }
  }
  assert.fail('missing public runtime enum binding ' + name);
}
function runtimeValues(binding) {
  const {file, variable, expression, name} = binding;
  assert.equal(variable.declarationList.declarations.length, 1);
  assert.equal(variable.declarationList.declarations[0].initializer, undefined);
  assert.ok(ts.isExpressionStatement(expression) && ts.isCallExpression(expression.expression));
  const call = expression.expression;
  assert.ok(ts.isParenthesizedExpression(call.expression) && ts.isFunctionExpression(call.expression.expression));
  const fn = call.expression.expression;
  assert.equal(fn.parameters.length, 1); assert.ok(ts.isIdentifier(fn.parameters[0].name));
  const parameter = fn.parameters[0].name.text;
  assert.equal(call.arguments.length, 1);
  assert.equal(call.arguments[0].getText(file).replace(/\s/g, ''), name + '||(' + name + '={})');
  const values = {};
  for (const statement of fn.body.statements) {
    assert.ok(ts.isExpressionStatement(statement) && ts.isBinaryExpression(statement.expression));
    const assignment = statement.expression, outer = assignment.left;
    assert.equal(assignment.operatorToken.kind, ts.SyntaxKind.EqualsToken);
    assert.ok(ts.isElementAccessExpression(outer) && outer.expression.getText(file) === parameter && ts.isBinaryExpression(outer.argumentExpression));
    const inner = outer.argumentExpression;
    assert.equal(inner.operatorToken.kind, ts.SyntaxKind.EqualsToken);
    assert.ok(ts.isElementAccessExpression(inner.left) && inner.left.expression.getText(file) === parameter);
    assert.ok(ts.isStringLiteral(inner.left.argumentExpression) && ts.isNumericLiteral(inner.right) && ts.isStringLiteral(assignment.right));
    assert.equal(inner.left.argumentExpression.text, assignment.right.text);
    values[assignment.right.text] = Number(inner.right.text);
  }
  assert.ok(Object.keys(values).length);
  const source = variable.getText(file) + '\n' + expression.getText(file);
  const observed = runInNewContext(source + '\nJSON.stringify(' + name + ')', {}, {timeout: 100});
  const runtime = JSON.parse(observed);
  for (const [member, value] of Object.entries(values)) assert.equal(runtime[member], value);
  return {values, source, source_sha256: sha(source), pure_IIFE_executed: true};
}

export function reviewFrameworkEnumUses({root = rootDefault, readSource, subjectData, population = 'captured'} = {}) {
  assert.ok(['captured','current'].includes(population),'unknown enum population');
  const read = path => readSource ? readSource(path) : readFileSync(join(root, path), 'utf8');
  const seed = readFileSync(join(root, seedPath)); assert.equal(sha(seed), seedSha);
  const subjects = subjectData || JSON.parse(read('compatibility/rc/framework-enum-public-subjects.json'));
  const models = subjects.subjects.map(subject => {
    assert.equal(subject.version, pins[subject.line][0]); assert.equal(subject.archive_sha256, pins[subject.line][1]); assert.equal(subject.archive_sri_verified, true);
    const files = new Map(subject.members.map(member => {
      const text = read(member.path); assert.equal(sha(text), member.sha256, 'enum subject bytes changed'); assert.equal(Buffer.byteLength(text), member.bytes);
      return [resolve(root, member.path), parse(resolve(root, member.path), text)];
    }));
    const entry = subject.members.find(member => member.archive_member === (subject.line === 'original' ? 'package/index.d.ts' : 'package/types/core.d.ts'));
    const runtimeEntry = subject.members.find(member => member.archive_member === 'package/fesm2022/core.mjs');
    const declarations = {}, runtimes = {};
    for (const name of names) {
      const binding = publicBinding(files, resolve(root, entry.path), name, ts.isEnumDeclaration);
      assert.deepEqual(markers(binding.node), [], 'private/deprecated enum declaration');
      const members = Object.fromEntries(binding.node.members.map(member => {
        assert.ok(ts.isIdentifier(member.name) && member.initializer && ts.isNumericLiteral(member.initializer));
        return [member.name.text, {value: Number(member.initializer.text), markers: markers(member)}];
      }));
      declarations[name] = {members, public_export_chain: binding.chain, declaration: binding.node.getText(binding.file)};
      runtimes[name] = {...runtimeValues(runtimeBinding(files, resolve(root, runtimeEntry.path), name)), public_export_chain: runtimeBinding(files, resolve(root, runtimeEntry.path), name).chain};
      for (const [member, record] of Object.entries(members)) assert.equal(runtimes[name].values[member], record.value, 'declaration/runtime enum value differs');
    }
    return {...subject, declarations, runtimes};
  });
  const original = models.find(model => model.line === 'original');
  const frozenUses = JSON.parse(seed).symbol_uses.filter(row => row.module === '@angular/core' && names.includes(row.symbol));
  assert.equal(frozenUses.length,78);
  const retired=population==='current'?frozenUses.filter(row=>row.file==='legacy-tabs/internal/tab-nav-bar-base.ts').map(row=>({...row})):[];
  if(population==='current'){
    assert.deepEqual(retired.map(row=>row.symbol).sort(),[...names].sort());
    const path='projects/ngx-material-legacy/legacy-tabs/internal/tab-nav-bar-base.ts',text=read(path),file=parse(path,text);
    const visit=node=>{if(ts.isIdentifier(node)){assert.ok(!names.includes(node.text),'retired enum import or panel returned');if(node.text==='MatTabNavPanel')assert.ok(ts.isInterfaceDeclaration(node.parent)&&node.parent.name===node||ts.isTypeReferenceNode(node.parent)&&node.parent.typeName===node,'retired enum import or panel returned');}ts.forEachChild(node,visit);};visit(file);
    for(const row of retired){row.candidate_source_sha256=sha(text);row.scope='Explicit retained frozen obligation; current structural panel runtime and enum imports are absent.';}
  }
  const uses=frozenUses.filter(row=>!retired.some(old=>old.file===row.file&&old.symbol===row.symbol));
  const paths = [...new Set(uses.map(row => row.file))], options = {noResolve: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, experimentalDecorators: true};
  const host = ts.createCompilerHost(options), hostRead = host.readFile.bind(host), sourceRoot = join(root, 'projects/ngx-material-legacy');
  host.readFile = path => path.startsWith(sourceRoot + '/') ? read('projects/ngx-material-legacy/' + path.slice(sourceRoot.length + 1)) : hostRead(path);
  const program = ts.createProgram(paths.map(path => join(sourceRoot, path)), options, host), checker = program.getTypeChecker(), cases = [];
  const pkg = JSON.parse(read('projects/ngx-material-legacy/package.json')), line = pkg.version.startsWith('21.') ? '21.x' : 'main';
  assert.equal(pkg.peerDependencies['@angular/core'], '^' + pins[line][0]);
  for (const use of uses) {
    const file = program.getSourceFile(join(sourceRoot, use.file)); assert.ok(file); assert.equal(file.parseDiagnostics.length, 0);
    const imported = file.statements.filter(ts.isImportDeclaration).filter(node => node.moduleSpecifier.text === '@angular/core' && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings));
    const bindings = imported.flatMap(node => node.importClause.namedBindings.elements.filter(binding => (binding.propertyName || binding.name).text === use.symbol));
    assert.equal(bindings.length, 1, 'missing/ambiguous enum import');
    const binding = bindings[0], symbol = checker.getSymbolAtLocation(binding.name); assert.ok(symbol);
    assert.deepEqual(symbol.declarations, [binding], 'enum import shadowed or redeclared');
    const components = imported.flatMap(node => node.importClause.namedBindings.elements.filter(item => (item.propertyName || item.name).text === 'Component'));
    assert.ok(components.length <= 1); const componentSymbol = components.length ? checker.getSymbolAtLocation(components[0].name) : null;
    if (componentSymbol) assert.deepEqual(componentSymbol.declarations, [components[0]], 'Component import shadowed or redeclared');
    const references = [];
    function visit(node) {
      if (ts.isIdentifier(node) && node !== binding.name && node !== binding.propertyName && checker.getSymbolAtLocation(node) === symbol) {
        if(population==='current')assert.ok(!binding.isTypeOnly&&!binding.parent.parent.isTypeOnly,'runtime enum imported type only');
        const access = node.parent; assert.ok(ts.isPropertyAccessExpression(access) && access.expression === node, 'unsupported enum reference');
        const member = access.name.text, property = access.parent, expectedProperty = use.symbol === names[0] ? 'changeDetection' : 'encapsulation';
        assert.ok(ts.isPropertyAssignment(property) && property.initializer === access && property.name.getText(file) === expectedProperty, 'enum reference outside metadata slot');
        const object = property.parent, call = object.parent;
        assert.ok(ts.isObjectLiteralExpression(object) && ts.isCallExpression(call) && call.arguments.length === 1 && call.arguments[0] === object && ts.isIdentifier(call.expression) && checker.getSymbolAtLocation(call.expression) === componentSymbol && ts.isDecorator(call.parent), 'enum reference outside public Component metadata');
        const historicalMember = member === 'Eager' ? 'Default' : member;
        const old = original.declarations[use.symbol].members[historicalMember]; assert.ok(old, 'new enum opt-in needs separate contract');
        for (const model of models.filter(model => model !== original)) {
          const record = model.declarations[use.symbol].members[member]; assert.ok(record, 'missing minimum enum member');
          assert.deepEqual(record.markers, [], 'private/deprecated authored enum member');
          assert.equal(record.value, old.value, 'historical enum value changed');
          assert.equal(model.runtimes[use.symbol].values[member], original.runtimes[use.symbol].values[historicalMember]);
        }
        references.push({line: file.getLineAndCharacterOfPosition(access.getStart(file)).line + 1, member, historical_member: historicalMember, numeric_value: old.value, metadata_property: expectedProperty});
      }
      ts.forEachChild(node, visit);
    }
    visit(file);
    let unusedImportErasure = null;
    if (!references.length) {
      assert.ok(['legacy-tabs/internal/tab-base.ts', 'legacy-tabs/internal/tab-group-base.ts', 'legacy-core/option/option-base.ts', 'legacy-select/internal/select-base.ts', 'legacy-menu/internal/menu-base.ts'].includes(use.file), 'unexpected unused enum import');
      const imports = binding.parent, kept = imports.elements.filter(element => element !== binding);
      const erased = file.text.slice(0, imports.getStart(file)) + '{' + kept.map(element => element.getText(file)).join(', ') + (imports.elements.hasTrailingComma ? ',' : '') + '}' + file.text.slice(imports.end);
      const emit = text => ts.transpileModule(text, {compilerOptions: {...options, emitDecoratorMetadata: false}}).outputText;
      assert.equal(sha(emit(file.text)), sha(emit(erased)), 'unused enum import changes executable emit');
      unusedImportErasure = {original_emit_sha256: sha(emit(file.text)), erased_emit_sha256: sha(emit(erased)), metadata_mode: 'emitDecoratorMetadata:false'};
    }
    cases.push({...use, candidate_source_sha256: sha(file.text), local_name: binding.name.text, references, unused_import_erasure: unusedImportErasure});
  }
  if(population==='current'){
    const actual=execFileSync('rg',['--files','projects/ngx-material-legacy','-g','*.ts','-g','!*.spec.ts'],{cwd:root,encoding:'utf8'}).trim().split('\n').flatMap(path=>{
      const file=parse(path,read(path));return file.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='@angular/core'&&node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings))
        .flatMap(node=>node.importClause.namedBindings.elements.filter(item=>names.includes((item.propertyName||item.name).text)).map(item=>path.slice('projects/ngx-material-legacy/'.length)+'#'+(item.propertyName||item.name).text));
    });
    assert.deepEqual(actual.sort(),uses.map(row=>row.file+'#'+row.symbol).sort(),'current enum population changed');
  }
  return {schema_version: 1, line, population, frozen_uses:frozenUses.length, retired_frozen_uses:retired, whole_current_population_reviewed:population==='current', node: process.version, compiler: ts.version, seed_sha256: seedSha, models, cases, files: paths.length, limits: 'Exact public enum export/declaration and pure runtime IIFE identity, all authored direct Component metadata references. Eager replaces deprecated Default only at the identical numeric1 boundary. No full Angular runtime, change-detection behavior, encapsulation rendering, compiler/AOT, native/packed/floor or upstream SHA clearance.', g11_claim: 'not-passed'};
}
