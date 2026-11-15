/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Read-only provisional census. This never admits a source change or writes DATA. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {lstatSync,readFileSync,readdirSync,realpathSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),base='7e9ecb0a8fe31d44c1f37b8a509fc58c6ab705ad';
const pinsPath='scripts/bidi-physical-pins.json',expectedPins='fc4f859358f0d2de44677ef377ddfed9b79e1d2a6557582b1ade7aa8b51b87ef';
const hash=b=>createHash('sha256').update(b).digest('hex'),blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'};
for(const k of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES','GIT_CONFIG_COUNT','GIT_CONFIG_PARAMETERS','GIT_NAMESPACE','GIT_REPLACE_REF_BASE','GIT_EXEC_PATH','GIT_SHALLOW_FILE'])delete env[k];
const git=(...args)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,maxBuffer:32*1024*1024});
// Fetch fresh Git objects once per observation, not from a prior transaction.
function batchBlobs(ids){const unique=[...new Set(ids)],input=Buffer.from(unique.join('\n')+'\n');const raw=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','cat-file','--batch'],{cwd:root,env,input,maxBuffer:64*1024*1024}),out=new Map();let pos=0;for(const expected of unique){const end=raw.indexOf(10,pos);assert.ok(end>=0,'missing Git object header');const [id,kind,sizeText]=raw.subarray(pos,end).toString().split(' '),size=Number(sizeText);assert.equal(id,expected);assert.equal(kind,'blob');assert.ok(Number.isSafeInteger(size)&&size>=0);const value=raw.subarray(end+1,end+1+size);assert.equal(value.length,size);assert.equal(raw[end+1+size],10);assert.equal(blob(value),id);out.set(id,Buffer.from(value));pos=end+size+2;}assert.equal(pos,raw.length);return out;}
function physical(p){let q=root;for(const part of p.split('/')){assert.ok(part&&part!=='.'&&part!=='..'&&part!=='.git');q=join(q,part);const s=lstatSync(q);assert.ok(!s.isSymbolicLink(),'linked source '+p);}assert.ok(lstatSync(q).isFile(),'not a file '+p);return readFileSync(q);}
function tree(commit){const map=new Map();for(const line of git('ls-tree','-rz',commit,'--','projects/ngx-material-legacy').toString('utf8').split('\0').filter(Boolean)){const [meta,p]=line.split('\t'),[mode,kind,id]=meta.split(' ');if(p.endsWith('.ts')&&!p.endsWith('.spec.ts')){assert.equal(kind,'blob');assert.equal(mode,'100644');assert.ok(!map.has(p));map.set(p,id);}}return map;}
function physicalPaths(){const files=[];const visit=p=>{for(const e of readdirSync(join(root,p),{withFileTypes:true})){if(e.name==='node_modules')continue;const q=p+'/'+e.name;assert.ok(!e.isSymbolicLink(),'linked product route '+q);if(e.isDirectory())visit(q);else{assert.ok(e.isFile(),'non-file product '+q);if(q.endsWith('.ts')&&!q.endsWith('.spec.ts'))files.push(q);}}};visit('projects/ngx-material-legacy');return files.sort();}
function classification(snapshot){const graph=[],bidi=[],core=[];for(const [p,b]of snapshot){const s=b.toString('utf8');if(/\b(?:BidiModule|MatCommonModule|MatLegacyCommonModule)\b/.test(s))graph.push(p);if(s.includes('@angular/cdk/bidi'))bidi.push(p);if(s.includes('@ngx-compat/material-legacy/legacy-core'))core.push(p);}return {graph:graph.sort(),bidi:bidi.sort(),core:core.sort()};}
export function inspectBidiEpoch({target,requireHead=true}={}){
assert.match(target??'',/^[0-9a-f]{40}$/);
assert.equal(realpathSync(root),root,'linked root');const anchor=lstatSync(root),head=git('rev-parse','HEAD').toString().trim();if(requireHead)assert.equal(head,target,'target differs from actual HEAD');else git('merge-base','--is-ancestor',target,head);git('merge-base','--is-ancestor',base,target);
const pinBytes=physical(pinsPath);assert.equal(hash(pinBytes),expectedPins,'historic pins changed');const pins=JSON.parse(pinBytes);assert.equal(pins.product_ts_source_commit,base);
const old=tree(base),next=tree(target);assert.equal(old.size,510);assert.deepEqual([...old.keys()].sort(),Object.keys(pins.product_ts_snapshot).sort(),'historic product membership changed');assert.deepEqual([...next.keys()].sort(),[...old.keys()].sort(),'unreviewed product membership transition');
assert.deepEqual(physicalPaths(),[...next.keys()].sort(),'current product physical membership');
const historical=new Map(),current=new Map(),oldDigests={},newDigests={},objects=batchBlobs([...old.values(),...next.values()]);
for(const [p,id]of old){const b=objects.get(id);assert.equal(blob(b),id);assert.equal(hash(b),pins.product_ts_snapshot[p],'historic source mismatch '+p);historical.set(p,b);oldDigests[p]=hash(b);}
for(const [p,id]of next){const b=physical(p);assert.equal(blob(b),id,'physical differs from committed source '+p);assert.equal(hash(b),hash(objects.get(id)));current.set(p,b);newDigests[p]=hash(b);}
const oldClasses=classification(historical),newClasses=classification(current);assert.deepEqual(oldClasses.graph,pins.graph_census);assert.deepEqual(oldClasses.bidi,pins.bidi_import_census);assert.deepEqual(oldClasses.core,pins.core_import_census);
const all=[...new Set([...old.keys(),...next.keys()])].sort(),changed=all.filter(p=>old.get(p)!==next.get(p)),transitions=[];
for(const p of changed){const commits=git('log','--format=%H','--reverse',base+'..'+target,'--',p).toString().trim().split('\n').filter(Boolean);assert.ok(commits.length,'missing per-path history '+p);let before=old.get(p)??null;const history=[];
 for(const commit of commits){const parents=git('rev-list','--parents','-n','1',commit).toString().trim().split(' ');assert.equal(parents.length,2,'merge requires explicit review '+p);const readEntry=(at)=>{const rows=git('ls-tree','-z',at,'--',p).toString().split('\0').filter(Boolean);if(!rows.length)return null;assert.equal(rows.length,1);const [meta,name]=rows[0].split('\t'),[mode,kind,id]=meta.split(' ');assert.equal(name,p);assert.equal(mode,'100644');assert.equal(kind,'blob');const bytes=git('show',at+':'+p);assert.equal(blob(bytes),id);return {blob:id,sha256:hash(bytes),bytes:bytes.length};};const previous=readEntry(parents[1]),after=readEntry(commit);assert.equal(previous?.blob??null,before,'non-contiguous history '+p);assert.notEqual(previous?.blob??null,after?.blob??null,'empty transition '+p);history.push({commit,parent:parents[1],before:previous,after});before=after?.blob??null;}
 assert.equal(before,next.get(p)??null,'last image does not match source cut '+p);transitions.push({path:p,was_bidi_pinned:Object.hasOwn(pins.graph_and_evidence,p),history,source_semantic_review:'required; identity census does not assess behavior'});
}
for(const [p,expected]of Object.entries(pins.graph_and_evidence)){if(old.has(p)){assert.equal(oldDigests[p],expected,'old graph preimage mismatch '+p);}else assert.equal(hash(physical(p)),expected,'non-product evidence changed '+p);}
assert.deepEqual(physicalPaths(),[...next.keys()].sort(),'late product membership changed');for(const [p,b]of current)assert.equal(hash(physical(p)),hash(b),'late physical change '+p);
assert.equal(git('rev-parse','HEAD').toString().trim(),head,'HEAD changed during census');assert.equal(realpathSync(root),root);assert.equal(lstatSync(root).dev,anchor.dev);assert.equal(lstatSync(root).ino,anchor.ino);assert.equal(hash(physical(pinsPath)),expectedPins);
return {schema_version:1,role:'provisional-bidi-product-source-identity-census-not-qualification',old_source:base,current_source:target,old_tree:git('rev-parse',base+'^{tree}').toString().trim(),current_tree:git('rev-parse',target+'^{tree}').toString().trim(),pins:{path:pinsPath,sha256:expectedPins},old_members:old.size,current_members:next.size,old_snapshot:oldDigests,current_snapshot:newDigests,old_census:oldClasses,current_census:newClasses,transitions,limits:['Manual independent per-path source review required before any immutable DATA or pin is created.','No current Bidi, NgModule, runtime, artifact or G11 qualification.']};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){assert.equal(process.argv.length,3,'usage: node scripts/prepare-bidi-physical-epoch.mjs <full-committed-HEAD>');console.log(JSON.stringify(inspectBidiEpoch({target:process.argv[2]}),null,2));}
