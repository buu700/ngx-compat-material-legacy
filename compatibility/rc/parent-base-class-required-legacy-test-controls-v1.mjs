/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE. */
/** Disposable finite test DATA controls; no owner/sourceproducer executes. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync,symlinkSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {currentCanonicalTestRegistry,currentCanonicalTestFrame} from '../../tests/current_sass_canonical_test_scope.mjs';
const root=process.cwd(),proposal='compatibility/rc/21x-base-class-removal-admission-canonical-proposal-v6.json';
const packet=JSON.parse(readFileSync(join(root,proposal))),LEDGER=packet.before.path,REGISTRY=packet.registry_before.path;
const directory=mkdtempSync(join(tmpdir(),'ngx-base-test-data-')),cases=[];
const put=(path,raw)=>{const target=join(directory,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,raw);};
const read=path=>readFileSync(join(directory,path));
const image=name=>gunzipSync(readFileSync(join(root,packet[name+'_image'].path)));
const ledgerBefore=image('ledger_before'),ledgerAfter=image('ledger_after'),registryBefore=image('registry_before'),registryAfter=image('registry_after');
function state(applied,registry70=applied){put(LEDGER,applied?ledgerAfter:ledgerBefore);put(REGISTRY,registry70?registryAfter:registryBefore);}
function check(id,fn){fn();cases.push(id);}
try{
 put('.git',Buffer.from('gitdir: '+execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','rev-parse','--absolute-git-dir'],{cwd:root,encoding:'utf8'}).trim()+'\n'));
 for(const path of [proposal,...['ledger_before','ledger_after','registry_before','registry_after'].map(name=>packet[name+'_image'].path)])put(path,readFileSync(join(root,path)));
 check('exact426-69',()=>{state(false);const s=currentCanonicalTestFrame({root:directory,read});assert.equal(s.individual_source_reviews,90);assert.equal(s.registered_source_contracts,69);s.assertCurrent();});
 check('exact426-70-precursor',()=>{state(false,true);const s=currentCanonicalTestFrame({root:directory,read});assert.equal(s.individual_source_reviews,90);assert.equal(s.registered_source_contracts,70);});
 check('exact427-70',()=>{state(true);const s=currentCanonicalTestFrame({root:directory,read});assert.equal(s.individual_source_reviews,91);assert.equal(s.base_class_decisions,1);assert.deepEqual(s.comparison(LEDGER,read(LEDGER)),ledgerBefore);assert.deepEqual(s.comparison(REGISTRY,read(REGISTRY)),registryBefore);});
 check('reject427-69',()=>{state(true,false);assert.throws(()=>currentCanonicalTestFrame({root:directory,read}));});
 check('unknown-registry',()=>{state(false);put(REGISTRY,Buffer.concat([registryBefore,Buffer.from('\n')]));assert.throws(()=>currentCanonicalTestRegistry({root:directory,read}));});
 check('unknown-ledger',()=>{state(false);put(LEDGER,Buffer.concat([ledgerBefore,Buffer.from('\n')]));assert.throws(()=>currentCanonicalTestFrame({root:directory,read}));});
 check('forged-callback-equals',()=>{state(false);const callback=path=>{const b=read(path);if(path===REGISTRY){b[0]=32;b.equals=()=>true;}return b;};assert.throws(()=>currentCanonicalTestRegistry({root:directory,read:callback}));});
 check('callback-restores-data-but-mutates-physical',()=>{state(false);let changed=false;const callback=path=>{const b=read(path);if(path===REGISTRY&&!changed){changed=true;put(REGISTRY,Buffer.concat([b,Buffer.from('\n')]));}return b;};assert.throws(()=>currentCanonicalTestRegistry({root:directory,read:callback}));assert.ok(changed);});
 check('late-physical-registry',()=>{state(false);const s=currentCanonicalTestFrame({root:directory,read});put(REGISTRY,registryAfter);assert.throws(()=>s.assertCurrent());});
 check('last-ledger-callback-mutates-earlier-registry',()=>{state(false);let late=false,changed=false;const callback=path=>{const b=read(path);if(late&&path===LEDGER&&!changed){changed=true;put(REGISTRY,registryAfter);}return b;};const s=currentCanonicalTestFrame({root:directory,read:callback});late=true;assert.throws(()=>s.assertCurrent());assert.ok(changed);});
 check('mutated-returned-comparison-snapshot',()=>{state(true);const s=currentCanonicalTestFrame({root:directory,read}),a=s.comparison(LEDGER,read(LEDGER));a.fill(0);assert.deepEqual(s.comparison(LEDGER,read(LEDGER)),ledgerBefore);s.assertCurrent();});
 check('changed-pinned-proposal',()=>{state(false);put(proposal,Buffer.concat([read(proposal),Buffer.from('\n')]));assert.throws(()=>currentCanonicalTestRegistry({root:directory,read}));put(proposal,readFileSync(join(root,proposal)));});
 check('changed-pinned-before-image',()=>{state(false);const path=packet.registry_before_image.path;put(path,Buffer.concat([read(path),Buffer.from('\n')]));assert.throws(()=>currentCanonicalTestRegistry({root:directory,read}));put(path,readFileSync(join(root,path)));});
 check('linked-registry',()=>{state(false);rmSync(join(directory,REGISTRY));symlinkSync(join(root,REGISTRY),join(directory,REGISTRY));assert.throws(()=>currentCanonicalTestRegistry({root:directory,read}));});
}finally{rmSync(directory,{recursive:true,force:true});}
console.log(JSON.stringify({schema_version:1,result:'pass',scope:'disposable registry/frame DATA only',cases:cases.length,case_ids:cases,current_root_mutated:false,owner_or_sourceproducer_executed:false}));
