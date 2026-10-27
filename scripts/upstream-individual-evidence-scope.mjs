/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createRequire} from 'node:module';
import {sourceContractDefinitions} from './upstream-source-contract-registry.mjs';
const require=createRequire(import.meta.url);
const registeredShas=new Set();
for(const definition of sourceContractDefinitions){
 if(Object.getPrototypeOf(definition)!==Object.prototype||Object.keys(definition).sort().join(',')!=='module,proof_kind,scope_key,sha'
   ||!/^[0-9a-f]{40}$/.test(definition.sha)||registeredShas.has(definition.sha)
   ||!/^individual-[a-z0-9-]+$/.test(definition.proof_kind)||!/^[_a-z][_a-z0-9]*$/.test(definition.scope_key)
   ||!/^upstream-[a-z0-9-]+-admission\.cjs$/.test(definition.module))throw new Error('Invalid individual source-contract registration');
 registeredShas.add(definition.sha);Object.freeze(definition);
}
Object.freeze(sourceContractDefinitions);
function sourceContract(entry,proof){
 const direct=sourceContractDefinitions.find(definition=>definition.sha===entry?.sha);if(direct)return direct;
 const hinted=sourceContractDefinitions.some(definition=>[proof,entry?.individual_proof].some(value=>value?.proof_kind===definition.proof_kind||value?.[definition.scope_key]!==undefined));
 return hinted?false:null;
}
const finalStates=new Set(['irrelevant','not-applicable','inherited','already-adapted','do-not-adopt','adapt','already-present']);
const unfinished=new Set(['open','pending','unreviewed','incomplete','partial','partially','proposed','proposal',
  'blocked','failed','failing','unconfirmed','awaiting','deferred','unfinished','progress','needs']);
const terminal=new Set(['reviewed','complete','completed','verified','resolved','accepted','approved','pass','passed','qualified']);
const sourcePresenceKinds=new Set(['candidate-source-line-match','candidate-source-equivalent','diff-read']);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const words=value=>value.toLowerCase().trim().split(/[^a-z]+/).filter(Boolean);
function conclusive(value,status){
 if(typeof value!=='string'||!value.trim())return false;
 const tokens=words(value);
 if(tokens.some(word=>unfinished.has(word)))return false;
 if(tokens.some((word,index)=>word==='not'&&terminal.has(tokens[index+1])))return false;
 if(tokens.includes('security')&&tokens.includes('review')&&!tokens.some(word=>terminal.has(word)))return false;
 return !status||finalStates.has(value)||tokens.some(word=>terminal.has(word));
}

/** Completion metadata only: neither a status nor a kind proves execution or authority. */
export function reviewMetadataComplete({entry,body,review,proof}){
 if(!object(entry)||!object(body)||!object(review)||(proof!==undefined&&!object(proof)))return false;
 const contract=sourceContract(entry,proof);if(contract===false)return false;
 if(contract){
  try{if(require('./'+contract.module).metadataOk({entry,body,review,proof})!==true)return false;}catch{return false;}
 }
 for(const node of [entry,body,review,...(proof===undefined?[]:[proof])]){
  for(const field of ['status','final_disposition','disposition']){
   if(Object.hasOwn(node,field)&&!conclusive(node[field],field==='status'))return false;
  }
 }
 return true;
}

/** Scope alignment, in addition to patch/source/branch checks and substantive review. */
export function individualReviewScopeOk({entry,proof,body,review,requiresIndividual,claimsBehavior}){
 if(!object(proof)||typeof requiresIndividual!=='boolean'||typeof claimsBehavior!=='boolean'
   ||!reviewMetadataComplete({entry,proof,body,review}))return false;
 if(Object.hasOwn(proof,'proof_kind')&&(typeof proof.proof_kind!=='string'||!proof.proof_kind.trim()))return false;
 if(claimsBehavior&&(typeof proof.proof_kind!=='string'||!proof.proof_kind.trim()))return false;
 if((requiresIndividual||claimsBehavior)&&sourcePresenceKinds.has(proof.proof_kind))return false;
 const contract=sourceContract(entry,proof);if(contract===false)return false;
 if(contract){
  try{return require('./'+contract.module).sourceOk({entry,body,review,proof})===true;}catch{return false;}
 }
 return true;
}
