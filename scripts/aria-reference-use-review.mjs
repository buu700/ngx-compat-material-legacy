/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Public ARIA id-list semantics and exact historical modal ownership methods. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SourceTextModule, SyntheticModule} from 'node:vm';
import {gunzipSync} from 'node:zlib';
import {keyManagerPublicSubjects} from './key-manager-public-subjects.mjs';

const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const sha = b => createHash('sha256').update(b).digest('hex');
const names = ['addAriaReferencedId', 'removeAriaReferencedId'];
const allNames = [...names, 'getAriaReferenceIds'];
const moduleName = '@angular/cdk/a11y';
const recipes = [
  ['legacy-autocomplete/internal/autocomplete-trigger-base.ts', 'autocomplete', '_MatAutocompleteTriggerBase', [2, 3]],
  ['legacy-select/internal/select-base.ts', 'select', '_MatSelectBase', [1, 2]],
];
const printer = ts.createPrinter({removeComments: true});
const parse = (path, text) => {const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true); assert.equal(source.parseDiagnostics.length, 0); return source;};
const emit = code => ts.transpileModule(code, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: true}}).outputText;
const print = (node, source) => printer.printNode(ts.EmitHint.Unspecified, node, source);
// Complete resulting functions from the individually reviewed e43c059a hunk.
const fixedFunctions = parse('upstream-hunk-result.mjs', `
function addAriaReferencedId(el, attr, id) {
  const ids = getAriaReferenceIds(el, attr); id = id.trim();
  if (ids.some(existingId => existingId.trim() === id)) { return; }
  ids.push(id); el.setAttribute(attr, ids.join(ID_DELIMITER));
}
function removeAriaReferencedId(el, attr, id) {
  const ids = getAriaReferenceIds(el, attr); id = id.trim();
  const filteredIds = ids.filter(val => val !== id);
  if (filteredIds.length) { el.setAttribute(attr, filteredIds.join(ID_DELIMITER)); }
  else { el.removeAttribute(attr); }
}
function getAriaReferenceIds(el, attr) {
  const attrValue = el.getAttribute(attr); return attrValue?.match(/\\S+/g) ?? [];
}`);

/** Attribute protocol supplies only the three Element APIs consumed by the helper. */
export function attributeElement(initial) {
  const attrs = new Map(Object.entries(initial || {})), calls = [];
  return {attrs, calls, getAttribute(name) {calls.push(['get', name]); return attrs.get(name) ?? null;},
    setAttribute(name, value) {assert.equal(typeof value, 'string'); calls.push(['set', name, value]); attrs.set(name, value);},
    removeAttribute(name) {calls.push(['remove', name]); attrs.delete(name);}};
}

export function exerciseAriaReferenceHelpers(api, original) {
  const receipts = [];
  for (const attr of ['aria-owns', 'aria-labelledby']) for (const existing of [null, '', ' ', 'a', 'a a', 'a b', ' a\t b\n', 'ab a'])
    for (const id of ['', 'a', ' a ', 'b', ' c ', 'ab']) for (const name of names) {
      const initial = existing === null ? {title: 'keep'} : {[attr]: existing, title: 'keep'};
      const old = attributeElement(initial), current = attributeElement(initial);
      original[name](old, attr, id); api[name](current, attr, id);
      assert.deepEqual([...current.attrs], [...old.attrs]); assert.deepEqual(current.calls, old.calls);
      assert.equal(current.attrs.get('title'), 'keep');
      const once = [...current.attrs]; api[name](current, attr, id); assert.deepEqual([...current.attrs], once);
      receipts.push([attr, existing, id, name, [...old.attrs], old.calls]);
    }
  // Patch-specific optimization: trim once regardless of the number of existing ids.
  let trimCalls = 0;
  const id = {trim() {trimCalls++; return 'b';}}, element = attributeElement({'aria-owns': 'a b c'});
  api.addAriaReferencedId(element, 'aria-owns', id); assert.equal(trimCalls, 1); assert.equal(element.attrs.get('aria-owns'), 'a b c');
  trimCalls = 0; api.removeAriaReferencedId(element, 'aria-owns', id); assert.equal(trimCalls, 1); assert.equal(element.attrs.get('aria-owns'), 'a c');
  return {primitive_string_cases: receipts.length, receipt_sha256: sha(JSON.stringify(receipts)),
    repeated_operation_idempotent: true, trim_once_checks: 2,
    trim_counter_scope: 'Instrumented trim protocol diagnoses the upstream optimization; the public API/callers still require primitive string ids.'};
}

