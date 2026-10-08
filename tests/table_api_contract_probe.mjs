/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Real API producer integration with emitted owned source; no packed/AOT qualification. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync,existsSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {packedShape,originalFactoryContract,originalInheritedConstructor,originalInheritedTableInputs,compareSignatures,loadDifferences} from '../scripts/api-surface.mjs';
import {approvedTableContract,TABLE_CONTRACT_PATH} from '../scripts/table-construction-contract.mjs';
import {observeRuntimeDi,expectedFactoryDi} from '../scripts/api-di-observe.mjs';
import {settleDi} from '../scripts/api-completeness.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),req=createRequire(import.meta.url),ts=req('typescript');
const read=p=>readFileSync(resolve(root,p),'utf8'),sf=(text,p='fixture.ts')=>ts.createSourceFile(p,text,ts.ScriptTarget.Latest,true);
const sha=b=>createHash('sha256').update(b).digest('hex'),url=spec=>pathToFileURL(req.resolve(spec)).href,importModule=spec=>import(url(spec));
await importModule('@angular/compiler');const core=await importModule('@angular/core');
const originalPath='/original/src/material/legacy-table/table.ts',name='MatLegacyTable';
const old=packedShape(sf(read('reference/material-16.2.14/table-outlet-sources/legacy-table.ts')),name);
const constructor=originalInheritedConstructor(originalPath,name),inputs=originalInheritedTableInputs(originalPath,name);
const symbol={symbol_id:'legacy-table/primary/MatLegacyTable',family:'legacy-table',kind:'primary',name,di_id:'table-api-fixture',shape:{...old,
 inheritedConstructor:constructor,inheritedTableInputs:inputs,originalFactory:originalFactoryContract(originalPath,name),
 signatures:[...old.ownSignatures,...constructor.signatures,...inputs.signatures]}};
