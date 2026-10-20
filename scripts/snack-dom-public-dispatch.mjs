/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** A bounded public dispatch repair; never a replacement CDK implementation. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {prepareTabPortalSubjects} from './tab-portal-explicit-container-review.mjs';
const ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex');
export const SNACK_DOM_SOURCE='projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-container-base.ts';
export const SNACK_DOM_PRIOR='compatibility/rc/snack-dom-public-dispatch-prior.json.gz';
const pins={main:'5428cc975dcb20262757897190f4606b6b79fdbf621aa7cee660867015b2c432','21.x':'f001dca2b85961ed7d97e48932c09c66bff8be88c07abedc8e7a86a64cf335eb'},authenticated=new Set();
function original(root,commit,m){assert.equal(hash(m.text),m.sha256);const key=JSON.stringify([root,commit,m.path,m.sha256]);if(authenticated.has(key))return;const raw=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+m.path],{cwd:root,maxBuffer:16*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});assert.equal(hash(raw),m.sha256);authenticated.add(key);}
export function snackDomPrior(root=process.cwd(),read=p=>readFileSync(join(root,p))){const raw=read(SNACK_DOM_PRIOR),line=Object.keys(pins).find(k=>hash(raw)===pins[k]);assert.ok(line,'changed DOM dispatch repair preimages');const data=JSON.parse(gunzipSync(raw));assert.equal(data.line,line);assert.equal(data.selected_closed_source_rows.length,11);assert.equal(data.product_members.length,1142);for(const m of [data.product,data.reference,...data.sources,...data.ledgers,...data.source_reviews,...data.protected])original(root,data.source_parent,m);original(root,data.reference_authority.commit,{...data.reference,path:data.reference_authority.path});return data;}
const oldCall='    const result = this._portalOutlet.attachDomPortal(portal);';
const repairedCall=`    let result: void;
    try {
      result = this._portalOutlet.attach(portal) as void;
    } catch (error) {
      // Generic dispatch records the portal before entering the DOM hook.
      // Keep the historical hook's observable flags when the hook throws.
      const portalAttached = portal.isAttached;
      this._portalOutlet.detach();
      if (portalAttached) {
        portal.setAttachedHost(this._portalOutlet);
      }
      throw error;
    }`;
