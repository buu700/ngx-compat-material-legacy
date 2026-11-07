/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Positive and negative controls for the finite main aggregate source projection. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFileSync,realpathSync,mkdtempSync,mkdirSync,writeFileSync,rmSync,renameSync,symlinkSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {aggregateExpectedSuccessor,aggregateProjectedSources} from '../scripts/sass-aggregate-source-successor.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),sha=x=>createHash('sha256').update(x).digest('hex');
const fixture=JSON.parse(readFileSync(join(root,'tests/sass_ordered_aggregate_fixture.json'))),catalog=JSON.parse(readFileSync(join(root,'fixtures/sass/ordered-aggregate-contracts.json'))),peers={};
for(const group of ['core','light','dark','panel']){const p=structuredClone(fixture.peers[group+'-main']);if(group!=='core'){p.sources=structuredClone(catalog.peer_inputs[p.source_set].sources);delete p.source_set;}peers[group]=p;}
const manifest=JSON.parse(readFileSync(join(root,'fixtures/sass/expected-isolation-inputs.json'))),sass=realpathSync(join(root,'node_modules/sass')),sassRequire=createRequire(join(sass,'sass.node.js'));
const temp=mkdtempSync(join(tmpdir(),'aggregate-source-successor-test-'));
try{
 const gitdir=execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:root,encoding:'utf8'}).trim();writeFileSync(join(temp,'.git'),'gitdir: '+gitdir+'\n');
 for(const row of manifest.files){let source=join(root,row.path);if(row.path.startsWith('node_modules/immutable/'))source=join(dirname(sassRequire.resolve('immutable/package.json')),row.path.slice('node_modules/immutable/'.length));const target=join(temp,row.path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,readFileSync(source));}
 for(const path of ['fixtures/sass/expected-isolation-inputs.json','scripts/sass-expected-snapshot-engine.mjs']){const target=join(temp,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,readFileSync(join(root,path)));}
 const actual=aggregateExpectedSuccessor(temp,'main',peers);assert.equal(actual.css_sha256,sha(actual.css));assert.equal(aggregateProjectedSources(temp).length,472);
 for(const path of ['projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss','projects/ngx-material-legacy/styles/core/focus-indicators/_focus-indicators.scss','scripts/sass-stepper-historical-model.mjs']){const f=join(temp,path),b=readFileSync(f);writeFileSync(f,Buffer.concat([b,Buffer.from('\n/* changed */')]));assert.throws(()=>aggregateExpectedSuccessor(temp,'main',peers),/closure input changed/);writeFileSync(f,b);}
 const f=join(temp,'projects/ngx-material-legacy/styles/core/focus-indicators/_focus-indicators.scss'),saved=f+'.saved';renameSync(f,saved);symlinkSync(saved,f);assert.throws(()=>aggregateExpectedSuccessor(temp,'main',peers),/linked input/);unlinkSync(f);renameSync(saved,f);
 const forged=structuredClone(peers);forged.light.css=forged.light.css.replace('--mat-stepper-header-focus-state-layer-shape: 4px','--mat-stepper-header-focus-state-layer-shape: 9px');assert.notEqual(forged.light.css,peers.light.css);forged.light.css_sha256=sha(forged.light.css);forged.light.css_bytes=Buffer.byteLength(forged.light.css);assert.throws(()=>aggregateExpectedSuccessor(temp,'main',forged));
 assert.throws(()=>aggregateExpectedSuccessor(temp,'21.x',peers),/main only/);
 console.log('aggregate successor: valid projection, three source mutations, symlink, rehashed peer and wrong-line controls passed');
}finally{rmSync(temp,{recursive:true,force:true});}
