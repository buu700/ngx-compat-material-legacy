/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dialogFocusFiniteSourceSuccessor} from '../scripts/dialog-focus-finite-source-successor.mjs';
import {currentAuthoredRosterSourceSubject} from '../scripts/current-authored-roster-source.mjs';
const root=process.cwd(),line=JSON.parse(readFileSync(root+'/projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
const read=path=>readFileSync(root+'/'+path);
const focus=dialogFocusFiniteSourceSuccessor({root,line,read});
assert.equal(focus.delta.previous_uses,1966);assert.equal(focus.delta.current_uses,1970);
for(const row of focus.packet.branches[line].transitions){
 const old={path:row.path,sha256:row.before.sha256,bytes:row.before.bytes};
 const now=focus.qualify(old);assert.equal(now.sha256,row.after.sha256);
 assert.deepEqual(focus.historicalReference(now),old);
 assert.deepEqual(focus.qualify(now),now);
 assert.throws(()=>focus.qualify({...old,sha256:'0'.repeat(64)}),/unknown focus predecessor/);
 assert.throws(()=>focus.qualify({...old,bytes:old.bytes+1}),/AssertionError/);
}
assert.throws(()=>dialogFocusFiniteSourceSuccessor({root,line,read:path=>path.endsWith('dialog-focus-authored-use-successor-v5.json')?Buffer.from('wrong'):read(path)}),/nonphysical focus input/);
const roster=currentAuthoredRosterSourceSubject({root});assert.equal(roster.current_graph.files,532);assert.equal(roster.current_graph.uses,1970);assert.equal(roster.current_graph.unreviewed_focus_additions,4);
roster.assertCurrent();
console.log(JSON.stringify({line,source_transitions:2,changed_uses:focus.delta.changed_uses.length,added_uses:focus.delta.added_uses.length,current:roster.current_graph,late_callback_rejected:true,unknown_reference_rejected:true}));
