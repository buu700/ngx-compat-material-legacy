/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Two exact current constructor additions, separate from historical DI inputs. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {qualifyApiV8Archive as qualifyOldApiV8Archive,API_V8_ARTIFACT_SHA} from './api-v8-artifact-successor.mjs';
import {qualifyApiHintIdArchive,API_HINT_ID_ARTIFACT_SHA,API_HINT_ID_FORM_BUNDLE_SHA,API_HINT_ID_FORM_MAP_SHA,API_HINT_ID_FORM_SOURCE_SHA} from './api-hint-id-artifact-successor.mjs';
const qualifyApiV8Archive = archive => qualifyOldApiV8Archive(archive) || qualifyApiHintIdArchive(archive);
import {exactMenuArtifact} from './api-menu-artifact.mjs';

const profiles=Object.freeze({
 'legacy-form-field/primary/MatLegacyFormField':Object.freeze({family:'legacy-form-field',public_name:'MatLegacyFormField',parameter_owner:'MatLegacyFormField',original_arity:7,bundle_sha256:'d77d13c903ecb0f982e76ad2e082a46e2bfd9c5e61b291d65a919adefb489eee'}),
 'legacy-select/primary/MatLegacySelect':Object.freeze({family:'legacy-select',public_name:'MatLegacySelect',parameter_owner:'_MatSelectBase',original_arity:14,bundle_sha256:'ef9694e8e3aae5ec2170be660c71a322e2240dfd8b62a6ba66a9d89f43e61979'}),
});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const shapes=Object.freeze({'legacy-form-field/primary/MatLegacyFormField':'e205167b693101e4f7f2ed409f996aa72735202f4e5bc58e31a73151b8f64aca','legacy-select/primary/MatLegacySelect':'a62d7b852bf0191139f73f1de649118c5e6ba80808894a30ab978435bf3c551b'});
export const ownedNodeInjectorProfile=symbol=>profiles[symbol?.symbol_id]??null;
const parameter=profile=>({index:profile.original_arity,token_expression:'@angular/core#Injector',attribute:null,optional:false,self:false,skipSelf:false,host:false});

export function qualifyOwnedNodeInjector({symbol,Type,parameterType,core,source,compiler,metadata,originalParameters,context}){
 const profile=ownedNodeInjectorProfile(symbol);assert.ok(profile,'unknown owned node Injector profile');
 assert.equal(symbol.family,profile.family);assert.equal(symbol.name,profile.public_name);
 assert.equal(hash(JSON.stringify(symbol.shape)),shapes[symbol.symbol_id]);
 assert.ok(context?.tarball&&context.packageRoot);const archive=readFileSync(context.tarball),isHint=qualifyApiHintIdArchive(archive);assert.ok(isHint||qualifyOldApiV8Archive(archive));const artifact=isHint?API_HINT_ID_ARTIFACT_SHA:API_V8_ARTIFACT_SHA,bundle=isHint&&symbol.symbol_id==='legacy-form-field/primary/MatLegacyFormField'?API_HINT_ID_FORM_BUNDLE_SHA:profile.bundle_sha256;
 assert.ok(exactMenuArtifact(context,context.packageRoot));
 const file='fesm2022/ngx-compat-material-legacy-'+profile.family+'.mjs',raw=readFileSync(join(context.packageRoot,file));
 assert.equal(hash(raw),bundle);assert.equal(raw.toString(),source);
 assert.equal(Type.name,profile.public_name);assert.equal(parameterType.name,profile.parameter_owner);
 for(const selected of new Set([Type,parameterType])){
  const text=Function.prototype.toString.call(selected);assert.ok(source.includes(text));assert.equal(source.split(text).length,2,'ambiguous loaded constructor source');
 }
 assert.equal(originalParameters.length,profile.original_arity);assert.equal(metadata.length,profile.original_arity+1);assert.equal(compiler.parameters.length,metadata.length);
 assert.equal(compiler.parameter_class_name,profile.parameter_owner);assert.deepEqual(compiler.parameters.at(-1),parameter(profile));
 const reflected=metadata.at(-1);assert.equal(reflected.type,core.Injector);assert.ok(reflected.decorators===undefined||Array.isArray(reflected.decorators)&&reflected.decorators.length===0);
 return {symbol_id:symbol.symbol_id,artifact_sha256:artifact,bundle_sha256:bundle,parameter:parameter(profile)};
}

