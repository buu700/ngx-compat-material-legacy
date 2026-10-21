/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite candidate structure only; tagged semantics/defaults/runtime/DI remain separate. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {dialogCallerSource} from '../scripts/dialog-caller-contracts.mjs';
import {componentConfigGraph} from '../scripts/component-config-caller-contracts.mjs';

const root = process.cwd(), read = path => readFileSync(join(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const ts = createRequire(import.meta.url)('typescript');
const source = dialogCallerSource({root}), path = 'compatibility/rc/dialog-caller-config-candidate.json';
const pins = {main: 'f41b9a5ff0a050a32ef1b29928439c9b4aab9b352d935b9fa1076a9f708df5a9',
  '21.x': '60da5e774a1be52328693c4bc0b56c462ee111457fa64879da6b3f8f8b710aea'};
assert.equal(hash(read(path)), pins[source.prior.line]);
const proposal = JSON.parse(read(path));
assert.equal(proposal.line, source.prior.line);
assert.deepEqual(proposal.source_capture, source.ref);
assert.equal(proposal.members.length, 3);
assert.equal(proposal.product_applied, false);
assert.equal(proposal.new_source_closures, 0);
assert.equal(hash(read(proposal.patch.path)), proposal.patch.sha256);
for (const member of proposal.members) {
  for (const version of [member.before, member.after]) {
    assert.equal(hash(version.text), version.sha256);
    assert.equal(Buffer.byteLength(version.text), version.bytes);
  }
  assert.equal(hash(read(member.path)), member.before.sha256, 'candidate unexpectedly applied');
  assert.equal(source.sources.get(member.path), member.before.text);
}
const parse = (path, text) => {
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  assert.equal(sf.parseDiagnostics.length, 0);
  return sf;
};
const bodies = sf => {
  const out = [];
  function visit(node) {
    if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node) || ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node)) && node.body) {
      out.push({kind: ts.SyntaxKind[node.kind], body: node.body.getText(sf)});
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return out;
};
const domains = node => {
  const types = ts.isUnionTypeNode(node) ? node.types : [node];
  return types.map(type => ts.SyntaxKind[type.kind]).sort();
};
export function inspectCandidate(members) {
  const config = members.find(member => member.path.endsWith('/dialog-config.ts'));
  const before = parse(config.path, config.before.text), after = parse(config.path, config.after.text);
  const aliases = after.statements.filter(ts.isTypeAliasDeclaration);
  assert.equal(aliases.length, 1);
  const alias = aliases[0];
  assert.equal(alias.name.text, 'LegacyDialogRuntimeConfig');
  assert.ok(ts.isIntersectionTypeNode(alias.type));
  assert.equal(alias.type.types.length, 2);
  const [omit, owned] = alias.type.types;
  assert.equal(omit.typeName.getText(after), 'Omit');
  assert.equal(omit.typeArguments.length, 2);
  assert.equal(omit.typeArguments[0].getText(after), 'DialogConfigBase<D>');
  assert.deepEqual(omit.typeArguments[1].types.map(type => type.literal.text).sort(),
    ['autoFocus', 'enterAnimationDuration', 'exitAnimationDuration']);
  assert.ok(ts.isTypeLiteralNode(owned));
  assert.deepEqual(owned.members.map(member => [member.name.text, !!member.questionToken, domains(member.type)]), [
    ['autoFocus', true, ['BooleanKeyword', 'StringKeyword']],
    ['enterAnimationDuration', true, ['NumberKeyword', 'StringKeyword']],
    ['exitAnimationDuration', true, ['NumberKeyword', 'StringKeyword']],
  ]);
  const oldClass = before.statements.find(ts.isClassDeclaration), nextClass = after.statements.find(ts.isClassDeclaration);
  assert.equal(nextClass.name.text, oldClass.name.text);
  assert.deepEqual(nextClass.heritageClauses.map(node => node.getText(after)), oldClass.heritageClauses.map(node => node.getText(before)));
  const added = nextClass.members.filter(member => member.name.text === 'autoFocus');
  assert.equal(added.length, 1);
  assert.equal(added[0].initializer.text, 'first-tabbable');
  assert.equal(!!added[0].questionToken, true);
  assert.deepEqual(domains(added[0].type), ['BooleanKeyword', 'StringKeyword']);
  assert.deepEqual(added[0].modifiers.map(modifier => modifier.kind), [ts.SyntaxKind.OverrideKeyword]);
  assert.deepEqual(nextClass.members.filter(member => member.name.text !== 'autoFocus').map(member => member.getText(after)),
    oldClass.members.map(member => member.getText(before)));
  for (const member of members) {
    const old = parse(member.path, member.before.text), next = parse(member.path, member.after.text);
    assert.deepEqual(bodies(next), bodies(old), 'focus/motion/constructor/function body changed');
    if (member.path.endsWith('/dialog-container-base.ts')) {
      const constructor = sf => sf.statements.find(node => ts.isClassDeclaration(node) &&
        node.name.text === '_MatDialogContainerBase').members.find(ts.isConstructorDeclaration);
      const a = constructor(old), b = constructor(next);
      assert.equal(a.parameters.length, b.parameters.length);
      for (let index = 0; index < a.parameters.length; index++) {
        const left = a.parameters[index], right = b.parameters[index];
        if (left.name.text !== '_config') assert.equal(right.getText(next), left.getText(old));
        else {
          assert.equal(index, 3);
          assert.equal(right.type.getText(next), 'LegacyDialogRuntimeConfig');
          assert.deepEqual(right.modifiers.map(modifier => modifier.getText(next)),
            ['@Inject(MatDialogConfig)', 'public', 'readonly']);
          assert.equal(right.initializer, undefined);
          assert.equal(right.questionToken, undefined);
        }
      }
    }
    if (member.path.endsWith('/dialog-initial-focus.ts')) {
      const replacement = "import type {LegacyDialogRuntimeConfig as MatDialogConfig} from '../dialog-config';";
      assert.equal(member.after.text.split(replacement).length, 2);
      assert.equal(member.after.text.replace(replacement,
        "import {MatDialogConfig} from '@angular/material/dialog';"), member.before.text);
    }
  }
  return true;
}
inspectCandidate(proposal.members);
const mutations = [
  ['/dialog-config.ts', "'exitAnimationDuration'>", "'restoreFocus'>"],
  ['/dialog-config.ts', 'autoFocus?: string | boolean;', 'autoFocus?: any;'],
  ['/dialog-config.ts', "= 'first-tabbable';", "= 'dialog';"],
  ['/dialog-config.ts', "override maxWidth?: number | string = '80vw';", "override maxWidth?: number | string = '90vw';"],
  ['/dialog-container-base.ts', '@Inject(MatDialogConfig) public readonly _config:', '@Inject(OverlayRef) public readonly _config:'],
  ['/dialog-container-base.ts', '      this._ariaLabelledByQueue.push(_config.ariaLabelledBy);', '      this._ariaLabelledByQueue.push("changed");'],
  ['/dialog-initial-focus.ts', "from '../dialog-config';", "from '@angular/material/dialog';"],
];
for (const [suffix, from, to] of mutations) {
  const members = structuredClone(proposal.members), member = members.find(member => member.path.endsWith(suffix));
  assert.equal(member.after.text.split(from).length, 2);
  member.after.text = member.after.text.replace(from, to);
  assert.throws(() => inspectCandidate(members), error => error?.code === 'ERR_ASSERTION', suffix + ':' + from);
}
const replacements = new Map(proposal.members.map(member => [member.path, member.after.text]));
const candidate = componentConfigGraph({root, selected: source.prior.selected,
  read: member => replacements.has(member) ? Buffer.from(replacements.get(member)) : read(member)});
assert.deepEqual([...candidate.sources.keys()].sort(), [...source.sources.keys()].sort());
assert.deepEqual(candidate.metadata, source.prior.metadata);
assert.deepEqual(candidate.peers, source.peers);
assert.equal(candidate.edges.length, source.prior.edges.length + 2);
for (const member of source.prior.ledgers) assert.equal(hash(read(member.path)), member.sha256, 'candidate changed canonical ledger bytes');
const report = {schema_version: 1, line: proposal.line, candidate: {path, sha256: pins[proposal.line]},
  product_files: 3, candidate_graph_sources: candidate.sources.size, exact_owned_fields: 3,
  focus_motion_constructor_and_other_function_bodies_unchanged: true,
  explicit_existing_DI_token_annotation: 'MatDialogConfig', structural_faults_rejected: mutations.length,
  canonical_ledgers_byte_preserved: 3, product_applied: false, source_closures: 0,
  candidate_semantic_types_tagged_defaults_actual_DI_runtime_native_or_packed_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(report));
