/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Run only in disposable scratch: adversarial inputs physically mutate files. */
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {readCheckerOwnerMember} from '../scripts/checker-owner-source.mjs';
import {inventoryRcAcceptanceSourceSuccessor} from '../scripts/inventory-rc-acceptance-source-successor.mjs';
const root=process.cwd(),path='scripts/rc_acceptance.py',packet='compatibility/rc/parent-inventory-rc-acceptance-finite-successor-v1.json',read=p=>readCheckerOwnerMember(root,p),body=JSON.parse(read(packet));
let poison=false;const callback=p=>poison&&p===path?Buffer.from('bad'):read(p);
const x=inventoryRcAcceptanceSourceSuccessor({root,read:callback});assert.equal(x.qualify(body.before).sha256,body.after.sha256);assert.throws(()=>x.qualify({...body.before,sha256:'0'.repeat(64)}));assert.throws(()=>x.qualify({...body.before,bytes:body.before.bytes+1}));
poison=true;assert.throws(()=>x.assertCurrent());assert.throws(()=>inventoryRcAcceptanceSourceSuccessor({root,read:callback}));poison=false;x.assertCurrent();
for(const p of [path,packet]){const old=read(p);try{writeFileSync(join(root,p),Buffer.concat([old,Buffer.from('\n')]));assert.throws(()=>x.assertCurrent());assert.throws(()=>inventoryRcAcceptanceSourceSuccessor({root,read:callback}));}finally{writeFileSync(join(root,p),old);}x.assertCurrent();}
console.log(JSON.stringify({result:'pass',selector_unknown_rejected:true,cold_late_physical_and_callback_rejected:true}));
