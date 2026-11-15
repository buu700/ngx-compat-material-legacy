/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact binding-role before/after comparisons; not whole component behavior. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {captureA11yPlatformGit} from './a11y-platform-pinned-git-cdee.mjs';
import {inventoryNgZoneUses} from './ng-zone-use-inventory-current-5628.mjs';
import {scanChangeDetectorUses} from './change-detector-current-5628.mjs';
import {elementRefSubjects,reviewElementRefUses} from './element-ref-current-5628.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const inputPath='compatibility/rc/core-three-bindings-2e270-inputs-v1.json',inputPin='df4aefcdccb99e41abe7972e04bfb7f641dc7e9f57672f998110cc72e9010906';
export async function compareCoreThreeBindings(root=process.cwd()){
 const git=captureA11yPlatformGit(root),read=p=>readFileSync(resolve(root,p)),raw=read(inputPath);assert.equal(hash(raw),inputPin);const input=JSON.parse(raw),subjects=await elementRefSubjects(root);const norm=a=>a.map(({line,...r})=>r);
 try {const current={NgZone:inventoryNgZoneUses({root}),ChangeDetectorRef:scanChangeDetectorUses({root}),ElementRef:await reviewElementRefUses({root,subjects,skipDiagnostics:true})},comparisons=[];
 for(const row of input.rows.filter(r=>r.source_transition)){
  const t=row.source_transition,before=git(['show',t.before_commit+':'+t.path]);assert.equal(hash(before),t.before_sha256);assert.equal(hash(read(t.path)),t.after_sha256);const opts={root,readSource:p=>p===t.path?before.toString():read(p).toString()};
  const prior=row.symbol==='NgZone'?inventoryNgZoneUses(opts):row.symbol==='ChangeDetectorRef'?scanChangeDetectorUses(opts):await reviewElementRefUses({...opts,subjects,skipDiagnostics:true});const next=current[row.symbol];
  const a=prior.cases.filter(c=>c.file===row.file),b=next.cases.filter(c=>c.file===row.file);assert.equal(a.length,1);assert.equal(b.length,1);assert.deepEqual(norm(a[0].references),norm(b[0].references),'changed bound references '+row.file+' '+row.symbol);
  let calls=[];if(row.symbol==='NgZone'){const extract=z=>z.accesses.filter(x=>x.file===row.file).map(({member,expression})=>({member,expression}));assert.deepEqual(extract(prior),extract(next),'changed zone member expressions');calls=extract(next);const f=z=>z.forwarding.filter(x=>x.file===row.file).map(({kind,target,argument})=>({kind,target,argument}));assert.deepEqual(f(prior),f(next),'changed zone forwarding');}
  if(row.symbol==='ChangeDetectorRef'){const extract=z=>z.calls.filter(x=>x.file===row.file).map(({method,expression})=>({method,expression}));assert.deepEqual(extract(prior),extract(next),'changed detector call expressions');calls=extract(next);}
  comparisons.push({file:row.file,symbol:row.symbol,prior_sha256:t.before_sha256,current_sha256:t.after_sha256,bound_references:norm(b[0].references),member_expressions:calls,scope:'Selected public binding and expressions only; source and animation behavior may change.'});
 }
 assert.equal(comparisons.length,10);return {schema_version:1,line:'main',inputs:{path:inputPath,sha256:inputPin},producer:{path:'scripts/core-three-binding-comparison-2e270.mjs',sha256:hash(read('scripts/core-three-binding-comparison-2e270.mjs'))},comparisons,source_role_only:true,component_di_native_scheduler_floor_qualified:false,g11_claim:'not-passed'};
 }finally{subjects.dispose();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){assert.equal(process.argv[2],'--write');const out=await compareCoreThreeBindings();writeFileSync('compatibility/rc/core-three-binding-comparison-2e270-v1.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({comparisons:out.comparisons.length,source_role_only:true}));}
