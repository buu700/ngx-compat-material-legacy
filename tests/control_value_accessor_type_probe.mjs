/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewControlValueAccessorTypes} from '../scripts/control-value-accessor-type-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>readFileSync(resolve(root,p),'utf8');
const subjects=JSON.parse(read('compatibility/rc/control-value-accessor-declaration-subjects.json'));
const compilerRoot=process.env.CLOSEOUT_INTERFACE_COMPILER_ROOT;
const report=reviewControlValueAccessorTypes({root,compilerRoot});assert.equal(report.cases.length,8);report.mutations=[];
function reject(id,expected,opts){assert.throws(()=>reviewControlValueAccessorTypes({root,compilerRoot,...opts}),expected,id);report.mutations.push({id,rejected:true});}
const path=report.sources[0].path,raw=read(path);
reject('runtime-interface-reference',/runtime\/unsupported/,{readSource:p=>p===path?raw+'\nconsole.log(ControlValueAccessor);\n':read(p)});
reject('interface-used-as-parent-class',/runtime\/unsupported/,{readSource:p=>p===path?raw+'\nclass RuntimeParent extends ControlValueAccessor {}\n':read(p)});
reject('shadowed-interface-reference',/shadowed interface reference/,{readSource:p=>p===path?raw+'\nfunction shadowed(){interface ControlValueAccessor{};class Local implements ControlValueAccessor{}}\n':read(p)});
reject('removed-interface-import',/missing\/ambiguous interface import/,{readSource:p=>p===path?raw.replace('  ControlValueAccessor,',''):read(p)});
const alias=raw.replace('  ControlValueAccessor,','  ControlValueAccessor as CVA,').replace('    ControlValueAccessor,','    CVA,');assert.notEqual(alias,raw);
assert.equal(reviewControlValueAccessorTypes({root,compilerRoot,readSource:p=>p===path?alias:read(p)}).cases[0].local_name,'CVA');report.alias_binding_positive=1;
for(const line of ['main','21.x']){
 function semantic(id,capName,edit,expected){
  const model=structuredClone(subjects),cap=model.subjects.find(s=>s.line===line)[capName],original=gunzipSync(readFileSync(resolve(root,cap.path))).toString('utf8'),changed=edit(original);assert.notEqual(changed,original,id);const bytes=Buffer.from(changed),zipped=gzipSync(bytes,{mtime:0});cap.sha256=hash(zipped);cap.bytes=zipped.length;cap.member_sha256=hash(bytes);cap.member_bytes=bytes.length;
  reject(line+':'+id,expected,{subjectData:model,readBytes:p=>p===cap.path?zipped:readFileSync(resolve(root,p))});
 }
 semantic('disabled-member-becomes-required','source',s=>s.replace('setDisabledState?(isDisabled: boolean): void;','setDisabledState(isDisabled: boolean): void;'),/historical interface shape changed/);
 semantic('disabled-argument-widened','source',s=>s.replace('setDisabledState?(isDisabled: boolean): void;','setDisabledState?(isDisabled: boolean | string): void;'),/historical interface shape changed/);
 semantic('change-registration-removed','source',s=>s.replace('registerOnChange(fn: any): void;',''),/historical interface shape changed/);
 semantic('deprecated-interface','source',s=>s.replace('interface ControlValueAccessor {','/** @deprecated */\ninterface ControlValueAccessor {'),/private\/deprecated interface/);
 semantic('deprecated-disabled-member','source',s=>s.replace('setDisabledState?(isDisabled: boolean): void;','/** @deprecated */\nsetDisabledState?(isDisabled: boolean): void;'),/private\/deprecated interface member/);
 semantic('public-interface-export-removed','source',s=>s.replace(/, ControlValueAccessor(?=,| \})/g,''),/interface not publicly exported/);
 semantic('public-package-entry-changed','package_manifest',s=>{const p=JSON.parse(s);p.exports['.'].types='./types/unrelated.d.ts';return JSON.stringify(p);},/public forms package entry changed/);
 const cap=subjects.subjects.find(s=>s.line===line).source;
 reject(line+':stale-declaration-bytes',/compressed declaration changed/,{readBytes:p=>p===cap.path?Buffer.concat([readFileSync(resolve(root,p)),Buffer.from('changed')]):readFileSync(resolve(root,p))});
}
const at=process.argv.indexOf('--report');if(at>=0){assert.equal(existsSync(process.argv[at+1]),false);writeFileSync(process.argv[at+1],JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({line:report.line,compiler:report.compiler,uses:report.cases.length,mutants_rejected:report.mutations.length,alias_binding_positive:report.alias_binding_positive,native_executed:false}));