function publicContracts(model) {
  const helpers = [];
  for (const name of allNames) {
    const bodies = [], types = [];
    for (const [path, text] of model.sources) if (path.startsWith('@angular/cdk/') && /\.(mjs|d\.ts)$/.test(path)) {
      const source = parse(path, text);
      for (const node of source.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name))
        (path.endsWith('.mjs') ? bodies : types).push({path, source, node});
    }
    assert.equal(bodies.length, 1); assert.equal(types.length, 1);
    const body = bodies[0], type = types[0]; assert.equal(model.runtime[name].toString(), body.node.getText(body.source));
    if (model.subject.line !== 'original') {
      const expected = fixedFunctions.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === name);
      assert.equal(print(body.node, body.source), print(expected, fixedFunctions), 'minimum peer does not contain the complete reviewed optimization');
    }
    assert.ok(!ts.getJSDocTags(type.node).some(t => ['deprecated', 'docs-private', 'experimental', 'breaking-change'].includes(t.tagName.text)));
    const delimiter = body.source.statements.filter(ts.isVariableStatement).flatMap(n => n.declarationList.declarations).find(n => n.name.text === 'ID_DELIMITER');
    assert.equal(delimiter.initializer.text, ' ');
    helpers.push({name, runtime_path: body.path, runtime_sha256: sha(body.source.text), function_source: body.node.getText(body.source),
      function_sha256: sha(body.node.getText(body.source)), declaration: print(type.node, type.source).replace(/^export /, ''),
      declaration_path: type.path, declaration_sha256: sha(type.source.text), id_delimiter: ' '});
  }
  return {line: model.subject.line, cdk_version: model.subject.cdk_version, public_entry: model.public_entry, helpers};
}

