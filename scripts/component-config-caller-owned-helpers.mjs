/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite historical helper comparison against untouched tagged SDK declarations/implementation. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';

const ts = createRequire(import.meta.url)('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const paths = {
  location: 'projects/ngx-material-legacy/legacy-progress-bar/internal/progress-bar-location.ts',
  defaults: 'projects/ngx-material-legacy/legacy-progress-bar/internal/progress-bar-defaults.ts',
  state: 'projects/ngx-material-legacy/legacy-checkbox/owned-transition-state.ts',
};
function parse(path, text) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  assert.equal(source.parseDiagnostics.length, 0);
  return source;
}
function tokens(node, source) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, node.getText(source));
  const result = [];
  for (let kind; (kind = scanner.scan()) !== ts.SyntaxKind.EndOfFileToken;) {
    result.push([ts.SyntaxKind[kind], kind === ts.SyntaxKind.StringLiteral ? scanner.getTokenValue() : scanner.getTokenText()]);
  }
  return result;
}
function named(source, name) {
  const found = source.statements.flatMap(statement => ts.isVariableStatement(statement) ?
    statement.declarationList.declarations.filter(declaration => declaration.name?.text === name) :
    statement.name?.text === name ? [statement] : []);
  assert.equal(found.length, 1, 'missing/ambiguous tagged or owned helper ' + name);
  return found[0];
}
function enumDomain(node) {
  assert.ok(ts.isEnumDeclaration(node));
  assert.ok(node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ConstKeyword));
  let next = 0;
  return node.members.map(member => {
    if (member.initializer) {
      assert.ok(ts.isNumericLiteral(member.initializer));
      next = Number(member.initializer.text);
    }
    return [member.name.getText(), next++];
  });
}
function interfaceDomain(node) {
  assert.ok(ts.isInterfaceDeclaration(node));
  return node.members.map(member => {
    assert.ok(ts.isPropertySignature(member));
    return {name: member.name.getText(), optional: !!member.questionToken,
      type: tokens(member.type, member.getSourceFile())};
  });
}
function tokenDomain(node, source) {
  assert.ok(ts.isVariableDeclaration(node) && ts.isNewExpression(node.initializer));
  assert.equal(node.initializer.expression.getText(source), 'InjectionToken');
  return node.initializer.arguments.map(argument => tokens(argument, source));
}

export function compareComponentConfigHelpers({taggedRuntime, taggedTypes, ownedLocation, ownedDefaults, ownedState}) {
  const runtime = parse('tagged-progress-bar.mjs', taggedRuntime), types = parse('tagged-progress-bar.d.ts', taggedTypes.progress),
    checkbox = parse('tagged-checkbox.d.ts', taggedTypes.checkbox), location = parse(paths.location, ownedLocation),
    defaults = parse(paths.defaults, ownedDefaults), state = parse(paths.state, ownedState);
  const locationNames = ['MAT_PROGRESS_BAR_LOCATION', 'MatProgressBarLocation', 'MAT_PROGRESS_BAR_LOCATION_FACTORY'];
  const defaultsNames = ['MatProgressBarDefaultOptions', 'MAT_PROGRESS_BAR_DEFAULT_OPTIONS'];
  for (const [source, names] of [[location, locationNames], [defaults, defaultsNames], [state, ['TransitionCheckState']]]) {
    const actual = source.statements.filter(statement => !ts.isImportDeclaration(statement)).flatMap(statement =>
      ts.isVariableStatement(statement) ? statement.declarationList.declarations.map(declaration => declaration.name.text) : [statement.name?.text]);
    assert.deepEqual(actual.sort(), [...names].sort(), 'extra owned helper code outside the finite historical declarations');
  }
  const enumValues = enumDomain(named(checkbox, 'TransitionCheckState'));
  assert.deepEqual(enumDomain(named(state, 'TransitionCheckState')), enumValues, 'changed historical checkbox enum domain');
  assert.deepEqual(enumValues, [['Init', 0], ['Checked', 1], ['Unchecked', 2], ['Indeterminate', 3]]);
  for (const [name, own] of [['MatProgressBarLocation', location], ['MatProgressBarDefaultOptions', defaults]]) {
    assert.deepEqual(interfaceDomain(named(own, name)), interfaceDomain(named(types, name)), 'changed historical owned interface ' + name);
  }
  for (const [name, own] of [['MAT_PROGRESS_BAR_LOCATION', location], ['MAT_PROGRESS_BAR_DEFAULT_OPTIONS', defaults]]) {
    assert.deepEqual(tokenDomain(named(own, name), own), tokenDomain(named(runtime, name), runtime), 'changed historical owned token ' + name);
    const taggedType = named(types, name).type, ownType = named(own, name).initializer;
    assert.ok(ts.isTypeReferenceNode(taggedType));
    assert.deepEqual(ownType.typeArguments.map(node => tokens(node, own)),
      taggedType.typeArguments.map(node => tokens(node, types)), 'changed historical token type argument ' + name);
  }
  const factory = 'MAT_PROGRESS_BAR_LOCATION_FACTORY';
  assert.deepEqual(tokens(named(location, factory).type, location), tokens(named(types, factory).type, types),
    'changed historical location factory return type');
  assert.deepEqual(tokens(named(location, factory).body, location), tokens(named(runtime, factory).body, runtime),
    'changed historical dynamic/falsy-document location factory body');
  return {enum_values: enumValues, exact_historical_interfaces: 2, exact_historical_tokens: 2,
    exact_historical_location_factory_body: true, normalization: 'Token trivia/quotes and explicit interface/const-enum domains;no candidate-derived expectations',
    actual_factory_runtime_native_or_packed_qualified: false};
}

export function inspectComponentConfigOwnedHelpers({qualified, read}) {
  const capsulePath = 'compatibility/rc/component-config-caller-public-subjects.json';
  const capsule = JSON.parse(read(capsulePath)), original = capsule.subjects.find(subject => subject.line === 'original');
  const descriptor = key => {
    const member = original.additions.find(member => member.key === key);
    assert.ok(member, 'tagged helper is outside authenticated SDK additions ' + key);
    const stored = read(member.path);
    assert.equal(hash(stored), member.stored_sha256);
    const bytes = gunzipSync(stored);
    assert.equal(hash(bytes), member.sha256);
    return {text: bytes.toString(), ref: {path: member.path, sha256: member.stored_sha256}};
  };
  const runtime = descriptor('@angular/material/fesm2022/progress-bar.mjs');
  const progress = descriptor('@angular/material/progress-bar/index.d.ts');
  const checkbox = descriptor('@angular/material/checkbox/index.d.ts');
  const inputs = {taggedRuntime: runtime.text, taggedTypes: {progress: progress.text, checkbox: checkbox.text},
    ownedLocation: read(paths.location).toString(), ownedDefaults: read(paths.defaults).toString(), ownedState: read(paths.state).toString()};
  for (const [key, path] of Object.entries(paths)) {
    const text = inputs[{location: 'ownedLocation', defaults: 'ownedDefaults', state: 'ownedState'}[key]];
    assert.equal(hash(text), hash(qualified.source.sources.get(path)), 'helper is outside the qualified complete source graph');
  }
  const report = compareComponentConfigHelpers(inputs);
  return {report, inputs, evidence: [runtime.ref, progress.ref, checkbox.ref], owned_paths: paths};
}
