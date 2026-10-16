/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Review the two original standalone migrations without adopting their private fixtures. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  ENV_SHAS, ENV_CAPSULES, authenticateTestEnvironmentPatch, originalEnvironmentCases,
} from './spec-test-environment-source-review.mjs';

const ts = createRequire(import.meta.url)('typescript');
const rootDefault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = value => createHash('sha256').update(value).digest('hex');
const digest = value => hash(JSON.stringify(value));
const parse = (text, path = 'original.spec.ts') => {
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  assert.equal(file.parseDiagnostics.length, 0);
  return file;
};
const collect = (node, predicate) => {
  const rows = [];
  function visit(n) { if (predicate(n)) rows.push(n); ts.forEachChild(n, visit); }
  visit(node);
  return rows;
};
function shape(node, {withoutDecorators = false, factoryNames = false} = {}) {
  const children = [];
  ts.forEachChild(node, child => {
    if (!(withoutDecorators && ts.isDecorator(child))) {
      children.push(shape(child, {withoutDecorators, factoryNames}));
    }
  });
  if (factoryNames && ts.isCallExpression(node) &&
      ['createComponent', 'TestBed.createComponent'].includes(node.expression.getText())) {
    return ['fixture-factory-name-only', node.typeArguments?.map(n => shape(n)) || [],
      node.arguments.map(n => shape(n))];
  }
  return [node.kind, ts.isVariableDeclarationList(node) ? node.flags &
    (ts.NodeFlags.Const | ts.NodeFlags.Let | ts.NodeFlags.Using | ts.NodeFlags.AwaitUsing) : null,
  ts.isIdentifier(node) ? node.text : ts.isLiteralExpression(node) ? node.text : null, children];
}

export const STANDALONE_SHAS = ENV_SHAS.slice(2);
export const MENU_WITNESS = {
  path: 'src/material/menu/menu.spec.ts', suites: ["'MatMenu'", "'lazy rendering'"],
  name: "'should detach the lazy content when the menu is closed'",
  before_sha256: '5dc4254c6e9495bc2c19f45c911b1dc9a4ca746a42a795e7fa7a511c3900eb4b',
  after_sha256: 'f7e8139c7f6fc6bf5596a9a1f47c57c81af8e2a50fecef575a54f3b571728dd1',
};
const popover = 'src/cdk-experimental/popover-edit/popover-edit.spec.ts';
const tree = 'src/cdk/tree/tree-with-tree-control.spec.ts';
export const TEMPLATE_REVIEWS = [
  [popover, 'VanillaTableOutOfCell', '425a3cd926268e384eae359260eb97364ed5603d5eafaf506271d2fbd18c77cc', '103b2007d3e1f4ca789a59895bc2ce4a23561cb8f1d948ba73303e1749043326', 'literal-inlining'],
  [popover, 'VanillaTableInCell', 'ad5ec114315dbf92aafe91806b3ccc295d48b9a9b0a2bdbe413c612ef90cc16c', '089f72befb9a9ec1e5655d3ee9d4a7bf3f6941ec71d58d500bdff5fa74c04eb1', 'literal-inlining'],
  [popover, 'CdkFlexTableInCell', '500a95bb6758e431698fd95d358837dad0a5998f14a2552f9b47931ab83976e1', '209337d5a996604a373f74b54b40ce14d0f31b074a3ff8d4b6f2ea47f62bc288', 'literal-inlining'],
  [popover, 'CdkTableInCell', 'd23d83cb1adbb67edf01dd1e89b100b16904eb85fd4af9dcc13212e651487967', '5c2134ca66f9cac78052ad0471773bdf9727f39a54ed5b417b7b57dd64b011ea', 'literal-inlining'],
  [popover, 'CdkTableWithSkipRows', 'ac2c0c7b50f909a4ec23589904387e168e323f8961b30c69ca40fe2aa089b8ac', '0b11084519de0a5697c85c21ca4a0af36ffd33e232e63a88cf229c108a19cd80', 'literal-inlining'],
  [tree, 'SimpleCdkTreeAppWithIndirectNodes', 'c741d916916c7721fd15cd44d61a0932e123a491e36e3cb3c744ac99238cf2e2', '678533605da3c4c2d159b8148d13900ea2ef4bc1b301d734cead2aa32a94489a', 'ngSwitch-to-if'],
  [tree, 'NestedCdkTreeAppWithToggle', 'a7eacfefa1fca21cd8edbc4d19f2cbfb16f7c21782f4be49704411f68b6129b4', 'a39b9a0214696631b38074768c5d6cf473c9ae90d9f207893620e7dfbad162d4', 'div-wrapper-removed'],
  ['src/material/autocomplete/autocomplete.spec.ts', 'NgIfAutocomplete', 'c0eb0e28c74f176a3fc34ef49386dbec908db2faf5180b551f59ac8b8a4df653', 'd7e979cd524c1a46adc18b27cd690002abcdd545dad070d192bd9d8cc4c94391', 'whitespace'],
  ['src/material/autocomplete/autocomplete.zone.spec.ts', 'SimpleAutocomplete', 'a25ed90213b56c405348d29c23ae04ddddb135730f49996755298d0c3fb1cc21', 'a56a751ef5d799b679b03d7d72856bb9484ab6a8928853548bd0ae7f5802daad', 'literal-inlining'],
  ['src/material/menu/menu.spec.ts', 'FakeIcon', 'df7a2f1ea296b3bf2cf3944dbd39815c0662f0bc5ca65a0eaed257bd60d90b5e', '28967ef518a530c744d4e140f65face5e23e137c0107cb126f38daff0da20fa5', 'self-closing-projection'],
  ['src/material/select/select.spec.ts', 'SelectWithFormFieldLabel', '63a1e9b2e0a4a4a766ec97fed0ee0768677e69eff498ccb5a4b1a607de8b2720', null, 'unused-fixture-removed'],
];

