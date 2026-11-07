/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {isDeepStrictEqual} from 'node:util';
const finalStates=new Set(['irrelevant','not-applicable','inherited','already-adapted','do-not-adopt','adapt','already-present']);
const unfinished=new Set(['open','pending','unreviewed','incomplete','partial','partially','proposed','proposal',
  'blocked','failed','failing','unconfirmed','awaiting','deferred','unfinished','progress','needs']);
const terminal=new Set(['reviewed','complete','completed','verified','resolved','accepted','approved','pass','passed','qualified']);
const sourcePresenceKinds=new Set(['candidate-source-line-match','candidate-source-equivalent','diff-read']);
// Finite vocabulary; recognition alone never establishes sufficient evidence.
const KNOWN_INDIVIDUAL_PROOF_KINDS = new Set([
  "artifact-required-individual-behavior",
  "browser-required-individual-content-observer",
  "browser-required-individual-form-field-hover",
  "browser-required-individual-media-matcher",
  "browser-required-individual-progress-csp",
  "browser-required-individual-ripple-replay",
  "candidate-source-equivalent",
  "candidate-source-line-match",
  "complete-public-predicate-and-exact-owned-handler-replay",
  "complete-reviewed-helper-hunk-and-tagged-owned-method-replay",
  "complete-syntax-and-documentation-review",
  "complete-upstream-build-only-source-exclusion",
  "diff-read",
  "executed-minimum-public-harness-protocol",
  "historical-required-individual-behavior",
  "individual-chip-lifecycle-source-decision",
  "individual-complete-build-harness-source-applicability",
  "individual-complete-build-source-exclusion",
  "individual-complete-compiler-build-source-applicability",
  "individual-complete-example-docs-source-applicability",
  "individual-complete-explicit-detection-source-applicability",
  "individual-complete-fixture-build-source-applicability",
  "individual-complete-global-zoneless-source-applicability",
  "individual-complete-mixed-cdk-source-applicability",
  "individual-complete-peer-async-source-applicability",
  "individual-complete-spec-source-applicability",
  "individual-complete-strict-tests-source-applicability",
  "individual-complete-theming-source-applicability",
  "individual-complete-tree-source-applicability",
  "individual-complete-zone-moves-source-applicability",
  "individual-contextual-source-review",
  "individual-excluded-upstream-test-setup",
  "individual-frozen-sass-contract",
  "individual-historical-base-token-source-exclusion",
  "individual-historical-button-token-repairs-source-review",
  "individual-historical-button-tokenization-source-review",
  "individual-historical-control-m3-theme-source-review",
  "individual-historical-core-tokenization-source-review",
  "individual-historical-form-field-tokenization-source-review",
  "individual-historical-foundation-m3-theme-source-review",
  "individual-historical-inspection-compatibility-source-review",
  "individual-historical-legacy-removal-source-exclusion",
  "individual-historical-m3-theme-boundary-source-review",
  "individual-historical-modern-control-base-source-exclusion",
  "individual-historical-remaining-unthemable-source-review",
  "individual-historical-sass-api-exclusion",
  "individual-historical-selector-density-source-review",
  "individual-historical-slider-m3-repairs-source-review",
  "individual-historical-surface-m3-theme-source-review",
  "individual-historical-table-local-compilation-source-review",
  "individual-historical-theming-inspection-source-exclusion",
  "individual-historical-token-root-source-exclusion",
  "individual-legacy-sass-default-module-exclusion",
  "individual-legacy-structure-source-review",
  "individual-modern-chip-edit-source-exclusion",
  "individual-modern-chip-input-api-source-decision",
  "individual-modern-chip-modernization-source-decision",
  "individual-modern-chip-source-exclusion",
  "individual-original-map-contract",
  "individual-owned-dialog-title-lifetime",
  "individual-owned-mdc-token-validation",
  "individual-owned-testing-api-exclusion",
  "individual-private-fixture-data-repair",
  "individual-retained-historical-test-scope",
  "individual-source-scope",
  "main-overlay-inherited-native",
  "main-table-inherited-native",
  "native-required-individual-tab-completion",
  "owned-source-and-executed-lifecycle-protocol",
  "packed-required-individual-generated-identity",
  "packed-required-individual-native-date",
  "packed-required-individual-public-typeahead",
  "packed-required-individual-public-bidi",
  "packed-required-individual-public-selection-model",
  "retained-legacy-slider-input-scope",
  "retained-legacy-slider-range-followup",
  "retained-legacy-slider-visual-thumb-exclusion",
  "sass-required-individual-owned-style",
  "whole-hunk-owned-and-package-boundary-review",
  "whole-input-transform-hunk-and-original-native-behavior",
  "whole-patch-source-and-executed-public-classic-control",
  "whole-patch-source-and-original-manual-and-node-constructor",
  "whole-sha-source-and-native-public-peer-probe",
  "whole-sha-unshipped-source-and-package-closure"
])
export function knownIndividualProofKind(kind){return typeof kind==='string'&&KNOWN_INDIVIDUAL_PROOF_KINDS.has(kind);}
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
export function individualReviewScopeOk({entry,proof,body,review,requiresIndividual,claimsBehavior,specialized=false}){
 if(!object(proof)||typeof requiresIndividual!=='boolean'||typeof claimsBehavior!=='boolean'
   ||!reviewMetadataComplete({entry,proof,body,review}))return false;
 if(Object.hasOwn(proof,'proof_kind')&&(typeof proof.proof_kind!=='string'||!KNOWN_INDIVIDUAL_PROOF_KINDS.has(proof.proof_kind)))return false;
 if((requiresIndividual||claimsBehavior)&&(typeof proof.proof_kind!=='string'||!proof.proof_kind.trim()))return false;
 if((requiresIndividual||claimsBehavior)&&sourcePresenceKinds.has(proof.proof_kind))return false;
 if(proof.proof_kind==='individual-contextual-source-review'){
  // A finite schema forbids unvalidated extra and nested source assertions.
  if(Object.keys(proof).some(k=>!['proof_kind','source_conclusion_only','execution_claim','source_members','diff_sha256','review_depth','affected_branches','decision'].includes(k)))return false;
  // Source judgment is not a runtime or inherited-peer execution proof.
  if(entry.final_disposition==='inherited'||proof.source_conclusion_only!==true||proof.execution_claim!=='not-claimed'
    ||review.source_conclusion_only!==true||review.execution_claim!=='not-claimed'
    ||entry.reason!==proof.decision||review.decision!==proof.decision||!isDeepStrictEqual(review.affected_branches,proof.affected_branches)
    ||review.final_disposition!==entry.final_disposition
    ||!Array.isArray(proof.source_members)||!proof.source_members.length
    ||!isDeepStrictEqual(review.source_members,proof.source_members))return false;
 }else if(proof.proof_kind&&!sourcePresenceKinds.has(proof.proof_kind)&&!specialized){
  // Unrecognized assertions are not part of this bounded current-source schema.
  if(Object.keys(proof).some(k=>!['proof_kind','source_conclusion_only','execution_claim','source_evidence','source_evidence_scope','diff_sha256','review_depth','affected_branches','decision'].includes(k)))return false;
  // A vocabulary label is never evidence by itself: the per-SHA review must
  // independently bind the complete proof and its physical source references.
  if(entry.reason!==proof.decision||review.decision!==proof.decision||!isDeepStrictEqual(review.affected_branches,proof.affected_branches)||review.final_disposition!==entry.final_disposition||proof.source_conclusion_only!==true||proof.execution_claim!=='not-claimed'||!Array.isArray(proof.source_evidence)||!proof.source_evidence.length
    ||!isDeepStrictEqual(review.individual_proof,proof))return false;
 }
 return true;
}
