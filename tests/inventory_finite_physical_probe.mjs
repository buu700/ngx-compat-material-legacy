/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
// Run only in a disposable copy: the packet is restored after each control.
import assert from 'node:assert/strict';import{readFileSync,writeFileSync}from'node:fs';import{join,resolve}from'node:path';
const root=resolve(process.argv[2]),packet='compatibility/rc/c04-inventory-reference-proposal.json',path=join(root,packet),original=readFileSync(path),{prepareInventoryReferenceSourceMetadata:make}=await import(root+'/scripts/inventory-reference-proposal.mjs');let armed=false,seen=false,changed=false;
const read=p=>{const raw=readFileSync(join(root,p));if(armed){if(p===packet)seen=true;else if(seen&&!changed){changed=true;writeFileSync(path,Buffer.concat([original,Buffer.from('\n')]));}}return raw;};
try{armed=true;assert.throws(()=>make({root,read}));assert.ok(changed,'cold later callback did not change earlier packet');}finally{writeFileSync(path,original);}
armed=false;seen=false;changed=false;const subject=make({root,read});subject.assertCurrent();
try{armed=true;assert.throws(()=>subject.assertCurrent());assert.ok(changed,'late later callback did not change earlier packet');}finally{writeFileSync(path,original);}
armed=false;subject.assertCurrent();console.log('PASS inventory cold/late physical packet mutation; same guard restored');