// These fingerprints identify authenticated upstream observations, not candidate goldens.
// Factory spelling/argument projection below compares predicates only. It does not
// prove injector, provider precedence, rendering, creation or lifecycle equivalence.
function predicateProjection(expression, file) {
  const result = ts.transform(expression, [context => {
    const visit = node => {
      if (ts.isCallExpression(node)) {
        const name = node.expression.getText(file);
        if (['createComponent', 'TestBed.createComponent', 'setupComponent'].includes(name)) {
          assert.ok(node.arguments.length >= 1);
          if (name === 'TestBed.createComponent') assert.equal(node.arguments.length, 1);
          for (const extra of node.arguments.slice(1)) {
            assert.ok(ts.isArrayLiteralExpression(extra), 'unknown private factory argument');
            assert.ok(extra.elements.every(n => ['ReactiveFormsModule', 'FormsModule', 'FakeIcon']
              .includes(n.getText(file))), 'unknown private factory dependency');
          }
          return ts.factory.updateCallExpression(node, ts.factory.createIdentifier(
            name === 'setupComponent' ? 'setupComponent' : 'predicateFixtureFactory'),
          node.typeArguments, [ts.visitNode(node.arguments[0], visit)]);
        }
      }
      return ts.visitEachChild(node, visit, context);
    };
    return node => ts.visitNode(node, visit);
  }]);
  try { return digest(shape(result.transformed[0])); } finally { result.dispose(); }
}
const predicateRows = row => {
  const file = parse(row.raw);
  return collect(file, n => ts.isExpressionStatement(n) &&
    n.expression.getText(file).startsWith('expect('))
    .map(n => ({text: n.getText(file), projection: predicateProjection(n.expression, file)}));
};
export function reviewMenuWitness(before, after) {
  for (const [side, row] of [['before', before], ['after', after]]) {
    assert.equal(row.path, MENU_WITNESS.path);
    assert.deepEqual(row.suites, MENU_WITNESS.suites);
    assert.equal(row.name, MENU_WITNESS.name);
    assert.equal(hash(row.raw), MENU_WITNESS[side + '_sha256']);
  }
  assert.ok(before.raw.includes('destroyCount++') && before.raw.includes('toBe(2)'));
  assert.ok(after.raw.includes('destroyCheckers.toArray()') &&
    after.raw.includes('toEqual([false, false])') && after.raw.includes('toEqual([true, true])'));
  assert.equal(predicateRows(before).length, 4);
  assert.equal(predicateRows(after).length, 4);
  return {kind: 'aggregate-destroy-counter-to-per-instance-flags',
    before_sha256: hash(before.raw), after_sha256: hash(after.raw),
    same_item_query_expectations: true, observations_equivalent: false,
    directive_moved_from_case_to_standalone_fixture: true,
    owned_packed_gate_requires_actual_child_destruction_and_recreation: true,
    owned_packed_gate_execution_qualified: false};
}
export function compareStandaloneCases(before, after) {
  assert.deepEqual(after.map(n => n.key), before.map(n => n.key),
    'case path, suite, mode, occurrence or order changed');
  const pairs = [], individual = [];
  for (let i = 0; i < before.length; i++) {
    const old = before[i], next = after[i], a = predicateRows(old), b = predicateRows(next);
    const equal = JSON.stringify(a.map(n => n.projection)) === JSON.stringify(b.map(n => n.projection));
    if (!equal) individual.push(reviewMenuWitness(old, next));
    pairs.push({key: old.key, path: old.path, suites: old.suites, name: old.name, mode: old.mode,
      before_sha256: old.sha256, after_sha256: next.sha256,
      callback_semantic_equal: old.callback_sha256 === next.callback_sha256,
      predicates_equal_after_private_factory_projection: equal,
      predicate_projection_does_not_prove_fixture_equivalence: true,
      ...(equal ? {} : {before_observations: a, after_observations: b})});
  }
  return {pairs, individual};
}

