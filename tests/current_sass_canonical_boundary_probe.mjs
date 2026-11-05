/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {canonicalSourcePhysicalBoundary,captureCanonicalSourceArguments} from '../scripts/current-sass-canonical-source-boundary.mjs';
const root=process.argv[2],first='compatibility/rc/first.patch',last='scripts/last.mjs';
assert.ok(root.includes('ngx-current-canonical-boundary-'));
const original=readFileSync(join(root,first)),checks=[];
let action=null;const callback=path=>{const raw=readFileSync(join(root,path));if(path===last&&action){const run=action;action=null;run();}return raw;};
const boundary=canonicalSourcePhysicalBoundary({root,read:callback});
boundary.read(first);boundary.read(last);boundary.assertPhysical();checks.push('authentic physical union');
action=()=>writeFileSync(join(root,first),Buffer.concat([original,Buffer.from('changed')]));
try{boundary.read(last);assert.throws(()=>boundary.assertPhysical());checks.push('last callback changes earlier canonical patch');}
finally{writeFileSync(join(root,first),original);}
boundary.assertPhysical();checks.push('exact source restoration');
const wrong=canonicalSourcePhysicalBoundary({root,read:()=>Buffer.from('nonphysical')});assert.throws(()=>wrong.read(first));checks.push('nonphysical callback rejects');
const absent='projects/ngx-material-legacy/styles/core/theming/_inspection.scss';
const absence=canonicalSourcePhysicalBoundary({root,read:callback,absentPaths:[absent]});absence.read(last);absence.assertPhysical();
action=()=>writeFileSync(join(root,absent),'// injected counterpart\n',{flag:'wx'});
try{absence.read(last);assert.throws(()=>absence.assertPhysical());checks.push('last callback introduces inherited absent counterpart');}
finally{unlinkSync(join(root,absent));}
absence.assertPhysical();checks.push('absence restoration');
const originalRead=()=>{},args={family:'inspection',entries:[{sha:'original'}],body:{source_qualification:{path:'original.json'}},root,read:originalRead};
const captured=captureCanonicalSourceArguments(args),entries=args.entries,body=args.body;
assert.notEqual(captured.values.entries,entries);assert.notEqual(captured.values.body,body);
args.body.source_qualification.path='temporary-foreign.json';
assert.equal(captured.values.body.source_qualification.path,'original.json');assert.throws(()=>captured.assertCurrent());
args.body.source_qualification.path='original.json';captured.assertCurrent();checks.push('transient mutation cannot alter isolated judgment references');
args.entries=[];assert.throws(()=>captured.assertCurrent());args.entries=entries;captured.assertCurrent();checks.push('outer entry identity replacement rejects');
args.body={...body};assert.throws(()=>captured.assertCurrent());args.body=body;captured.assertCurrent();checks.push('outer body identity replacement rejects');
args.read=()=>{};assert.throws(()=>captured.assertCurrent());args.read=originalRead;captured.assertCurrent();checks.push('reader identity replacement rejects');
Object.defineProperty(args,'root',{writable:false});assert.throws(()=>captured.assertCurrent());Object.defineProperty(args,'root',{writable:true});captured.assertCurrent();checks.push('descriptor mutation rejects');
let getters=0;assert.throws(()=>captureCanonicalSourceArguments({get body(){getters++;return {};}}));
assert.throws(()=>captureCanonicalSourceArguments({body:{get hidden(){getters++;return true;}}}));
assert.equal(getters,0);checks.push('outer and nested accessors reject without evaluation');
let traps=0;assert.throws(()=>captureCanonicalSourceArguments(new Proxy({},{getPrototypeOf(){traps++;return Object.prototype;}})));
assert.equal(traps,0);checks.push('outer proxy rejects without traps');
boundary.assertPhysical();absence.assertPhysical();captured.assertCurrent();
console.log(JSON.stringify({checks,compiler_calls:0,producer_or_owner_execution:false,artifact_or_audit_admission_granted:false}));
