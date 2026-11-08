/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact later spec images; the earlier additive packet remains historical. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
const SELF='scripts/autocomplete-current-spec-source-successor.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const PACKET={path:'compatibility/rc/main-autocomplete-current-spec-source-successor-v1.json',sha256:'507db85b892cb051ebbaee3214a48b275bae5be1a03234f53692966f47b1607d',bytes:4231};
const path='projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts',hash=b=>createHash('sha256').update(b).digest('hex');
const commits=['a712a8abc59fce79f5fc935fff98bf0b04d0cbfc','b6ef5d7d94a7a7a2b3d65beb8115ffd2e1223e5c','45bbb3016f631296c08cf0eaa5f54a0e61455cf1','c051c2d66d97969d9ecd31e01c4103a10e1f4bb3'];
export function autocompleteCurrentSpecSourceSuccessor({root,read,line}){
 assert.equal(line,'main');assert.equal(typeof read,'function');
 const physical=p=>readEvidenceMember(root,p),env={PATH:process.env.PATH,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};
 const git=args=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,maxBuffer:1024*1024});
 const check=(bytes,ref)=>{assert.equal(hash(bytes),ref.sha256);assert.equal(bytes.length,ref.bytes);};
 assert.ok(physical(SELF).equals(image));const packetRaw=physical(PACKET.path);check(packetRaw,PACKET);const packet=JSON.parse(packetRaw);
 assert.equal(packet.schema_version,1);assert.equal(packet.role,'main-autocomplete-current-spec-source-successor');assert.equal(packet.line,line);assert.equal(packet.path,path);assert.equal(packet.base_head,'a796c018da3023e916b37088917f6adca56fbc9d');
 assert.equal(packet.historical_packet_rewritten,false);assert.equal(packet.historical_programs_executed,false);assert.equal(packet.actual_native_or_packed_execution_qualified,false);assert.equal(packet.g11_claim,'not-passed');
 assert.deepEqual(packet.steps.map(s=>s.commit),commits);git(['merge-base','--is-ancestor',packet.base_head,'HEAD']);
 let expected=packet.before,prior=null;
 assert.deepEqual(expected,{path,sha256:'2610d311569c9a6fdb063dc0652b423414622cf1370b2434f13ba86070293236',bytes:152212});
 for(const step of packet.steps){
  assert.equal(git(['rev-list','--parents','-n','1',step.commit]).toString().trim(),step.commit+' '+step.parent);
  git(['merge-base','--is-ancestor',step.commit,packet.base_head]);
  assert.deepEqual(step.before,expected);assert.equal(step.before.path,path);assert.equal(step.after.path,path);
  const before=git(['show',step.parent+':'+path]),after=git(['show',step.commit+':'+path]);check(before,step.before);check(after,step.after);if(prior)assert.ok(prior.equals(before));
  assert.equal(hash(git(['diff','--full-index','--no-ext-diff','--no-textconv',step.parent,step.commit,'--',path])),step.patch_sha256);
  expected=step.after;prior=after;
 }
 assert.deepEqual(expected,packet.after);assert.equal(expected.sha256,'b831b4d3ac6f17f0a9de9d0cd5594f6154ab5fe2b479e9a3b5289dbc1aeed1b6');assert.ok(physical(path).equals(prior));
 const bound=[{path:SELF,sha256:hash(image),bytes:image.length},{...PACKET},{...expected}];
 const assertCurrent=()=>{assert.ok(physical(SELF).equals(image));for(const ref of bound){const before=physical(ref.path),provided=read(ref.path);assert.ok(Buffer.isBuffer(provided)&&before.equals(provided),'nonphysical current autocomplete source');check(before,ref);assert.ok(before.equals(physical(ref.path)));}assert.ok(physical(SELF).equals(image));};
 assertCurrent();return {before:{...packet.before},after:{...expected},bound:structuredClone(bound),assertCurrent};
}