function classOwner(node) {
  let parent = node;
  while (parent && !ts.isClassDeclaration(parent)) parent = parent.parent;
  assert.ok(parent?.name);
  return parent.name.text;
}
const properties = (file, name) => collect(file, n => ts.isPropertyAssignment(n) &&
  n.name.getText(file) === name).map(n => ({owner: classOwner(n), node: n.initializer}));
function constantResolver(file) {
  const constants = new Map();
  for (const statement of file.statements.filter(ts.isVariableStatement)) {
    if (!(statement.declarationList.flags & ts.NodeFlags.Const)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer) {
        assert.ok(!constants.has(declaration.name.text));
        constants.set(declaration.name.text, declaration.initializer);
      }
    }
  }
  const literal = (node, stack = []) => {
    if (ts.isStringLiteralLike(node)) return node.text;
    if (ts.isTemplateExpression(node)) return node.head.text + node.templateSpans
      .map(n => literal(n.expression, stack) + n.literal.text).join('');
    assert.ok(ts.isIdentifier(node), 'nonliteral template operation is not executed');
    assert.ok(constants.has(node.text) && !stack.includes(node.text), 'unresolved template constant');
    return literal(constants.get(node.text), [...stack, node.text]);
  };
  return literal;
}
export function reviewStandaloneTemplates(subject) {
  const changes = [], styles = [];
  for (const member of subject.members) {
    const old = parse(member.before.text, member.path), next = parse(member.after.text, member.path);
    const a = properties(old, 'template'), b = properties(next, 'template');
    assert.ok(b.every(n => a.some(o => o.owner === n.owner)), 'unreviewed new template');
    for (const row of a) {
      const other = b.find(n => n.owner === row.owner);
      if (other && row.node.getText(old) === other.node.getText(next)) continue;
      const rule = TEMPLATE_REVIEWS.find(n => n[0] === member.path && n[1] === row.owner);
      assert.ok(rule, 'unreviewed fixture template change');
      assert.equal(hash(row.node.getText(old)), rule[2]);
      assert.equal(other ? hash(other.node.getText(next)) : null, rule[3]);
      let nonwhitespaceEqual = false;
      if (other) nonwhitespaceEqual = constantResolver(old)(row.node).replace(/\s/g, '') ===
        constantResolver(next)(other.node).replace(/\s/g, '');
      assert.equal(nonwhitespaceEqual, ['literal-inlining', 'whitespace'].includes(rule[4]));
      if (rule[4] === 'unused-fixture-removed') {
        assert.equal(collect(old, n => ts.isIdentifier(n) && n.text === row.owner).length, 2);
        assert.equal(collect(next, n => ts.isIdentifier(n) && n.text === row.owner).length, 0);
      }
      changes.push({path: member.path, owner: row.owner, before_sha256: rule[2],
        after_sha256: rule[3], kind: rule[4], literal_nonwhitespace_stream_equal: nonwhitespaceEqual,
        DOM_whitespace_projection_or_lifecycle_equivalence_proved: false,
        owned_template_changed: false});
    }
    const styleRows = file => ['styles', 'styleUrls', 'styleUrl'].flatMap(name =>
      properties(file, name).map(n => ({name, owner: n.owner, text: n.node.getText(file)})));
    assert.deepEqual(styleRows(old), styleRows(next), 'unreviewed upstream fixture style change');
    styles.push({path: member.path, upstream_style_properties_unchanged: true});
  }
  const expected = TEMPLATE_REVIEWS.filter(n => subject.members.some(m => m.path === n[0]));
  assert.equal(changes.length, expected.length);
  return {changes, styles};
}

