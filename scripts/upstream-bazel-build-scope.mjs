/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Two complete upstream build changes; no installed runtime-fix claim. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';

const ts = createRequire(import.meta.url)('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const gitHash = (kind, text) => createHash('sha1').update(`${kind} ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
export const BAZEL_BUILD_ROLE = 'C04 two individual upstream build-only scope reviews';
export const BAZEL_BUILD_KIND = 'complete-upstream-build-only-source-exclusion';
export const BAZEL_BUILD_SUBJECTS = 'compatibility/rc/bazel-build-only-subjects.json.gz';
export const BAZEL_BUILD_SHAS = ['b777c2df0052232cc304e20c46b0d0572d1f9894', 'ba5cf3d06ebfbb2bf945378cf0f786e68abeab6a'];
const patches = ['79bc624bb4cdc006b2df0f982649422fb2753d4ff57e8435b7bed12739c2578f', '3a5a8cf167384723ee0024671eda3113b8567aabf08e3369354cf5dbe8ee64f3'];
const nonBuildPaths = ['src/bazel-tsconfig-build.json',
  'src/google-maps/map-directions-renderer/map-directions-service.spec.ts',
  'src/google-maps/map-geocoder/map-geocoder.spec.ts', 'src/google-maps/tsconfig-test.json',
  'src/material/icon/icon.spec.ts', 'src/youtube-player/tsconfig-test.json',
  'tools/bazel/ts_project_interop.bzl', 'tools/defaults.bzl'];
const contextPaths = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'toolchain-lock.json', '.node-version', '.npm-version',
  'projects/ngx-material-legacy/package.json', 'projects/ngx-material-legacy/ng-package.json',
  'projects/ngx-material-legacy/tsconfig.lib.json', 'chainman.toml', 'chainman.lock', 'justfile', '.github/workflows/ci.yml'];
