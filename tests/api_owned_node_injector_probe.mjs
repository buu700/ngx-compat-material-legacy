/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {deriveSurface} from '../scripts/api-surface.mjs';
import {observeRuntimeDi,loadRuntimeModule} from '../scripts/api-di-observe.mjs';
import {settleDi} from '../scripts/api-completeness.mjs';
import {ownedNodeInjectorProfile,qualifyOwnedNodeInjector,originalOwnedNodeInjectorCapture} from '../scripts/api-owned-node-injector-context.mjs';

assert.equal(process.argv.length,6,'usage: node tests/api_owned_node_injector_probe.mjs <package-root> <tarball> <reference-material-root> <report>');
const [packageRoot,tarball,referenceRoot,report]=process.argv.slice(2).map(p=>resolve(p));
const surface=deriveSurface(referenceRoot);
const family=process.env.API_OWNED_NODE_INJECTOR_FAMILY;
assert.ok(family===undefined||['legacy-form-field','legacy-select'].includes(family));
const selected=symbol=>ownedNodeInjectorProfile(symbol)&&(!family||symbol.family===family);
// Keep the complete alias population while executing just these two factories.
const symbols=surface.symbols.map(symbol=>selected(symbol)?symbol:{...symbol,di_id:undefined});
const rows=await observeRuntimeDi(packageRoot,symbols,[],undefined,{packageRoot,tarball,referenceRoot});
assert.equal(rows.length,family?1:2);
const records=JSON.parse(readFileSync('compatibility/rc/api/di-differences.json')).differences||[];
writeFileSync(report,JSON.stringify({role:'Actual current selected-factory observations; mutation controls follow',rows},null,2)+'\n',{flag:'wx'});
let rejected=0,producerRejected=0;
for(const row of rows){
 const settled=settleDi(row,records);assert.equal(settled.result,'pass',JSON.stringify({symbol:row.symbol.symbol_id,problems:settled.problems,error:row.factory_error,stack:row.factory_error_stack}));
 const extra=row.factory_owned_node_injector_context,arity=ownedNodeInjectorProfile(row.symbol).original_arity;
 assert.equal(extra.original_arity,arity);assert.equal(extra.current_arity,arity+1);
 assert.equal(row.runtime_requests.length,arity-(row.symbol.family==='legacy-select'?1:0));
 const core=await import('@angular/core'),loaded=await loadRuntimeModule(packageRoot,row.symbol.family,'primary');
 const Type=loaded[row.symbol.name],parameterType=Type.name===ownedNodeInjectorProfile(row.symbol).parameter_owner?Type:Object.getPrototypeOf(Type);
 const metadata=parameterType.ctorParameters(),compiler=row.factory_compiler_observation;
 const options={symbol:row.symbol,Type,parameterType,core,source:readFileSync(join(packageRoot,'fesm2022/ngx-compat-material-legacy-'+row.symbol.family+'.mjs'),'utf8'),compiler,metadata,originalParameters:row.symbol.shape.originalFactoryContext.factory_parameters,context:{packageRoot,tarball}};
 assert.ok(qualifyOwnedNodeInjector(options));
 const changedMetadata=()=>metadata.map(value=>({...value,...(value.decorators?{decorators:value.decorators.map(decorator=>({...decorator}))}:{})}));
 const wrongToken=changedMetadata();wrongToken.at(-1).type=core.ElementRef;
 const wrongDecorator=changedMetadata();wrongDecorator.at(-1).decorators=[{type:core.Optional}];
 const wrongFlags=structuredClone(compiler);wrongFlags.parameters.at(-1).optional=true;
 const wrongExpression=structuredClone(compiler);wrongExpression.parameters.at(-1).token_expression='@angular/core#ElementRef';
 for(const change of [{metadata:metadata.slice(0,-1)},{metadata:[...metadata,metadata.at(-1)]},{metadata:wrongToken},{metadata:wrongDecorator},{compiler:wrongFlags},{compiler:wrongExpression},{originalParameters:options.originalParameters.slice(0,-1)},{symbol:{...row.symbol,shape:{...row.symbol.shape,forged:true}}}]){
  assert.throws(()=>qualifyOwnedNodeInjector({...options,...change}));producerRejected++;
 }
 const inputs=Array.from({length:arity+1},()=>({})),capture={constructor_calls:1,inputs,value:{}};
 const original=originalOwnedNodeInjectorCapture(row.symbol.symbol_id,extra,capture);
 assert.deepEqual(original.inputs,inputs.slice(0,arity));assert.notEqual(original.inputs,inputs);original.inputs.length=0;assert.equal(inputs.length,arity+1);
 for(const change of [{constructor_calls:2},{inputs:inputs.slice(0,-1)},{inputs:[...inputs,{}]}]){
  assert.throws(()=>originalOwnedNodeInjectorCapture(row.symbol.symbol_id,extra,{...capture,...change}));producerRejected++;
 }
 assert.throws(()=>originalOwnedNodeInjectorCapture(row.symbol.symbol_id,{...extra,child_scope_matched:false},capture));producerRejected++;
 const mutations=[
  ['factory_owned_node_injector_context',null],
  ['factory_owned_node_injector_context.artifact_sha256','0'.repeat(64)],
  ['factory_owned_node_injector_context.bundle_sha256','0'.repeat(64)],
  ['factory_owned_node_injector_context.parameter.index',arity-1],
  ['factory_owned_node_injector_context.parameter.token_expression','@angular/core#ElementRef'],
  ['factory_owned_node_injector_context.parameter.optional',true],
  ['factory_owned_node_injector_context.parameter.self',true],
  ['factory_owned_node_injector_context.parameter.attribute','tabindex'],
  ['factory_owned_node_injector_context.stored_input_identical',false],
  ['factory_owned_node_injector_context.node_element_matched',false],
  ['factory_owned_node_injector_context.application_matched',false],
  ['factory_owned_node_injector_context.child_scope_matched',false],
  ['factory_owned_node_injector_context.parent_scope_distinct',false],
  ['factory_owned_node_injector_context.constructor_calls',2],
  ['factory_owned_node_injector_context.original_arity',arity+1],
  ['factory_constructor_evidence.0.input_verified',false],
  ['factory_constructor_evidence.1.scope_challenge','pending-public-view-destruction'],
  ['factory_compiler_observation.parameters.0.optional',true],
  ['factory_compiler_observation.parameters.'+arity+'.token_expression','@angular/core#ElementRef'],
  ['runtime_requests.0.identity_matched',!row.runtime_requests[0].identity_matched],
  ['runtime_requests.1.identity_matched',false],
  ['runtime_requests.1.observation_evidence','public Injector request trace'],
  ['symbol.shape.originalFactoryContext.factory_parameters.0.ident','Forged'],
  ['factory_outcome','threw'],
  ['factory_returned_owned_instance',false],
  ['factory_node_kind','template'],
  ['factory_context_modules',[]],
  ['factory_context','unverified caller'],
 ];
 if(row.symbol.family==='legacy-select')mutations.push(['factory_constructor_evidence.10.attribute','wrong'],
  ['runtime_requests.0.intentional_token_difference',null],
  ['runtime_requests.0.intentional_token_difference.proof.common','0'.repeat(64)],
  ['runtime_requests.0.intentional_token_difference.proof.bundle_sha256','0'.repeat(64)],
  ['runtime_requests.0.intentional_token_difference.proof.declaration_sha256','0'.repeat(64)],
  ['runtime_requests.0.intentional_token_difference.proof.program_sources',321],
  ['runtime_requests.0.intentional_token_difference.proof.program_closure_sha256','0'.repeat(64)],
  ['runtime_requests.0.intentional_token_difference.historical16_provider_selects_actual',true],
  ['runtime_requests.0.intentional_token_difference.minimum22_provider_selects_actual',true],
  ['runtime_requests.0.intentional_token_difference.node.owned_input_matches_node_provider',false],
  ['runtime_requests.0.intentional_token_difference.node.stored_input_matches',false],
  ['runtime_requests.0.intentional_token_difference.node.owned_metadata_token',false],
  ['runtime_requests.0.intentional_token_difference.node.viewport_index',1],
  ['runtime_requests.0.intentional_token_difference.node.constructor_arity',14]);
 else mutations.push(['factory_owned_motion_context.constructor_animation_mode.original_constructor_arity',8],['factory_owned_motion_context.constructor_animation_mode.original_parameter_index',7]);
 for(const [path,value] of mutations){
  const changed=structuredClone(row),parts=path.split('.'),last=parts.pop(),parent=parts.reduce((object,key)=>object[key],changed);parent[last]=value;
  if(path==='symbol.shape.originalFactoryContext.factory_parameters.0.ident')assert.throws(()=>settleDi(changed,records),/original factory context changed/);
  else assert.notEqual(settleDi(changed,records).result,'pass',row.symbol.symbol_id+': '+path);
  rejected++;
 }
}
console.log(JSON.stringify({result:'pass',factories:rows.length,producer_mutations_rejected:producerRejected,settlement_mutations_rejected:rejected,scope:rows.length+' current owned constructor correlations; full API/coordinator/floors separate'}));
