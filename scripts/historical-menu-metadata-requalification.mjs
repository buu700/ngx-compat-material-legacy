/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Read-only, finite requalification of four menu-dependent public import groups. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewClassDecoratorUses} from './class-decorator-use-review.mjs';
import {reviewAnimationTokenUses} from './animation-token-use-review.mjs';
import {reviewAttributeDecoratorUses} from './attribute-decorator-use-review.mjs';
import {inspectKeyManagerCallers} from './key-manager-caller-review.mjs';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const METADATA_INPUTS='compatibility/rc/historical-menu-metadata-requalification-inputs.json';
const inputSha='bfcd78a74e342b3fba21ae07db148ac44e6839903e290cd055659bd6a397eaa9';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const groups=[['class-decorator','public-class-decorator-boundary','class-decorator-minimum-source-diagnostic'],
 ['animation-token','public-animation-mode-token-boundary','animation-token-minimum-source-diagnostic'],
 ['attribute','public-attribute-decorator-boundary','attribute-decorator-minimum-source-diagnostic'],
 ['key-manager','public-key-manager-caller-boundaries','key-manager-caller-diagnostic']];
const key=r=>[r.file,r.module,r.symbol].join('\0');
const index=rows=>{const m=new Map(rows.map(r=>[key(r),r]));assert.equal(m.size,rows.length);return m;};
// These are observation identities, not type/call/options/metadata contracts.
const omitted=new Set(['line','candidate_source_sha256','source_sha256','sha256','emit_sha256']);
function shape(v){if(Array.isArray(v))return v.map(shape);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([k])=>!omitted.has(k)).map(([k,x])=>[k,shape(x)]));return v;}
export async function inspectHistoricalMenuMetadataRequalification({root=rootDefault,readMember}={}){
 const read=p=>readMember?readMember(p):readFileSync(resolve(root,p));const bytes=read(METADATA_INPUTS);assert.equal(hash(bytes),inputSha,'metadata inputs changed');
 const inputs=JSON.parse(bytes),manifest=JSON.parse(read('projects/ngx-material-legacy/package.json')),line=manifest.version.startsWith('21.')?'21.x':'main';
 const docs=new Map();for(const[p,sha]of Object.entries(inputs.lines[line].members)){const b=read(p);assert.equal(hash(b),sha,'metadata evidence changed: '+p);docs.set(p,JSON.parse(b));}
 const source=p=>read(p).toString('utf8');
 const fresh={
  'class-decorator':await reviewClassDecoratorUses({root,skipDiagnostics:true,readSource:source}),
  'animation-token':await reviewAnimationTokenUses({root,skipDiagnostics:true,readSource:source}),
  'attribute':await reviewAttributeDecoratorUses({root,skipDiagnostics:true,readSource:source}),
  'key-manager':{cases:inspectKeyManagerCallers({root,readSource:source})},
 };
 const results=[];
 for(const[kind,name,diag]of groups){const before=docs.get('compatibility/rc/'+diag+'.json'),after=docs.get('compatibility/rc/historical-menu-'+kind+'-requalification-diagnostic.json');
  const prior=docs.get('compatibility/f10/authored-use-reviews/'+name+'.json');assert.equal(prior.line,line);assert.equal(after.line,line);
  const old=index(before.cases),now=index(after.cases),actual=index(fresh[kind].cases);assert.deepEqual([...actual.keys()].sort(),[...now.keys()].sort());
  for(const[id,r]of now){assert.deepEqual(actual.get(id),r,'fresh metadata source differs: '+id);assert.equal(hash(read('projects/ngx-material-legacy/'+r.file)),r.candidate_source_sha256);}
  assert.deepEqual([...old.keys()].filter(id=>!now.has(id)),[],'prior import lost');
  const added=[...now.values()].filter(r=>!old.has(key(r)));assert.deepEqual(added.map(r=>r.file),kind==='class-decorator'?['legacy-menu/internal/menu-item-base.ts']:[]);
  const changed=[];for(const[id,r]of old){if(JSON.stringify(shape(r))!==JSON.stringify(shape(now.get(id))))changed.push(id);}
  assert.deepEqual(changed,kind==='class-decorator'?['legacy-menu/menu-item.ts\0@angular/core\0Component']:[],'unreviewed role change');
  const changedSources=prior.reviews.filter(r=>now.get(key(r))?.candidate_source_sha256!==r.candidate_source_sha256).map(r=>[r.file,r.symbol]).sort();
  assert.deepEqual(changedSources,kind==='class-decorator'?[
    ['legacy-menu/internal/menu-base.ts','Component'],['legacy-menu/internal/menu-base.ts','Directive'],
    ['legacy-menu/internal/menu-trigger-base.ts','Directive'],['legacy-menu/menu-item.ts','Component']]
   :kind==='key-manager'?[['legacy-menu/internal/menu-base.ts','FocusKeyManager']]:[]);
  results.push({group:kind,prior_review_path:'compatibility/f10/authored-use-reviews/'+name+'.json',prior_review_sha256:inputs.lines[line].members['compatibility/f10/authored-use-reviews/'+name+'.json'],
   old_cases:old.size,current_cases:now.size,unchanged_role_shapes:old.size-changed.length,
   individually_reviewed_changed_sources:changedSources,changed_roles:changed,added_cases:added,current_cases_for_review:[...now.values()]});
 }
 const cls=docs.get('compatibility/rc/historical-menu-class-decorator-requalification-diagnostic.json');assert.equal(cls.current_uses,148);
 assert.equal(cls.mutations.length,17);for(const r of cls.authored_metadata){assert.equal(r.metadata_constructor_count,183);assert.equal(r.constructors.length,183);}
 const leaf=cls.cases.find(r=>r.file==='legacy-menu/menu-item.ts'&&r.symbol==='Component').references[0];
 assert.deepEqual(leaf.fields,['standalone','selector','exportAs','inputs','host','changeDetection','encapsulation','templateUrl','providers']);
 assert.equal(leaf.target_class,'MatLegacyMenuItem');assert.equal(leaf.standalone,false);
 const base=cls.cases.find(r=>r.file==='legacy-menu/internal/menu-item-base.ts').references[0];assert.equal(base.expression,'Directive({standalone: false})');assert.equal(base.historical_base_directive,true);
 const runtime=docs.get('compatibility/rc/owned-menu-item-runtime-diagnostic.json');
 assert.equal(runtime.sources.base,hash(read('projects/ngx-material-legacy/legacy-menu/internal/menu-item-base.ts')));
 assert.equal(runtime.sources.leaf,hash(read('projects/ngx-material-legacy/legacy-menu/menu-item.ts')));
 assert.equal(docs.get('compatibility/rc/owned-menu-item-implementation-decision.json').authority.kind,'explicit-owner-approved-historical-implementation');
 assert.equal(docs.get('compatibility/rc/owned-menu-item-minimum-api-diagnostic.json').actual_JIT_factory_subjects,4);
 const animation=docs.get('compatibility/rc/historical-menu-animation-token-requalification-diagnostic.json');assert.equal(animation.mutations.length,15);assert.equal(animation.production.subjects.length,3);
 assert.equal(docs.get('compatibility/rc/historical-menu-attribute-requalification-diagnostic.json').mutations.length,14);
 assert.equal(docs.get('compatibility/rc/historical-menu-key-manager-requalification-diagnostic.json').mutation_rejections.length,15);
 return {schema_version:1,line,groups:results,input_capsule_sha256:inputSha,
  changed_metadata_decision:'The explicitly approved historical item has an internal nonstandalone Directive and restores disabled/ripple inputs plus inherited click/hover handlers on the legacy leaf; its provider binds the owned base while retaining the public peer token. Actual metadata constructors replay these fields. Factory/manual behavior is separately authenticated; native query/provider/rendering qualification remains open.',
  key_manager_decision:'The menu QueryList item type now denotes the owned historical item. The exact constructor/configuration expression and public member uses remain unchanged, match the tagged reference and execute against authentic public namespaces with item/context protocols; native full menu keyboard/focus remains separate.',
  limits:'Finite public imported metadata/token/annotation/key-manager boundaries only. No native complete components, current-parent subtype, node/application/query/provider/compiler/resource/render/motion/AOT/packed/full-floor/upstream/G11 assurance.',g11_claim:'not-passed'};
}