const contract=approvedTableContract(symbol),differences=loadDifferences();
assert.equal(expectedFactoryDi(symbol.shape).length,11);assert.deepEqual(symbol.shape.originalFactory.inherited_factory.attributes,['role']);
assert.equal(contract.runtime_requests.length,7);assert.equal(inputs.signatures.length,4);
const path='projects/ngx-material-legacy/legacy-table/table.ts',source=read(path),candidate=packedShape(sf(source,path),name);
const matched=compareSignatures(symbol,candidate,differences);assert.deepEqual(matched.blocking,[]);
assert.equal(matched.rows.filter(r=>r.construction_contract===contract.profile_id).length,1);
for(const text of [
 source.replace('  CdkTable,','  CdkTable as PublicTable,').replace('extends CdkTable<T>','extends PublicTable<T>').replace('{provide: CdkTable,','{provide: PublicTable,'),
 source.replace('  CdkTable,\n','').replace("import {coerceBooleanProperty}","import * as tablePeer from '@angular/cdk/table';\nimport {coerceBooleanProperty}").replace(/\bCdkTable\b/g,'tablePeer.CdkTable'),
]){
 const declaration=packedShape(sf(text),name);assert.equal(declaration.publicTableParent,true);
 assert.deepEqual(compareSignatures(symbol,declaration,differences).blocking,[]);
}
const signatureMutants=[];
for(const [id,text]of [
 ['missing-constructor',source.replace(/  \/\*\* Construct through Angular node DI[^\n]*\n  constructor\(\) \{[\s\S]*?\n  \}\n/,'')],
 ['rest-arguments',source.replace('constructor()','constructor(...args:unknown[])')],
 ['optional-manual-element',source.replace('constructor()','constructor(element?:unknown)')],
 ['extra-overload',source.replace('constructor() {','constructor();\n  constructor(element:unknown);\n  constructor(element?:unknown) {')],
 ['wrong-public-import',source.replace("from '@angular/cdk/table'","from 'foreign/table'")],
 ['foreign-parent',source.replace('extends CdkTable<T>','extends Other<T>')],
 ['shadow-parent',source+'\nclass CdkTable<T> {}\n'],
 ['wrong-parent-type-argument',source.replace('extends CdkTable<T>','extends CdkTable<unknown>')],
 ['wrong-inherited-input-type',source.replace('set fixedLayout(value: BooleanInput)','set fixedLayout(value: boolean)')],
 ['missing-input-override',source.replace(/  override get fixedLayout\(\): boolean \{[^\n]*\}\n  override set fixedLayout\(value: BooleanInput\) \{[\s\S]*?\n  \}\n/,'')],
 ['extra-unrelated-api',source.replace('export class MatLegacyTable<T> extends CdkTable<T> {','export class MatLegacyTable<T> extends CdkTable<T> {\n  unrelatedNewApi():void {}')],
]){
 assert.notEqual(text,source,id+': mutation did not apply');const result=compareSignatures(symbol,packedShape(sf(text),name),differences);
 assert.ok(result.blocking.length,id+': signature mutation escaped');signatureMutants.push({id,rejected:true,problems:result.blocking});
}
const unbound=differences.map(row=>{const copy={...row};delete copy.construction_contract;return copy;});
assert.ok(compareSignatures(symbol,candidate,unbound).blocking.length);signatureMutants.push({id:'plain-rationale-cannot-authorize-constructor',rejected:true});
for(const mode of ['contract','authority','original-constructor','original-factory','original-inherited-inputs']){
 const altered=structuredClone(symbol);
 if(mode==='original-constructor')altered.shape.inheritedConstructor.signatures[0]+='?';
 if(mode==='original-factory')altered.shape.originalFactory.inherited_factory.declaration+=' ';
 if(mode==='original-inherited-inputs')altered.shape.inheritedTableInputs.signatures.pop();
 const reader=p=>{const bytes=readFileSync(resolve(root,p));return mode==='contract'&&p===TABLE_CONTRACT_PATH||mode==='authority'&&p===contract.authority.path?Buffer.concat([bytes,Buffer.from(' ')]):bytes;};
 assert.throws(()=>approvedTableContract(altered,reader));signatureMutants.push({id:mode+'-identity-changed',rejected:true});
}
for(const [kind,value]of [['kind','testing'],['family','legacy-menu'],['name','Other']]){
 const altered={...symbol,[kind]:value};assert.throws(()=>approvedTableContract(altered));signatureMutants.push({id:'wrong-'+kind+'-scope',rejected:true});
}
const otherLine=contract.line==='main'?'codex-closeout-21':'codex-closeout-main';
const sibling=resolve(root,'../../',otherLine,'ngx-compat-material-legacy',TABLE_CONTRACT_PATH);
if(existsSync(sibling)){
 assert.throws(()=>approvedTableContract(symbol,p=>p===TABLE_CONTRACT_PATH?readFileSync(sibling):readFileSync(resolve(root,p))));
 signatureMutants.push({id:'other-line-contract-cannot-be-borrowed',rejected:true});
}
const emit=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true}}).outputText
 .replace(/(['"])(@angular\/[^'"]+)\1/g,(_,q,spec)=>JSON.stringify(url(spec)));
const temp=mkdtempSync(join(tmpdir(),'table-api-contract-')),runtime=[],settlementMutants=[];
async function observe(id,leaf=source,footer=''){
 const directory=join(temp,id);mkdirSync(join(directory,'fesm2022'),{recursive:true});
 writeFileSync(join(directory,'fesm2022/ngx-compat-material-legacy-legacy-table.mjs'),emit(leaf)+'\n'+footer);
 const [row]=await observeRuntimeDi(directory,[symbol],[],importModule);return settleDi(row,[]);
}
let good;
try{
 good=await observe('positive');assert.equal(good.result,'pass',JSON.stringify({problems:good.problems,observed:good.observed,observation:good.approved_construction}));assert.equal(good.status,'intentional-legacy-difference');assert.deepEqual(good.problems,[]);
 assert.equal(good.factory_outcome,'returned');assert.equal(good.observed.length,7);assert.equal(good.approved_construction.parent_comparison.length,2);
 runtime.push({id:'actual-source-factory-checker-and-settlement',result:'pass',historical:good.historical,observed:good.observed,approved_construction:good.approved_construction});
 for(const [id,leaf,footer]of [
  ['missing-manual-argument-rejection',source.replace('if (arguments.length)','if (false)'), ''],
  ['wrong-node-element',source.replace('super();',"super();this._elementRef=new (Object.getPrototypeOf(this._elementRef).constructor)({nodeName:'MAT-TABLE',setAttribute(){}});"),''],
  ['wrong-borrowed-detector',source.replace('super();','super();this._changeDetectorRef={markForCheck(){}};'),''],
  ['wrong-borrowed-direction',source.replace('super();',"super();this._dir={value:'ltr',change:{subscribe(){}}};"),''],
  ['wrong-sticky-class',source.replace("stickyCssClass = 'mat-table-sticky'","stickyCssClass = 'wrong-sticky'"),''],
  ['wrong-sticky-position-policy',source.replace('needsPositionStickyOnElement = false','needsPositionStickyOnElement = true'),''],
  ['wrong-direct-input-coercion',source.replace('super.fixedLayout = coerceBooleanProperty(value)','super.fixedLayout = Boolean(value)'),''],
  ['empty-returning-factory',source,'Object.defineProperty(MatLegacyTable,"ɵfac",{value:()=>({}),configurable:true});'],
  ['peer-instead-of-owned-factory',source,'Object.defineProperty(MatLegacyTable,"ɵfac",{value:()=>new CdkTable(),configurable:true});'],
  ['throwing-factory',source,'Object.defineProperty(MatLegacyTable,"ɵfac",{value:()=>{throw new Error("factory did not complete");},configurable:true});'],
  ['unresolved-required-root-provider',source,`import {inject as probeInject,InjectionToken} from ${JSON.stringify(url('@angular/core'))};const missing=new InjectionToken('table-contract-missing-provider');Object.defineProperty(MatLegacyTable,'ɵfac',{value:()=>{probeInject(missing);return new MatLegacyTable();},configurable:true});`],
  ['extra-public-dependency',source,`import {inject as probeInject,ElementRef as ExtraRef} from ${JSON.stringify(url('@angular/core'))};Object.defineProperty(MatLegacyTable,'ɵfac',{value:()=>{probeInject(ExtraRef);return new MatLegacyTable();},configurable:true});`],
 ]){
  assert.ok(leaf!==source||footer,id+': mutation did not apply');const result=await observe(id,leaf,footer);assert.equal(result.result,'fail',id+': runtime mutation escaped');runtime.push({id,result:'rejected',problems:result.problems});
 }
 for(const [id,change]of [
  ['missing-profile',row=>delete row.approved_construction],
  ['wrong-profile',row=>row.approved_construction.profile_id='other'],
  ['wrong-contract-hash',row=>row.approved_construction.contract_sha256='0'.repeat(64)],
  ['factory-not-returned',row=>row.factory_outcome='threw'],
  ['missing-complete-trace',row=>delete row.approved_construction.parent_comparison],
  ['missing-role-context',row=>row.approved_construction.parent_comparison.pop()],
  ['wrong-role-context',row=>row.approved_construction.parent_comparison[1].context='grid-role'],
  ['different-token-objects',row=>row.approved_construction.parent_comparison[0].token_objects_equal=false],
  ['different-flags',row=>row.approved_construction.parent_comparison[0].options_equal=false],
  ['different-resolution-kinds',row=>row.approved_construction.parent_comparison[0].trace_kinds_equal=false],
  ['omitted-trace-request',row=>row.approved_construction.parent_comparison[0].trace_count--],
  ['missing-root-proof',row=>row.approved_construction.root_requests.pop()],
  ['unresolved-root-provider',row=>row.approved_construction.root_requests[0].unresolved=true],
  ['missing-public-node-request',row=>row.observed.pop()],
  ['wrong-node-request-label',row=>row.observed[0]='SameCountOtherToken'],
  ['missing-public-node-identities',row=>delete row.approved_construction.public_node_requests],
  ['non-array-public-node-proof',row=>row.approved_construction.public_node_requests={length:7}],
  ['null-public-node',row=>row.approved_construction.public_node_requests[0]=null],
  ['non-array-parent-proof',row=>row.approved_construction.parent_comparison={length:2}],
  ['null-parent-proof',row=>row.approved_construction.parent_comparison[0]=null],
  ['null-root-proof',row=>row.approved_construction.root_requests[0]=null],
  ['unproved-public-node-identity',row=>row.approved_construction.public_node_requests[0].identity_matched=false],
  ['wrong-sticky-skip-self',row=>row.approved_construction.public_node_requests[5].skipSelf=false],
  ['wrong-public-node-optional-flag',row=>row.approved_construction.public_node_requests[2].optional=false],
  ['wrong-role-default',row=>row.approved_construction.parent_comparison[1].role_behavior=false],
  ['manual-arguments-not-rejected',row=>row.approved_construction.counts.manualRejects=0],
  ['subclass-not-initialized',row=>row.approved_construction.counts.subclass=0],
  ['missing-data-source-disconnect',row=>row.approved_construction.counts.disconnects=0],
  ['borrowed-node-service-destroyed',row=>row.approved_construction.counts.borrowedDestroyed=1],
  ['missing-behavior-proof',row=>delete row.approved_construction.behavior_problems],
  ['behavior-failure',row=>row.approved_construction.behavior_problems.push('parent identity failed')],
  ['identity-problem-cannot-be-waived',row=>row.problems.push('token object differs')],
 ]){
  const changed=structuredClone(good);change(changed);assert.equal(settleDi(changed,[]).result,'fail',id+': settlement mutation escaped');settlementMutants.push({id,rejected:true});
 }
}finally{rmSync(temp,{recursive:true,force:true});}
const peerPath=req.resolve('@angular/cdk/table'),peerSha=sha(readFileSync(peerPath));
const subjects=JSON.parse(read('compatibility/rc/table-public-module-import-source-proof.json')).subjects;
const peer=subjects.find(s=>s.members.some(m=>m.path.endsWith('.mjs')&&m.sha256===peerSha));assert.ok(peer,'actual peer source identity missing');
const report={schema_version:1,role:'Table-specific delegated construction API/DI producer integration with emitted source, not packed/AOT qualification',line:contract.line,node:process.version,compiler:ts.version,runtime_peer:core.VERSION.full,peer_table:{version:peer.version,sha256:peerSha},
 source_caps:[path,'scripts/api-surface.mjs','scripts/api-di-observe.mjs','scripts/api-completeness.mjs','scripts/api-table-factory.mjs','scripts/table-construction-contract.mjs','tests/table_api_contract_probe.mjs',TABLE_CONTRACT_PATH,contract.authority.path].map(p=>({path:p,sha256:sha(readFileSync(resolve(root,p)))})),
 original:{constructor,factory:symbol.shape.originalFactory,inherited_inputs:inputs,expected_factory_di:expectedFactoryDi(symbol.shape)},signature_comparison:matched,signature_mutants:signatureMutants,runtime,settlement_mutants:settlementMutants,
 limits:['Actual Angular22 JIT factory and independent current public CdkTable execute with synthetic server DOM and public node/root services.','Actual borrowed22 peer bytes authenticated; own-line contract/declarations differ. No actualAngular21 runtime/compiler/native/AOT/packed/floor or whole API/security audit qualification.','The original constructor/eleven DI dependencies/role and four independently read inherited input signatures remain unchanged. Only the delegated table constructor difference is accepted.','Other inherited table members and generic/behavior obligations remain part of the full audit; this finite input coverage repair is not an exhaustive inherited-member audit.']};
const argv=process.argv.slice(2),at=argv.indexOf('--report');if(at>=0){assert.equal(existsSync(argv[at+1]),false);writeFileSync(argv[at+1],JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({line:contract.line,signature_mutants:signatureMutants.length,runtime_positive:1,runtime_mutants:runtime.length-1,settlement_mutants:settlementMutants.length,original_factory_dependencies:11,accepted_public_node_requests:7,runtime_peer:core.VERSION.full}));
