/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
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
 return true;
}
