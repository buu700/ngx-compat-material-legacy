/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Original-object and patch-corruption controls, without upstream execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {authenticateLegacyRemovalOriginals,inspectLegacyRemovalOriginals} from '../scripts/upstream-legacy-removal-source.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),disk=path=>readFileSync(join(root,path)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const prefix='compatibility/rc/21x-legacy-removal-source-',before=disk('compatibility/f10/disposition-ledger/ledger.json');
const data=JSON.parse(gunzipSync(disk(prefix+'originals.json.gz'))),census=JSON.parse(gunzipSync(disk('compatibility/rc/upstream-complete-patch-census.json.gz')));
let tamper=null;const read=path=>{const raw=disk(path);return path===tamper?Buffer.concat([raw,Buffer.from(' ')]):raw;};
const subject=inspectLegacyRemovalOriginals({root,read});let cold=0,late=0,semantic=0;
for(const ref of subject.bound){tamper=ref.path;assert.throws(()=>subject.assertCurrent());late++;tamper=null;}
for(const ref of subject.bound){tamper=ref.path;assert.throws(()=>inspectLegacyRemovalOriginals({root,read}));cold++;tamper=null;}
function bad(mutator){const value={...data};mutator(value);assert.throws(()=>authenticateLegacyRemovalOriginals(value,census));semantic++;}
bad(value=>value.sections=value.sections.slice(1));
bad(value=>{value.sections=value.sections.slice();value.sections[0]={...value.sections[0],status:'D'};});
bad(value=>{value.original_commit={...value.original_commit,raw_commit:value.original_commit.raw_commit+' '};});
bad(value=>{value.parent_commit={...value.parent_commit,raw_commit:value.parent_commit.raw_commit+' '};});
bad(value=>{value.tagged_reference={...value.tagged_reference,commit:{...value.tagged_reference.commit,sha:'0'.repeat(40)}};});
bad(value=>value.tree_objects=value.tree_objects.slice(1));
bad(value=>{value.tree_objects=value.tree_objects.slice();const old=value.tree_objects[0],raw=Buffer.from(old.raw_base64,'base64');raw[0]^=1;value.tree_objects[0]={...old,raw_base64:raw.toString('base64'),sha256:hash(raw)};});
bad(value=>{value.sections=value.sections.slice();const row=structuredClone(value.sections[0]);row.before.body+=' ';row.before.bytes++;row.before.sha256=hash(row.before.body);value.sections[0]=row;});
bad(value=>{value.sections=value.sections.slice();const index=value.sections.findIndex(row=>row.status==='M'&&row.hunks.length);const row=structuredClone(value.sections[index]);row.hunks.pop();value.sections[index]=row;});
bad(value=>{value.tagged_reference={...value.tagged_reference,members:value.tagged_reference.members.slice(1)};});
bad(value=>{value.sections=value.sections.slice();const index=value.sections.findIndex(row=>row.empty_text_deletion);const row=structuredClone(value.sections[index]);row.before.absent=true;value.sections[index]=row;});
bad(value=>{value.sections=value.sections.slice();const index=value.sections.findIndex(row=>row.binary_literal_reconstruction);const row=structuredClone(value.sections[index]);const raw=Buffer.from(row.before.body,'base64');raw[100]^=1;row.before.body=raw.toString('base64');row.before.sha256=hash(raw);value.sections[index]=row;});
bad(value=>{value.capture_policy={...value.capture_policy,upstream_code_executed:true};});
bad(value=>value.actual_native_packed_browser_floor_or_full_audit_qualified=true);
bad(value=>value.canonical_decisions_changed=1);
// Recompute all self-declared diff hashes so this failure depends on replay,
// rather than a checksum mismatch. The original tree/blob boundary stays fixed.
bad(value=>{
 value.sections=value.sections.slice();const index=value.sections.findIndex(row=>row.status==='M'&&row.hunks.some(h=>h.text.includes('\n+'))),row=structuredClone(value.sections[index]);
 const h=row.hunks.find(h=>h.text.includes('\n+')),start=h.text.indexOf('\n+');h.text=h.text.slice(0,start+2)+'ALTERED'+h.text.slice(start+2);h.sha256=hash(h.text);
 row.patch=row.patch.split(/(?=^@@ )/m)[0]+row.hunks.map(h=>h.text).join('');row.patch_sha256=hash(row.patch);value.sections[index]=row;value.diff=value.sections.map(row=>row.patch).join('');value.diff_sha256=hash(value.diff);
});
subject.assertCurrent();subject.bound.length=0;subject.facts.complete_original_files=13;subject.assertCurrent();assert.ok(disk('compatibility/f10/disposition-ledger/ledger.json').equals(before));
const report={...inspectLegacyRemovalOriginals({root}).facts,result:'pass',cold_source_faults_rejected:cold,late_source_faults_rejected:late,semantic_object_tree_scope_and_hunk_mutants_rejected:semantic,canonical_ledger_unchanged:true,source_qualification_is_acquisition_only:true,analysis_node:process.version};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
