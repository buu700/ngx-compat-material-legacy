/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite source/role qualification only; all runtime validators still require a coordinator. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {CHIP_LIST_SOURCE,readChipListPrior,inspectChipListFocusContract} from './chip-list-focus-contract.mjs';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),printer=ts.createPrinter({removeComments:true});
export const CHIP_AUDIT_PRIOR='compatibility/rc/chip-audit-source-requalification-prior.json.gz';
const pins={main:'235fa9b9c438b3649fbb555238db459897fa05112b4a24ef4d28c297e31d55e3','21.x':'f69ab64e7828a72a1fc8ad1326f67cc1efdd5fa350b9fdac8180bdcd573f825b'};
export function chipAuditSourcePrior(root=rootDefault,readMember=p=>readFileSync(join(root,p))){
 const bytes=readMember(CHIP_AUDIT_PRIOR),value=JSON.parse(gunzipSync(bytes));assert.equal(hash(bytes),pins[value.line],'changed chip source prior');
 assert.equal(hash(value.ledger_text),value.ledger_sha256);
 for(const member of [...value.sources,...value.reviews,...value.authored_stores,...value.authored_reviews,...value.previous_recorded_source_context])assert.equal(hash(member.text),member.sha256);
 return value;
}
function importRoles(text){
 const source=ts.createSourceFile('chip-list.ts',text,ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0);
 const imports=source.statements.filter(ts.isImportDeclaration).filter(n=>n.moduleSpecifier.text.startsWith('@angular/'));
 const print=n=>printer.printNode(ts.EmitHint.Unspecified,n,source).trim(),bindings=[];
 for(const declaration of imports){assert.ok(ts.isNamedImports(declaration.importClause.namedBindings));for(const member of declaration.importClause.namedBindings.elements)bindings.push({module:declaration.moduleSpecifier.text,symbol:(member.propertyName??member.name).text,local:member.name.text,node:member,references:[]});}
 const owned=source.statements.filter(n=>ts.isTypeAliasDeclaration(n)&&n.name.text==='BooleanInput');assert.equal(owned.length,1);
 bindings.push({module:'@angular/cdk/coercion',symbol:'BooleanInput',local:'BooleanInput',node:owned[0],role:'owned-replacement',declaration:print(owned[0]),references:[]});
 const visit=node=>{if(ts.isIdentifier(node))for(const binding of bindings)if(node.text===binding.local&&node!==binding.node.name&&node!==binding.node.propertyName)binding.references.push({parent_kind:ts.SyntaxKind[node.parent.kind],syntax:print(node.parent)});ts.forEachChild(node,visit);};visit(source);
 return {imports:imports.map(print),bindings:bindings.map(({node,...binding})=>binding)};
}
export function inspectChipAuditSourceRoles({root=rootDefault,readSource}={}){
 const read=readSource??(p=>readFileSync(join(root,p),'utf8')),prior=chipAuditSourcePrior(root),focusPrior=readChipListPrior(root);
 const current=read(CHIP_LIST_SOURCE),old=focusPrior.sources.find(m=>m.path===CHIP_LIST_SOURCE).text;
 // No additional production edit is owned by this source qualification task.
 assert.equal(hash(current),prior.sources.find(m=>m.path===CHIP_LIST_SOURCE).sha256,'unreviewed production change');
 const before=importRoles(old),after=importRoles(current);assert.equal(before.bindings.length,27);assert.deepEqual(after,before,'upstream imported symbol roles changed');
 const contract=inspectChipListFocusContract({root,readSource:read});
 return {schema_version:1,line:prior.line,file:'legacy-chips/chip-list.ts',previous_source_sha256:hash(old),candidate_source_sha256:hash(current),tagged_contract:contract.reference,imports:after.imports,roles:after.bindings,unchanged_upstream_bindings:26,all_import_reference_syntax_preserved:true,owned_replacement_roles:1,reviewed_roles:27,required_consumer_HTML_CSS_SCSS_changes:0,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}
const modules=[
 ['artifact-behavior','ARTIFACT_BEHAVIOR_KIND','artifact_behavior','artifactBehaviorRequirements','validateArtifactBehavior'],
 ['historical-behavior','HISTORICAL_BEHAVIOR_KIND','historical_behavior','historicalBehaviorRequirements','validateHistoricalBehavior'],
 ['generated-identity','GENERATED_IDENTITY_KIND','generated_identity_behavior','generatedIdentityRequirements','validateGeneratedIdentity'],
 ['selection','SELECTION_BEHAVIOR_KIND','selection_behavior','selectionBehaviorRequirements','validateSelectionBehavior'],
 ['bidi','BIDI_BEHAVIOR_KIND','bidi_behavior','bidiBehaviorRequirements','validateBidiBehavior'],
 ['progress-csp','PROGRESS_CSP_KIND','progress_csp_behavior','progressCspRequirements','validateProgressCsp'],
 ['form-field-hover','FORM_FIELD_HOVER_KIND','form_field_hover_behavior','formFieldHoverRequirements','validateFormFieldHover'],
 ['tab-completion','TAB_COMPLETION_KIND','tab_completion_behavior','tabCompletionRequirements','validateTabCompletion'],
 ['ripple-replay','RIPPLE_REPLAY_KIND','ripple_replay_behavior','rippleReplayRequirements','validateRippleReplay'],
 ['content-observer','CONTENT_OBSERVER_KIND','content_observer_behavior','contentObserverRequirements','validateContentObserver'],
 ['media-matcher','MEDIA_MATCHER_KIND','media_matcher_behavior','mediaMatcherRequirements','validateMediaMatcher'],
 ['native-date','NATIVE_DATE_KIND','native_date_behavior','nativeDateRequirements','validateNativeDate'],
 ['owned-style','OWNED_STYLE_KIND','owned_style_behavior','ownedStyleRequirements','validateOwnedStyle'],
];
export async function currentChipAuditNativeDefinitions({root=rootDefault,checkNoCoordinator=false}={}){
 const prior=chipAuditSourcePrior(root),entries=JSON.parse(readFileSync(join(root,prior.ledger_path))).entries,rows=[];
 for(const [name,kind,field,requirements,validator]of modules){const api=await import('./upstream-'+name+'-evidence.mjs');
  for(const entry of entries){const definition=api[requirements](entry.sha,prior.line);if(!definition)continue;
   const row={sha:entry.sha,kind:api[kind],field,definition};
   if(checkNoCoordinator){const result=api[validator]({root,entry,proof:entry.individual_proof});assert.deepEqual(result,{ok:false,detail:'missing coordinator run'},entry.sha);row.no_run=result;}
   rows.push(row);
  }
 }
 assert.equal(rows.length,prior.line==='main'?31:30);assert.equal(new Set(rows.map(r=>r.sha)).size,rows.length);
 return rows;
}
