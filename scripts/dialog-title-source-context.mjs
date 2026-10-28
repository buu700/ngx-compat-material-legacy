/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact current title sources and metadata references; never returns old product bytes. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const SOURCE=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const ownPath='scripts/dialog-title-source-context.mjs';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const ownImage=readFileSync(join(SOURCE,ownPath));
export const DIALOG_TITLE_SOURCE_IMAGES=Object.freeze([
 {path:'projects/ngx-material-legacy/legacy-dialog/dialog-content-directives.ts',before:'698b2fea49964c4cea0cfa07b0847ada413130055c032de94d16df3cc4b59ca5',before_bytes:6504,after:'07b539ec15bdf207e3db563651f2c0e4875bb63f44f90963c304ca0dcc6eac2a',after_bytes:6651,
  edits:[['    const instance = this._dialogRef?._containerInstance;\n\n    if (instance) {\n      Promise.resolve().then(() => {\n        removeLegacyDialogTitle(instance, this.id);',
   '    const instance = this._dialogRef?._containerInstance;\n    // Match the tagged lifetime: remove from the queue captured at destruction.\n    const queue = instance?._ariaLabelledByQueue;\n\n    if (instance && queue) {\n      Promise.resolve().then(() => {\n        removeLegacyDialogTitle(instance, this.id, queue);']]},
 {path:'projects/ngx-material-legacy/legacy-dialog/internal/dialog-container-state.ts',before:'96606c75b79d2ff8b89d7b725eaa6ab9e6f7a9f95f0421dac76f59886851f16d',before_bytes:3172,after:'cefcbfb0ad5bb9e695fcfac03afa66d59c2f89709d686b59ee3edd3005812141',after_bytes:3193,
  edits:[['export function removeLegacyDialogTitle(container: LegacyDialogTitleContainer, id: string): void {\n  const state = states.get(container);\n  const queue = container._ariaLabelledByQueue;',
   'export function removeLegacyDialogTitle(\n  container: LegacyDialogTitleContainer, id: string,\n  queue: string[] | undefined = container._ariaLabelledByQueue,\n): void {\n  const state = states.get(container);']]},
]);
const parents={"21.x":"da845d2c63153c6720c48f3fc5456ddb426ac625","main":"f9de4645f73d40f6d39b72af3209903acdcb1bbb"};
const originalCache=new Map();
function original(root,line,path){
 const key=line+'\0'+path;
 if(!originalCache.has(key)){
  const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
  for(const name of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[name];
  const bytes=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parents[line]+':'+path],{cwd:root,env,maxBuffer:1024*1024});
  originalCache.set(key,bytes);
 }
 return Buffer.from(originalCache.get(key));
}
const ref=(image,side,bytes=true)=>({path:image.path,sha256:image[side],...(bytes?{bytes:image[side+'_bytes']}: {})});
function qualify(images,member,side){
 const image=images.find(image=>image.path===member.path);if(!image)return null;
 const previous=member.sha256===image.before?'before':member.sha256===image.after?'after':null;
 assert.ok(previous,'unqualified title source reference '+member.path);
 if(member.bytes!==undefined)assert.equal(member.bytes,image[previous+'_bytes']);
 return {...member,...ref(image,side,member.bytes!==undefined)};
}
/** Every source read stays raw; only exact recorded references can advance. */
export function dialogTitleProductSubject({root=process.cwd(),read=path=>readFileSync(join(root,path)),line}={}){
 const version=JSON.parse(read('projects/ngx-material-legacy/package.json')).version;
 const actual=version.startsWith('21.')?'21.x':version.startsWith('22.')?'main':null;assert.ok(actual);line??=actual;assert.equal(line,actual);
 const bound=[];
 for(const image of DIALOG_TITLE_SOURCE_IMAGES){
  const before=original(root,line,image.path);assert.equal(hash(before),image.before);assert.equal(before.length,image.before_bytes);
  let expected=before.toString();for(const [from,to]of image.edits){assert.equal(expected.split(from).length,2,'title source edit is not exact');expected=expected.replace(from,to);}
  assert.equal(hash(expected),image.after);assert.equal(Buffer.byteLength(expected),image.after_bytes);
  const current=read(image.path);assert.equal(current.toString(),expected,'unqualified current title source '+image.path);bound.push(ref(image,'after'));
 }
 const module=read(ownPath);assert.equal(module.equals(ownImage),true,'changed title source owner');bound.push({path:ownPath,sha256:hash(ownImage),bytes:ownImage.length});
 const assertCurrent=()=>{for(const member of bound){const raw=read(member.path);assert.equal(hash(raw),member.sha256,'late title source change '+member.path);assert.equal(raw.length,member.bytes);}};
 assertCurrent();return {line,bound,assertCurrent,qualify:member=>qualify(DIALOG_TITLE_SOURCE_IMAGES,member,'after'),historicalReference:member=>qualify(DIALOG_TITLE_SOURCE_IMAGES,member,'before'),
  old_product_bytes_exposed:false,canonical_decisions_changed:0,current_native_or_packed_or_full_source_qualified:false};
}

