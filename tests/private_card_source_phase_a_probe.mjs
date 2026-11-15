/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Source identity controls on a disposable copied fixture; no CSS admission. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {basename,join,resolve} from 'node:path';
import {createPrivateCardGateContext,privateCardGateDescriptor} from '../scripts/sass-private-card-gate.mjs';
const root=resolve(process.argv[2]);assert.ok(basename(root).startsWith('ngx-current-sass-source-test-'));assert.notEqual(realpathSync(root),realpathSync(process.cwd()));
const context=createPrivateCardGateContext({root});const before=privateCardGateDescriptor(context);assert.equal(before.source.source_modules.length,9);
for(const path of ['scripts/sass-private-card-gate.mjs','scripts/select-program-transition-source-v2.mjs','scripts/select_program_transition_source_v2.py','compatibility/rc/current-main-density-source-ae9-successor-v1.json']){
 const file=join(root,path),original=readFileSync(file);try{writeFileSync(file,Buffer.concat([original,Buffer.from(' foreign')]));assert.throws(()=>privateCardGateDescriptor(context),path);}finally{writeFileSync(file,original);}assert.deepEqual(privateCardGateDescriptor(context),before);
}
console.log('private-card physical source rejection and recovery passed');