const parse = (path, text) => {
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  assert.equal(file.parseDiagnostics.length, 0, 'invalid source syntax'); return file;
};
function config(text, path) {
  const parsed = ts.parseConfigFileTextToJson(path, text); assert.equal(parsed.error, undefined); return parsed.config;
}
let originalAnalysis;
export function analyzeBazelBuildSubjects(readMember) {
  const stored = readMember(BAZEL_BUILD_SUBJECTS);
  assert.equal(hash(stored), '536465cb9e0a708ddc72371fb12a4de727293ea1bb1bfb7dd0232327b83b6346');
  const raw = gunzipSync(stored); assert.equal(hash(raw), '58fa17886575b3998bb402dc645b408ac5af57af531c35554cd683fb7509be90');
  const producers = ['scripts/upstream-bazel-build-scope.mjs', 'scripts/upstream_bazel_source_analysis.py']
    .map(path => ({path, sha256: hash(readMember(path))}));
  if (originalAnalysis) {assert.deepEqual(originalAnalysis.producers, producers, 'analysis producer changed'); return structuredClone(originalAnalysis);}
  const subject = JSON.parse(raw); assert.equal(subject.schema_version, 1);
  assert.deepEqual(subject.reviews.map(r => r.sha), BAZEL_BUILD_SHAS);
  for (const [index, review] of subject.reviews.entries()) {
    assert.equal(gitHash('commit', review.raw_commit), review.sha);
    assert.deepEqual(review.raw_commit.split('\n').filter(l => l.startsWith('parent ')), ['parent ' + review.parent]);
    assert.equal(hash(review.diff), patches[index]); assert.equal(review.diff_sha256, patches[index]);
    assert.equal(review.members.length, [37, 157][index]);
    assert.deepEqual(review.diff.split('\n').filter(l => l.startsWith('diff --git ')).map(l => l.split(' b/')[1]), review.members.map(m => m.path));
    assert.equal(review.diff.split('\n').filter(l => l.startsWith('@@')).length, [74, 332][index]);
    for (const member of review.members) {
      for (const side of ['before', 'after']) if (member[side] !== null) {
        assert.equal(hash(member[side].text), member[side].sha256);
        assert.equal(Buffer.byteLength(member[side].text), member[side].bytes);
        assert.equal(gitHash('blob', member[side].text), member[side].git_blob);
      }
      assert.ok(member.after && review.diff.includes('index ' + (member.before?.git_blob ?? '0'.repeat(40)) + '..' + member.after.git_blob));
    }
  }
  assert.ok(subject.reviews[0].members.every(m => m.path.endsWith('BUILD.bazel')));
  assert.deepEqual(subject.reviews[1].members.filter(m => !m.path.endsWith('BUILD.bazel')).map(m => m.path), nonBuildPaths);
  const child = spawnSync('python3', [fileURLToPath(new URL('./upstream_bazel_source_analysis.py', import.meta.url))],
    {input: raw, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 20000});
  assert.equal(child.status, 0, child.stderr + String(child.error || ''));
  const starlark = JSON.parse(child.stdout);
  assert.deepEqual(starlark.reviews.map(r => r.parsed_starlark_members), [37, 151]);
  assert.equal(starlark.parsed_member_versions, 376);
  const annotationSpecs = [
    ['src/google-maps/map-directions-renderer/map-directions-service.spec.ts', 'response', 'MapDirectionsResponse', 1],
    ['src/google-maps/map-geocoder/map-geocoder.spec.ts', 'response', 'MapGeocoderResponse', 1],
    ['src/material/icon/icon.spec.ts', 'element', 'SVGElement', 3],
  ];
  const annotations = annotationSpecs.map(([path, name, type, count]) => {
    const member = subject.reviews[1].members.find(m => m.path === path), before = member.before.text, after = member.after.text;
    const changed = `.subscribe((${name}: ${type}) => {`, prior = `.subscribe(${name} => {`;
    assert.equal(after.split(changed).length - 1, count);
    assert.equal(after.replaceAll(changed, prior), before, 'additional test/source changes beyond exact parameter annotations');
    parse(path, before); parse(path, after);
    const reprintSubscribeArrows = text => {
      const file = parse(path + '.js', text);
      const result = ts.transform(file, [context => {
        const visit = node => {
          const value = ts.visitEachChild(node, visit, context);
          if (!ts.isArrowFunction(value) || value.parameters.length !== 1 || !ts.isIdentifier(value.parameters[0].name)
              || value.parameters[0].name.text !== name || !ts.isCallExpression(node.parent)
              || !ts.isPropertyAccessExpression(node.parent.expression) || node.parent.expression.name.text !== 'subscribe') return value;
          assert.ok(!value.parameters[0].type && !value.parameters[0].initializer && !value.parameters[0].dotDotDotToken);
          return ts.factory.createArrowFunction(value.modifiers, value.typeParameters, value.parameters, value.type,
            value.equalsGreaterThanToken, value.body);
        };
        return node => ts.visitNode(node, visit);
      }]);
      try {return ts.createPrinter().printFile(result.transformed[0]);} finally {result.dispose();}
    };
    const emits = [false, true].map(metadata => {
      const emit = source => ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext, experimentalDecorators: true, emitDecoratorMetadata: metadata}}).outputText;
      const original = emit(before), changed = emit(after);
      const oldProgram = reprintSubscribeArrows(original), newProgram = reprintSubscribeArrows(changed);
      assert.equal(oldProgram, newProgram, 'upstream test executable program changed');
      return {emitDecoratorMetadata: metadata, before_sha256: hash(original), after_sha256: hash(changed),
        equal_after_only_reprinting_single_parameter_subscribe_arrows: true, executable_program_sha256: hash(oldProgram)};
    });
    return {path, parameter: name, type, count, whole_source_restoration_equal: true, emits};
  });
  const configs = subject.reviews[1].members.filter(m => m.path.endsWith('.json')).map(member => {
    const actual = config(member.after.text, member.path); let expected;
    if (member.path === 'src/bazel-tsconfig-build.json') {
      expected = config(member.before.text, member.path); expected.compilerOptions.types = [];
      Object.assign(expected.compilerOptions.paths, {'@angular/cdk-experimental/*': ['./cdk-experimental/*'], '@angular/material/*': ['./material/*']});
    } else {
      assert.equal(member.before, null);
      expected = {extends: '../bazel-tsconfig-test.json', compilerOptions: {types: member.path.includes('google-maps')
        ? ['google.maps', 'jasmine', 'node'] : ['jasmine', 'node', 'youtube']}};
    }
    assert.deepEqual(actual, expected, 'unreviewed upstream compiler configuration change');
    return {path: member.path, before_exists: member.before !== null, after: actual};
  });
  assert.equal(configs.length, 3);
  originalAnalysis = {schema_version: 1, subject_sha256: hash(stored), compiler: ts.version, producers, starlark, annotations, configs,
    reviews: subject.reviews.map(r => ({sha: r.sha, diff: r.diff, diff_sha256: r.diff_sha256,
      paths: r.members.map(m => m.path), hunks: r.diff.split('\n').filter(l => l.startsWith('@@')).length,
      members: r.members.map(m => ({path: m.path, before: m.before && {sha256: m.before.sha256, git_blob: m.before.git_blob},
        after: {sha256: m.after.sha256, git_blob: m.after.git_blob}}))})), upstream_code_or_tests_executed: false};
  return structuredClone(originalAnalysis);
}