const readerPath='compatibility/rc/dialog-title-current-source-reader-successors.json';
const readerPins={'21.x':'c189a19263d4862df74b47f590c1cb21875932406e150b9dc35141c448a86369',main:'8ec37f431f8da2aee653a62fb4676cd86e67f3fea233b530cf440e15cbf44d71'};
const readerCode={"21.x":["scripts/upstream-rules-js-build-admission.mjs","scripts/upstream-testing-api-21x-admission.mjs","scripts/autocomplete-selection-spec-subject.mjs","scripts/packed-upstream-ledger-epoch.mjs","scripts/checker-reference-metadata.mjs","scripts/packed-product-source-recovery.mjs","scripts/dialog-caller-owned-contract-boundary.mjs","scripts/snack-dom-source-context.mjs","scripts/packed-cva-source-requalification.mjs"],"main":["scripts/upstream-testing-api-21x-admission.mjs","scripts/autocomplete-selection-spec-subject.mjs","scripts/packed-upstream-ledger-epoch.mjs","scripts/packed-product-source-recovery.mjs","scripts/dialog-caller-owned-contract-boundary.mjs","scripts/snack-dom-source-context.mjs","scripts/packed-cva-source-requalification.mjs","scripts/sass-wrapper-notice-subject.mjs","scripts/dialog-portal-failure-recovery.mjs"]};
/** Tool before-images authenticate literal edits only; they are never executed. */
export function dialogTitleReaderSubject({root=process.cwd(),read=path=>readFileSync(join(root,path)),line}={}){
 const actual=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';line??=actual;assert.equal(line,actual);
 assert.ok(Object.hasOwn(readerPins,line),'title source-reader port not yet qualified for '+line);
 const raw=read(readerPath);assert.equal(hash(raw),readerPins[line],'changed title reader transition');const data=JSON.parse(raw);
 assert.equal(data.schema_version,1);assert.equal(data.line,line);assert.match(data.source_parent,/^[0-9a-f]{40}$/);
 assert.deepEqual(data.code_subjects.map(row=>row.path),readerCode[line]);assert.equal(data.old_product_bytes_exposed,false);assert.equal(data.canonical_decisions_changed,0);assert.equal(data.native_or_full_qualification,false);
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const name of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[name];
 const bound=[{path:readerPath,sha256:hash(raw),bytes:raw.length}],images=[],beforeCode=new Map();
 for(const row of data.code_subjects){
  const before=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',data.source_parent+':'+row.path],{cwd:root,env,maxBuffer:1024*1024});
  assert.equal(hash(before),row.before.sha256);assert.equal(before.length,row.before.bytes);beforeCode.set(row.path,Buffer.from(before));
  let expected=before.toString();for(const edit of row.literal_edits){assert.equal(expected.split(edit.before).length,2,'title source-reader hook is not exact');expected=expected.replace(edit.before,edit.after);}
  assert.equal(hash(expected),row.after.sha256);assert.equal(Buffer.byteLength(expected),row.after.bytes);
  assert.equal(read(row.path).toString(),expected,'changed current title source-reader '+row.path);
  bound.push({path:row.path,...row.after});images.push({path:row.path,before:row.before.sha256,before_bytes:row.before.bytes,after:row.after.sha256,after_bytes:row.after.bytes});
 }
 const assertCurrent=()=>{for(const member of bound){const current=read(member.path);assert.equal(hash(current),member.sha256,'late title reader change '+member.path);assert.equal(current.length,member.bytes);}};
 // Used only to reconstruct authenticated old tool-reference metadata. No tool
 // before-image is executed, and product reads pass through without projection.
 const withHistoricalToolMetadata=action=>{
  const metadata=path=>{assertCurrent();return beforeCode.has(path)?Buffer.from(beforeCode.get(path)):read(path);};
  return action(metadata);
 };
 assertCurrent();return {line,bound,assertCurrent,qualify:member=>qualify(images,member,'after'),historicalReference:member=>qualify(images,member,'before'),withHistoricalToolMetadata,
  old_product_bytes_exposed:false,old_tool_bytes_exposed_as_current:false,historical_tool_metadata_only:true,canonical_decisions_changed:0,current_native_or_packed_or_full_source_qualified:false};
}
