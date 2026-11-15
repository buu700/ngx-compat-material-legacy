/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {prepareRadioDispatcherSubjects,inspectRadioDispatcherUses} from '../scripts/radio-dispatcher-f9-use-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(join(root,p),'utf8');
const inspected=inspectRadioDispatcherUses({root}),loaded=prepareRadioDispatcherSubjects(root),worker=readFileSync(join(root,'tests/radio_dispatcher_subject.mjs')),results=[];
const ts=createRequire(import.meta.url)('typescript'),baseRaw=read('projects/ngx-material-legacy/legacy-radio/internal/radio-base.ts'),baseFile=ts.createSourceFile('radio-base.ts',baseRaw,ts.ScriptTarget.Latest,true),baseClass=baseFile.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='_MatRadioButtonBase');
const methods=['ngOnInit','ngOnDestroy','_updateTabIndex'].map(name=>{const found=baseClass.members.filter(n=>n.name?.getText(baseFile)===name);assert.equal(found.length,1);return found[0].getText(baseFile).replace(/^private\s+/,'')});
const make=parts=>ts.transpileModule('export class Replay {'+parts.join('\n')+'}',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const changes=[['listener-not-removed','this._removeUniqueSelectionListener();','void 0;'],['destroy-flag-omitted','this._isDestroyed = true;','void 0;'],['late-focus-guard-omitted','!this._isDestroyed &&','true &&']];const faults={};for(const [id,from,to] of changes){const code=methods.join('\n');assert.equal(code.split(from).length,2);faults[id]=make([code.replace(from,to)])}const cleanupPayload={current:make(methods),faults},cleanupWorker=readFileSync(join(root,'tests/radio_dispatcher_f9_cleanup_subject.mjs')),cleanupResults=[];

try{for(const model of loaded.models){const target=join(model.root,'worker.mjs');writeFileSync(target,worker);const cleanup=join(model.root,'radio-cleanup-subject.mjs');writeFileSync(cleanup,cleanupWorker);writeFileSync(join(model.root,'radio-cleanup-payload.json'),JSON.stringify(cleanupPayload));for(const mode of model.line==='original'?['zoneful']:['zoneful','zoneless']){results.push(JSON.parse(execFileSync(process.execPath,[target,model.line,mode],{cwd:model.root,encoding:'utf8',timeout:15000})));cleanupResults.push({line:model.line,mode,...JSON.parse(execFileSync(process.execPath,[cleanup],{cwd:model.root,encoding:'utf8',timeout:15000}))});}}}finally{loaded.dispose();}
const base='projects/ngx-material-legacy/legacy-radio/internal/radio-base.ts',leaf='projects/ngx-material-legacy/legacy-radio/radio.ts';
const mutations=[
 ['type-only-token',base,"import {UniqueSelectionDispatcher}","import type {UniqueSelectionDispatcher}"],
 ['unreviewed-token-route',base,"from '@angular/cdk/collections'","from '@angular/cdk/a11y'"],
 ['base-parameter-type',base,'_radioDispatcher: UniqueSelectionDispatcher','_radioDispatcher: Object'],
 ['derived-parameter-type',leaf,'radioDispatcher: UniqueSelectionDispatcher','radioDispatcher: Object'],
 ['wrong-registration-name',base,'name === this.name','name !== this.name'],
 ['missing-cleanup',base,'this._removeUniqueSelectionListener();','void 0;'],
 ['changed-selection-notification',base,'this._radioDispatcher.notify(this.id, this.name);','this._radioDispatcher.notify(this.name, this.id);'],
 ['changed-event-identity',base,'this.change.emit(new MatRadioChange(this, this._value));','this.change.emit({source:this,value:this._value});'],
 ['changed-forwarding',leaf,'      radioDispatcher,','      focusMonitor,'],
 ['wrong-animation-resolver',leaf,'resolveLegacyAnimationMode(animationMode)','animationMode'],
];
const controls=[];for(const [id,path,before,after] of mutations){const source=read(path);assert.equal(source.split(before).length,2,id);const changed=source.replace(before,after);assert.throws(()=>inspectRadioDispatcherUses({root,readSource:p=>p===path?changed:read(p)}),undefined,id);controls.push(id);}
const alias=read(base).replaceAll('UniqueSelectionDispatcher','SelectionDispatcher');const positive=inspectRadioDispatcherUses({root,readSource:p=>p===base?alias.replace('import {SelectionDispatcher}', 'import {UniqueSelectionDispatcher as SelectionDispatcher}'):read(p)});assert.equal(positive.cases[1].local_name,'SelectionDispatcher');
const report={schema_version:1,node:process.version,producer_sha256:hash(readFileSync(fileURLToPath(import.meta.url))),worker_sha256:hash(worker),helper_sha256:hash(readFileSync(join(root,'scripts/radio-dispatcher-f9-use-review.mjs'))),source:inspected,cleanup_results:cleanupResults,cleanup_worker_sha256:hash(cleanupWorker),subjects:loaded.models.map(m=>({line:m.line,contract:m.contract,borrowed:m.borrowed,borrowed_zone:m.borrowed_zone})),results,negative_controls:controls,import_alias_positive:true,limits:['Complete genuine public dispatcher/default application DI and manual algorithms. Complete seven tagged-owned methods and event/forwarding shapes; actual owned construction belongs to separate radio identity proof.','Explicit document/renderer and callback protocols. No full Angular component/node/native/packed or compiler/Node/RxJS floor claim.'],g11_claim:'not-passed'};
const args=process.argv.slice(2);if(args.length){assert.equal(args.length,2);assert.equal(args[0],'--report');assert.equal(existsSync(args[1]),false);writeFileSync(args[1],JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({roles:inspected.cases.length,methods:inspected.methods.length,contexts:results.length,negative_controls:controls.length,cleanup_contexts:cleanupResults.length,cleanup_mutations:3,import_alias_positive:true,whole_component_or_native_or_packed_qualified:false}));
