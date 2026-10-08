/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const seedPath = 'compatibility/f10/authored-dependency-inventory-seed.json';
const seedSha = '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b';
const names = ['OnInit', 'OnDestroy', 'OnChanges', 'DoCheck', 'AfterContentInit',
  'AfterContentChecked', 'AfterViewInit', 'AfterViewChecked', 'SimpleChanges'];
const selected = new Set(names);
const dependencies = [...names, 'SimpleChange'];

/** Type-only public-framework uses; hook execution/body behavior is separate. */
export function reviewFrameworkLifecycleTypes({root = defaultRoot, readSource, subjectData} = {}) {
  const ts = createRequire(import.meta.url)('typescript');
  const read = path => readSource ? readSource(path) : readFileSync(resolve(root, path), 'utf8');
  const seedBytes = readFileSync(resolve(root, seedPath)); assert.equal(sha(seedBytes), seedSha);
  const model = subjectData || JSON.parse(readFileSync(resolve(root,
    'compatibility/rc/framework-lifecycle-declaration-subjects.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(resolve(root, 'projects/ngx-material-legacy/package.json'), 'utf8'));
  const line = manifest.version.startsWith('21.') ? '21.x' : 'main';
  assert.equal(manifest.peerDependencies['@angular/core'], '^' + model.subjects.find(s => s.line === line).version);
  const parsed = (path, text) => ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const printer = ts.createPrinter({removeComments: true});
  const memberShape = (node, file) => node.members.map(member =>
    printer.printNode(ts.EmitHint.Unspecified, member, file).replace(/\s+/g, '')).join('');
  const models = model.subjects.map(subject => {
    const text = read(subject.path); assert.equal(sha(text), subject.sha256, 'peer declaration subject changed');
    const file = parsed(subject.path, text), declarations = new Map();
    for (const name of dependencies) {
      assert.equal(subject.symbols[name].public_export, true);
      assert.deepEqual(subject.symbols[name].markers, [], 'private/deprecated public type');
      const nodes = file.statements.filter(node => (ts.isInterfaceDeclaration(node)
        || ts.isClassDeclaration(node) || ts.isTypeAliasDeclaration(node)) && node.name?.text === name);
      assert.equal(nodes.length, 1); declarations.set(name, nodes[0]);
    }
    const brand = file.statements.find(node => ts.isVariableStatement(node)
      && node.declarationList.declarations.some(d => d.name.getText(file) === 'ɵINPUT_SIGNAL_BRAND_READ_TYPE'));
    return {subject, text, file, declarations, brand};
  });
  const original = models.find(m => m.subject.line === 'original');
  assert.equal(original.subject.version, '16.2.12');
  for (const peer of models.filter(m => m !== original)) {
    for (const name of names.filter(name => name !== 'SimpleChanges')) {
      assert.equal(peer.declarations.get(name).typeParameters?.length || 0, 0);
      assert.equal(memberShape(peer.declarations.get(name), peer.file),
        memberShape(original.declarations.get(name), original.file), 'historical hook shape changed: ' + name);
    }
  }

  // Compile the complete actual declaration closure. The current generic
  // SimpleChanges<T=unknown> defaults to the original dictionary branch; the
  // SimpleChange<T=any> default preserves its original public field types.
  // The private brand declaration is data from the peer's own type closure,
  // never a dependency imported or used by the library.
  const chunks = [
    'type Equal<A,B>=(<T>()=>T extends A?1:2) extends (<T>()=>T extends B?1:2)?true:false;',
    'type Assert<T extends true>=T;',
  ], namespaces = new Map();
  models.forEach((m, index) => {
    const ns = 'Subject' + index; namespaces.set(m, ns);
    const declarations = [...m.declarations.values()].map(node => node.getText(m.file)
      .replace(/^export\s+(?:declare\s+)?/, '').replace(/^declare\s+/, '')
      .replace(/^(class|interface|type) /, 'export $1 '));
    if (m.brand) declarations.push(m.brand.getText(m.file).replace(/^declare\s+/, ''));
    chunks.push('declare namespace ' + ns + ' {\n' + declarations.join('\n') + '\n}');
  });
  for (const peer of models.filter(m => m !== original)) {
    for (const name of dependencies) {
      const old = namespaces.get(original) + '.' + name, current = namespaces.get(peer) + '.' + name;
      const id = namespaces.get(peer) + name;
      chunks.push(`declare const old${id}:${old};const forward${id}:${current}=old${id};`,
        `declare const current${id}:${current};const backward${id}:${old}=current${id};`,
        `type exact${id}=Assert<Equal<${old},${current}>>;`);
    }
  }
  for (const ns of namespaces.values()) {
    chunks.push(`declare const changes${ns}:${ns}.SimpleChanges;declare const key${ns}:string;`,
      `const lookup${ns}:${ns}.SimpleChange=changes${ns}[key${ns}];`,
      `const first${ns}:boolean=lookup${ns}.firstChange;const method${ns}:boolean=lookup${ns}.isFirstChange();`);
  }
  const fixture = resolve(root, '__framework_lifecycle_type_diagnostic__.ts');
  const options = {strict: true, noEmit: true, types: [], lib: ['lib.es2022.d.ts'], target: ts.ScriptTarget.ES2022};
  const host = ts.createCompilerHost(options), hostRead = host.readFile.bind(host);
  host.readFile = path => path === fixture ? chunks.join('\n') : hostRead(path);
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([fixture], options, host));
  assert.equal(diagnostics.length, 0, 'unparameterized public type equivalence failed: ' +
    ts.formatDiagnostics(diagnostics, {getCanonicalFileName: p => p, getCurrentDirectory: () => root, getNewLine: () => '\n'}));

  const uses = JSON.parse(seedBytes).symbol_uses.filter(row => row.module === '@angular/core' && selected.has(row.symbol));
  const files = new Map(), cases = [];
  const emit = text => ts.transpileModule(text, {compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    experimentalDecorators: true, emitDecoratorMetadata: false,
  }}).outputText;
  function removeTypes(text, file) {
    const edits = [];
    for (const node of file.statements.filter(ts.isImportDeclaration)) {
      if (node.moduleSpecifier.text !== '@angular/core' || !node.importClause?.namedBindings
          || !ts.isNamedImports(node.importClause.namedBindings)) continue;
      const bindings = node.importClause.namedBindings;
      const kept = bindings.elements.filter(e => !selected.has((e.propertyName || e.name).text));
      if (kept.length === bindings.elements.length) continue;
      if (!kept.length && !node.importClause.name) edits.push([node.getStart(file), node.end, '']);
      else edits.push([bindings.getStart(file), bindings.end,
        '{' + kept.map(e => e.getText(file)).join(', ') + (bindings.elements.hasTrailingComma ? ',' : '') + '}']);
    }
    for (const [start, end, replacement] of edits.sort((a, b) => b[0] - a[0]))
      text = text.slice(0, start) + replacement + text.slice(end);
    return text;
  }
  for (const use of uses) {
    const path = 'projects/ngx-material-legacy/' + use.file;
    if (!files.has(path)) {
      const text = read(path), file = parsed(path, text);
      assert.equal(file.parseDiagnostics.length, 0);
      const emitted = emit(text), erased = emit(removeTypes(text, file));
      assert.equal(emitted, erased, 'type-only peer imports changed executable emit: ' + use.file);
      files.set(path, {text, file, cap: {path, sha256: sha(text), bytes: Buffer.byteLength(text),
        emit_sha256: sha(emitted), emit_without_selected_imports_sha256: sha(erased)}});
    }
    const {file, cap} = files.get(path), bindings = [];
    for (const node of file.statements.filter(ts.isImportDeclaration)) {
      if (node.moduleSpecifier.text !== '@angular/core' || !node.importClause?.namedBindings
          || !ts.isNamedImports(node.importClause.namedBindings)) continue;
      for (const binding of node.importClause.namedBindings.elements)
        if ((binding.propertyName || binding.name).text === use.symbol) bindings.push(binding);
    }
    assert.equal(bindings.length, 1, 'missing/ambiguous public import: ' + use.file + ':' + use.symbol);
    const binding = bindings[0], referenceLines = [];
    function visit(node) {
      if (ts.isIdentifier(node) && node.text === binding.name.text && node !== binding.name
          && node !== binding.propertyName) {
        const parent = node.parent;
        const type = ts.isTypeReferenceNode(parent) && parent.typeName === node;
        const heritage = ts.isExpressionWithTypeArguments(parent) && parent.expression === node
          && ts.isHeritageClause(parent.parent) && (parent.parent.token === ts.SyntaxKind.ImplementsKeyword
            || ts.isInterfaceDeclaration(parent.parent.parent));
        assert.ok(type || heritage, 'runtime/unsupported lifecycle type reference: ' + use.file);
        assert.equal(parent.typeArguments?.length || 0, 0, 'modern generic type usage needs a separate contract');
        referenceLines.push(file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1);
      }
      ts.forEachChild(node, visit);
    }
    visit(file);
    cases.push({...use, candidate_source_sha256: cap.sha256,
      import_line: file.getLineAndCharacterOfPosition(binding.getStart(file)).line + 1,
      local_name: binding.name.text, reference_lines: referenceLines,
      minimum_public_declaration: models.find(m => m.subject.line === line).subject.path});
  }
  return {schema_version: 1, line, role: 'Exact public lifecycle type/default and type-only use review;not hook execution qualification',
    node: process.version, compiler: ts.version, models: models.map(m => ({...m.subject,
      declarations: Object.fromEntries([...m.declarations].map(([name, node]) => [name, node.getText(m.file)]))})),
    strict_default_assignments: (models.length - 1) * dependencies.length * 2,
    strict_default_equalities: (models.length - 1) * dependencies.length,
    strict_dynamic_dictionary_lookups: models.length,
    sources: [...files.values()].map(f => f.cap), cases,
    limitations: ['Strict compilation covers the full captured declaration closure/defaults,not Angular classes/templates/AOT or packed consumers.',
      'All source references are type-only;no lifecycle hook body/invocation,DI,change detection or framework/runtime-floor clearance.',
      'Diagnostic emitDecoratorMetadata:false;no current built artifact reattribution.']};
}
