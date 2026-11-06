/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** The caller supplies its own isolated source clone. */
import {readFileSync,writeFileSync} from 'node:fs';import{createHash}from'node:crypto';import assert from 'node:assert/strict';import{pathToFileURL}from'node:url';
const [root,mode]=process.argv.slice(2);assert.ok(root&&['baseline','pre','rehash','late'].includes(mode));const path=root+'/fixtures/sass/default-aggregate-contracts.json',mp=root+'/fixtures/sass/ordinary-density-proof-inputs.json',original=readFileSync(path),manifest=readFileSync(mp),line=JSON.parse(readFileSync(root+'/projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';let rejected=false;
try{try{if(mode==='pre')writeFileSync(path,Buffer.concat([original,Buffer.from('\n')]));if(mode==='rehash'){const data=JSON.parse(original);data.peer_inputs[line].sources[0].sha256='0'.repeat(64);const b=Buffer.from(JSON.stringify(data,null,2)+'\n');writeFileSync(path,b);const m=JSON.parse(manifest),row=m.files.find(x=>x.path==='fixtures/sass/default-aggregate-contracts.json');row.sha256=createHash('sha256').update(b).digest('hex');row.bytes=b.length;writeFileSync(mp,JSON.stringify(m,null,2)+'\n')}const{createOrdinaryDensityGateContext}=await import(pathToFileURL(root+'/scripts/sass-ordinary-density-gate.mjs').href);const ctx=createOrdinaryDensityGateContext({root});if(mode==='late'){writeFileSync(path,Buffer.concat([original,Buffer.from('\n')]));ctx.assertCurrent()}}catch(e){if(mode==='baseline')throw e;rejected=true}assert.equal(rejected,mode!=='baseline');console.log(JSON.stringify({mode,ok:true}))}finally{writeFileSync(path,original);writeFileSync(mp,manifest)}
