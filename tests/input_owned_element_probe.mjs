/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Run with INPUT_DISABLED_REFERENCE, INPUT_DISABLED_PACKAGE and
 * INPUT_DISABLED_TARBALL bound to the reviewed diagnostic inputs.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync,mkdtempSync,mkdirSync,symlinkSync,readdirSync,cpSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {deriveSurface} from '../scripts/api-surface.mjs';
import {observeRuntimeDi,observePublicNodeFactory,loadRuntimeModule} from '../scripts/api-di-observe.mjs';
import {settleDi} from '../scripts/api-completeness.mjs';
import {inputObservationProblems,inputArtifactProof,inputBoundClass,inputScopeFromSource} from '../scripts/api-input-context.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),referenceRoot=process.env.INPUT_DISABLED_REFERENCE,packageRoot=process.env.INPUT_DISABLED_PACKAGE,tarball=process.env.INPUT_DISABLED_TARBALL;
if(!referenceRoot||!packageRoot||!tarball)throw Error('reviewed input fixture environment variables required');
const context={tarball,referenceRoot},surface=deriveSurface(referenceRoot),symbols=surface.symbols.filter(s=>s.family==='legacy-input').map(s=>s.name==='MatLegacyInput'?s:{...s,di_id:null}),symbol=symbols.find(s=>s.name==='MatLegacyInput');
const pass=(await observeRuntimeDi(packageRoot,symbols,[],undefined,context))[0],settled=settleDi(pass,[],context);assert.deepEqual(settled.problems,[]);assert.equal(settled.result,'pass');assert.deepEqual(pass.observed,['MatFormField?','ElementRef']);assert.equal(pass.runtime_requests.length,2);assert.equal(pass.runtime_requests[1].token_role,'owned native element');
const reject=[];
for(const [id,c] of [['missing provenance',null],['forged proof',{verified:true}],['wrong artifact',{...context,tarball:referenceRoot+'/input/input.ts'}],['wrong reference',{...context,referenceRoot:packageRoot}]]){
 assert.equal(inputArtifactProof(symbol,packageRoot,c),null,id);const row=settleDi((await observeRuntimeDi(packageRoot,symbols,[],undefined,c))[0],[],c);assert.notEqual(row.result,'pass',id);assert.ok(row.problems.some(x=>x.includes('token count')),id);reject.push(id);
}
const require=createRequire(join(root,'package.json')),load=spec=>import(pathToFileURL(require.resolve(spec)).href);const core=await load('@angular/core');await load('@angular/compiler');const loaded=await loadRuntimeModule(packageRoot,'legacy-input','primary'),Type=loaded.MatLegacyInput;
// A matching function string in a comment or unrelated declaration is never
// proof that the actual public export owns the captured request.
const peer=(await load('@angular/material/input')).MatInput,peerText=Function.prototype.toString.call(peer),peerSource=readFileSync(require.resolve('@angular/material/input'),'utf8');
assert.ok(inputBoundClass(peerSource,peerText,'MatInput'));
assert.ok(inputBoundClass('const RuntimeParent = class MatInput {}; export {RuntimeParent as MatInput};','class MatInput {}','MatInput'));
assert.ok(inputBoundClass('export const MatInput = class MatInput {};','class MatInput {}','MatInput'));
const ownedFile=join(packageRoot,'fesm2022/ngx-compat-material-legacy-legacy-input.mjs'),ownedSource=readFileSync(ownedFile,'utf8'),ownedText=Function.prototype.toString.call(Type);
assert.ok(inputBoundClass(ownedSource,ownedText,'MatLegacyInput',true));
const classDecoys=[
 ['comment decoy',`export class MatInput {}\n/* ${peerText} */`],
 ['unused expression decoy',`const decoy = (${peerText}); export class MatInput {}`],
 ['unexported real class',`${peerText}\nclass Wrong {}\nexport {Wrong as MatInput};`],
 ['swapped public export',peerSource.replace('export { MAT_INPUT_CONFIG, MAT_INPUT_VALUE_ACCESSOR, MatInput, MatInputModule,','class Wrong {}\nexport { MAT_INPUT_CONFIG, MAT_INPUT_VALUE_ACCESSOR, Wrong as MatInput, MatInputModule,')],
 ['duplicate lexical name',`const MatInput=0;\n${peerText}\nexport {MatInput};`],
 ['owned parent import retargeted',ownedSource.replace("import { MatInput } from '@angular/material/input';","import { MatInput as ForeignInput } from '@angular/material/input';")],
 ['owned parent import counterfeit',ownedSource.replace("import { MatInput } from '@angular/material/input';","import { MatInput } from '@counterfeit/input';")],
 ['duplicate public export',peerSource+'\nexport {MatInput};'],
];
for(const [id,mutant] of classDecoys){const isOwned=id.startsWith('owned ');assert.throws(()=>inputBoundClass(mutant,isOwned?ownedText:peerText,isOwned?'MatLegacyInput':'MatInput',isOwned),undefined,id);reject.push(id);}
for(const [id,mutant] of [
 ['shadow inject',ownedSource+'\nconst inject = () => null;'],
 ['shadow ElementRef',ownedSource+'\nconst ElementRef = class {};'],
 ['shadow legacy token',ownedSource+'\nconst MAT_LEGACY_FORM_FIELD = {};'],
]){assert.throws(()=>inputScopeFromSource(mutant,ownedText,ownedFile,true,true),undefined,id);reject.push(id);}
assert.throws(()=>inputScopeFromSource(peerSource+'\n',peerText,require.resolve('@angular/material/input'),false,true));reject.push('peer runtime image mismatch');
const badNode=await observePublicNodeFactory(Type,core,packageRoot,symbol,symbols,load,{inputArtifactContext:context,constructorFactory:Receiver=>{const value=Type.ɵfac(Receiver);value._legacyElement=new core.ElementRef({});return value;}});
assert.ok(badNode.outcome!=='returned'||badNode.behaviorProblems?.length,'borrowed different node accepted');reject.push('borrowed wrong native node');
const temp=mkdtempSync(join(tmpdir(),'input-owned-di-')),scripts=join(temp,'scripts');mkdirSync(scripts);symlinkSync(join(root,'node_modules'),join(temp,'node_modules'));
for(const name of readdirSync(join(root,'scripts')))if(name!=='api-di-observe.mjs')symlinkSync(join(root,'scripts',name),join(scripts,name));
const source=readFileSync(join(root,'scripts/api-di-observe.mjs'),'utf8'),needle='if(options.captureStack)request.stack=new Error().stack;options.onRequest?.(request);';assert.ok(source.includes(needle));
for(const [id,mutation] of [['wrong token',"request.token=class FakeElementRef {};"],['optional flag','request.optional=true;'],['self flag','request.self=true;'],['skipSelf flag','request.skipSelf=true;'],['host flag','request.host=true;'],['unresolved flag','request.unresolved=true;']]){
 const injected=`if(options.captureStack)request.stack=new Error().stack;if(request.token?.name==='ElementRef'&&request.stack?.includes('ngx-compat-material-legacy-legacy-input.mjs')){${mutation}}options.onRequest?.(request);`,path=join(scripts,`di-mutant-${id.replaceAll(' ','-')}.mjs`);
 writeFileSync(path,source.replace(needle,injected));try{const mutant=await import(pathToFileURL(path).href),row=settleDi((await mutant.observeRuntimeDi(packageRoot,symbols,[],undefined,context))[0],[],context);assert.notEqual(row.result,'pass',id);reject.push(id);}finally{unlinkSync(path);}
}
for(const [key,value] of Object.entries({token:'@angular/core:Other',identity_matched:false,optional:true,self:true,skipSelf:true,host:true,unresolved:true,owned_field_origin:false,native_node_identical:false,artifact_sha256:'0'.repeat(64),owned_source_sha256:'0'.repeat(64),helper_collision_risk:'waived'})){
 const row=structuredClone(pass);row.factory_input_context.owned_element_ref[key]=value;assert.ok(inputObservationProblems(row,context).length,'receipt corruption '+key);reject.push('receipt '+key);
}
const altered=join(temp,'altered-package');cpSync(packageRoot,altered,{recursive:true});const alteredSource=join(altered,'fesm2022/ngx-compat-material-legacy-legacy-input.mjs');const originalSource=readFileSync(alteredSource,'utf8'),mutatedSource=originalSource.replace('_legacyElement = inject(ElementRef);','_legacyElement = inject(Injector);');assert.notEqual(mutatedSource,originalSource);writeFileSync(alteredSource,mutatedSource);assert.equal(inputArtifactProof(symbol,altered,context),null);reject.push('altered packed source');
rmSync(temp,{recursive:true,force:true});
console.log(JSON.stringify({valid:pass.observed,owned_request:pass.factory_input_context.owned_element_ref,negative_controls:reject},null,2));
