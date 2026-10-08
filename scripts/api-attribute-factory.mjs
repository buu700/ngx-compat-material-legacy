/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {compilerConstructorContract} from './api-compiler-constructor-contract.mjs';
import {captureFactoryConstructorInputs} from './api-factory-constructor-inputs.mjs';

const flags=['optional','self','skipSelf','host'];

/** Candidate compiler observations must agree with original expectations and actual token objects. */
export async function attributeFactoryContract(Type,core,source,originalParameters,matchToken){
 const compiler=compilerConstructorContract(source,Type.name);
 if(!Object.hasOwn(Type,'ctorParameters')||typeof Type.ctorParameters!=='function')
  throw Error('explicit owned constructor reflection metadata required');
 const metadata=Type.ctorParameters();
 if(!Array.isArray(metadata)||metadata.length!==originalParameters.length||compiler.parameters.length!==metadata.length)
  throw Error('original/compiler/runtime constructor parameter counts differ');
 const parameters=[];
 for(let index=0;index<metadata.length;index++){
  const reflected=metadata[index],original=originalParameters[index],declared=compiler.parameters[index];
  let token=reflected.type,attribute=null;
  const options=Object.fromEntries(flags.map(flag=>[flag,false])),seen=new Set();
  for(const decorator of reflected.decorators||[]){
   const kind=['Inject','Attribute','Optional','Self','SkipSelf','Host'].find(name=>decorator.type===core[name]);
   if(!kind||seen.has(kind))throw Error('unknown/duplicate runtime constructor decorator');
   seen.add(kind);
   if(kind==='Inject'||kind==='Attribute'){
    if(!Array.isArray(decorator.args)||decorator.args.length!==1)throw Error('runtime decorator argument count differs');
    if(kind==='Inject')token=decorator.args[0];
    else{if(typeof decorator.args[0]!=='string')throw Error('runtime attribute name is not literal');attribute=decorator.args[0];}
   }else{
    if(decorator.args!==undefined)throw Error('runtime flag decorator has arguments');
    options[{Optional:'optional',Self:'self',SkipSelf:'skipSelf',Host:'host'}[kind]]=true;
   }
  }
  if(attribute!==declared.attribute||attribute!==(original.attribute??null))throw Error('original/compiler/runtime attribute names differ');
  for(const flag of flags)if(options[flag]!==Boolean(declared[flag])||options[flag]!==Boolean(original[flag]))
   throw Error('original/compiler/runtime '+flag+' differs at parameter '+index);
  if(attribute===null&&!(await matchToken(original,token)))throw Error('actual constructor token identity differs at parameter '+index);
  parameters.push({index,token,attribute,...options});
 }
 return {compiler,parameters};
}

/** Run unchanged factory in an active public node; capture inputs through its compiler type override. */
export function executeAttributeFactory(Type,core,contract,node,runFactory,attributes={}){
 let entered=false;
 const factory=runFactory(()=>captureFactoryConstructorInputs(Type,Type.ɵfac,
  {beforeConstructor(){entered=true;}}),core.Injector,core.runInInjectionContext,{injector:node.injector,
   onRequest:request=>{request.constructor_phase=entered?'body':'parameters';}});
 if(factory.outcome!=='returned')return {...factory,constructorEvidence:[],detectors:[]};
 const captured=factory.value;
 if(captured.inputs.length!==contract.parameters.length)throw Error('actual constructor input count differs');
 // Directive factories resolve parameters through the active node, outside the
 // tracing Injector. A pre-constructor traced request is unsupported; do not
 // silently discard it or infer identity from a name/count list.
 if(factory.requests.some(request=>request.constructor_phase==='parameters'))
  throw Error('unexpected traced pre-constructor request in attribute factory');
 const requests=[],constructorEvidence=[],detectors=[];
 for(const parameter of contract.parameters){
  const input=captured.inputs[parameter.index];
  if(parameter.attribute!==null){
   const expected=Object.hasOwn(attributes,parameter.attribute)?attributes[parameter.attribute]:null;
   if(input!==expected)throw Error('actual attribute input differs at parameter '+parameter.index);
   constructorEvidence.push({index:parameter.index,attribute:parameter.attribute,value:input,input_verified:true});
   continue;
  }
  let same;
  if(parameter.token===core.ElementRef){
   same=input instanceof core.ElementRef&&input.nativeElement===node.element.nativeElement;
  }else if(parameter.token===core.ChangeDetectorRef){
   // Fresh ViewRef wrappers do not have object equality. Their concrete public
   // view and scope are challenged after owned teardown, before fixture cleanup.
   same=typeof input?.destroy==='function'&&input.destroyed===false;
   if(same)detectors.push(input);
  }else{
   same=input===node.injector.get(parameter.token,undefined,Object.fromEntries(flags.map(flag=>[flag,parameter[flag]])));
  }
  if(!same)throw Error('actual constructor provider value differs at parameter '+parameter.index);
  requests.push({token:parameter.token,label:typeof parameter.token==='function'?parameter.token.name:String(parameter.token).replace(/^InjectionToken /,''),
   ...Object.fromEntries(flags.map(flag=>[flag,parameter[flag]])),evidence:'actual compiler metadata token identity and captured constructor input'});
  constructorEvidence.push({index:parameter.index,attribute:null,input_verified:true,
   scope_challenge:parameter.token===core.ChangeDetectorRef?'pending-public-view-destruction':null});
 }
 return {...factory,value:captured.value,requests:[...requests,...factory.requests],constructorEvidence,detectors,
  compilerObservation:contract.compiler};
}

/** Only after checking that the owned instance left borrowed nodes alive. */
export function challengeAttributeDetectorScopes(factory,fixture){
 if(!factory.detectors?.length)return;
 if(factory.detectors.length!==1)throw Error('multiple detector scope challenges remain unsupported');
 factory.detectors[0].destroy();
 if(!fixture.element.destroyed||!fixture.template.destroyed)
  throw Error('captured ChangeDetectorRef belongs to a different view');
 for(const observation of factory.constructorEvidence)if(observation.scope_challenge)
  observation.scope_challenge='public-view-destruction-verified';
}

/** Serialized execution evidence is required by settlement, as well as producer success. */
export function attributeConstructorObservationProblems(row){
 const parameters=row.symbol.shape.originalFactoryContext?.factory_parameters||row.symbol.shape.diParams||[];
 if(!parameters.some(p=>p.attribute))return [];
 const evidence=row.factory_constructor_evidence,compiler=row.factory_compiler_observation;
 if(!Array.isArray(evidence)||evidence.length!==parameters.length||!compiler
  ||!Array.isArray(compiler.parameters)||compiler.parameters.length!==parameters.length)
  return ['attribute constructor execution/correlation evidence incomplete'];
 const problems=[];
 for(let index=0;index<parameters.length;index++){
  const original=parameters[index],observed=evidence[index],declared=compiler.parameters[index];
  if(observed.index!==index||declared.index!==index||observed.input_verified!==true
   ||observed.attribute!==(original.attribute??null)||declared.attribute!==(original.attribute??null))
   problems.push('attribute constructor parameter evidence differs at '+index);
  for(const flag of flags)if(Boolean(declared[flag])!==Boolean(original[flag]))
   problems.push('attribute compiler flag evidence differs at '+index);
  if(original.attribute&&observed.value!==null)
   problems.push('canonical absent attribute input evidence differs at '+index);
  if(original.spec==='@angular/core'&&original.imported==='ChangeDetectorRef'
   &&observed.scope_challenge!=='public-view-destruction-verified')
   problems.push('attribute detector scope evidence incomplete at '+index);
 }
 return problems;
}