export function snackDomVariants(before){assert.equal(before.split(oldCall).length,2);return {before,simple:before.replace(oldCall,'    const result = this._portalOutlet.attach(portal) as void;'),repaired:before.replace(oldCall,repairedCall)};}
function baseClass(text){const source=ts.createSourceFile('snack.ts',text,ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0);const classes=source.statements.filter(n=>ts.isClassDeclaration(n)&&n.name?.text==='_MatSnackBarContainerBase');assert.equal(classes.length,1);return {source,node:classes[0]};}
const selected=['attachComponentPortal','attachTemplatePortal','attachDomPortal','_assertNotAttached','_afterPortalAttached','_exposeToModals','_clearFromModals'];
export function snackDomReplaySource(text,name='SnackDomHost'){
 const {source,node}=baseClass(text),members=selected.map(key=>{const found=node.members.filter(m=>m.name?.getText(source)===key);assert.equal(found.length,1);return found[0].getText(source);});
 return `import {BasePortalOutlet,CdkPortalOutlet,ComponentPortal,TemplatePortal,DomPortal} from '@angular/cdk/portal';\nimport {ComponentRef,EmbeddedViewRef,ElementRef} from '@angular/core';\ndeclare const ngDevMode: boolean | undefined;\nexport class ${name} extends BasePortalOutlet {\n_portalOutlet!: CdkPortalOutlet;\n_elementRef!: ElementRef<HTMLElement>;\n_document!: Document;\n_trackedModals=new Set<Element>();\n_liveElementId='snack-dom-live';\nsnackBarConfig: {panelClass?: string|string[]}={};\n${members.join('\n')}\n}\n`;
}
export function reviewSnackDomSource(root=process.cwd(),{read=p=>readFileSync(join(root,p)),allowBefore=false}={}){
 const prior=snackDomPrior(root,read),variants=snackDomVariants(prior.product.text),current=read(SNACK_DOM_SOURCE).toString();assert.ok(current===variants.repaired||(allowBefore&&current===variants.before),'unreviewed snack DOM dispatch edit');
 const old=baseClass(prior.product.text),now=baseClass(current);assert.equal(old.node.members.length,now.node.members.length);let unchanged=0;for(let i=0;i<old.node.members.length;i++){const a=old.node.members[i],b=now.node.members[i];assert.equal(a.name?.getText(old.source),b.name?.getText(now.source));if(a.name?.getText(old.source)!=='attachDomPortal'){assert.equal(a.getText(old.source),b.getText(now.source));unchanged++;}}
 const paths=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','ls-files','projects/ngx-material-legacy'],{cwd:root,encoding:'utf8'}).trim().split('\n');assert.deepEqual(paths,prior.product_members.map(m=>m.path));for(const m of prior.product_members)if(m.path!==SNACK_DOM_SOURCE)assert.equal(hash(read(m.path)),m.sha256,'unrelated product/resource changed '+m.path);
 for(const m of [prior.reference,...prior.sources,...prior.protected])assert.equal(hash(read(m.path)),m.sha256);
 return {line:prior.line,source_parent:prior.source_parent,source:SNACK_DOM_SOURCE,before_sha256:prior.product.sha256,current_sha256:hash(current),repaired_sha256:hash(variants.repaired),only_product_member_changed:'_MatSnackBarContainerBase.attachDomPortal',unchanged_class_members:unchanged,other_product_resource_members_preserved:1141,consumer_HTML_CSS_SCSS_changes:0,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}
export function prepareSnackDomSubjects(root=process.cwd()){snackDomPrior(root);return prepareTabPortalSubjects(root);}
export function compileSnackDomTypes(root,model){
 const prior=snackDomPrior(root),variants=snackDomVariants(prior.product.text),parts=Object.entries(variants).map(([key,text])=>snackDomReplaySource(text,'SnackDom_'+key));
 const imports=parts[0].slice(0,parts[0].indexOf('export class')),sourceText=imports+parts.map(s=>s.slice(s.indexOf('export class'))).join('\n'),file=join(model.root,'snack-dom-types.ts');writeFileSync(file,sourceText);
 const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,strict:true,skipLibCheck:false,noEmit:true,types:[]};const program=ts.createProgram([file],options),diagnostics=ts.getPreEmitDiagnostics(program);assert.equal(diagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>model.root,getNewLine:()=> '\n'}));const checker=program.getTypeChecker(),source=program.getSourceFile(file),results=[];
 for(const cls of source.statements.filter(ts.isClassDeclaration)){
  const property=cls.members.find(m=>m.name?.getText(source)==='attachDomPortal'),signature=checker.getTypeAtLocation(property.name).getCallSignatures()[0];assert.ok(signature);const calls=[],deprecated=[];
  function visit(node){if(ts.isCallExpression(node)||ts.isNewExpression(node)){const sig=checker.getResolvedSignature(node);assert.ok(sig);const declaration=sig.declaration;if(declaration?.getSourceFile().fileName.includes('/node_modules/@angular/')){const symbol=ts.isPropertyAccessExpression(node.expression)?checker.getSymbolAtLocation(node.expression.name):undefined,tags=[...sig.getJsDocTags(),...(symbol?.getJsDocTags(checker)??[])];const row={expression:node.expression.getText(source),declaration_sha256:hash(declaration.getText(declaration.getSourceFile()))};calls.push(row);if(tags.some(t=>['deprecated','breaking-change'].includes(t.name)))deprecated.push(row);}}ts.forEachChild(node,visit);}visit(cls);
  results.push({variant:cls.name.text.replace('SnackDom_',''),callback_signature:checker.signatureToString(signature),parameters:signature.parameters.length,public_calls:calls,unsupported_public_calls:deprecated});
 }
 const before=results.find(r=>r.variant==='before'),simple=results.find(r=>r.variant==='simple'),after=results.find(r=>r.variant==='repaired');assert.equal(before.parameters,1);assert.equal(before.unsupported_public_calls.length,1);assert.equal(simple.unsupported_public_calls.length,0);assert.equal(after.unsupported_public_calls.length,0);assert.equal(after.callback_signature,before.callback_signature);assert.equal(simple.callback_signature,before.callback_signature);
 return {line:model.line,typescript:ts.version,strict:true,skipLibCheck:false,diagnostics:0,callback_API_preserved:true,variants:results,complete_minimum_peer_declarations:model.tab_portal_declarations.members.map(({key,sha256})=>({key,sha256})),actual_consumer_AOT_or_floor_qualified:false};
}
export function writeSnackDomRuntime(root,model){
 const prior=snackDomPrior(root),variants=snackDomVariants(prior.product.text);const sources={reference:prior.reference.text,...variants};
 const mutate=(from,to)=>{const {source,node}=baseClass(variants.repaired),member=node.members.find(m=>m.name?.getText(source)==='attachDomPortal'),text=member.getText(source);assert.equal(text.split(from).length,2);return variants.repaired.slice(0,member.getStart(source))+text.replace(from,to)+variants.repaired.slice(member.end);};
 const faults={no_guard:mutate('this._assertNotAttached();','void 0;'),no_hook:mutate('this._afterPortalAttached();','void 0;'),changed_return:mutate('return result;','return 1 as any;'),no_host_restore:mutate('portal.setAttachedHost(this._portalOutlet);','void 0;')};
 for(const[key,text]of Object.entries(faults)){assert.notEqual(text,variants.repaired);sources[key]=text;}
 for(const[key,text]of Object.entries(sources)){const result=ts.transpileModule(snackDomReplaySource(text),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});assert.equal(result.diagnostics?.length??0,0);writeFileSync(join(model.root,'snack-dom-'+key+'.cjs'),result.outputText);}
 const prelude=readFileSync(join(root,'tests/core_view_use_subject.mjs'),'utf8').split('const run=(id,fn)=>')[0];assert.ok(prelude.includes('function withOwner(fn)'));writeFileSync(join(model.root,'snack-dom-subject.mjs'),prelude+readFileSync(join(root,'tests/snack_dom_public_dispatch_subject.mjs'),'utf8'));
 return {variants:Object.keys(sources),actual_before_source_sha256:prior.product.sha256,repaired_source_sha256:hash(variants.repaired),untouched_reference_sha256:prior.reference.sha256};
}
/** Compare the owned callback contract to the actual reference-peer execution.
 * attachedRef is an unused peer getter, whose empty default is recorded separately.
 * This add-on does not mirror old CDK object defaults into current public peers. */