export function captureOwnedNodeInjector(proof,captured,core,node){
 const profile=profiles[proof?.symbol_id];assert.ok(profile);
 assert.equal(captured.constructor_calls,1);assert.equal(captured.inputs.length,profile.original_arity+1);
 const input=captured.inputs[profile.original_arity];assert.equal(typeof input?.get,'function');assert.equal(captured.value._injector,input);
 const element=node.element.nativeElement;
 assert.equal(input.get(core.ElementRef).nativeElement,element);assert.equal(node.injector.get(core.ElementRef).nativeElement,element);
 assert.equal(input.get(core.ApplicationRef),node.injector.get(core.ApplicationRef));
 return {input,observation:{...proof,original_arity:profile.original_arity,current_arity:profile.original_arity+1,constructor_calls:1,stored_input_identical:true,node_element_matched:true,application_matched:true}};
}

export function finishOwnedNodeInjector(factory,fixture,core){
 if(!factory.ownedNodeInjectorContext)return;
 const input=factory.ownedNodeInjectorInput,context=factory.ownedNodeInjectorContext;
 assert.equal(input,factory.value._injector);assert.equal(input.get(core.ElementRef).nativeElement,fixture.element.element.nativeElement);
 assert.equal(input.get(core.ApplicationRef),fixture.element.injector.get(core.ApplicationRef));
 assert.equal(input.get(fixture.scopeToken),fixture.childValue);assert.equal(fixture.element.injector.get(fixture.scopeToken),fixture.childValue);
 assert.equal(fixture.parentNode.injector.get(fixture.scopeToken),fixture.parentValue);assert.notEqual(fixture.childValue,fixture.parentValue);
 context.child_scope_matched=true;context.parent_scope_distinct=true;
}

function expectedContext(symbolId,artifact=API_V8_ARTIFACT_SHA){
 const profile=profiles[symbolId];assert.ok(profile);assert.ok([API_V8_ARTIFACT_SHA,API_HINT_ID_ARTIFACT_SHA].includes(artifact));const bundle=artifact===API_HINT_ID_ARTIFACT_SHA&&symbolId==='legacy-form-field/primary/MatLegacyFormField'?API_HINT_ID_FORM_BUNDLE_SHA:profile.bundle_sha256;
 return {symbol_id:symbolId,artifact_sha256:artifact,bundle_sha256:bundle,parameter:parameter(profile),original_arity:profile.original_arity,current_arity:profile.original_arity+1,constructor_calls:1,stored_input_identical:true,node_element_matched:true,application_matched:true,child_scope_matched:true,parent_scope_distinct:true};
}
export function ownedNodeInjectorObservationProblems(row,{tarball}={}){
 const profile=ownedNodeInjectorProfile(row.symbol);if(!profile)return [];let artifact=API_V8_ARTIFACT_SHA;
 if(tarball){try{const bytes=readFileSync(tarball);artifact=qualifyApiHintIdArchive(bytes)?API_HINT_ID_ARTIFACT_SHA:qualifyOldApiV8Archive(bytes)?API_V8_ARTIFACT_SHA:null;}catch{artifact=null;}}
 if(!artifact)return ['owned trailing Injector artifact evidence incomplete'];
 return row.factory_outcome==='returned'&&row.factory_returned_owned_instance===true&&row.factory_node_kind==='element'
  &&isDeepStrictEqual(row.factory_context_modules,[profile.family+'/primary/'+profile.public_name+'Module'])
  &&row.factory_context==='actual Angular element/template nodes and public application providers with synthetic Renderer2/server DOM and public MockPlatformLocation URL backend; native/browser/AOT/packed/floors separate'
  &&row.symbol.shape&&hash(JSON.stringify(row.symbol.shape))===shapes[row.symbol.symbol_id]&&isDeepStrictEqual(row.factory_owned_node_injector_context,expectedContext(row.symbol.symbol_id,artifact))?[]:['owned trailing Injector source/input/node-scope evidence incomplete'];
}

export function assertOwnedNodeInjectorContext(context,symbolId){
 assert.deepEqual(context,expectedContext(symbolId,context?.artifact_sha256));
}

/** Data view for the unchanged original-parameter motion check. The current
 * compiler vector and its extra dependency remain independently reported. */
export function originalOwnedNodeInjectorCapture(symbolId,context,capture){
 assertOwnedNodeInjectorContext(context,symbolId);
 const profile=profiles[symbolId];assert.equal(capture.constructor_calls,1);
 assert.equal(capture.inputs.length,profile.original_arity+1);
 return {...capture,inputs:capture.inputs.slice(0,profile.original_arity)};
}
