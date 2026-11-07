/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current physical source identity. This module grants no CSS or artifact acceptance. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {lstatSync, readFileSync, realpathSync} from 'node:fs';
import {isAbsolute, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {composeCanonicalSourceGuards} from './canonical-source-guard-plan.mjs';
import {selectDialogFiniteSuccessor} from './select-dialog-finite-source-successor.mjs';
import {selectDialogFiniteSuccessor as selectDialogV6,selectDialogFiniteLoadedImage as selectV6Image} from './select-dialog-finite-source-v6.mjs';
import {dialogFocusFiniteSourceSuccessor} from './dialog-focus-finite-source-successor.mjs';

const SELF = 'scripts/current-sass-source.mjs';
const FOCUS_STYLE_PACKET=Object.freeze({path:'compatibility/rc/current-main-strong-focus-source-v1.json',sha256:'e4f6c47d595edc21f102a756e3a827d077c0f717f1968b8672c691d4fb336ccb',bytes:1030});
const SIXTH_HELPER = Object.freeze({path: 'scripts/stepper-sixth-source.mjs',
  sha256: 'e14efe828ea074fb1aa61bab093add26e836f238d2f869e49206baf890175657'});
const MAIN_SIXTH_HELPER = Object.freeze({path:'scripts/stepper-current-peer-source-v5.mjs',sha256:'ed58eb7eabd2039a48321ec1c3037f42031dd68880795929a440283c5fbf659a'});
const FOCUS_HELPER = Object.freeze({path: 'scripts/dialog-focus-finite-source-successor.mjs',
  sha256: 'd45ce542f0d8a546d77e1a43fc0385f01ff51f908987871803a3a9fd8cc384d7'});
const compileVerifiedHelper = Function;
// Load this exact builtins-only helper image synchronously, without an ESM cache entry.
// Synchronous loading preserves the existing CommonJS callers of this source authority.
function stepperFactory(root,line) {
  const helper=line==='main'?MAIN_SIXTH_HELPER:SIXTH_HELPER;
  const raw = physical(root, helper.path);
  assert.equal(hash(raw), helper.sha256, 'changed sixth source executable');
  let text = raw.toString();
  const imports = [
    "import assert from 'node:assert/strict';",
    "import {execFileSync} from 'node:child_process';",
    "import {createHash} from 'node:crypto';",
    "import {lstatSync, readFileSync} from 'node:fs';",
    "import {isAbsolute, join, resolve} from 'node:path';",
    "import {fileURLToPath} from 'node:url';",
    "import {types} from 'node:util';",
  ];
  for (const statement of imports) {
    assert.equal(text.split(statement).length, 2);
    text = text.replace(statement, '');
  }
  for (const [before, after] of [
    ['fileURLToPath(import.meta.url)', 'selfFile'],
    [line==='main'?'export const stepperCurrentPeerLoadedImage':'export const stepperSixthLoadedImage', 'const stepperSixthLoadedImage'],
    [line==='main'?'export function createStepperCurrentPeerSourceV4':'export function createStepperSixthSource', 'function createStepperSixthSource'],
  ]) {assert.equal(text.split(before).length, 2); text = text.replace(before, after);}
  assert.doesNotMatch(text, /\bimport\s|\bexport\s|import\.meta/);
  const factory = compileVerifiedHelper('deps', 'selfFile',
    'const {assert, execFileSync, createHash, lstatSync, readFileSync, isAbsolute, join, resolve, fileURLToPath, types} = deps;\n' +
    text + '\nreturn createStepperSixthSource;')(
      {assert, execFileSync, createHash, lstatSync, readFileSync, isAbsolute, join, resolve, fileURLToPath, types},
      join(root, helper.path));
  assert.ok(equalBytes(raw, physical(root, helper.path)), 'sixth helper changed during load');
  return factory;
}
const INPUTS = 'compatibility/rc/current-sass-source-inputs-v2.json';
const INPUTS_SHA = '46e1c8e8657880c1168010c8ec1b5967cbb4aa4c289a4d9b9ae29e3b2182b0a9';
const ADDITIONAL = [
  'projects/ngx-material-legacy/styles/checkbox/_checkbox-theme.scss',
  'projects/ngx-material-legacy/styles/button/_button-theme.scss',
  'projects/ngx-material-legacy/styles/card/_card-theme.scss',
];
const CARD = ADDITIONAL[2];
const image = readFileSync(fileURLToPath(import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const blobHash = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const bufferEquals = Buffer.prototype.equals;
const equalBytes = (actual, supplied) => Buffer.isBuffer(supplied) && Reflect.apply(bufferEquals, actual, [supplied]);
const reference = (path, bytes) => ({path, sha256: hash(bytes), bytes: bytes.length});
export const currentSassSourceLoadedImage = Object.freeze(reference(SELF,image));
const planner = composeCanonicalSourceGuards;
const plannerFunctionImage = 'fecc474c121931506ce1f0f97e176886957f1504da46e74a085a068910ff9947';
const plannerReference = Object.freeze({path: 'scripts/canonical-source-guard-plan.mjs',
  sha256: '3a3663ce06af2107f55c410fff458100a808593fa9a968e18a94d8490c7fc664', bytes: 5014});
const functionToString = Function.prototype.toString;

function safe(path) {
  assert.equal(typeof path, 'string');
  assert.ok(path && !isAbsolute(path) && !path.includes('\\') && !path.includes('\0'));
  assert.ok(path.split('/').every(part => part && part !== '.' && part !== '..'));
  return path;
}

function physical(root, path) {
  safe(path);
  const regular = (base, parts) => {
    let cursor = base;
    for (const part of parts) {
      cursor = join(cursor, part);
      assert.equal(lstatSync(cursor).isSymbolicLink(), false, 'linked source descendant ' + path);
    }
    assert.ok(lstatSync(cursor).isFile());
    return readFileSync(cursor);
  };
  const peer = /^node_modules\/(@angular\/(?:core|material|cdk)|sass)\/(.+)$/.exec(path);
  if (!peer) return regular(root, path.split('/'));
  const container = join(root, 'node_modules');
  assert.ok(lstatSync(container).isDirectory() && !lstatSync(container).isSymbolicLink());
  if (peer[1].startsWith('@angular/')) {
    const scope = join(container, '@angular');
    assert.ok(lstatSync(scope).isDirectory() && !lstatSync(scope).isSymbolicLink());
  }
  const base = realpathSync(join(container, peer[1]));
  assert.ok(lstatSync(base).isDirectory());
  if (peer[1] === 'sass') assert.ok(['package.json', 'sass.node.js', 'sass.dart.js'].includes(peer[2]));
  assert.equal(JSON.parse(regular(base, ['package.json'])).name, peer[1]);
  return regular(base, peer[2].split('/'));
}

function metadata(value) {
  assert.ok(value && typeof value === 'object' && !types.isProxy(value));
  assert.equal(Object.getPrototypeOf(value), Object.prototype);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const out = {};
  for (const key of ['path', 'sha256', 'bytes']) {
    const descriptor = descriptors[key];
    if (key === 'bytes' && !descriptor) continue;
    assert.ok(descriptor && Object.hasOwn(descriptor, 'value'), 'source reference accessor');
    out[key] = descriptor.value;
  }
  return out;
}

/** Read authenticated Git blobs as comparison data, never as current source. */
function historicalBlobs(root, source, profile) {
  assert.match(source.before_commit, /^[0-9a-f]{40}$/);
  assert.match(profile.source_parent, /^[0-9a-f]{40}$/);
  assert.deepEqual(profile.source_implementations.map(row => row.path), ['scripts/current-sass-source.mjs', 'scripts/current_sass_source.py']);
  const refs = [...source.modules.map(row => ({path: row.path, ...row.before})), ...source.unchanged_owned_sass_before_inputs,
    ...profile.source_implementations.map(row => ({...row, source_parent: profile.source_parent}))];
  assert.equal(new Set(refs.map(row => row.path)).size, refs.length);
  const env = {PATH: process.env.PATH, LANG: 'C', LC_ALL: 'C', GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_SYSTEM: '/dev/null', GIT_TERMINAL_PROMPT: '0', GIT_NO_REPLACE_OBJECTS: '1', GIT_NO_LAZY_FETCH: '1'};
  const raw = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
    'cat-file', '--batch'], {cwd: root, env, input: refs.map(row => (row.source_parent ?? source.before_commit) + ':' + safe(row.path)).join('\n') + '\n', maxBuffer: 16 * 1024 * 1024});
  const out = new Map();
  let cursor = 0;
  for (const row of refs) {
    const end = raw.indexOf(10, cursor);
    assert.ok(end > cursor);
    const [blob, kind, sizeText] = raw.subarray(cursor, end).toString().split(' ');
    const size = Number(sizeText), bytes = raw.subarray(end + 1, end + 1 + size);
    assert.equal(kind, 'blob');
    assert.ok(Number.isSafeInteger(size) && size >= 0);
    assert.equal(bytes.length, size);
    assert.equal(raw[end + 1 + size], 10);
    assert.equal(blob, row.blob);
    assert.equal(blobHash(bytes), blob);
    assert.equal(hash(bytes), row.sha256);
    assert.equal(size, row.bytes);
    out.set(row.path, Buffer.from(bytes));
    cursor = end + 2 + size;
  }
  assert.equal(cursor, raw.length);
  return out;
}

export function createCurrentSassSource({root = process.cwd(), read: providedRead} = {}) {
  root = resolve(root);
  assert.ok(lstatSync(root).isDirectory() && !lstatSync(root).isSymbolicLink());
  assert.ok(providedRead === undefined || typeof providedRead === 'function');
  const bound = new Map();
  const assertPlanner = () => {
    assert.equal(composeCanonicalSourceGuards, planner);
    assert.equal(hash(Reflect.apply(functionToString, planner, [])), plannerFunctionImage);
    assert.deepEqual(reference(plannerReference.path, physical(root, plannerReference.path)), plannerReference,
      'changed current Sass guard planner');
  };
  // Authenticate executable policy before the first supplied callback.
  assertPlanner();
  const assertPhysical = () => {
    for (const row of bound.values()) assert.deepEqual(reference(row.path, physical(root, row.path)), row, 'changed final physical source ' + row.path);
    product.assertPhysical();
    focus.assertPhysical();
    sixth.assertPhysical();
  };
  const read = path => {
    const actual = physical(root, path);
    const row = reference(path, actual);
    if (bound.has(path)) assert.deepEqual(row, bound.get(path));
    else bound.set(path, row);
    if (providedRead !== undefined) assert.ok(equalBytes(actual, providedRead(path)), 'nonphysical current source ' + path);
    assert.ok(equalBytes(physical(root, path), actual), 'source changed during read ' + path);
    return actual;
  };
  const initialVersion = JSON.parse(physical(root, 'projects/ngx-material-legacy/package.json')).version;
  const initialLine = initialVersion.startsWith('21.') ? '21.x' : initialVersion.startsWith('22.') ? 'main' : null;
  const productRead=providedRead ?? (path => physical(root,path));
  let product;
  if(initialLine==='main'){
    assert.deepEqual(selectV6Image,{path:'scripts/select-dialog-finite-source-v6.mjs',sha256:'4bd50817e745cf5c1e410a1a4c2b28726d95529f6d9df7a4d2bf953fddc8560a',bytes:15483});
    assert.deepEqual(reference(selectV6Image.path,physical(root,selectV6Image.path)),selectV6Image);
    product=selectDialogV6({root,read:productRead,line:initialLine});
  }else product=selectDialogFiniteSuccessor({root,read:productRead,line:initialLine});
  assert.equal(hash(physical(root, FOCUS_HELPER.path)), FOCUS_HELPER.sha256);
  const focus = dialogFocusFiniteSourceSuccessor({root, read: providedRead ?? (path => physical(root,path)), line: initialLine});
  const sixth = stepperFactory(root,initialLine)({root, read: providedRead});
  for (const owner of [product, focus, sixth]) for (const ref of owner.bound) {
    if (bound.has(ref.path)) assert.deepEqual(bound.get(ref.path), ref);
    else bound.set(ref.path, {...ref});
  }
  let focusStyle=null,gitStyleBefore=null;
  const member = row => {
    const projected=focusStyle && row.path===focusStyle.before.path && row.sha256===focusStyle.before.sha256;
    if(projected)assert.equal(row.bytes,focusStyle.before.bytes);
    const expected = projected ? focusStyle.after : sixth.qualify(row) ?? focus.qualify(row) ?? product.qualify(row) ?? row;
    const bytes = read(row.path);
    assert.equal(hash(bytes), expected.sha256, 'changed current Sass source ' + row.path);
    assert.equal(bytes.length, expected.bytes);
    return bytes;
  };
  if(initialLine==='main'){
    member({path:'scripts/select_dialog_finite_source_successor_v6.py',sha256:'f93437e3315e03f8ae60944625f4ad46f60874f345d72b7f70afc3b195d85b31',bytes:18527});
    member({path:'scripts/select_dialog_finite_source_successor_v4.py',sha256:'ddaaada77d28cdcfe7482770adf8eec3f1e47413de70b08ee8d98201768d6855',bytes:13849});
    member({path:MAIN_SIXTH_HELPER.path,sha256:MAIN_SIXTH_HELPER.sha256,bytes:16963});
    member({path:'scripts/stepper_current_peer_source_v5.py',sha256:'f03cab7c899f19bb0f58189ea5355871c47cbe8773b4d6a9466204ca997273c7',bytes:17569});
    member({path:'scripts/stepper_current_peer_source_v4.py',sha256:'e94a50ceae847413bb80538bd19dd5afcd3f2fa212cd8c1c4e296236f625b1fa',bytes:15375});
  }
  if(initialLine==='main'){
    const packetRaw=read(FOCUS_STYLE_PACKET.path);assert.deepEqual(reference(FOCUS_STYLE_PACKET.path,packetRaw),FOCUS_STYLE_PACKET);const fp=JSON.parse(packetRaw);
    assert.equal(fp.schema_version,1);assert.equal(fp.role,'finite-current-main-strong-focus-source');assert.equal(fp.source_scope_only,true);
    assert.equal(fp.parent,'d74c0d083077f227ea237aff33f42f6c75e76214');assert.equal(fp.commit,'e1848d4e3a04b31cbb616f16b77d80525f6a7a5c');
    assert.equal(fp.before.path,'projects/ngx-material-legacy/styles/core/focus-indicators/_focus-indicators.scss');assert.equal(fp.after.path,fp.before.path);
    const env={PATH:process.env.PATH,LANG:'C',LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1'};
    const git=(...args)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env});
    assert.equal(git('rev-list','--parents','-n','1',fp.commit).toString().trim(),fp.commit+' '+fp.parent);
    const before=git('show',fp.parent+':'+fp.before.path),after=git('show',fp.commit+':'+fp.after.path);
    assert.deepEqual(reference(fp.before.path,before),fp.before);gitStyleBefore=before;assert.deepEqual(reference(fp.after.path,after),fp.after);assert.ok(equalBytes(read(fp.after.path),after));
    assert.deepEqual(reference(fp.review.path,read(fp.review.path)),fp.review);focusStyle=fp;
  }
  member(plannerReference);
  assert.ok(equalBytes(read(SELF), image));
  const raw = read(INPUTS);
  assert.equal(hash(raw), INPUTS_SHA);
  const packet = JSON.parse(raw);
  assert.equal(packet.schema_version, 2);
  assert.deepEqual(packet.additional_modules.map(row => row.path), ADDITIONAL);
  assert.equal(packet.css_admission_granted, false);
  const priorProfile = packet.prior_four_module_profile;
  const priorPacket = JSON.parse(member(priorProfile.packet));
  assert.equal(priorPacket.schema_version, 1);
  assert.deepEqual(priorPacket.product_paths, packet.product_paths.slice(0, 4));
  assert.deepEqual(priorPacket.additional_modules, packet.additional_modules.slice(0, 2));
  assert.deepEqual(packet.historical_non_target_reclassified_as_target, [CARD]);
  const base = JSON.parse(member(packet.historical_source_packet));
  member(packet.historical_source_subject); // Authenticated data; the old constructor never runs.
  const css = JSON.parse(member(packet.historical_css_packet));
  for (const name of ['oracle', 'catalog', 'provenance', 'reference_lock']) member(css[name]);
  for (const row of css.compiler_inputs) member(row);
  member(packet.proposal);
  const protectedPacket = JSON.parse(member(packet.protected_input_packet));
  const census = JSON.parse(member(packet.style_template_census));
  const version = JSON.parse(read('projects/ngx-material-legacy/package.json')).version;
  const line = version.startsWith('21.') ? '21.x' : version.startsWith('22.') ? 'main' : null;
  assert.ok(line);
  const source = base.branches[line], branch = packet.branches[line];
  member(css.branches[line].observation);
  assert.equal(process.versions.node, '24.21.0');
  assert.deepEqual(branch.minimum_versions, source.minimum_versions);
  assert.equal(source.inputs.length, branch.historical_loaded_input_count);
  assert.equal(source.unchanged_owned_sass_before_inputs.length, branch.unchanged_owned_before_count);
  assert.deepEqual(branch.new_loaded_edges, []);
  assert.deepEqual(packet.product_paths, [...source.modules.map(row => row.path), ...ADDITIONAL]);
  assert.equal(branch.current_unchanged_owned_before_count, source.unchanged_owned_sass_before_inputs.length - ADDITIONAL.length);
  const historical = historicalBlobs(root, source, priorProfile.branches[line]);
  const changes = new Map(packet.additional_modules.map(row => [row.path, row]));
  for (const row of changes.values()) {
    const before = historical.get(row.path);
    assert.ok(before);
    assert.deepEqual(reference(row.path, before), row.before);
    const lines = before.toString().split(/(?<=\n)/);
    let cursor = 0, expected = '';
    for (const insertion of row.insertions) {
      assert.ok(Number.isSafeInteger(insertion.before_line) && insertion.before_line >= cursor && insertion.before_line <= lines.length);
      assert.equal(typeof insertion.text, 'string');
      assert.ok(insertion.text);
      expected += lines.slice(cursor, insertion.before_line).join('') + insertion.text;
      cursor = insertion.before_line;
    }
    expected += lines.slice(cursor).join('');
    assert.deepEqual(reference(row.path, Buffer.from(expected)), row.current);
    assert.ok(equalBytes(member(row.afterimage), Buffer.from(expected)));
  }
  assert.ok(!changes.has(sixth.transition.path));
  changes.set(sixth.transition.path, structuredClone(sixth.transition));
  if(focusStyle){assert.ok(equalBytes(historical.get(focusStyle.before.path),gitStyleBefore));changes.set(focusStyle.before.path,{path:focusStyle.before.path,before:focusStyle.before,current:focusStyle.after});}
  for (const row of source.inputs) member(changes.get(row.path)?.current ?? row);
  member(source.semantic_receipt);
  for (const row of source.unchanged_owned_sass_before_inputs) {
    const actual = member(changes.get(row.path)?.current ?? row);
    if (!changes.has(row.path)) assert.ok(equalBytes(actual, historical.get(row.path)));
  }
  for (const row of protectedPacket.branches[line].protected_inputs) member(row);
  const graph = census.lines.find(row => row.line === line);
  assert.ok(graph);
  assert.equal(graph.non_target_owned_style_template_graph.length, graph.non_target_graph_count);
  assert.equal(graph.non_target_graph_count, branch.historical_non_target_graph_count);
  assert.equal(branch.current_non_target_graph_count, graph.non_target_graph_count - 1);
  assert.deepEqual(graph.non_target_owned_style_template_graph.filter(row => row.path === CARD), [changes.get(CARD).before]);
  for (const row of graph.non_target_owned_style_template_graph) member(row.path === CARD ? changes.get(CARD).current : row);
  const transitions = [...source.modules.map(row => ({path: row.path, before: row.before, current: row.current})),
    ...packet.additional_modules.map(row => ({path: row.path, before: row.before, current: row.current})), sixth.transition,...(focusStyle?[{path:focusStyle.before.path,before:focusStyle.before,current:focusStyle.after}]:[])];
  for (const row of transitions) member(row.current);
  const sourceSets = {}, sourceSetSuccessors = [];
  for (const [historicalHash, rows] of Object.entries(css.branches[line].source_sets)) {
    assert.equal(hash(JSON.stringify(rows)), historicalHash);
    const current = rows.map(row => {
    const path='projects/ngx-material-legacy/' + row.path;
    const changed = row.root === 0 && path!==focusStyle?.before.path && changes.get(path);
    return changed ? {...row, sha256: changed.current.sha256, bytes: changed.current.bytes} : {...row};
    });
    const currentHash = hash(JSON.stringify(current));
    assert.equal(historicalHash, sixth.source_set.historical_sha256);
    assert.equal(currentHash, sixth.source_set.current_sha256 ?? sixth.source_set.v3_current_sha256);
    assert.deepEqual(current, sixth.source_set.rows);
    let finalRows=current,finalHash=currentHash;
    if(focusStyle){assert.equal(currentHash,focusStyle.source_set_before);let seen=0;finalRows=current.map(row=>{if(row.root===0&&'projects/ngx-material-legacy/'+row.path===focusStyle.before.path){seen++;assert.equal(row.sha256,focusStyle.before.sha256);assert.equal(row.bytes,focusStyle.before.bytes);return {...row,sha256:focusStyle.after.sha256,bytes:focusStyle.after.bytes};}return row;});assert.equal(seen,1);finalHash=hash(JSON.stringify(finalRows));assert.equal(finalHash,focusStyle.source_set_after);}
    sourceSets[finalHash] = finalRows;
    sourceSetSuccessors.push({historical_sha256: historicalHash, current_sha256: finalHash});
  }
  let active = false;
  const idle = () => assert.equal(active, false, 'reentrant current Sass source');
  const phase = operation => () => {
    idle(); active = true;
    try { assertPlanner(); operation(); assertPlanner(); }
    finally { active = false; }
  };
  const guardNode = Object.freeze({dependencies: Object.freeze([]),
    preflight: phase(assertPhysical),
    consume: phase(() => {for (const row of bound.values()) member(row);}),
    final: phase(assertPhysical)});
  const composed = planner(Object.freeze([guardNode]));
  const assertCurrent = () => {idle(); composed();};
  const guardPlan = Object.freeze({assertCurrent, node: guardNode});
  const qualify = incoming => {
    idle();
    const original = metadata(incoming), row = transitions.find(row => row.path === original.path);
    if (!row) return null;
    const sixthMatch = row.path===sixth.transition.path ? sixth.qualify(original) : null;
    const selected = sixthMatch ?? [row.before, row.current].find(value => value.sha256 === original.sha256);
    assert.ok(selected, 'unknown owned source hash');
    if (!sixthMatch && Object.hasOwn(original, 'bytes')) assert.equal(original.bytes, selected.bytes);
    assertCurrent();
    assert.deepEqual(metadata(incoming), original, 'source reference mutated');
    const result = {path: row.path, sha256: row.current.sha256, ...(Object.hasOwn(original, 'bytes') ? {bytes: row.current.bytes} : {})};
    assertPhysical();
    return result;
  };
  const assertHistoricalSource = (path, expected) => {
    idle();
    const row = transitions.find(row => row.path === safe(path));
    assert.ok(row && (typeof expected === 'string' || Buffer.isBuffer(expected)));
    const copy = Buffer.from(expected);
    assert.ok(equalBytes(copy, historical.get(path)));
    assert.equal(hash(copy), row.before.sha256);
    assertCurrent();
    assert.ok(typeof expected === 'string' || equalBytes(copy, expected), 'historical comparison changed during source guards');
    assertPhysical();
    return {path, before_sha256: row.before.sha256, current_sha256: row.current.sha256, exact_historical_comparison: true, current_physical_source_guarded: true};
  };
  const result = {root, line, assertCurrent, guardNode, guardPlan, qualify, assertHistoricalSource, bound: structuredClone([...bound.values()]),
    transitions: structuredClone(transitions), source_sets: structuredClone(sourceSets), source_set_successors: structuredClone(sourceSetSuccessors),
    descriptor: structuredClone({source_subject: reference(SELF, image), source_packet: reference(INPUTS, raw), source_modules: transitions.map(row => row.current)}),
    source_scope_only: true, metadata_refs_qualified: 6, current_source_reads_are_physical: true,
    historical_source_bytes_exposed: false, historical_constructor_executed: false, fresh_sass_compilation_this_call: false,
    css_or_artifact_admission_granted: false, current_native_packed_browser_floor_or_full_audit_qualified: false, g11_claim: 'not-passed'};
  assertCurrent();
  return result;
}
