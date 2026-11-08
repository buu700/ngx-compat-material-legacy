/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),hash=b=>createHash('sha256').update(b).digest('hex');
const {autocompleteSelectionSpecSubject:make,AUTOCOMPLETE_SELECTION_SPEC:spec}=await import(pathToFileURL(root+'/scripts/autocomplete-selection-spec-subject.mjs'));
const original=make({root,line:'main'}),targets=[...new Set(original.bound.map(r=>r.path))];
assert.equal(original.after.sha256,'2610d311569c9a6fdb063dc0652b423414622cf1370b2434f13ba86070293236');
assert.equal(original.current_after.sha256,'b831b4d3ac6f17f0a9de9d0cd5594f6154ab5fe2b479e9a3b5289dbc1aeed1b6');
assert.equal(hash(original.current_source),original.current_after.sha256);
assert.ok(original.current_source.equals(readFileSync(root+'/'+spec)));
for(const target of targets){
 let bad=false;const read=path=>{const raw=readFileSync(root+'/'+path);return bad&&path===target?Buffer.concat([raw,Buffer.from(' ')]):raw;};
 const live=make({root,read,line:'main'});bad=true;
 assert.throws(()=>live.assertCurrent(),undefined,'late '+target);
 assert.throws(()=>make({root,read,line:'main'}),undefined,'cold '+target);
 bad=false;live.assertCurrent();
}
assert.throws(()=>make({root,line:'main',read:path=>path===spec?Buffer.from(original.original_source):readFileSync(root+'/'+path)}));
original.bound.length=0;original.current_after.sha256='0'.repeat(64);original.current_source.fill(0);original.after.sha256='0'.repeat(64);
original.assertCurrent();
console.log(JSON.stringify({result:'pass',scope:'current spec source only; enclosing reader and native execution unqualified',targets:targets.length,cold_rejections:targets.length,late_rejections:targets.length,recovery:targets.length,historical_source_substitution_rejected:true,public_metadata_isolated:true}));
