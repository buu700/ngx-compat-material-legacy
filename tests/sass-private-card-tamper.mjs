/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Operates only on the caller's isolated temporary clone. */
import assert from 'node:assert/strict';import{createHash}from'node:crypto';import{readFileSync,writeFileSync}from'node:fs';import{pathToFileURL}from'node:url';
const[root,mode]=process.argv.slice(2),path=root+'/fixtures/sass/private-card-peer.scss',pinPath=root+'/fixtures/sass/private-card-peer-pins.json',original=readFileSync(path),pinOriginal=readFileSync(pinPath);let rejected=false;try{try{if(mode==='pre')writeFileSync(path,Buffer.concat([original,Buffer.from('\n// tamper\n')]));if(mode==='rehash'){const b=Buffer.concat([original,Buffer.from('\n// tamper\n')]),pin=JSON.parse(pinOriginal);pin.program_sha256=createHash('sha256').update(b).digest('hex');writeFileSync(path,b);writeFileSync(pinPath,JSON.stringify(pin,null,2)+'\n')}const{createPrivateCardGateContext,privateCardGateDescriptor}=await import(pathToFileURL(root+'/scripts/sass-private-card-gate.mjs').href);const ctx=createPrivateCardGateContext({root});if(mode==='late'){writeFileSync(path,Buffer.concat([original,Buffer.from('\n// tamper\n')]));privateCardGateDescriptor(ctx)}}catch(e){if(mode==='baseline')throw e;rejected=true}assert.equal(rejected,mode!=='baseline');console.log(JSON.stringify({ok:true,mode}))}finally{writeFileSync(path,original);writeFileSync(pinPath,pinOriginal)}