function ownedCallers(root, read) {
  const seed = readFileSync(join(root, 'compatibility/f10/authored-dependency-inventory-seed.json'));
  assert.equal(sha(seed), '3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
  const uses = JSON.parse(seed).symbol_uses.filter(r => r.module === moduleName && names.includes(r.symbol)); assert.equal(uses.length, 4);
  const taggedRaw = readFileSync(join(root, 'compatibility/rc/key-manager-tagged-construction-subjects.json'));
  assert.equal(sha(taggedRaw), '50e7f14e8460bef4eab432c53de985b502678d5c1f0257b1dbcc4a2e30e1aad2');
  const tagged = JSON.parse(taggedRaw), cases = [], owners = [];
  for (const [file, family, className, counts] of recipes) {
    const path = 'projects/ngx-material-legacy/' + file, text = read(path), source = parse(path, text), absolute = join(root, path);
    const options = {noResolve: true, noLib: true}, host = ts.createCompilerHost(options); host.getSourceFile = p => p === absolute ? source : undefined;
    const checker = ts.createProgram([absolute], options, host).getTypeChecker(), bindings = [];
    for (const [index, name] of names.entries()) {
      const imports = source.statements.filter(ts.isImportDeclaration).filter(n => n.moduleSpecifier.text === moduleName)
        .flatMap(n => n.importClause?.namedBindings?.elements?.filter(e => (e.propertyName || e.name).text === name) || []);
      assert.equal(imports.length, 1); const binding = imports[0], symbol = checker.getSymbolAtLocation(binding.name), references = [];
      assert.deepEqual(symbol?.declarations, [binding]); assert.ok(!binding.isTypeOnly && !binding.parent.parent.isTypeOnly); bindings.push([name, binding.name.text]);
      function visit(node) {
        if (ts.isIdentifier(node) && node !== binding.name && node !== binding.propertyName && checker.getSymbolAtLocation(node) === symbol) {
          const call = node.parent; assert.ok(ts.isCallExpression(call) && call.expression === node && call.arguments.length === 3);
          assert.equal(call.arguments[1].getText(source), "'aria-owns'");
          const receiver = call.arguments[0].getText(source); assert.ok(['this._trackedModal', 'modal'].includes(receiver));
          assert.ok(['panelId', 'this.autocomplete.id'].includes(call.arguments[2].getText(source)));
          let member = call; while (member.parent && !ts.isClassDeclaration(member.parent)) member = member.parent;
          references.push({line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, expression: call.getText(source), member: member.name.text});
        }
        ts.forEachChild(node, visit);
      }
      visit(source); assert.equal(references.length, counts[index]);
      cases.push({file, module: moduleName, symbol: name, local_name: binding.name.text, candidate_source_sha256: sha(text), references});
    }
    const cls = source.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === className); assert.ok(cls);
    const entry = tagged.members.find(m => m.archive_member === 'package/fesm2022/' + family + '.mjs'); assert.ok(entry);
    const stored = readFileSync(join(root, entry.path)); assert.equal(sha(stored), entry.gzip_sha256);
    const raw = gunzipSync(stored); assert.equal(sha(raw), entry.sha256); assert.equal(raw.length, entry.bytes);
    const oldSource = parse(entry.archive_member, raw.toString()), oldClass = oldSource.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === className); assert.ok(oldClass);
    const methods = ['_applyModalPanelOwnership', '_clearFromModal'].map(name => {
      const own = cls.members.find(n => ts.isMethodDeclaration(n) && n.name?.getText(source) === name);
      const old = oldClass.members.find(n => ts.isMethodDeclaration(n) && n.name?.getText(oldSource) === name); assert.ok(own?.body && old?.body);
      const canonical = (body, file, aliases) => {
        let code = emit('function replay(){' + body.statements.map(n => n.getText(file)).join('\n') + '}');
        for (const [publicName, local] of aliases) if (publicName !== local) code = code.replaceAll(local, publicName);
        const parsed = parse('replay.mjs', code); return print(parsed.statements.find(ts.isFunctionDeclaration).body, parsed);
      };
      const original = canonical(old.body, oldSource, []); assert.equal(canonical(own.body, source, bindings), original);
      return {name, source: own.getText(source), tagged_body_sha256: sha(original)};
    });
    owners.push({file, family, bindings, methods, tagged_member_sha256: entry.sha256});
  }
  assert.ok(cases.every(c => uses.some(u => u.file === c.file && u.symbol === c.symbol)));
  return {cases, owners};
}

async function replayOwnership(model, owner, api) {
  const imports = owner.bindings.map(([name, local]) => name + (name === local ? '' : ' as ' + local)).join(', ');
  const code = emit(`import {${imports}} from '${moduleName}';export class Replay {${owner.methods.map(m => m.source).join('\n')}}`);
  const bridge = new SyntheticModule(names, function() {for (const name of names) this.setExport(name, api[name]);});
  const module = new SourceTextModule(code); await module.link(spec => {assert.equal(spec, moduleName); return bridge;}); await module.evaluate();
  const instance = new module.namespace.Replay(), a = attributeElement({'aria-owns': 'other'}), b = attributeElement({'aria-owns': 'second'});
  let modal = null; const nativeElement = {closest(selector) {assert.equal(selector, 'body > .cdk-overlay-container [aria-modal="true"]'); return modal;}};
  instance._element = instance._elementRef = {nativeElement}; instance.id = 'select'; instance.autocomplete = {id: 'auto'}; instance._trackedModal = null;
  const id = owner.family === 'select' ? 'select-panel' : 'auto', receipts = [];
  instance._applyModalPanelOwnership(); assert.equal(instance._trackedModal, null); assert.equal(a.calls.length, 0);
  modal = a; instance._applyModalPanelOwnership(); assert.equal(a.attrs.get('aria-owns'), 'other ' + id); assert.equal(instance._trackedModal, a);
  instance._applyModalPanelOwnership(); assert.equal(a.attrs.get('aria-owns'), 'other ' + id);
  modal = b; instance._applyModalPanelOwnership(); assert.equal(a.attrs.get('aria-owns'), 'other'); assert.equal(b.attrs.get('aria-owns'), 'second ' + id); assert.equal(instance._trackedModal, b);
  instance._clearFromModal(); assert.equal(b.attrs.get('aria-owns'), 'second'); assert.equal(instance._trackedModal, null);
  const calls = b.calls.length; instance._clearFromModal(); assert.equal(b.calls.length, calls);
  modal = attributeElement(); instance._applyModalPanelOwnership(); assert.equal(modal.attrs.get('aria-owns'), id);
  instance._clearFromModal(); assert.equal(modal.attrs.has('aria-owns'), false);
  receipts.push(a.calls, b.calls, modal.calls);
  return {line: model.subject.line, file: owner.file, ownership_transitions: 8, receipt_sha256: sha(JSON.stringify(receipts)),
    whole_component_or_native_DOM_executed: false};
}