export function reviewBazelBuildContext(readMember, productPaths, line) {
  assert.ok(['main', '21.x'].includes(line));
  const product = JSON.parse(readMember('projects/ngx-material-legacy/package.json'));
  assert.equal(product.version.startsWith('21.') ? '21.x' : 'main', line);
  const pkg = JSON.parse(readMember('package.json'));
  assert.equal(pkg.scripts['build:lib'], 'node scripts/pack-library.mjs');
  const graph = new Map();
  function visit(path) {
    if (graph.has(path)) return;
    assert.ok(path.startsWith('scripts/') && !path.split('/').includes('..'));
    const raw = readMember(path), text = raw.toString(); assert.doesNotMatch(text, /bazel/i, 'Bazel introduced into maintained library pack graph');
    const file = parse(path, text); graph.set(path, {path, sha256: hash(raw), bytes: raw.length});
    for (const node of file.statements) if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier?.text.startsWith('.'))
      visit(posix.normalize(posix.join(posix.dirname(path), node.moduleSpecifier.text)));
  }
  visit('scripts/pack-library.mjs');
  const pack = parse('pack-library.mjs', readMember('scripts/pack-library.mjs').toString());
  const build = pack.statements.filter(ts.isExpressionStatement).map(n => n.expression)
    .filter(n => ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'run');
  assert.equal(build.length, 1); assert.equal(build[0].arguments[0].text, 'pnpm');
  assert.ok(ts.isArrayLiteralExpression(build[0].arguments[1]));
  assert.deepEqual(build[0].arguments[1].elements.map(n => n.text), ['exec', 'ng-packagr', '-p', 'project', '-c', 'tsconfig']);
  for (const [name, expected] of [['project', 'projects/ngx-material-legacy/ng-package.json'], ['tsconfig', 'projects/ngx-material-legacy/tsconfig.lib.json']]) {
    const variable = pack.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations]).find(n => n.name.getText(pack) === name);
    assert.equal(variable?.initializer?.getText(pack), `join(root, '${expected}')`);
  }
  const npm = pack.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'npmPack');
  assert.ok(npm); const calls = [];
  function findCalls(node) {if (ts.isCallExpression(node) && node.expression.getText(pack) === 'spawnSync') calls.push(node); ts.forEachChild(node, findCalls);}
  findCalls(npm); assert.equal(calls.length, 1); assert.equal(calls[0].arguments[0].text, 'npm');
  assert.ok(ts.isArrayLiteralExpression(calls[0].arguments[1]) && calls[0].arguments[1].elements[0].text === 'pack');
  const files = contextPaths.map(path => {const raw = readMember(path); return {path, sha256: hash(raw), bytes: raw.length};});
  const paths = [...productPaths()].sort(); assert.ok(paths.length > 0 && new Set(paths).size === paths.length);
  assert.ok(paths.includes('projects/ngx-material-legacy/package.json'));
  const bazel = paths.filter(path => /(?:BUILD(?:\.bazel)?|WORKSPACE(?:\.bazel)?|\.bazelrc)$/.test(path) || path.endsWith('.bzl'));
  assert.deepEqual(bazel, [], 'Bazel source in maintained product population');
  const sources = paths.map(path => {assert.ok(path.startsWith('projects/ngx-material-legacy/') && !path.split('/').includes('..'));
    const raw = readMember(path); return {path, sha256: hash(raw), bytes: raw.length};});
  return {schema_version: 1, line, files, pack_module_graph: [...graph.values()].sort((a, b) => a.path.localeCompare(b.path)),
    product_paths: paths, product_members: sources, product_population_sha256: hash(JSON.stringify(sources)),
    bazel_product_members: bazel, library_builder: 'pnpm exec ng-packagr -p projects/ngx-material-legacy/ng-package.json -c projects/ngx-material-legacy/tsconfig.lib.json',
    packing: 'npm pack of local ng-packagr dist; no upstream Bazel execution', actual_build_pack_or_floor_executed: false};
}

export function bazelBuildEvidenceOk(body, entry, readMember, productPaths, line) {
  try {
    const index = BAZEL_BUILD_SHAS.indexOf(entry.sha); assert.ok(index >= 0);
    assert.equal(body.role, BAZEL_BUILD_ROLE); assert.equal(body.status, 'reviewed'); assert.equal(body.line, line);
    assert.equal(body.g11_claim, 'not-passed'); assert.deepEqual(body.scope_sha_ids, BAZEL_BUILD_SHAS);
    const source = analyzeBazelBuildSubjects(readMember); assert.deepEqual(body.source_analysis, source);
    assert.deepEqual(body.candidate_context, reviewBazelBuildContext(readMember, productPaths, line));
    assert.deepEqual(body.reviews.map(r => r.sha), BAZEL_BUILD_SHAS);
    const review = body.reviews[index], actual = source.reviews[index];
    for (const key of ['sha', 'diff', 'diff_sha256', 'paths', 'hunks', 'members']) assert.deepEqual(review[key], actual[key]);
    assert.equal(review.final_disposition, 'not-applicable'); assert.equal(entry.final_disposition, 'not-applicable');
    assert.equal(review.status, 'reviewed'); assert.equal(review.review_depth, 'individual-compatibility');
    assert.deepEqual(review.affected_branches, [line]); assert.deepEqual(entry.affected_branches, [line]);
    assert.deepEqual(entry.files, actual.paths); assert.ok(typeof review.decision === 'string' && review.decision.length > 150);
    assert.deepEqual(entry.individual_proof, {proof_kind: BAZEL_BUILD_KIND, diff_sha256: actual.diff_sha256,
      review_depth: 'individual-compatibility', affected_branches: [line], decision: review.decision});
    assert.equal(entry.reason, review.decision); assert.deepEqual(entry.prior_dispositions.at(-1), review.prior_entry);
    assert.equal(hash(JSON.stringify(review.prior_entry)), review.prior_entry_sha256);
    return true;
  } catch {return false;}
}
