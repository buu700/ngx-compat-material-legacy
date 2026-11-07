/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {reverseFixedReportCapturePackedSource as reverse} from '../scripts/fixed-report-capture-packed-source-successor.mjs';
import {reverseChipMenuTooltipPackedSource as nested} from '../scripts/chip-menu-tooltip-packed-source-requalification.mjs';
assert.ok(process.argv[2],'disposable fixture root required');
const root=resolve(process.argv[2]);assert.equal(readFileSync(join(root,'.capture-packed-fixture'),'utf8'),'disposable\n');
const read=path=>readFileSync(join(root,path)),options={root,readMember:read};
const target='scripts/packed-consumer-evidence.mjs',raw=read(target).toString();
const old=execFileSync('git',['show','c72d88c74944463d1fea960ae718fb30944818c9:'+target],{cwd:root,encoding:'utf8'});
assert.equal(reverse(target,raw,'main',options),old);assert.equal(reverse(target,old,'main',options),old);
assert.equal(nested(target,raw,'main',options),nested(target,old,'main',options));
assert.throws(()=>reverse(target,raw+' ','main',options));assert.equal(reverse('unrelated',raw,'main'),raw);assert.equal(reverse(target,raw,'21.x'),raw);
const paths=[target,'compatibility/rc/fixed-report-catalog.json','compatibility/rc/fixed-report-capture-packed-source-inputs-v1.json','scripts/fixed-report-capture-packed-source-successor.mjs'];
for(const path of paths){
 const file=join(root,path),saved=read(path);
 try{writeFileSync(file,Buffer.concat([saved,Buffer.from(' cold')]));assert.throws(()=>reverse(target,raw,'main',options));}finally{writeFileSync(file,saved);}
 let armed=true;
 try{assert.throws(()=>reverse(target,raw,'main',{root,readMember:p=>{const result=read(p);if(armed&&p==='scripts/fixed-report-capture-packed-source-successor.mjs'){armed=false;writeFileSync(file,Buffer.concat([saved,Buffer.from(' late')]));}return result;}}));}finally{writeFileSync(file,saved);}
 assert.equal(reverse(target,raw,'main',options),old);
}
console.log(JSON.stringify({result:'pass',cold:paths.length,late:paths.length,nested:true,source_only:true}));