export const FILE_JUDGMENTS = {
  [popover]: 'Inline five literal macros and move CdkTableModule/MatPopoverEditModule, forms and editing dependencies to fixture imports. Static expansion preserves only the nonwhitespace string stream. Do not transplant experimental popover-edit fixtures or infer legacy DOM/layout equivalence.',
  'src/cdk/dialog/dialog.spec.ts': 'Move dialog fixture declarations to imports. Preserve owned legacy dialog modules, real overlay/focus/lifetime observations and public peer interoperability; injector and creation equivalence are not established by this fixture migration.',
  'src/cdk/listbox/listbox.spec.ts': 'Remove setupComponent module/declaration configuration and its extra forms-import parameter; retain direct creation, initial detection, queries and all predicates. Dependency ownership moves to each fixture. CDK listbox remains reachable; no CDK fork or inherited behavior claim.',
  'src/cdk/menu/context-menu-trigger.spec.ts': 'Remove the private creation/configuration helper and add explicit initial detection where its implicit detection was needed. Keep actual menu-sharing and context predicates. Scope/creation equivalence is not asserted.',
  'src/cdk/menu/menu-trigger.spec.ts': 'Replace helper creation with TestBed and explicit initial detection for three sharing/recursive fixtures; remove local declarations from context/focus cases. Preserve actual predicates while declining the private scope rewrite.',
  'src/cdk/table/table.spec.ts': 'Remove declaration lists, relocate table dependencies to fixtures and drop extra wrapper declarations from setupTableTestApp. Keep all content/error/OnPush predicates; preserve owned legacy table structure and consumer viewport/selection fixtures.',
  'src/cdk/tree/tree-using-legacy-key-manager.spec.ts': 'Convert the four inherited private tree test fixtures to standalone imports. No owned key-manager implementation or public compatibility contract is replaced.',
  [tree]: 'Remove configureCdkTreeTestingModule/declaration batches and relocate dependencies. Separately review ngSwitch-to-@if and removal of the expanded-node div wrapper. The wrapper removal changes fixture structure; preserve owned legacy templates and do not declare DOM equivalence.',
  'src/cdk/tree/tree.spec.ts': 'Remove private configureCdkTreeTestingModule calls and declaration batches, retaining completion/destroy/indirect-node/expansion assertions. Public current CDK remains a reachable peer; no tree fork or source-only native pass.',
  'src/material/autocomplete/autocomplete.spec.ts': 'Relocate component dependencies into imports, retain the disabled xit and every suite-qualified occurrence; one existing control-flow template changes whitespace. Preserve owned legacy autocomplete markup and actual overlay/form/focus gates.',
  'src/material/autocomplete/autocomplete.zone.spec.ts': 'Inline the local SIMPLE_AUTOCOMPLETE_TEMPLATE literal and move dependencies to standalone imports. Expanded nonwhitespace strings match; whitespace/rendering/zone behavior still requires actual tests.',
  'src/material/grid-list/grid-list.spec.ts': 'Replace the private creation/declaration helper and add fixture imports, retaining invalid ratio/error and layout predicates. Do not replace historical grid structure or accept layout from factory-spelling comparison.',
  'src/material/input/input.spec.ts': 'Remove private configuration/creation helpers; relocate ErrorHandler rethrow providers into suite beforeEach, and move per-case error matcher/default options to explicit TestBed setup, including a reset in the floating-label case. Keep accessor dependencies and all predicates. Reset/provider precedence and error-observation context are not proved equivalent.',
  'src/material/menu/menu.spec.ts': 'Review the per-instance destroy witness separately from the aggregate counter; lift DestroyChecker and add its query/import. Rewrite FakeIcon projection syntax. Reset/reacquire OverlayContainer for provider/NoopAnimations overrides; inject FocusMonitor/ViewportRuler per case. Nested menus move compileTestComponent into beforeEach, use a mutable Directionality getter for rtl and add provideCheckNoChangesConfig({exhaustive:false}). Preserve actual focus/layout predicates and owned animation host. Decline these private scopes/checking preferences without introducing their debug provider or changing consumer structure.',
  'src/material/select/select.spec.ts': 'Remove private declarations/helper batches; drop the unused SelectWithFormFieldLabel fixture (only declaration and module-registration references). Keep all241 occurrences. Review explicit reset/provider overrides separately, including quick close after reset without the former module configuration. Preserve owned animation/focus/scroll/default-options and legacy structure; no provider/lifecycle equivalence claim.',
  'src/material/slider/slider.spec.ts': 'Move dependencies to fixture imports and remove private module declarations. Retain every slider predicate and historical padding/timing requirements; standalone metadata supplies no native layout or interaction proof.',
  'src/material/tooltip/tooltip.spec.ts': 'Move dependencies to standalone imports and remove declarations/imports from provider override scopes; wide-tooltip case retains reset while dropping configuration. Keep all delay/position/interactivity predicates. Preserve owned overlay and lifecycle gates; injector/creation/render equivalence remains unproved.',
};

