/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Durable import/restore controls, using a caller-supplied authenticated fixture report. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,existsSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const [rootArg,line,reportArg]=process.argv.slice(2),root=resolve(rootArg),report=JSON.parse(readFileSync(resolve(reportArg),'utf8'));
assert.ok(line==='21.x'||line==='main');
assert.equal(readFileSync(join(root,'.sass-isolation-disposable'),'utf8'),'test-owned-disposable\n','mutating controls require a disposable test-owned copy');
const fixture=report.fixtures.find(x=>x.id==='06-aggregate-and-companions');assert.ok(fixture);
const sha=b=>createHash('sha256').update(b).digest('hex'),baseline='b9e73e138556f00c4077c19032587c2b78a64aad0ecc46abc3dca56b1eb95070';
const candidate=css=>{const x=structuredClone(fixture),m=x.actual_measurement;m.css=css;m.css_sha256=sha(css);m.css_bytes=Buffer.byteLength(css);x.css_sha256=m.css_sha256;return x;};
const row=x=>({status:'blocked',baseline_sha256:baseline,candidate_sha256:x.css_sha256});
const source=join(root,'scripts/sass-ordered-button-composition.mjs'),original=readFileSync(source,'utf8'),guardPath=join(root,'scripts/sass-ordered-button-source-guard.mjs'),guardOriginal=readFileSync(guardPath,'utf8');
const tampered=original.replace('return replace(css,edits);',"return replace(css,edits)+'\\n.unrelated { color: red; }';");assert.notEqual(tampered,original);
const tamperedGuard=guardOriginal.replace('export function orderedButtonSourceGuard(line,sources,peers,actualCss){try{','export function orderedButtonSourceGuard(line,sources,peers,actualCss){return true;try{');assert.notEqual(tamperedGuard,guardOriginal);
let module,helper;
try{writeFileSync(source,tampered);writeFileSync(guardPath,tamperedGuard);module=await import(pathToFileURL(join(root,'scripts/sass-ordered-aggregate-contract.mjs')));helper=await import(pathToFileURL(source));}finally{writeFileSync(source,original);writeFileSync(guardPath,guardOriginal);}
assert.equal(readFileSync(source,'utf8'),original);assert.equal(readFileSync(guardPath,'utf8'),guardOriginal);
const forgedCss=helper.composeOrderedAggregateButton({caseId:fixture.id,css:module.orderedAggregateExpectedCss(fixture.current_companion.peers,line)});
assert.ok(forgedCss.endsWith('.unrelated { color: red; }'));assert.notEqual(forgedCss,fixture.actual_measurement.css);
assert.equal(module.orderedAggregateResultMatches(row(candidate(forgedCss)),candidate(forgedCss)),false,'imported helper closure must never decide acceptance');
assert.equal(module.orderedAggregateResultMatches(row(fixture),fixture),true,'restored current sources still qualify real full CSS');
const controls=['captured-helper-rejected','poisoned-imported-guard-rejected','clean-full-css'];
let callbackTouched=false;const bad=structuredClone(fixture);bad.current_companion.peers={get core(){callbackTouched=true;throw Error('getter');}};
assert.equal(module.orderedAggregateResultMatches(row(bad),bad),false);assert.equal(callbackTouched,false);controls.push('getter-callback-not-executed');
const guard=await import(pathToFileURL(guardPath));
assert.equal(guard.orderedButtonSourceGuard(line,fixture.actual_measurement.sources,()=>{callbackTouched=true;return true;},fixture.actual_measurement.css),true,'poisoned guard must remain active');assert.equal(callbackTouched,false);
const callback=structuredClone(fixture);callback.current_companion.peers=()=>{callbackTouched=true;return true;};assert.equal(module.orderedAggregateResultMatches(row(callback),callback),false);assert.equal(callbackTouched,false);controls.push('executable-callback-rejected');

const catalogPath=join(root,'fixtures/sass/ordered-aggregate-contracts.json'),catalogRaw=readFileSync(catalogPath),catalog=JSON.parse(catalogRaw),target=catalog.peer_inputs[line].sources.find(s=>s.path.startsWith('autocomplete/'));
const oldHash=target.sha256;target.sha256='0'.repeat(64);const forgedPeerFixture=structuredClone(fixture);
for(const group of ['light','dark','panel']){const source=forgedPeerFixture.current_companion.peers[group].sources.find(s=>s.root===target.root&&s.path===target.path);assert.equal(source.sha256,oldHash);source.sha256=target.sha256;}
let captured;
try{writeFileSync(catalogPath,JSON.stringify(catalog));captured=await import(pathToFileURL(join(root,'scripts/sass-ordered-aggregate-model.mjs')).href+'?captured-catalog-control');}finally{writeFileSync(catalogPath,catalogRaw);}
assert.equal(readFileSync(catalogPath).equals(catalogRaw),true);
assert.equal(typeof captured.orderedAggregateExpectedCss(forgedPeerFixture.current_companion.peers,line),'string','demonstrate captured changed catalog accepts forged peer provenance');
assert.equal(module.orderedAggregateResultMatches(row(forgedPeerFixture),forgedPeerFixture),false,'isolated complete catalog must reject imported prior catalog state');controls.push('captured-catalog-rejected');

const scratch=mkdtempSync(join(tmpdir(),'ngx-sass-env-control-')),marker=join(scratch,'preload-ran'),preload=join(scratch,'preload.cjs');
writeFileSync(preload,"require('node:fs').writeFileSync("+JSON.stringify(marker)+",'bad');throw Error('untrusted startup executed');");
const keys=['NODE_OPTIONS','NODE_PATH','PYTHONPATH','PYTHONSTARTUP'],old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
try{
 process.env.NODE_OPTIONS='--require='+preload;process.env.NODE_PATH=scratch;process.env.PYTHONPATH=scratch;process.env.PYTHONSTARTUP=preload;
 assert.equal(module.orderedAggregateResultMatches(row(fixture),fixture),true);assert.equal(existsSync(marker),false);controls.push('startup-environment-sanitized');
}finally{for(const k of keys)if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];rmSync(scratch,{recursive:true,force:true});}
for(const suffix of ['\n.unrelated { color: red; }','\n']){const x=candidate(fixture.actual_measurement.css+suffix);assert.equal(module.orderedAggregateResultMatches(row(x),x),false);controls.push('changed-rehashed-whole-css');}
let x=structuredClone(fixture);x.actual_measurement.sources.pop();assert.equal(module.orderedAggregateResultMatches(row(x),x),false);controls.push('full-closure-required');
x=structuredClone(fixture);x.actual_measurement.sass_version+=' forged';assert.equal(module.orderedAggregateResultMatches(row(x),x),false);controls.push('wrong-compiler');
x=structuredClone(fixture);x.actual_measurement.line=line==='main'?'21.x':'main';assert.equal(module.orderedAggregateResultMatches(row(x),x),false);controls.push('wrong-line');
try{writeFileSync(source,original+'\n// late physical mutation\n');assert.equal(module.orderedAggregateResultMatches(row(fixture),fixture),false);controls.push('late-physical-mutation');}finally{writeFileSync(source,original);}
assert.equal(module.orderedAggregateResultMatches(row(fixture),fixture),true);controls.push('same-process-restored-positive');
console.log(JSON.stringify({schema_version:1,line,controls,full_css_sha256:fixture.css_sha256,full_css_bytes:fixture.actual_measurement.css_bytes,scope:'bounded actual prior packed fixture; current physical source contexts; no coordinator or full seal pass'}));
