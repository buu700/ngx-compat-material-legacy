/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Compiler visibility for the explicit five-module owner; no CSS or artifact acceptance. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {lstatSync, readFileSync, readdirSync, realpathSync} from 'node:fs';
import {isAbsolute, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types,isDeepStrictEqual} from 'node:util';
import {gunzipSync} from 'node:zlib';
import {createCurrentSassSource} from './current-sass-source.mjs';
import {inspectOwnedMaterialBoundary} from './measure-sass-inspection-scope.mjs';

const SELF = 'scripts/current-sass-inspection-scope.mjs';
const LEGACY_INSPECTOR = 'scripts/measure-sass-inspection-scope.mjs';
const image = readFileSync(fileURLToPath(import.meta.url));
const inspectorImage = readFileSync(new URL('./measure-sass-inspection-scope.mjs', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const INSPECTION = ['get-theme-version', 'get-theme-type', 'get-theme-color', 'get-theme-typography', 'get-theme-density', 'theme-has'];
const BOUNDARIES = [
  'styles/bridges/_companion-overrides.scss', 'styles/bridges/_form-field-state-overrides.scss',
  'styles/datepicker/_datepicker-theme.scss', 'styles/progress-bar/_progress-bar-theme.scss',
  'styles/progress-spinner/_progress-spinner-theme.scss', 'styles/snack-bar/_snack-bar-theme.scss',
  'styles/checkbox/_checkbox-theme.scss', 'styles/button/_button-theme.scss',
  'styles/card/_card-theme.scss',
].sort();
const COMPANION_BRIDGE = 'projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss';
const HISTORICAL_SCOPE = 'compatibility/rc/upstream-sass-inspection-current-scope.json.gz';
const HISTORICAL_PINS = {
  '21.x': {sha256: 'b0a8f0d0d2ce8cb41943a0585ccdcc25fd6bb0d30c9339f80501ef86c65726f4', bytes: 61597},
  main: {sha256: '6432e6b856ee57431709fe9b407d8535734c8bad3fb534a57ddb9310cf4ce8fd', bytes: 61818},
};
const NOTICE_PACKET='compatibility/rc/sass-wrapper-notice-successor.json';
const NOTICE_SHA='5be99f3d9441057f9007868ffc7f1c9efe7d7b766b56fa0e640ba80e4cff7493';
const NOTICE_NAMES=['bottom-sheet','button-toggle','divider','expansion','sidenav','sort','tree'];

/** Main already owns these seven silent prefixes. Authenticate them separately
 * from the five ordinary source transitions; no other historical hash changes. */
function noticeScope(root,source,historical){
 if(source.line!=='main')return {scope:structuredClone(historical),assertCurrent(){},count:0};
 const readPacket=()=>{
  for(const path of ['compatibility','compatibility/rc',NOTICE_PACKET])assert.equal(lstatSync(join(root,path)).isSymbolicLink(),false);
  const raw=readFileSync(join(root,NOTICE_PACKET));assert.equal(hash(raw),NOTICE_SHA);return raw;
 };
 const raw=readPacket(),packet=JSON.parse(raw),header='// Copyright Google LLC All Rights Reserved.\n// Copyright (c) 2026 Ryan Lester.\n// Use of this source code is governed by the MIT license in LICENSE.\n\n';
 assert.equal(packet.schema_version,1);assert.equal(packet.line,'main');assert.equal(packet.source_parent,'8dccb816e63c1f417ac6f1d5b502b8ea43aae2d0');
 assert.equal(packet.header,header);assert.equal(packet.comment_prefix_additions,7);assert.equal(packet.source_code_HTML_selectors_maps_mixin_calls_or_goldens_changed,0);
 assert.deepEqual(packet.subjects.map(row=>row.path),NOTICE_NAMES.map(name=>'projects/ngx-material-legacy/styles/'+name+'/_'+name+'-theme.scss'));
 const bound=new Map(source.bound.map(row=>[row.path,row])),notices=new Map();
 for(const row of packet.subjects){
  assert.equal(row.executable_source_bytes_changed,0);assert.equal(row.line21_notice_matches,true);
  assert.deepEqual(bound.get(row.path),{path:row.path,...row.after});
  const current=readFileSync(join(root,row.path));assert.equal(hash(current),row.after.sha256);assert.equal(current.length,row.after.bytes);
  assert.ok(current.subarray(0,Buffer.byteLength(header)).equals(Buffer.from(header)));
  const before=current.subarray(Buffer.byteLength(header));assert.equal(hash(before),row.before.sha256);assert.equal(before.length,row.before.bytes);
  notices.set(row.path,row);
 }
 const qualify=(ref,prefix='')=>{
  const row=notices.get(prefix+ref.path);if(!row)return ref;
  const before=[row.before,row.after].find(side=>side.sha256===ref.sha256);assert.ok(before,'unknown Sass notice reference');
  if(Object.hasOwn(ref,'bytes'))assert.equal(ref.bytes,before.bytes);
  return {...ref,sha256:row.after.sha256,...(Object.hasOwn(ref,'bytes')?{bytes:row.after.bytes}:{})};
 };
 const scope=structuredClone(historical);scope.owned_scss_population=scope.owned_scss_population.map(row=>qualify(row));
 scope.owned_population_sha256=hash(JSON.stringify(scope.owned_scss_population));
 scope.candidate.loaded_sources=scope.candidate.loaded_sources.map(row=>row.root===0?qualify(row,'projects/ngx-material-legacy/'):row);
 return {scope,count:7,assertCurrent(){assert.ok(readPacket().equals(raw));source.assertCurrent();}};
}

/** Descriptor-only metadata; no caller accessors, proxies or prototype transport. */
export function captureCurrentSassMetadata(value) {
  if (value === null || ['string', 'boolean', 'undefined'].includes(typeof value)) return value;
  if (typeof value === 'number') {assert.ok(Number.isSafeInteger(value)); return value;}
  assert.ok(value && typeof value === 'object' && !types.isProxy(value));
  const array = Array.isArray(value);
  assert.equal(Object.getPrototypeOf(value), array ? Array.prototype : Object.prototype);
  const descriptors = Object.getOwnPropertyDescriptors(value), out = array ? [] : {};
  for (const key of Reflect.ownKeys(descriptors)) {
    assert.equal(typeof key, 'string');
    if (array && key === 'length') continue;
    const descriptor = descriptors[key];
    assert.ok(Object.hasOwn(descriptor, 'value') && descriptor.enumerable);
    if (array) assert.match(key, /^(?:0|[1-9][0-9]*)$/);
    Object.defineProperty(out, key, {value: captureCurrentSassMetadata(descriptor.value), enumerable: true, writable: true, configurable: true});
  }
  if (array) {assert.equal(out.length, descriptors.length.value); assert.equal(Object.keys(out).length, out.length);}
  return out;
}

export function currentSassSourceSummary(source) {
  return {role: 'Separately guarded current five-module source; retained source comparisons remain historical',
    sources: captureCurrentSassMetadata(source.transitions), guard_inputs: captureCurrentSassMetadata(source.bound),
    current_source: captureCurrentSassMetadata(source.descriptor), current_source_reads_are_physical: true,
    historical_source_bytes_exposed: false, historical_constructor_executed: false,
    fresh_sass_compilation_by_source_guard: false,
    current_native_packed_browser_floor_or_full_audit_qualified: false, g11_claim: 'not-passed'};
}

function scopeProgram(entry, namespace, mixins = []) {
  const extra = [...INSPECTION.map(name => `@debug 'inspection/${name}/#{meta.function-exists('${name}',peer)}';`),
    ...mixins.map(name => `@debug 'override/${name}/#{meta.mixin-exists('${name}',peer)}';`)].join('\n');
  return `@use 'sass:meta'; @use '${entry}' as ${namespace};
@each $name,$value in meta.module-functions(${namespace}) {@debug 'function/#{$name}';}
@each $name,$value in meta.module-mixins(${namespace}) {@debug 'mixin/#{$name}';}
${namespace === 'peer' ? extra : ''}`;
}

function sourcePopulation(root) {
  const rows = [];
  const visit = path => {
    const file = join(root, path), stat = lstatSync(file);
    assert.equal(stat.isSymbolicLink(), false);
    if (stat.isDirectory()) {
      for (const name of readdirSync(file).sort()) if (name !== 'node_modules') visit(path + '/' + name);
    } else if (path.endsWith('.scss')) {
      assert.ok(stat.isFile());
      const bytes = readFileSync(file);
      rows.push({path, sha256: hash(bytes), bytes: bytes.length});
    }
  };
  visit('projects/ngx-material-legacy');
  return rows;
}

function compileScope(sass, root, entry, namespace, allowed, mixins = []) {
  const program = scopeProgram(entry, namespace, mixins);
  const functions = [], exportedMixins = [], messages = [];
  const compiled = sass.compileString(program, {
    loadPaths: [root, join(root, 'node_modules')], style: 'expanded', charset: false,
    silenceDeprecations: ['import', 'if-function', 'global-builtin', 'color-functions', 'slash-div'],
    logger: {warn() {}, debug(message) {
      if (message.startsWith('function/')) functions.push(message.slice(9));
      else if (message.startsWith('mixin/')) exportedMixins.push(message.slice(6));
      else messages.push(message);
    }},
  });
  const sources = compiled.loadedUrls.map(url => {
    assert.equal(url.protocol, 'file:');
    const file = realpathSync(fileURLToPath(url));
    const owner = allowed.findIndex(base => {
      const path = relative(base, file);
      return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith('../'));
    });
    assert.ok(owner >= 0, 'unrelated inspection source ' + file);
    const bytes = readFileSync(file);
    return {root: owner, path: relative(allowed[owner], file).replaceAll('\\', '/'), sha256: hash(bytes), bytes: bytes.length};
  }).sort((a, b) => a.root - b.root || a.path.localeCompare(b.path));
  return {program, program_sha256: hash(program), functions: functions.sort(), mixins: exportedMixins.sort(), messages,
    css_sha256: hash(compiled.css), css_bytes: Buffer.byteLength(compiled.css), loaded_sources: sources};
}

/** Exact current scope schema, derived from an authenticated frozen receipt.
 * This comparison invokes neither the old physical constructor nor a compiler. */
export function assertCurrentSassInspectionScopeSuccessor({root = process.cwd(), historical, current} = {}) {
  root = resolve(root);
  const liveHistorical = historical, liveCurrent = current;
  historical = captureCurrentSassMetadata(historical); current = captureCurrentSassMetadata(current);
  const source = createCurrentSassSource({root}), pin = HISTORICAL_PINS[source.line];
  const readHistorical = () => {
    for (const part of ['compatibility', 'compatibility/rc', HISTORICAL_SCOPE]) assert.equal(lstatSync(join(root, part)).isSymbolicLink(), false);
    const raw = readFileSync(join(root, HISTORICAL_SCOPE));
    assert.equal(hash(raw), pin.sha256); assert.equal(raw.length, pin.bytes); return raw;
  };
  const frozen = JSON.parse(gunzipSync(readHistorical())).actual;
  const notices=noticeScope(root,source,frozen);
  // The maintained main caller already qualifies its exact notice references.
  // Both complete historical forms are independently reconstructed here.
  if(source.line==='main'&&!isDeepStrictEqual(historical,frozen))assert.deepEqual(historical,notices.scope,'historical notice-qualified inspection receipt changed');
  else assert.deepEqual(historical,frozen,'historical inspection receipt changed');
  const originalHistorical=historical;historical=notices.scope;
  assert.equal(historical.line, source.line); assert.equal(historical.owned_scss_population.length, 409);
  assert.equal(historical.boundaries.length, 4); assert.equal(historical.public_override_mixins.length, 16);
  assert.equal(historical.candidate.functions.length, 25); assert.equal(historical.entry_override_used, false);
  const transitions = new Map(source.transitions.map(row => [row.path, row]));
  const qualify = (ref, prefix = '') => {
    const row = transitions.get(prefix + ref.path); if (!row) return structuredClone(ref);
    const before = [row.before, row.current].find(value => value.sha256 === ref.sha256);
    assert.ok(before, 'unknown current inspection source hash');
    if (Object.hasOwn(ref, 'bytes')) assert.equal(ref.bytes, before.bytes);
    return {...ref, sha256: row.current.sha256, ...(Object.hasOwn(ref, 'bytes') ? {bytes: row.current.bytes} : {})};
  };
  const census = historical.owned_scss_population.map(row => qualify(row));
  assert.equal(source.transitions.length, 6);
  assert.equal(source.transitions.filter(row => row.path === COMPANION_BRIDGE).length, 1);
  assert.equal(historical.boundaries.filter(row => row.path === COMPANION_BRIDGE).length, 1);
  const currentBoundaries = source.transitions.map(row => {
    const raw = readFileSync(join(root, row.path)); assert.equal(hash(raw), row.current.sha256); assert.equal(raw.length, row.current.bytes);
    return inspectOwnedMaterialBoundary(row.path, raw);
  });
  const newBoundaries = currentBoundaries.filter(row => row.path !== COMPANION_BRIDGE);
  assert.equal(newBoundaries.length, 5);
  assert.ok(newBoundaries.every(row => !historical.boundaries.some(old => old.path === row.path)));
  const bridge = currentBoundaries.find(row => row.path === COMPANION_BRIDGE);
  const boundaries = [...structuredClone(historical.boundaries).map(row => row.path === COMPANION_BRIDGE ? bridge : row),
    ...newBoundaries].sort((a, b) => a.path.localeCompare(b.path));
  assert.ok(boundaries.every(Boolean));
  assert.deepEqual(boundaries.map(row => row.path.replace('projects/ngx-material-legacy/', '')).sort(), BOUNDARIES);
  const mixins = [...new Set(boundaries.flatMap(row => row.public_mixin_calls))].sort(); assert.equal(mixins.length, 21);
  const candidate = structuredClone(historical.candidate), peer = structuredClone(historical.current);
  candidate.program = scopeProgram('projects/ngx-material-legacy', 'legacy'); candidate.program_sha256 = hash(candidate.program);
  candidate.loaded_sources = candidate.loaded_sources.map(row => row.root === 0 ? qualify(row, 'projects/ngx-material-legacy/') : row);
  peer.program = scopeProgram('@angular/material', 'peer', mixins); peer.program_sha256 = hash(peer.program);
  peer.messages = [...INSPECTION.map(name => 'inspection/' + name + '/true'), ...mixins.map(name => 'override/' + name + '/true')];
  const expected = {schema_version: 1, line: source.line, result: 'pass',
    role: 'Five-module current compiler visibility only; historical receipts remain unchanged',
    owned_scss_population: census, owned_population_sha256: hash(JSON.stringify(census)), boundaries,
    public_override_mixins: mixins, candidate, current: peer, inspection_names: INSPECTION,
    current_source: source.descriptor, compiler: historical.sass, compile_calls: 2,
    historical_physical_constructor_executed: false, css_or_artifact_admission_granted: false,
    producer: {path: SELF, sha256: hash(image)}, g11_claim: 'not-passed'};
  assert.deepEqual(current, expected, 'current inspection differs beyond the exact five-module scope successor');
  source.assertCurrent(); readHistorical();notices.assertCurrent();
  assert.deepEqual(captureCurrentSassMetadata(liveHistorical), originalHistorical); assert.deepEqual(captureCurrentSassMetadata(liveCurrent), current);
  assert.ok(readFileSync(join(root, SELF)).equals(image)); source.assertCurrent();
  return {historical_owned_rows: 409, current_owned_rows: 409, historical_boundaries: 4, current_boundaries: 9,
    historical_override_mixins: 16, current_override_mixins: 21, historical_functions: 25,
    independently_qualified_notice_prefixes:notices.count,
    fresh_compiler_execution_by_comparator: false, css_or_artifact_admission_granted: false};
}

export function measureCurrentSassInspectionScope({root = process.cwd(), entryOverride} = {}) {
  assert.ok(entryOverride === undefined || entryOverride === null, 'entryOverride is not supported by current Sass inspection scope');
  root = resolve(root);
  const source = createCurrentSassSource({root});
  assert.ok(readFileSync(join(root, SELF)).equals(image));
  assert.ok(readFileSync(join(root, LEGACY_INSPECTOR)).equals(inspectorImage));
  const census = sourcePopulation(root);
  assert.equal(census.length, 409);
  const boundaries = census.map(row => inspectOwnedMaterialBoundary(row.path, readFileSync(join(root, row.path)))).filter(Boolean);
  assert.deepEqual(boundaries.map(row => row.path.replace('projects/ngx-material-legacy/', '')).sort(), BOUNDARIES);
  const publicMixins = [...new Set(boundaries.flatMap(row => row.public_mixin_calls))].sort();
  assert.equal(publicMixins.length, 21);
  const oracle = JSON.parse(readFileSync(join(root, 'compatibility/rc/oracles/material-16.2.14-sass-api.json')));
  const material = realpathSync(join(root, 'node_modules/@angular/material'));
  const cdk = realpathSync(join(root, 'node_modules/@angular/cdk'));
  const owned = realpathSync(join(root, 'projects/ngx-material-legacy'));
  const sass = createRequire(join(root, 'package.json'))('sass');
  const candidate = compileScope(sass, root, 'projects/ngx-material-legacy', 'legacy', [owned, material, cdk]);
  assert.deepEqual(candidate.functions, Object.keys(oracle.members.functions).sort());
  assert.equal(candidate.functions.length, 25);
  const current = compileScope(sass, root, '@angular/material', 'peer', [material, cdk], publicMixins);
  for (const name of INSPECTION) {
    assert.equal(candidate.functions.includes(name), false);
    assert.ok(current.messages.includes('inspection/' + name + '/true'));
  }
  for (const name of publicMixins) assert.ok(current.messages.includes('override/' + name + '/true'));
  source.assertCurrent();
  assert.deepEqual(sourcePopulation(root), census, 'inspection population changed');
  assert.ok(readFileSync(join(root, SELF)).equals(image));
  assert.ok(readFileSync(join(root, LEGACY_INSPECTOR)).equals(inspectorImage));
  return {schema_version: 1, line: source.line, result: 'pass',
    role: 'Five-module current compiler visibility only; historical receipts remain unchanged',
    owned_scss_population: census, owned_population_sha256: hash(JSON.stringify(census)), boundaries,
    public_override_mixins: publicMixins, candidate, current, inspection_names: INSPECTION,
    current_source: source.descriptor, compiler: sass.info, compile_calls: 2,
    historical_physical_constructor_executed: false, css_or_artifact_admission_granted: false,
    producer: {path: SELF, sha256: hash(image)}, g11_claim: 'not-passed'};
}