export function reviewSnackDomCrossPeer(report){
 const owned=rows=>rows.map(({dispatch,...row})=>({...row,steps:row.steps.map(({attached_ref_null,...step})=>step)})),comparisons=[];
 for(const row of report.runtime_subjects){const reference=report.runtime_subjects.find(s=>s.line==='original'&&s.production===row.production);assert.ok(reference);assert.deepEqual(owned(row.observations.repaired),owned(reference.observations.reference),'owned callback contract differs from actual tagged-peer execution');
  const peerDefaults=[];for(let i=0;i<reference.observations.reference.length;i++){const a=reference.observations.reference[i],b=row.observations.repaired[i];for(let j=0;j<a.steps.length;j++)if(a.steps[j].attached_ref_null!==b.steps[j].attached_ref_null)peerDefaults.push({case:a.id,step:a.steps[j].label,reference_attachedRef_is_null:a.steps[j].attached_ref_null,current_peer_attachedRef_is_null:b.steps[j].attached_ref_null});}
  comparisons.push({line:row.line,mode:row.mode,production:row.production,owned_callback_contract_matches_reference:true,peer_empty_attachedRef_observations:peerDefaults});
 }
 return {comparisons,scope:'All recorded return/error,DOM,attachment,hook,panel/modal,application and borrowed-owner observables match the actual tagged-peer execution. The unused CDK attachedRef getter empty default is reported as peer-owned data; the legacy callback does not read or return it. No compatibility mirror or whole CDK API equivalence is claimed.'};
}
