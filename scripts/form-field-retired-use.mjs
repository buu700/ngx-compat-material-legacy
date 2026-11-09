/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite provenance for the additional AfterViewChecked use removed by a798ff9c5. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {join} from 'node:path';
const hash=b=>createHash('sha256').update(b).digest('hex');
export const FORM_FIELD_RETIRED_ROLE={file:'legacy-form-field/form-field.ts',module:'@angular/core',symbol:'AfterViewChecked'};
const path='projects/ngx-material-legacy/'+FORM_FIELD_RETIRED_ROLE.file;
const ledger='compatibility/f10/authored-dependency-current-dispositions.json';
const currentEpoch='7e9ecb0a8fe31d44c1f37b8a509fc58c6ab705ad', currentParent='11767b00a96caa175a206388551c9f014c7513fb';
const currentHash='e645f8b92ccb57518eb9fac6ab3a20c35db6bd9f19a301fcb659ffe58911cfb6';
const parent='d0b99b5b6975859ca4eff8aa55dd97e4dfeb4749',commit='a798ff9c58cdd539f115eda00b7cdd898d035353';
const proof={path:'compatibility/f10/authored-use-reviews/form-field-render-subclass-current-v2.json',sha256:'92516f5b8162ec646914eba916c3a33e001a4541b90ae6d7ad90c2317d448a63'};
const equalRole=r=>Object.keys(FORM_FIELD_RETIRED_ROLE).every(k=>r?.[k]===FORM_FIELD_RETIRED_ROLE[k]);
const active=new Map();
export function qualifyFormFieldRetiredUse(options){
 const root=realpathSync(options.root),prior=active.get(root);if(prior){prior.reentered=true;assert.fail('reentrant form-field retirement');}const state={reentered:false};active.set(root,state);try{const result=qualify({...options,root});assert.equal(state.reentered,false,'reentrant form-field retirement');return result;}finally{active.delete(root);}
}
function qualify({root,current,readMember}){
 assert.equal(typeof readMember,'function');
 const physical=p=>{assert.ok(typeof p==='string'&&!p.includes('\\'));const parts=p.split('/');assert.ok(parts.every(x=>x&&x!=='.'&&x!=='..'));let at=root;for(let i=0;i<parts.length;i++){at=join(at,parts[i]);const stat=lstatSync(at);assert.equal(stat.isSymbolicLink(),false);assert.ok(i===parts.length-1?stat.isFile():stat.isDirectory());}return readFileSync(at);};
 const sweep=()=>{assert.equal(realpathSync(root),root);assert.equal(hash(physical(path)),currentHash,'changed form-field source frame');assert.equal(hash(physical(proof.path)),proof.sha256,'changed form-field review frame');};
 const checked=(p,digest)=>{sweep();const value=physical(p),supplied=readMember(p);sweep();assert.ok(Buffer.isBuffer(supplied)&&value.equals(supplied));assert.equal(hash(value),digest);assert.ok(value.equals(physical(p)));return value;};
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('GIT_')));Object.assign(env,{GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0'});
 const git=(...args)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,maxBuffer:16*1024*1024});
 assert.equal(git('rev-parse',commit+'^').toString().trim(),parent);git('merge-base','--is-ancestor',commit,'HEAD');
 const before=git('show',parent+':'+path),after=git('show',commit+':'+path),oldLedger=git('show',parent+':'+ledger);
 assert.equal(hash(before),'a0ed827e6ac47802a886d87ab1c1c270c952c6a8fa45f65c5fdfc0f7472fabff');
 assert.equal(hash(after),'e6204762c0899cfc038d28c7eb3918d291766b3179b6a7bf0b4630f59c6cd657');
 assert.equal(git('rev-parse',currentEpoch+'^').toString().trim(),currentParent);git('merge-base','--is-ancestor',currentEpoch,'HEAD');
 const currentBefore=git('show',currentParent+':'+path),currentAfter=git('show',currentEpoch+':'+path);
 assert.ok(currentBefore.equals(after));assert.equal(hash(currentAfter),currentHash);
 const expected=currentBefore.toString().replace("import {afterFormFieldRender} from './internal/after-form-field-render';", "import {afterFormFieldRender} from './internal/after-form-field-render';\nimport {nextLegacyHintId} from './internal/hint-id';").replace('  readonly _hintLabelId: string = `mat-hint-${nextUniqueId++}`;', '  // Reserve the historical field counter position used by the separate label ID.\n  readonly _hintLabelId: string = (nextUniqueId++, nextLegacyHintId());');
 assert.equal(currentAfter.toString(),expected,'unreviewed form-field retirement source delta');
 assert.equal(hash(oldLedger),'1ee2b18b6fbcf835a928be1cd4bdab5813d244ea459017cfa7bac109408b9884');
 const original=JSON.parse(oldLedger).symbol_uses.filter(equalRole);assert.equal(original.length,1);assert.equal(original[0].candidate_source_sha256,hash(before));assert.equal(original[0].occurrences.length,1);assert.deepEqual(original[0].occurrences,[{kind:'named-import',local_name:'AfterViewChecked',type_only:false,line:17}]);
 const actual=checked(path,currentHash);assert.ok(actual.equals(currentAfter));
 const validateCurrent=()=>{assert.equal(current.source_files.filter(m=>m.path===path&&m.sha256===currentHash).length,1);assert.equal(current.symbol_uses.filter(equalRole).length,0);};validateCurrent();
 const evidence=checked(proof.path,proof.sha256);
 const review=JSON.parse(evidence).reviews.filter(equalRole);assert.equal(review.length,1);assert.equal(review[0].conclusion,'removed-use');assert.equal(review[0].candidate_source_sha256,hash(after));
 checked(path,currentHash);checked(proof.path,proof.sha256);sweep();validateCurrent();
 return {original:original[0],retired:{...FORM_FIELD_RETIRED_ROLE,candidate_source_sha256:currentHash,occurrences:[]},qualification:proof};
}

/** Locate the independently committed additional obligation whenever its retirement is in this branch history. */
export function formFieldRetirementHistory({root}){
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('GIT_')));Object.assign(env,{GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0'});
 const git=(...args)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,maxBuffer:16*1024*1024});
 try{git('merge-base','--is-ancestor',commit,'HEAD');}catch(e){if(e.status===1)return null;throw e;}
 assert.equal(git('rev-parse',commit+'^').toString().trim(),parent);const bytes=git('show',parent+':'+ledger);assert.equal(hash(bytes),'1ee2b18b6fbcf835a928be1cd4bdab5813d244ea459017cfa7bac109408b9884');const matches=JSON.parse(bytes).symbol_uses.filter(equalRole);assert.equal(matches.length,1);assert.equal(matches[0].candidate_source_sha256,'a0ed827e6ac47802a886d87ab1c1c270c952c6a8fa45f65c5fdfc0f7472fabff');return matches[0];
}
