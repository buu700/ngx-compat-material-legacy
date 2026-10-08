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
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha = text => createHash('sha256').update(text).digest('hex');
const moduleName = '@angular/cdk/a11y';
const seedPath = 'compatibility/f10/authored-dependency-inventory-seed.json';
const seedSha = '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b';

/** Finite type boundary only; focus routing and monitor lifetimes remain separate. */
export function reviewFocusOriginTypes({root = defaultRoot, readSource, subjectData} = {}) {
  const ts = createRequire(import.meta.url)('typescript');
  const read = path => readSource ? readSource(path) : readFileSync(resolve(root, path), 'utf8');
  const seed = readFileSync(resolve(root, seedPath)); assert.equal(sha(seed), seedSha);
  const subjects = subjectData || JSON.parse(read('compatibility/rc/focus-origin-declaration-subjects.json'));
  const manifest = JSON.parse(read('projects/ngx-material-legacy/package.json'));
  const line = manifest.version.startsWith('21.') ? '21.x' : 'main';
  assert.equal(manifest.peerDependencies['@angular/cdk'], '^' + subjects.subjects.find(s => s.line === line).version);
  const parse = (path, text) => ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const models = subjects.subjects.map(subject => {
    const text = read(subject.path), entry = read(subject.entry_path);
    assert.equal(sha(text), subject.sha256, 'declaration subject changed');
    assert.equal(sha(entry), subject.entry_sha256, 'public entry subject changed');
    assert.equal(subject.public_export, true); assert.deepEqual(subject.markers, []);
    const file = parse(subject.path, text);
    const nodes = file.statements.filter(n => ts.isTypeAliasDeclaration(n) && n.name.text === 'FocusOrigin');
    assert.equal(nodes.length, 1, 'missing/ambiguous FocusOrigin declaration');
    const node = nodes[0];
    assert.ok(!ts.getJSDocTags(node).some(t => ['docs-private', 'deprecated'].includes(t.tagName.text)),
      'private/deprecated FocusOrigin');
    const exported = subject.line === 'original'
      ? /export\s+(?:declare\s+)?type\s+FocusOrigin\b/.test(entry)
      : /export\s*(?:type\s*)?\{[^}]*\bFocusOrigin\b[^}]*\}\s*from\s*['"]\.\/_focus-monitor-chunk\.js['"]/.test(entry);
    assert.ok(exported, 'missing public FocusOrigin export');
    assert.equal(node.typeParameters?.length || 0, 0);
    return {...subject, declaration: node.type.getText(file)};
  });

  // Use complete, unmodified alias bodies from all three authenticated subjects.
  // Both assignment directions, exact equality, and accepted/rejected literal
  // domains prevent a widened alias from masquerading as the historical model.
  const fixture = resolve(root, '__focus_origin_type_diagnostic__.ts');
  const chunks = ['type Equal<A,B>=(<T>()=>T extends A?1:2) extends (<T>()=>T extends B?1:2)?true:false;',
    'type Assert<T extends true>=T;'];
  models.forEach((m, i) => {
    chunks.push(`type Subject${i}=${m.declaration};`);
    for (const value of ["'touch'", "'mouse'", "'keyboard'", "'program'", 'null'])
      chunks.push(`const accepted${i}_${chunks.length}:Subject${i}=${value};`);
    chunks.push(`// @ts-expect-error An unknown origin is not in the historical domain.\nconst unknown${i}:Subject${i}='unknown';`,
      `// @ts-expect-error Undefined is only allowed by the caller's optional type.\nconst absent${i}:Subject${i}=undefined;`);
  });
  for (let i = 1; i < models.length; i++) chunks.push(
    `declare const old${i}:Subject0;const forward${i}:Subject${i}=old${i};`,
    `declare const current${i}:Subject${i};const backward${i}:Subject0=current${i};`,
    `type exact${i}=Assert<Equal<Subject0,Subject${i}>>;`);
  const options = {strict: true, noEmit: true, types: [], lib: ['lib.es2022.d.ts'], target: ts.ScriptTarget.ES2022};
  const host = ts.createCompilerHost(options), originalRead = host.readFile.bind(host);
  host.readFile = path => path === fixture ? chunks.join('\n') : originalRead(path);
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([fixture], options, host));
  assert.equal(diagnostics.length, 0, 'FocusOrigin domain/equality failed: ' +
    ts.formatDiagnostics(diagnostics, {getCanonicalFileName: p => p, getCurrentDirectory: () => root, getNewLine: () => '\n'}));

  const uses = JSON.parse(seed).symbol_uses.filter(r => r.module === moduleName && r.symbol === 'FocusOrigin');
  const sources = [], cases = [];
  const emit = text => ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext, experimentalDecorators: true, emitDecoratorMetadata: false}}).outputText;
  for (const use of uses) {
    const path = 'projects/ngx-material-legacy/' + use.file, text = read(path), file = parse(path, text);
    assert.equal(file.parseDiagnostics.length, 0);
    const imports = file.statements.filter(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === moduleName
      && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings));
    const matches = imports.flatMap(n => n.importClause.namedBindings.elements
      .filter(b => (b.propertyName || b.name).text === 'FocusOrigin').map(binding => ({node: n, binding})));
    assert.equal(matches.length, 1, 'missing/ambiguous FocusOrigin import');
    const {node, binding} = matches[0], referenceLines = [];
    function visit(n) {
      if (ts.isIdentifier(n) && n.text === binding.name.text && n !== binding.name && n !== binding.propertyName) {
        assert.ok(ts.isTypeReferenceNode(n.parent) && n.parent.typeName === n,
          'runtime/unsupported FocusOrigin reference');
        assert.equal(n.parent.typeArguments?.length || 0, 0);
        referenceLines.push(file.getLineAndCharacterOfPosition(n.getStart(file)).line + 1);
      }
      ts.forEachChild(n, visit);
    }
    visit(file); assert.ok(referenceLines.length, 'unused FocusOrigin import needs removal review');
    const bindings = node.importClause.namedBindings;
    const kept = bindings.elements.filter(b => b !== binding);
    const [start, end, replacement] = !kept.length && !node.importClause.name
      ? [node.getStart(file), node.end, '']
      : [bindings.getStart(file), bindings.end, '{' + kept.map(b => b.getText(file)).join(', ')
        + (bindings.elements.hasTrailingComma ? ',' : '') + '}'];
    const stripped = text.slice(0, start) + replacement + text.slice(end);
    const emitted = emit(text), erased = emit(stripped);
    assert.ok(emitted === erased, 'FocusOrigin import changed executable emit: ' + use.file);
    sources.push({path, sha256: sha(text), bytes: Buffer.byteLength(text), emit_sha256: sha(emitted),
      emit_without_focus_origin_sha256: sha(erased)});
    cases.push({...use, candidate_source_sha256: sha(text), local_name: binding.name.text,
      import_line: file.getLineAndCharacterOfPosition(binding.getStart(file)).line + 1,
      reference_lines: referenceLines, minimum_declaration: models.find(m => m.line === line).path});
  }
  return {schema_version: 1, line, role: 'Exact public FocusOrigin type domain and erased authored uses only',
    node: process.version, compiler: ts.version, models, sources, cases,
    strict_assignments: 4, strict_equalities: 2, accepted_literals: 15, rejected_literals: 6,
    limitations: ['No focus-origin routing, focus-monitor implementation/lifetime, component behavior, DI or security clearance.',
      'Host Node/TypeScript source diagnostic only; no canonical, native, AOT, packed or actual minimum compiler/runtime qualification.']};
}
