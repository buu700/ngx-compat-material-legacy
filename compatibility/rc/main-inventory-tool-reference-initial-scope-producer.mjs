/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite tool-reference qualification; current product/native gates remain separate. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),main='/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy';
const other='/home/parallels/.codex/worktrees/codex-closeout-21/ngx-compat-material-legacy';
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(resolve(main,p)),local=p=>readFileSync(resolve(root,p));
const role='scripts/canonical-tool-source-role.mjs',owner='scripts/packed-upstream-ledger-epoch.mjs',packetPath='compatibility/rc/c04-inventory-owner-inputs.json';
const worksheet=JSON.parse(local('compatibility/rc/main-inventory-tool-reference-worksheet.json')),transition=JSON.parse(local('compatibility/rc/main-inventory-tool-reference-literal-transition.json'));
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const k of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[k];
const original=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',worksheet.source_parent+':'+role],{cwd:root,env});
assert.equal(hash(original),worksheet.before_role.sha256);assert.equal(hash(original),transition.before.sha256);
let derived=original.toString();for(const edit of transition.literal_edits){assert.equal(derived.split(edit.before).length,2);derived=derived.replace(edit.before,edit.after);}
assert.equal(hash(derived),transition.after.sha256);assert.equal(Buffer.byteLength(derived),transition.after.bytes);assert.equal(local(role).toString(),derived);
assert.equal(read(role).toString(),derived);assert.equal(readFileSync(join(other,role)).toString(),derived);
const packet=JSON.parse(read(packetPath));assert.equal(hash(read(packetPath)),worksheet.main_inventory_packet.sha256);
const before=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',packet.source_parent+':'+owner],{cwd:main,env});
const helpers=await Promise.all([main,other].map(r=>import(pathToFileURL(join(r,role)))));
const prior={...packet.before_owner},controls=[];const started=performance.now();
const mutations=new Map(),current=p=>mutations.get(p)??read(p);
const qualified=helpers[0].qualifyCanonicalToolReference({root:main,read:current,prior});assert.ok(qualified);assert.deepEqual(qualified.reference,packet.after_owner);qualified.assertCurrent();
const foreign=helpers[1].qualifyCanonicalToolReference({root:main,read,prior});assert.deepEqual(foreign.reference,qualified.reference);foreign.assertCurrent();
controls.push({name:'own-root and foreign-root main references match',passed:true});
for(const helper of helpers){
 assert.equal(helper.qualifyCanonicalToolReference({root:main,read,prior:{...packet.after_owner}}),null);
 assert.equal(helper.qualifyCanonicalToolReference({root:main,read:p=>p===owner?before:read(p),prior}),null);
 assert.equal(helper.qualifyCanonicalToolReference({root:main,read,prior:{path:'scripts/unrelated.mjs',sha256:'0'.repeat(64)}}),null);
}
controls.push({name:'existing exact-current historical-literal and unrelated references preserved',passed:true});
function rejects(name,action,pattern){assert.throws(action,pattern);controls.push({name,rejected:true});}
rejects('unknown prior source digest',()=>helpers[0].qualifyCanonicalToolReference({root:main,read,prior:{...prior,sha256:'0'.repeat(64)}}),/unknown main inventory tool reference/);
rejects('incorrect prior byte length',()=>helpers[0].qualifyCanonicalToolReference({root:main,read,prior:{...prior,bytes:prior.bytes+1}}),/Expected values to be strictly equal/);
rejects('missing required packet',()=>helpers[0].qualifyCanonicalToolReference({root:main,read:p=>{if(p===packetPath)throw new Error('missing packet control');return read(p);},prior}),/missing packet control/);
for(const path of [owner,packetPath,role]){
 mutations.set(path,Buffer.concat([read(path),Buffer.from('\n/* different current bytes */\n')]));
 rejects('cold nonphysical '+path,()=>helpers[0].qualifyCanonicalToolReference({root:main,read:current,prior}),/nonphysical main inventory tool input/);
 rejects('late nonphysical '+path,()=>qualified.assertCurrent(),/nonphysical or late main inventory tool input/);mutations.clear();
}
qualified.assertCurrent();
const {autocompleteSelectionReaderSubject}=await import(pathToFileURL(join(main,'scripts/autocomplete-selection-spec-subject.mjs')));
const nativeSource=autocompleteSelectionReaderSubject({root:main,read});nativeSource.assertCurrent();controls.push({name:'complete current main native-spec title-reader chain accepts actual owner bytes',passed:true,input_bindings:nativeSource.bound.length});
const {inspectPackedProductSourceRepairs}=await import(pathToFileURL(join(main,'scripts/snack-dom-source-context.mjs')));
let nextError;try{inspectPackedProductSourceRepairs({root:main,read});assert.fail('current product transition must still be unqualified');}catch(error){nextError={message:error.message,stack_frames:error.stack?.split('\n').filter(s=>/^\s+at /.test(s)).slice(0,4)};}
assert.match(nextError.message,/changed raw current product\/resource projects\/ngx-material-legacy\/(?:legacy-form-field\/testing\/error-harness|legacy-menu\/internal\/menu-base|legacy-snack-bar\/internal\/snack-bar-base|legacy-tabs\/internal\/tab-nav-bar-base)\.ts/);
controls.push({name:'new current product guard remains failed after tool repair',rejected:true});
qualified.assertCurrent();foreign.assertCurrent();nativeSource.assertCurrent();
const script='compatibility/rc/main-inventory-tool-reference-verify.mjs';
const result={schema_version:1,line:worksheet.line,status:'exact main inventory tool successor qualified; current product source epoch remains pending',reference:qualified.reference,tool_bound:qualified.bound,controls,controls_rejected:controls.filter(c=>c.rejected).length,next_product_source_rejection:nextError,
 current_main_native_spec_and_title_source_reader_chain_accepted:true,current_product_source_epoch_accepted:false,
 current_21x_owner_delegation_source_body_preserved:true,actual_main_canonical_owner_module_changed:false,
 producer:{path:script,sha256:hash(local(script))},seconds:(performance.now()-started)/1000,
 source_bindings:[...qualified.bound,{path:'compatibility/rc/main-inventory-tool-reference-worksheet.json',sha256:hash(local('compatibility/rc/main-inventory-tool-reference-worksheet.json'))},{path:'compatibility/rc/main-inventory-tool-reference-literal-transition.json',sha256:hash(local('compatibility/rc/main-inventory-tool-reference-literal-transition.json'))}],
 old_programs_executed:false,product_changes:0,canonical_dispositions_changed:0,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
const out='compatibility/rc/main-inventory-tool-reference-qualified.json';assert.equal(existsSync(join(root,out)),false);writeFileSync(join(root,out),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({line:result.line,current_main_tool_chain:true,current_product_epoch:false,controls_rejected:result.controls_rejected,seconds:result.seconds,next_rejection:nextError.message.split('\n')[0]}));
