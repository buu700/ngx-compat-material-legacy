/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Six individual patch reviews; record-backed public harness execution, not browser qualification. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdtempSync, mkdirSync, symlinkSync, realpathSync, rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {homedir, tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {prepareMaterialRemainingPublicSubjects} from '../scripts/material-remaining-caller-public-subjects.mjs';
import {candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), require = createRequire(import.meta.url);
const ts = require('typescript'), hash = b => createHash('sha256').update(b).digest('hex');
const gitHash = (kind, text) => createHash('sha1').update(`${kind} ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const subjectPath = 'compatibility/rc/upstream-testing-api-21x-subjects.json.gz';
const subjectHash = 'dee4da78a6d7fcc0dfd2aeb3fd0c5d062adc7d794c2eed0be8e41fb5ec127560';
const selected = ['4de7c0fb2d033bd81074764a52cc46edd02e6774', '54d514df66b9a1ea544df0aacc7069defcd78dcd',
  '3619903fa26910a784f01bee627e30d922b9b525', '85f596b3c32d22541c3825da3479b67832a2f4da',
  '9cf15019d9d82bcb7460df5febd898a1b1eec59b', '3ef56a682fa797563d3269f18769ddceda05f760'];
const arguments_ = process.argv.slice(2), arg = name => arguments_[arguments_.indexOf(name) + 1];
assert.ok(arguments_.includes('--run') && arguments_.includes('--out'), 'explicit artifact run and fresh output required');
assert.equal(process.version, 'v24.21.0');
const runPath = resolve(arg('--run')), out = resolve(arg('--out'));
const stored = readFileSync(join(root, subjectPath)); assert.equal(hash(stored), subjectHash);
const packet = JSON.parse(gunzipSync(stored)); assert.equal(packet.complete, true); assert.deepEqual(packet.errors, []);
assert.deepEqual(packet.subjects.map(s => s.sha), selected);
for (const s of packet.subjects) {
  assert.equal(gitHash('commit', s.raw_commit), s.sha); assert.equal(hash(s.diff), s.diff_sha256);
  assert.deepEqual(s.diff.split('\n').filter(l => l.startsWith('diff --git ')).map(l => l.split(' b/')[1]), s.members.map(m => m.path));
  for (const m of s.members) for (const side of ['before', 'after']) if (!m[side].absent) {
    assert.equal(gitHash('blob', m[side].text), m[side + '_blob']); assert.equal(hash(m[side].text), m[side].sha256);
  }
}
const historicalTemplatePath = 'reference/material-16.2.14/template-control-flow/legacy-form-field--form-field.html';
const historicalTemplate = readFileSync(join(root, historicalTemplatePath), 'utf8');
assert.equal(gitHash('blob', historicalTemplate), '1e69358fe3d91491a70502e3e5881234cc72c7c8');
const currentTemplatePath = 'projects/ngx-material-legacy/legacy-form-field/form-field.html';
const currentTemplate = readFileSync(join(root, currentTemplatePath), 'utf8');
for (const template of [historicalTemplate, currentTemplate]) {
  assert.ok(template.includes('<label class="mat-form-field-label"'));
  assert.ok(template.includes('[id]="_labelId"')); assert.ok(template.includes('[attr.for]="_control.id"'));
}
const runBytes = readFileSync(runPath), run = JSON.parse(runBytes), artifact = run.artifacts.find(a => a.id === 'library');
assert.equal(run.source.line, '21.x'); assert.equal(run.source.clean, true);
assert.equal(run.source.commit, 'e22e54eda8c16e70a47a6de581314e1d54931748');
assert.equal(artifact.sha256, 'b22cc5742c078ef3e61d6d1817da9f7f8e0872cd06c4190ceef73bdb40c044fc');
const tarball = join(dirname(runPath), artifact.path); assert.equal(hash(readFileSync(tarball)), artifact.sha256);
const qualificationPath = 'compatibility/rc/packed-cva-current-artifact-paired-qualification.json';
const qualificationBytes = readFileSync(join(root, qualificationPath));
const retained = JSON.parse(qualificationBytes).subjects.find(s => s.line === '21.x');
assert.deepEqual(retained.artifact, artifact); assert.deepEqual(retained.source, run.source);
const retainedRunBytes = readFileSync(join(root, retained.reports.run.path)); assert.equal(hash(retainedRunBytes), retained.reports.run.sha256);
assert.deepEqual(JSON.parse(gunzipSync(retainedRunBytes)).source, run.source);
const sdk = prepareMaterialRemainingPublicSubjects(root), temporary = mkdtempSync(join(tmpdir(), 'legacy-testing-api-21-'));
try {
  const model = sdk.models.find(m => m.line === '21.x'); assert.ok(model);
  const peerMembers = [];
  for (const [key, text] of model.sources) {
    if (!key.startsWith('@angular/')) continue;
    assert.equal(hash(readFileSync(join(root, 'node_modules', key))), hash(text), 'installed SDK differs from authenticated public subject ' + key);
    peerMembers.push({path: key, sha256: hash(text)});
  }
  const materialRecord = model.material_remaining_subject.archives.find(p => p.name === '@angular/material');
  assert.equal(materialRecord.version, '21.2.14');
  const content = Buffer.from(materialRecord.integrity.slice('sha512-'.length), 'base64').toString('hex');
  let materialArchive = arguments_.includes('--material-archive') ? resolve(arg('--material-archive')) :
    join(homedir(), '.npm/_cacache/content-v2/sha512', content.slice(0, 2), content.slice(2, 4), content.slice(4));
  let materialBytes;
  try {materialBytes = readFileSync(materialArchive);} catch (error) {
    if (error.code !== 'ENOENT' || arguments_.includes('--material-archive')) throw error;
    const response = await fetch('https://registry.npmjs.org/@angular/material/-/material-21.2.14.tgz');
    assert.equal(response.status, 200); materialBytes = Buffer.from(await response.arrayBuffer());
    materialArchive = join(temporary, 'material-21.2.14.tgz'); writeFileSync(materialArchive, materialBytes, {flag: 'wx'});
  }
  assert.equal(materialBytes.length, materialRecord.archive_bytes); assert.equal(hash(materialBytes), materialRecord.archive_sha256);
  assert.equal('sha512-' + createHash('sha512').update(materialBytes).digest('base64'), materialRecord.integrity);
  const archiveReader = 'import hashlib,json,sys,tarfile\nwith tarfile.open(sys.argv[1],"r:gz") as t:\n print(json.dumps([{ "path":m.name[8:],"sha256":hashlib.sha256(t.extractfile(m).read()).hexdigest(),"bytes":m.size } for m in t.getmembers() if m.isfile() and m.name.startswith("package/") and (m.name.endswith((".mjs",".d.ts")) or m.name=="package/package.json")]))';
  const completeMaterialMembers = JSON.parse(execFileSync('python3', ['-c', archiveReader, materialArchive], {encoding: 'utf8', maxBuffer: 4 * 1024 * 1024}));
  assert.ok(completeMaterialMembers.length > 100);
  for (const member of completeMaterialMembers) {
    assert.ok(!member.path.startsWith('/') && !member.path.split('/').includes('..'));
    const bytes = readFileSync(join(root, 'node_modules/@angular/material', member.path));
    assert.equal(hash(bytes), member.sha256, 'installed complete Material member differs from minimum archive ' + member.path);
    assert.equal(bytes.length, member.bytes);
  }
  const modules = join(temporary, 'node_modules'); mkdirSync(join(modules, '@ngx-compat'), {recursive: true});
  const extraction = 'import pathlib,sys,tarfile\nwith tarfile.open(sys.argv[1],"r:gz") as t:\n for m in t.getmembers():\n  p=pathlib.PurePosixPath(m.name)\n  assert p.parts and p.parts[0]=="package" and not p.is_absolute() and ".." not in p.parts and (m.isfile() or m.isdir())\n t.extractall(sys.argv[2],filter="data")\npathlib.Path(sys.argv[2],"package").rename(pathlib.Path(sys.argv[2],"material-legacy"))';
  execFileSync('python3', ['-c', extraction, tarball, join(modules, '@ngx-compat')]);
  symlinkSync(realpathSync(join(root, 'node_modules/@angular')), join(modules, '@angular'), 'dir');
  for (const name of ['rxjs', 'tslib']) symlinkSync(realpathSync(join(root, 'node_modules', name)), join(modules, name), 'dir');
  writeFileSync(join(temporary, 'package.json'), JSON.stringify({type: 'module'}));
  const consumerRequire = createRequire(join(temporary, 'probe.cjs'));
  const owned = async suffix => {
    const path = consumerRequire.resolve('@ngx-compat/material-legacy/' + suffix + '/testing');
    assert.ok(path.startsWith(join(modules, '@ngx-compat/material-legacy/'))); return import(pathToFileURL(path));
  };
  const external = async name => import(pathToFileURL(require.resolve(name)));
  await external('@angular/compiler');
  const core = await external('@angular/core'), testing = await external('@angular/cdk/testing');
  const peerInput = await external('@angular/material/input/testing'), datepicker = await external('@angular/material/datepicker/testing');
  const [input, button, table, select] = await Promise.all(['legacy-input', 'legacy-button', 'legacy-table', 'legacy-select'].map(owned));
  const {ComponentHarness, ContentContainerComponentHarness, HarnessEnvironment, HarnessPredicate} = testing;
  const cases = [], rejected = [];
  async function check(id, work) {await work(); cases.push(id);}
  const node = (attributes = {}, text = '', classes = [], children = []) => ({attributes, text, classes, children});
  const descendants = root => root.children.flatMap(child => [child, ...descendants(child)]);
  function matches(record, selector) {
    return selector.split(',').some(part => {
      const query = part.trim(), match = /^(?:([a-z][\w-]*))?(?:\.([\w-]+))?(?:\[([\w-]+)(?:="([^"\n]*)")?\])?$/.exec(query);
      assert.ok(match && query, 'fixture cannot model selector ' + query);
      if (match[1] && record.attributes.tag !== match[1]) return false;
      if (match[2] && !record.classes.includes(match[2])) return false;
      return !match[3] || (Object.hasOwn(record.attributes, match[3]) && (match[4] === undefined || record.attributes[match[3]] === match[4]));
    });
  }
  class RecordEnvironment extends HarnessEnvironment {
    constructor(record, documentRoot = record, calls = []) {super(record); this.document_ = documentRoot; this.calls = calls;}
    async forceStabilize() {}
    async waitForTasksOutsideAngular() {}
    getDocumentRoot() {return this.document_;}
    createEnvironment(record) {return new RecordEnvironment(record, this.document_, this.calls);}
    createTestElement(record) {
      return {text: async () => record.text, getAttribute: async name => record.attributes[name] ?? null,
        getProperty: async name => record.attributes[name], hasClass: async name => record.classes.includes(name),
        matchesSelector: async selector => matches(record, selector)};
    }
    async getAllRawElements(selector) {this.calls.push(selector); return descendants(this.rawRootElement).filter(record => matches(record, selector));}
  }
  function labelFixture(attributes, labels) {
    const host = node(attributes), document = node({}, '', [], [host, ...labels]), calls = [];
    return {host, document, calls, environment: new RecordEnvironment(host, document, calls)};
  }
  const labelCases = [
    ['legacy-labelledby', {'aria-labelledby': 'legacy-label', id: 'control'},
      [node({id: 'legacy-label', for: 'control'}, 'Legacy label', ['mat-form-field-label']), node({id: 'modern-decoy'}, 'Modern decoy', ['mdc-floating-label'])], 'Legacy label'],
    ['legacy-for', {id: 'control'}, [node({for: 'control'}, 'Legacy label', ['mat-form-field-label']), node({for: 'other'}, 'Decoy', ['mdc-floating-label'])], 'Legacy label'],
    ['modern-labelledby', {'aria-labelledby': 'modern-label'}, [node({id: 'modern-label'}, 'Modern label', ['mdc-floating-label']), node({id: 'legacy-decoy'}, 'Decoy', ['mat-form-field-label'])], 'Modern label'],
    ['aria-label-before-for', {'aria-label': 'Accessible label', id: 'control'}, [node({for: 'control'}, 'For decoy', ['mat-form-field-label'])], 'Accessible label'],
    ['labelledby-before-aria-label', {'aria-labelledby': 'legacy-label', 'aria-label': 'Attribute decoy'}, [node({id: 'legacy-label'}, 'Legacy label', ['mat-form-field-label'])], 'Legacy label'],
    ['missing-labelledby-does-not-fall-through', {'aria-labelledby': 'missing', 'aria-label': 'Decoy', id: 'control'}, [node({for: 'control'}, 'Other decoy', ['mat-form-field-label'])], null],
    ['unlabelled-does-not-use-unrelated-label', {}, [node({for: 'other'}, 'Unrelated', ['mat-form-field-label'])], null],
  ];
  for (const [name, Harness] of [['owned-input', input.MatLegacyInputHarness], ['native-select-alias', input.MatLegacyNativeSelectHarness],
    ['datepicker-input-peer', datepicker.MatDatepickerInputHarness], ['date-range-peer', datepicker.MatDateRangeInputHarness]]) {
    for (const [id, attributes, labels, expected] of labelCases) {
      await check(name + '/' + id, async () => {
        const fixture = labelFixture(attributes, labels), harness = new Harness(fixture.environment);
        assert.equal(await harness.getLabel(), expected);
        if (expected !== null) {
          const predicate = Harness.with({label: expected}); assert.equal(predicate.harnessType, Harness);
          assert.equal(await predicate.evaluate(harness), true); assert.equal(await Harness.with({label: 'Wrong label'}).evaluate(harness), false);
        }
      });
    }
  }
  await check('native-select-retains-public-peer-identity', () => assert.equal(input.MatLegacyNativeSelectHarness, peerInput.MatNativeSelectHarness));
  await check('owned-input-retains-current-public-parent', () => assert.equal(Object.getPrototypeOf(input.MatLegacyInputHarness.prototype), peerInput.MatInputHarness.prototype));
  const parsed = (name, text) => {const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0); return source;};
  const declarationProofs = [];
  function stableDeclaration(name, methods) {
    const candidates = [...model.sources].filter(([path, text]) => path.endsWith('.d.ts') && text.includes('class ' + name));
    if (name === 'FakeMatIconRegistry') candidates.push(['@angular/material/types/icon-testing.d.ts', readFileSync(join(root, 'node_modules/@angular/material/types/icon-testing.d.ts'), 'utf8')]);
    const definitions = candidates.flatMap(([path, text]) => {
      const source = parsed(path, text); return source.statements.filter(n => ts.isClassDeclaration(n) && n.name?.text === name).map(node => ({path, text, node}));
    });
    const unique = [...new Map(definitions.map(d => [d.path, d])).values()]; assert.equal(unique.length, 1, 'ambiguous or absent public declaration ' + name);
    const declaration = unique[0], nodes = [declaration.node, ...methods.map(method => {
      const found = declaration.node.members.filter(n => n.name?.text === method); assert.equal(found.length, 1); return found[0];
    })];
    for (const n of nodes) assert.ok(!ts.getJSDocTags(n).some(t => ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(t.tagName.text)), 'unstable public declaration ' + name);
    declarationProofs.push({name, methods, path: declaration.path, sha256: hash(declaration.text), stable: true});
  }
  stableDeclaration('HarnessEnvironment', ['getHarnessAtIndex', 'countHarnesses', 'getDocumentRoot', 'createTestElement', 'createEnvironment', 'getAllRawElements']);
  stableDeclaration('ContentContainerComponentHarness', ['getHarnessAtIndex', 'countHarnesses']);
  stableDeclaration('MatFormFieldControlHarnessBase', ['getLabel']);
  stableDeclaration('FakeMatIconRegistry', ['registerFontClassAlias', 'classNameForFontAlias', 'getDefaultFontSetClass']);
  function interfaceMembers(path, name) {
    const source = parsed(path, readFileSync(join(root, path), 'utf8'));
    const members = source.statements.filter(n => ts.isInterfaceDeclaration(n) && n.name.text === name); assert.equal(members.length, 1);
    return members[0].members.map(m => m.name.text);
  }
  await check('legacy-select-retains-finite-disabled-filter', () => {
    assert.deepEqual(interfaceMembers('projects/ngx-material-legacy/legacy-select/testing/select-harness-filters.ts', 'LegacySelectHarnessFilters'), ['disabled']);
    assert.equal(typeof select.MatLegacySelectHarness.prototype.getLabel, 'undefined');
  });
  class Child extends ComponentHarness {
    static hostSelector = '[data-probe-child]';
    async getText() {return (await this.host()).text();}
    static with(options = {}) {return new HarnessPredicate(Child, options).addOption('text', options.text, (h, text) => HarnessPredicate.stringMatches(h.getText(), text));}
  }
  const children = ['First', 'Second', 'Third'].map(text => node({'data-probe-child': ''}, text));
  const buttonRecord = node({'mat-raised-button': '', tag: 'button'}, 'Legacy action', [], children);
  const document = node({}, '', [], [buttonRecord, node({'data-probe-child': ''}, 'Outside')]);
  const environment = new RecordEnvironment(buttonRecord, document), legacyButton = new button.MatLegacyButtonHarness(environment);
  await check('loader-methods-are-genuine-inherited-public-members', () => {
    for (const name of ['getHarnessAtIndex', 'countHarnesses']) assert.equal(button.MatLegacyButtonHarness.prototype[name], ContentContainerComponentHarness.prototype[name]);
  });
  await check('count-content-excludes-document-sibling', async () => assert.equal(await legacyButton.countHarnesses(Child), 3));
  await check('document-root-loader-sees-document-sibling', async () => assert.equal(await environment.documentRootLocatorFactory().countHarnesses(Child), 4));
  for (let index = 0; index < 3; index++) await check('content-index-' + index, async () => assert.equal(await (await legacyButton.getHarnessAtIndex(Child, index)).getText(), ['First', 'Second', 'Third'][index]));
  await check('count-respects-predicate', async () => assert.equal(await legacyButton.countHarnesses(Child.with({text: 'Third'})), 1));
  await check('index-applies-to-filtered-results', async () => assert.equal(await (await legacyButton.getHarnessAtIndex(Child.with({text: /^(Second|Third)$/}), 1)).getText(), 'Third'));
  await check('empty-count', async () => assert.equal(await legacyButton.countHarnesses(Child.with({text: 'Missing'})), 0));
  await check('negative-index-rejects', async () => assert.rejects(legacyButton.getHarnessAtIndex(Child, -1), /Index must not be negative/));
  await check('past-end-index-rejects', async () => assert.rejects(legacyButton.getHarnessAtIndex(Child, 3), /No harness was located at index 3/));
  await check('empty-index-rejects', async () => assert.rejects(legacyButton.getHarnessAtIndex(Child.with({text: 'Missing'}), 0), /No harness was located at index 0/));
  await check('query-rejection-propagates', async () => {
    const broken = new RecordEnvironment(buttonRecord), error = new Error('query sentinel'); broken.getAllRawElements = async () => {throw error;};
    await assert.rejects(new button.MatLegacyButtonHarness(broken).countHarnesses(Child), e => e === error);
  });
  await check('fresh-content-state-observed', async () => {
    children.push(node({'data-probe-child': ''}, 'Fourth')); assert.equal(await legacyButton.countHarnesses(Child), 4);
    assert.equal(await (await legacyButton.getHarnessAtIndex(Child, 3)).getText(), 'Fourth'); children.pop();
  });
  await check('legacy-button-variant-remains-raised', async () => assert.equal(await legacyButton.getVariant(), 'raised'));
  await check('legacy-button-type-and-icon-filters-remain-finite', () => {
    assert.deepEqual(interfaceMembers('projects/ngx-material-legacy/legacy-button/testing/button-harness.ts', 'LegacyButtonHarnessFilters'), ['text', 'variant', 'disabled']);
    assert.equal(typeof legacyButton.getType, 'undefined');
  });
  await check('legacy-button-text-predicate-remains-owned', async () => {
    assert.equal(button.MatLegacyButtonHarness.with({text: 'Legacy action'}).harnessType, button.MatLegacyButtonHarness);
    assert.equal(await button.MatLegacyButtonHarness.with({text: /action$/}).evaluate(legacyButton), true);
    assert.equal(await button.MatLegacyButtonHarness.with({text: 'Other'}).evaluate(legacyButton), false);
  });
  const rows = ['One', 'Two'].map(text => node({}, '', ['mat-row'], [node({}, text, ['mat-cell'])]));
  const tableRecord = node({}, '', ['mat-table'], rows), legacyTable = new table.MatLegacyTableHarness(new RecordEnvironment(tableRecord));
  await check('legacy-table-owned-row-harnesses', async () => {
    const actual = await legacyTable.getRows(); assert.equal(actual.length, 2); assert.ok(actual.every(r => r instanceof table.MatLegacyRowHarness));
  });
  await check('legacy-table-cell-order-and-text', async () => assert.deepEqual(await legacyTable.getCellTextByIndex(), [['One'], ['Two']]));
  await check('legacy-table-no-new-no-data-harness-api', () => {
    assert.equal(typeof legacyTable.getNoDataRow, 'undefined'); assert.equal(table.MatLegacyNoDataRowHarness, undefined); assert.equal(table.MatLegacyNoDataCellHarness, undefined);
  });
  const icon = await external('@angular/material/icon/testing');
  await check('Service-is-absent-from-advertised-framework', () => assert.equal(core.Service, undefined));
  await check('public-21-icon-registry-injects-without-Service', () => {
    const injector = core.Injector.create({providers: [icon.FakeMatIconRegistry]});
    try {
      const registry = injector.get(icon.FakeMatIconRegistry); assert.ok(registry instanceof icon.FakeMatIconRegistry);
      assert.equal(registry.registerFontClassAlias('legacy', 'legacy-font'), registry); assert.equal(registry.classNameForFontAlias('legacy'), 'legacy');
      assert.deepEqual(registry.getDefaultFontSetClass(), ['material-icons']);
    } finally {injector.destroy();}
  });
  const productTs = candidateProductSourcePaths(root).filter(p => p.endsWith('.ts') && !p.endsWith('.spec.ts'));
  const iconTestingEdges = [], dynamicUnknown = [];
  for (const path of productTs) {
    const source = parsed(path, readFileSync(join(root, path), 'utf8'));
    function visit(n) {
      if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier?.text === '@angular/material/icon/testing') iconTestingEdges.push(path);
      if (ts.isCallExpression(n) && (n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === 'require'))) {
        if (n.arguments.length !== 1 || !ts.isStringLiteral(n.arguments[0])) dynamicUnknown.push(path);
        else if (n.arguments[0].text === '@angular/material/icon/testing') iconTestingEdges.push(path);
      }
      ts.forEachChild(n, visit);
    }
    visit(source);
  }
  await check('no-owned-production-icon-testing-delegation', () => {assert.deepEqual(iconTestingEdges, []); assert.deepEqual(dynamicUnknown, []);});
  async function mutation(id, apply, restore, work) {
    try {apply(); await assert.rejects(async () => work(), 'semantic mutation escaped: ' + id); rejected.push(id);}
    finally {restore();}
  }
  const count = HarnessEnvironment.prototype.countHarnesses, atIndex = HarnessEnvironment.prototype.getHarnessAtIndex;
  await mutation('incorrect-count', () => {HarnessEnvironment.prototype.countHarnesses = async () => 0;},
    () => {HarnessEnvironment.prototype.countHarnesses = count;}, async () => assert.equal(await legacyButton.countHarnesses(Child), 3));
  await mutation('ignored-index', () => {HarnessEnvironment.prototype.getHarnessAtIndex = function (query) {return this.getHarness(query);};},
    () => {HarnessEnvironment.prototype.getHarnessAtIndex = atIndex;}, async () => assert.equal(await (await legacyButton.getHarnessAtIndex(Child, 1)).getText(), 'Second'));
  await mutation('predicate-ignored-before-indexing', () => {HarnessEnvironment.prototype.getHarnessAtIndex = function (query, index) {return atIndex.call(this, query.harnessType ?? query, index);};},
    () => {HarnessEnvironment.prototype.getHarnessAtIndex = atIndex;}, async () => assert.equal(await (await legacyButton.getHarnessAtIndex(Child.with({text: 'Third'}), 0)).getText(), 'Third'));
  const mixed = packet.subjects[0], oldControl = mixed.members.find(m => m.path.endsWith('/form-field-control-harness.ts')).after.text;
  const emitted = ts.transpileModule(oldControl, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext}}).outputText
    .replace("'@angular/cdk/testing'", JSON.stringify(pathToFileURL(require.resolve('@angular/cdk/testing')).href));
  const initial = await import('data:text/javascript;base64,' + Buffer.from(emitted).toString('base64'));
  const originalModernFixture = labelCases.find(c => c[0] === 'modern-labelledby');
  await check('original-MDC-prefix-control-works-on-modern-label', async () => {
    const [, attrs, labels, expected] = originalModernFixture;
    assert.equal(await new initial.MatFormFieldControlHarnessBase(labelFixture(attrs, labels).environment).getLabel(), expected);
  });
  const labelReversionObservations = [];
  for (const id of ['legacy-labelledby', 'legacy-for']) {
    const [, attrs, labels, expected] = labelCases.find(c => c[0] === id), fixture = labelFixture(attrs, labels);
    const observed = await new initial.MatFormFieldControlHarnessBase(fixture.environment).getLabel();
    assert.equal(observed, null, 'original reversion failed for an unexpected reason');
    assert.throws(() => assert.equal(observed, expected)); labelReversionObservations.push({id, expected, observed, queries: fixture.calls});
    rejected.push('original-MDC-only-' + id);
  }
  const sourcePaths = ['legacy-input/testing/input-harness.ts', 'legacy-input/testing/public-api.ts',
    'legacy-button/testing/button-harness.ts', 'legacy-select/testing/select-harness.ts', 'legacy-select/testing/select-harness-base.ts',
    'legacy-select/testing/select-harness-filters.ts', 'legacy-table/testing/table-harness.ts', 'legacy-table/testing/table-harness-base.ts',
    'legacy-table/testing/row-harness.ts', 'legacy-table/testing/cell-harness.ts'].map(p => 'projects/ngx-material-legacy/' + p);
  const gitEnv = {...process.env, GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1'};
  for (const k of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete gitEnv[k];
  const sources = sourcePaths.map(path => {
    const raw = readFileSync(join(root, path)), packedSource = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
      'show', run.source.commit + ':' + path], {cwd: root, env: gitEnv, maxBuffer: 1024 * 1024});
    assert.deepEqual(raw, packedSource); return {path, sha256: hash(raw)};
  });
  const productTree = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'ls-tree', '-r', '--full-tree',
    run.source.commit, '--', 'projects/ngx-material-legacy'], {cwd: root, env: gitEnv, encoding: 'utf8'});
  const productRows = productTree.trimEnd().split('\n').map(line => {
    const match = /^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/.exec(line); assert.ok(match);
    const [, mode, blob, path] = match; assert.equal(gitHash('blob', readFileSync(join(root, path))), blob); return {mode, blob, path};
  });
  const currentPopulation = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', 'projects/ngx-material-legacy'],
    {cwd: root, env: gitEnv, encoding: 'utf8'}).trimEnd().split('\n');
  assert.deepEqual([...currentPopulation].sort(), productRows.map(row => row.path).sort()); assert.equal(productRows.length, 1142);
  const decisions = [
    ['inherited', 'The current21.2.14public CDK supplies the two loader methods, and current public input/native-select/datepicker label lookup accepts legacy label bindings without the initial MDC prefix. The owned input adapter preserves predicate identity/native disabled behavior. The owned legacy select retains its finite disabled-only filter and old parent; modern select label API is not copied. Upstream fixture/doc edits are source review, not execution of those suites.'],
    ['do-not-adopt', 'The four-file change adds modern buttonType/getType API. The packed owned legacy harness preserves raised/flat/stroked variants, its finite historical filter interface and native text predicate. Adding a new modern button API is outside this finite legacy contract.'],
    ['do-not-adopt', 'The five-file change adds iconName and a MatIconHarness dependency to modern buttons. The owned historical filter has no iconName promise or icon-harness import. Its text/variant predicates and inherited content-container behavior remain separate. No new icon predicate or Bazel dependency is copied.'],
    ['do-not-adopt', 'The five-file change adds modern no-data row/cell harness classes and getNoDataRow with an MDC row selector. The packed legacy table retains its finite row/cell harnesses and ordered cell-text behavior. This testing-API decision makes no change to the legacy no-data component or its markup.'],
    ['not-applicable', 'This one-file follow-up changes the newly added modern iconName predicate from hasHarness to locatorForOptional. The owned legacy button implements neither that filter nor that query path; its separately qualified content-container methods are inherited from public CDK.'],
    ['do-not-adopt', 'The one-file research-head decorator replacement requires Service, which is absent from the21.xframework public namespace. The actual21.2.14public FakeMatIconRegistry injects and keeps its font-alias behavior using the installed framework. The owned production source graph has no icon/testing delegation to port; no younger peer or Service shim is introduced.'],
  ];
  const mixedFileNotes = {
    'src/cdk/testing/component-harness.ts': 'Public loader signatures and content-container forwarders add index/count; genuine current CDK methods execute through the packed legacy button, including filtered order, content scope and error propagation.',
    'src/cdk/testing/harness-environment.ts': 'The actual public environment runs query/filter/count/index logic. Negative, empty and past-end offsets reject; count/index mutations and ignored predicates are rejected.',
    'src/cdk/testing/test-harnesses.md': 'The added index/count/hasHarness documentation describes public CDK loader APIs; it adds no legacy component or owned API copy.',
    'src/material/datepicker/testing/date-range-input-harness.ts': 'The original MDC-prefixed label method is superseded at the advertised minimum by prefix-free id/for lookup; the actual public range harness passes legacy/modern associations and label filters.',
    'src/material/datepicker/testing/date-range-input-harness.spec.ts': 'The new third range-input fixture and label filter expectation were read. The original upstream Angular fixture suite was not run; current public label semantics are exercised separately.',
    'src/material/datepicker/testing/datepicker-harness-filters.ts': 'Datepicker/range filters add the public shared label field. The actual minimum peer accepts the filters; the add-on creates no parallel datepicker API.',
    'src/material/datepicker/testing/datepicker-input-harness-base.ts': 'The new public parent and label predicate are inherited in the current public datepicker input; legacy native input-label bindings are exercised without a copied parent.',
    'src/material/datepicker/testing/datepicker-input-harness.spec.ts': 'The labeled wrapper, form-field/input imports and new label predicate test were read. These modern upstream fixtures are not historical legacy goldens and are not claimed executed.',
    'src/material/form-field/testing/control/form-field-control-harness-filters.ts': 'The added public label filter is supplied by the current peer and its inherited native input/select aliases; no wildcard owned API mirror is introduced.',
    'src/material/form-field/testing/control/form-field-control-harness.ts': 'The new public base getLabel initially required an MDC class. The actual minimum removes that restriction; original prefix-only source is executed as a rejected reversion, while current binding precedence is exercised.',
    'src/material/form-field/testing/control/index.ts': 'The public peer barrel exports the new filter. The owned legacy select retains its separate historical interface and empty public control-harness parent.',
    'src/material/input/testing/input-harness-filters.ts': 'The public input filter gains label. The maintained input adapter already binds this option to its own harness constructor; actual packed predicates and label association are exercised.',
    'src/material/input/testing/input-harness.spec.ts': 'The countHarnesses call and labeled input fixture were read. The inherited loader behavior and actual packed input label predicates execute separately; the upstream suite is not claimed run.',
    'src/material/input/testing/input-harness.ts': 'The public parent/filter additions are current-peer behavior. The owned adapter keeps its native disabled-property override and own predicate identity instead of copying the modern class.',
    'src/material/input/testing/native-select-harness-filters.ts': 'The public native-select filter gains label; the add-on retains exact public native-select class identity and its supported current filter contract.',
    'src/material/input/testing/native-select-harness.spec.ts': 'The new form-field label and filter assertion were read; the packed alias label contract executes against discriminating legacy/modern label records.',
    'src/material/input/testing/native-select-harness.ts': 'The public native-select parent and label predicate are inherited through the unchanged alias; current minimum prefix-free lookup supports legacy id/for labels.',
    'src/material/select/testing/select-harness-filters.ts': 'The modern select filter gains label. The owned legacy select remains a finite disabled-only interface, so this new modern filter is not advertised or mirrored.',
    'src/material/select/testing/select-harness.spec.ts': 'The new modern label fixture/filter assertion were read; the add-on retains its separate legacy select and does not replace legacy goldens with these modern expectations.',
    'src/material/select/testing/select-harness.ts': 'The modern class changes public import routes, parent and label filtering. The owned legacy class keeps its own option/optgroup types, old control parent and finite disabled filter; the current-source/packed identity check includes those exact members.',
  };
  assert.deepEqual(Object.keys(mixedFileNotes).sort(), mixed.members.map(m => m.path).sort());
  const reviewCases = [cases.filter(id => /^(owned-input|native-select|datepicker|date-range|legacy-select|loader|count-|document-root|content-index|index-|empty-|negative-|past-end|query-|fresh-|original-MDC)/.test(id)),
    cases.filter(id => id.startsWith('legacy-button-')), cases.filter(id => id.startsWith('legacy-button-')),
    cases.filter(id => id.startsWith('legacy-table-')), cases.filter(id => id.startsWith('legacy-button-')),
    cases.filter(id => /^(Service-|public-21-icon|no-owned-production-icon)/.test(id))];
  const reviews = packet.subjects.map((s, i) => ({sha: s.sha, status: 'reviewed', recommended_disposition: decisions[i][0],
    decision: decisions[i][1], diff_sha256: s.diff_sha256, complete_original_paths: s.members.map(m => m.path),
    source_review_complete: true, canonical_disposition_applied: false, executed_case_ids: reviewCases[i],
    file_reviews: s.members.map(m => ({path: m.path, before_blob: m.before_blob, after_blob: m.after_blob,
      scope: i === 0 ? mixedFileNotes[m.path] : m.path.endsWith('.spec.ts') ? 'Whole changed upstream test/fixture read with this SHA decision; original upstream suite not executed.' : m.path.endsWith('.md') ? 'Whole public API delta read: new buttonType/iconName or no-data harness API is absent from the finite owned historical contract described in this SHA decision.' : m.path.endsWith('.bazel') ? 'The added MatIconHarness Bazel dependency belongs to the new modern iconName filter. No owned production icon/testing edge exists.' : 'Whole original source delta reviewed against the specific current public/owned API boundary described in this SHA decision.'}))}));
  const result = {schema_version: 1, role: 'Six individual21.xpublic testing API contract reviews', line: '21.x', status: 'reviewed',
    subjects: {path: subjectPath, sha256: subjectHash}, reviews, cases, semantic_reversions_rejected: rejected, result: 'pass',
    original_MDC_label_reversion_observations: labelReversionObservations,
    producer: {path: 'tests/upstream_testing_api_21x_probe.mjs', sha256: hash(readFileSync(fileURLToPath(import.meta.url)))},
    source_members: sources, actual_library_artifact: {...artifact, source: run.source, run: {path: runPath, sha256: hash(runBytes)}},
    public_sdk_subject: sdk.material_remaining_capsule, matched_installed_public_members: peerMembers,
    public_stable_declarations: declarationProofs,
    complete_minimum_material_archive: {version: materialRecord.version, sha256: materialRecord.archive_sha256,
      integrity: materialRecord.integrity, bytes: materialRecord.archive_bytes, matched_installed_members: completeMaterialMembers},
    retained_packed_evidence: {qualification: {path: qualificationPath, sha256: hash(qualificationBytes)}, run: retained.reports.run},
    current_product_identity: {packed_source_commit: run.source.commit, members: productRows.length,
      git_tree_listing_sha256: hash(productTree), all_current_file_bytes_equal_actual_packed_source: true, extra_product_paths: 0},
    tagged_label_template: {path: historicalTemplatePath, sha256: hash(historicalTemplate), git_blob: '1e69358fe3d91491a70502e3e5881234cc72c7c8'},
    current_label_template: {path: currentTemplatePath, sha256: hash(currentTemplate), legacy_label_class_id_and_for_binding_preserved: true},
    icon_testing_ownership: {production_ts_members: productTs.length, direct_edges: iconTestingEdges, unknown_dynamic_imports: dynamicUnknown},
    environment: {node: process.version, compiler: ts.version, arch: process.arch, platform: process.platform,
      angular: require('@angular/core/package.json').version, cdk: require('@angular/cdk/package.json').version,
      material: require('@angular/material/package.json').version, package_install_executed: false},
    limitations: ['Real packed harnesses, real public CDK HarnessEnvironment/Container/Predicate and real public Angular Injector execute; elements and selector queries are explicit record-backed protocol adapters.',
      'No browser DOM, Angular component view, original upstream fixture suite, new pack/AOT run, Node/RxJS/x64 floor or full gate matrix was executed.',
      'The original patch MDC-prefixed label implementation is a rejected historical reversion. Current minimum behavior, not that research snapshot, is the execution subject.',
      'These individual decisions have no canonical admission credit until the shared current-source/ledger successor is qualified.'],
    canonical_dispositions_changed: 0, g11_claim: 'not-passed'};
  writeFileSync(out, JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({result: result.result, reviews: reviews.length, cases: cases.length, reversions_rejected: rejected.length, report: out}));
} finally {sdk.dispose(); rmSync(temporary, {recursive: true, force: true});}
