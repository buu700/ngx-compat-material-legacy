/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Investigation: errors are reported as unresolved, never an identity pass. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {compileRemainingIdentityGraph,remainingIdentityEntries} from '../scripts/remaining-identity-construction.mjs';
import {prepareRemainingIdentitySubjects} from '../scripts/remaining-identity-public-subjects.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),hash=b=>createHash('sha256').update(b).digest('hex'),compiled=compileRemainingIdentityGraph({root}),loaded=prepareRemainingIdentitySubjects(root),worker=readFileSync(join(root,'tests/remaining_identity_construction_subject.mjs')),results=[];
const args=process.argv.slice(2),orders=args.includes('--both-orders')?['legacy-first','peer-first']:['legacy-first'];
try{for(const model of loaded.models){for(const module of compiled.modules){const target=join(model.root,'owned',module.path.replace(/\.ts$/,'.mjs'));mkdirSync(dirname(target),{recursive:true});writeFileSync(target,module.compiled);}writeFileSync(join(model.root,'worker.mjs'),worker);writeFileSync(join(model.root,'resources.json'),JSON.stringify(compiled.resources));
 for(const family of ['autocomplete','menu','select','snack-bar','tab-link','tab-panel'])for(const order of orders){const entry=remainingIdentityEntries[family.startsWith('tab-')?'tabs':family],child=spawnSync(process.execPath,[join(model.root,'worker.mjs'),model.line,family,order,join(model.root,'owned',entry.replace(/\.ts$/,'.mjs'))],{cwd:model.root,encoding:'utf8',timeout:20000});if(child.status===0&&child.stderr===''){try{results.push({...JSON.parse(child.stdout),status:'observed'});}catch(error){results.push({line:model.line,family,order,status:'unresolved',error:String(error),stdout:child.stdout,stderr:child.stderr});}}else results.push({line:model.line,family,order,status:'unresolved',exit_code:child.status,error:String(child.error??''),stdout:child.stdout,stderr:child.stderr});}
}}finally{loaded.dispose();}
const report={schema_version:1,line:JSON.parse(readFileSync(join(root,'compatibility/rc/remaining-identity-worksheet.json'))).line,node:process.version,compiler:compiled.compiler,producer_sha256:hash(readFileSync(fileURLToPath(import.meta.url))),worker_sha256:hash(worker),compiler_helper_sha256:hash(readFileSync(join(root,'scripts/remaining-identity-construction.mjs'))),public_subject_loader_sha256:hash(readFileSync(join(root,'scripts/remaining-identity-public-subjects.mjs'))),runtime_capsule:loaded.runtime_capsule,owned_modules:compiled.modules.map(({compiled,...m})=>m),resources:compiled.resources.map(({text,...r})=>r),results,limits:[compiled.limits,'Public target constructors are genuine. Element/document/renderer, focus/live/viewport and local resource text are explicit protocols. Original/reference collisions are not called regressions without individual contract review.'],g11_claim:'not-passed'};
const outIndex=args.indexOf('--report');if(outIndex>=0){const out=args[outIndex+1];assert.ok(out);assert.equal(existsSync(out),false);writeFileSync(out,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({line:report.line,contexts:results.length,observed:results.filter(r=>r.status==='observed').length,unresolved:results.filter(r=>r.status!=='observed').map(r=>({line:r.line,family:r.family,error:r.stderr?.split('\n').slice(0,5).join(' ')})),values:results.filter(r=>r.status==='observed').map(r=>({line:r.line,family:r.family,order:r.order,values:r.values})),actual_nodes_or_native_or_packed_qualified:false}));
