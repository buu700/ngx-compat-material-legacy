/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=process.cwd(),read=path=>readFileSync(join(root,path)),hash=x=>createHash('sha256').update(x).digest('hex');
const ts=createRequire(join(root,'package.json'))('typescript');
const {packedShape,compareSignatures}=await import(pathToFileURL(join(root,'scripts/api-surface.mjs')));
const archivePath='compatibility/rc/dialog-caller-owned-contract-diagnostic-prior.json.gz';
const archive=JSON.parse(gunzipSync(read(archivePath)));const originals=new Map();
for(const member of archive.members){assert.equal(hash(member.text),member.sha256);const git=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','show',archive.source_parent+':'+member.path],{cwd:root,maxBuffer:8*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});assert.equal(hash(git),member.sha256);originals.set(member.path,member.text);}
const path='tests/dialog_ref_runtime_probe.mjs',before=originals.get(path),after=read(path).toString();
function cases(text){const file=ts.createSourceFile('probe.mjs',text,ts.ScriptTarget.Latest,true),found=[];const visit=node=>{if(ts.isCallExpression(node)&&node.expression.getText(file)==='check'&&node.arguments.length===2)found.push({name:node.arguments[0].getText(file),body:node.arguments[1].getText(file)});ts.forEachChild(node,visit);};visit(file);return found;}
const oldCases=cases(before),newCases=cases(after);assert.equal(oldCases.length,newCases.length);let changed=0;
for(let i=0;i<oldCases.length;i++){const a=oldCases[i],b=newCases[i];if(a.name.includes('successful-opening-replay-and-borrowed-container-stream-remain-intact')){assert.equal(b.name,a.name.replace('opening-replay','opening-broadcast'));assert.equal(b.body,a.body.replace('assert.equal(opened,1);','assert.equal(opened,0);'));changed++;}else assert.deepEqual(b,a);}
assert.equal(changed,1);
const table=text=>text.slice(text.indexOf('  for(const[id,from,to,rejectedBy]of['),text.indexOf('const sources=['));assert.equal(table(after),table(before));
const motion='tests/dialog_motion_runtime_probe.mjs';assert.equal(read(motion).toString(),originals.get(motion).replace('const baseUrl = await loadBase(undefined, undefined, true);','export const baseUrl = await loadBase(undefined, undefined, true);'));
assert.equal(read('tests/test_dialog_ref_runtime.py').toString(),originals.get('tests/test_dialog_ref_runtime.py'));
const differencesPath='compatibility/rc/api/signature-differences.json',oldDiff=JSON.parse(originals.get(differencesPath)),newDiff=JSON.parse(read(differencesPath));assert.deepEqual(newDiff.differences.slice(0,-1),oldDiff.differences);assert.equal(newDiff.differences.length,oldDiff.differences.length+1);
const proposal=JSON.parse(read('compatibility/rc/dialog-caller-owned-contract-candidate.json'));const member=proposal.members.find(m=>m.path.endsWith('/dialog-ref.ts'));const shape=text=>packedShape(ts.createSourceFile(member.path,text,ts.ScriptTarget.Latest,true),'MatLegacyDialogRef');const historical=shape(member.before.text),owned=shape(member.after.text),symbol={symbol_id:'legacy-dialog/primary/MatLegacyDialogRef',shape:historical};
const valid=compareSignatures(symbol,owned,newDiff.differences);assert.deepEqual(valid.blocking,[]);assert.equal(valid.rows.filter(r=>r.status==='intentional-legacy-difference').length,1);
const bad=structuredClone(owned);for(const key of ['signatures','ownSignatures'])bad[key]=bad[key].map(x=>x==='public readonly prop componentRef:ComponentRef<T>|null|undefined'?'public readonly prop componentRef:any':x);assert.ok(compareSignatures(symbol,bad,newDiff.differences).blocking.length);
const reference='reference/material-16.2.14/dialog-focus-sources/material-dialog-ref.ts';assert.equal(hash(read(reference)),'381c4255f6329e44e015949bf14da4cb2e51985b4ae9a5e5e25716ff6c5ea336');
const result={schema_version:1,line:archive.line,original_archive:{path:archivePath,sha256:hash(read(archivePath)),source_parent:archive.source_parent},original_programs_authenticated:archive.members.length,original_case_definitions:oldCases.length,unchanged_case_definitions:oldCases.length-1,tagged_broadcast_successor_cases:1,nine_source_mutation_programs_unchanged:true,python_case_and_skip_condition_unchanged:true,motion_loader_export_only:true,previous_API_signature_records_unchanged:true,new_exact_API_signature_records:1,unlisted_componentRef_type_rejected:true,untouched_tagged_reference_sha256:hash(read(reference)),source_closures:0,actual_native_packed_AOT_or_full_floor_qualified:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