export async function reviewAriaReferenceUses({root = rootDefault, readSource, subjects, runtimeOverrides} = {}) {
  const read = p => readSource ? readSource(p) : readFileSync(join(root, p), 'utf8'), callers = ownedCallers(root, read);
  const own = !subjects, loaded = subjects || await keyManagerPublicSubjects(root);
  try {
    const contracts = loaded.models.map(publicContracts), original = loaded.models.find(m => m.subject.line === 'original');
    const oldTypes = contracts.find(m => m.line === 'original');
    for (const contract of contracts) for (const helper of contract.helpers) assert.equal(helper.declaration, oldTypes.helpers.find(h => h.name === helper.name).declaration);
    const behaviors = [], delegations = [];
    for (const model of loaded.models) {
      const api = runtimeOverrides?.[model.subject.line] || model.runtime;
      if (model.subject.line !== 'original') behaviors.push({line: model.subject.line, ...exerciseAriaReferenceHelpers(api, original.runtime)});
      for (const owner of callers.owners) delegations.push(await replayOwnership(model, owner, api));
    }
    const manifest = JSON.parse(read('projects/ngx-material-legacy/package.json')), line = manifest.version.startsWith('21.') ? '21.x' : 'main';
    assert.equal(manifest.peerDependencies['@angular/cdk'], '^' + contracts.find(c => c.line === line).cdk_version);
    const patchPath = 'compatibility/f10/disposition-ledger/evidence/patches/e43c059ac313fca732443c6c73cf397f0cf446f3.patch';
    const patch = readFileSync(join(root, patchPath)); assert.equal(sha(patch), 'b7f43524551ae931446c984057ad09ac32b52f7fbbff7c1c2e7ab780d3760695');
    return {schema_version: 1, line, node: process.version, compiler: ts.version, public_subjects_sha256: loaded.capsule_sha256,
      upstream_sha: 'e43c059ac313fca732443c6c73cf397f0cf446f3', patch_path: patchPath, patch_sha256: sha(patch),
      cases: callers.cases, tagged_ownership_methods: callers.owners.map(({bindings, ...owner}) => owner), contracts, behaviors, delegations,
      source_override_used: !!readSource, runtime_override_used: !!runtimeOverrides, rxjs: loaded.rxjs,
      limits: ['Genuine complete authenticated public modules; id-list comparisons use explicit Element get/set/removeAttribute protocols, not a native DOM or assistive technology.',
        'Two exact tagged ownership methods per component replay modal movement, duplicate attachment and cleanup. Autocomplete close/attach and full select/overlay lifecycle remain separate; only their helper-call contexts are inspected.',
        'No complete Angular component, native view/focus, browser, packed consumer or runtime-floor execution.'], g11_claim: 'not-passed'};
  } finally {if (own) loaded.dispose();}
}