function setupGraph(file) {
  const textRow = node => ({line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
    sha256: hash(node.getText(file)), text: node.getText(file)});
  return {
    imports: file.statements.filter(ts.isImportDeclaration).map(textRow),
    fixture_decorators: collect(file, ts.isDecorator).map(n => {
      const name = ts.isCallExpression(n.expression) ? n.expression.expression.getText(file) : '';
      if (!['Component', 'Directive', 'NgModule'].includes(name)) return null;
      const argument = n.expression.arguments[0];
      return {owner: classOwner(n), name, properties: argument && ts.isObjectLiteralExpression(argument)
        ? argument.properties.map(p => ({name: p.name?.getText(file), sha256: hash(p.getText(file)),
          ...(['template', 'styles'].includes(p.name?.getText(file)) ? {} : {text: p.getText(file)})})) : []};
    }).filter(Boolean),
    configuration_and_factory_calls: collect(file, n => ts.isCallExpression(n) &&
      /^(TestBed\.|createComponent$|setupComponent$|setupTableTestApp$|configureCdkTreeTestingModule$|configureMatSelectTestingModule$|compileTestComponent$)/.test(n.expression.getText(file)))
      .map(textRow),
    variable_declaration_kinds: collect(file, ts.isVariableDeclarationList).map(n => ({
      flags: n.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let | ts.NodeFlags.Using | ts.NodeFlags.AwaitUsing),
      bindings: n.declarations.map(d => d.name.getText(file)),
    })),
  };
}
function classChanges(member) {
  const a = parse(member.before.text), b = parse(member.after.text);
  const classes = file => collect(file, ts.isClassDeclaration).map(n => ({name: n.name?.text, node: n}));
  const old = classes(a), next = classes(b);
  assert.ok(next.every(n => old.some(o => o.name === n.name)), 'unexpected new fixture class');
  const changes = old.filter(n => !next.some(o => o.name === n.name &&
    digest(shape(n.node, {withoutDecorators: true})) === digest(shape(o.node, {withoutDecorators: true}))));
  const expected = member.path === MENU_WITNESS.path ? ['DestroyChecker', 'OverlapSubject', 'SimpleLazyMenu'] :
    member.path === 'src/material/select/select.spec.ts' ? ['SelectWithFormFieldLabel'] : [];
  assert.deepEqual(changes.map(n => n.name), expected, 'unreviewed fixture class behavior change');
  return changes.map(n => {
    const other = next.find(o => o.name === n.name);
    if (n.name === 'OverlapSubject') assert.deepEqual(shape(n.node, {withoutDecorators: true, factoryNames: true}),
      shape(other.node, {withoutDecorators: true, factoryNames: true}));
    return {name: n.name, before: n.node.getText(a), after: other?.node.getText(b) || null,
      owned_fixture_changed: false};
  });
}
export function analyzeStandaloneEnvironment(subject) {
  assert.ok(STANDALONE_SHAS.includes(subject.sha), 'not a standalone migration original');
  const hunks = authenticateTestEnvironmentPatch(subject);
  const before = originalEnvironmentCases(subject, 'before'), after = originalEnvironmentCases(subject, 'after');
  const comparison = compareStandaloneCases(before, after), templates = reviewStandaloneTemplates(subject);
  const material = subject.sha === STANDALONE_SHAS[1];
  assert.equal(before.length, material ? 882 : 429);
  assert.equal(comparison.individual.length, material ? 1 : 0);
  assert.equal(before.filter(n => n.mode === 'xit').length, material ? 1 : 0);
  assert.equal(before.filter(n => n.mode === 'fit').length, 0);
  const programs = subject.members.map(member => ({path: member.path,
    judgment: FILE_JUDGMENTS[member.path], before: setupGraph(parse(member.before.text, member.path)),
    after: setupGraph(parse(member.after.text, member.path)), class_behavior_changes: classChanges(member),
    provider_creation_render_and_lifetime_equivalence_proved: false}));
  assert.ok(programs.every(n => n.judgment));
  return {sha: subject.sha, complete_original_files: subject.members.length,
    complete_original_hunks: hunks.length, static_occurrences: before.length,
    complete_ordered_case_bijection: true, retained_disabled_occurrences: material ? 1 : 0,
    callback_semantic_equal: comparison.pairs.filter(n => n.callback_semantic_equal).length,
    case_pairs: comparison.pairs, individually_reviewed_witness_changes: comparison.individual,
    template_reviews: templates.changes, style_reviews: templates.styles, fixture_programs: programs,
    hunk_reviews: hunks.map(n => ({...n, judgment: FILE_JUDGMENTS[n.path],
      review_basis: 'Authenticated complete original, ordered full suite/path/mode case pairing, predicate comparison, explicit fixture graph and individual template/lifecycle observations. Fixture equivalence is not asserted.'})),
    source_conclusion_only: true, final_disposition: 'do-not-adopt',
    actual_Angular_browser_native_packed_or_floor_qualified: false};
}

export const OWNED_MENU_GATES = {
  'scripts/chip-menu-tooltip-packed-contract.mjs': '4c431f5c93a062815c24c858c4506eb26f218f43f9702a609b64b64db9733e6a',
  'scripts/packed-consumer-aot-smoke.mjs': {
    main: '5827a9f4705b9f5dd5b6860c989ce94ed1e44f9602b9a828c13802b527457591',
    '21.x': '1d8a4bd076b77ed5e74561c74496dfe39bce114b16fa7a6f87dfed8a2765b146',
  },
  'scripts/api-menu-content-context.mjs': 'eb9d7b52a34d38d26c24cd101c45434568255f1857c0645437ff1f7aa10d37db',
};
export function inspectStandaloneEnvironmentSources({root = rootDefault, readMember} = {}) {
  const read = readMember || (path => readFileSync(resolve(root, path)));
  const line = JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main';
  const [originals, acquisition] = Object.entries(ENV_CAPSULES[line]).map(([path, sha]) => {
    const bytes = read(path); assert.equal(hash(bytes), sha, 'captured original changed');
    return JSON.parse(gunzipSync(bytes));
  });
  for (const packet of [originals, acquisition]) {
    assert.equal(packet.line, line);
    assert.equal(hash(read(packet.producer.path)), packet.producer.sha256);
    assert.equal(hash(packet.selection.worksheet_text), packet.selection.sha256);
    assert.deepEqual(JSON.parse(packet.selection.worksheet_text).subjects, ENV_SHAS);
  }
  assert.deepEqual(originals.subjects.map(n => n.sha), ENV_SHAS);
  assert.deepEqual(acquisition.subjects, ENV_SHAS);
  const census = JSON.parse(gunzipSync(read('compatibility/rc/upstream-complete-patch-census.json.gz')));
  assert.equal(census.line, line);
  for (const subject of originals.subjects) {
    authenticateTestEnvironmentPatch(subject);
    const row = census.commits.find(n => n.sha === subject.sha);
    assert.equal(row.raw_commit, subject.raw_commit);
    assert.deepEqual(row.complete_changed_files, subject.complete_changed_files);
  }
  for (const [path, sha] of Object.entries(OWNED_MENU_GATES)) {
    assert.equal(hash(read(path)), typeof sha === 'string' ? sha : sha[line],
      'owned lifetime gate changed; qualify separately');
  }
  const subjects = originals.subjects.slice(2).map(analyzeStandaloneEnvironment);
  return {schema_version: 1, line, all_four_originals_authenticated: true,
    complete_original_files: 17, complete_original_hunks: 675,
    individual_standalone_source_decisions: 2, static_occurrences_paired: 1311,
    disabled_occurrences_preserved: 1, individual_lifecycle_witness_changes: 1,
    changed_template_properties_reviewed: 11, changed_style_properties: 0,
    subjects, owned_menu_gates: OWNED_MENU_GATES, product_changes: 0,
    factory_projection_is_not_fixture_equivalence: true,
    owned_packed_menu_runtime_qualification: 'pending',
    actual_Angular_browser_native_packed_or_floor_qualified: false, g11_claim: 'not-passed'};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = inspectStandaloneEnvironmentSources(), out = process.argv.indexOf('--out');
  if (out >= 0) writeFileSync(process.argv[out + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({...report, subjects: undefined}));
}
