/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {RULES_JS_BUILD_SHAS,RULES_JS_BUILD_REPORT,requiresRulesJsBuild,rulesJsBuildEntryEvidenceOk,
 rulesJsBuildEntrySourceOk,rulesJsBuildOriginalPatch} from '../scripts/upstream-rules-js-build-admission.mjs';
const root=process.cwd(),read=p=>readFileSync(join(root,p)),hash=raw=>createHash('sha256').update(raw).digest('hex');
const body=JSON.parse(read(RULES_JS_BUILD_REPORT)),line=body.line;
const packet=JSON.parse(gunzipSync(read('compatibility/rc/upstream-rules-js-build-ledger-transition.json.gz')));
const entries=packet.entries.map(row=>row.after_entry),cases=[],rejected=[];
for(const entry of entries){
 assert.equal(requiresRulesJsBuild({sha:entry.sha}),true);
 assert.equal(rulesJsBuildEntrySourceOk({root,read,line,entry,body}),true);
 assert.equal(rulesJsBuildEntryEvidenceOk({root,read,line,entry,body}),true);
 assert.equal(hash(rulesJsBuildOriginalPatch(read,entry.sha)),entry.diff_sha256);
 cases.push(entry.sha);
}
assert.deepEqual(cases,RULES_JS_BUILD_SHAS);
const entry=entries[0];
for(const [id,change]of [
 ['wrong-line',e=>e.affected_branches=['wrong']],['wrong-disposition',e=>e.final_disposition='inherited'],
 ['borrowed-peer-floor',e=>e.peer_floor={package:'@angular/cdk'}],['missing-proof',e=>delete e.individual_proof],
 ['altered-decision',e=>e.reason+=' Changed.'],['altered-original-paths',e=>e.files=[]],
 ['wrong-patch',e=>e.diff_sha256='0'.repeat(64)],['changed-source-check',e=>e.source_check.evidence_report_sha256='0'.repeat(64)],
 ['erased-prior-history',e=>e.prior_dispositions=[]],['false-runtime-credit',e=>e.individual_proof.rules_js_build_source_scope.current_native_packed_or_floor_qualified=true],
]){
 const copy=structuredClone(entry);change(copy);assert.equal(rulesJsBuildEntryEvidenceOk({root,read,line,entry:copy,body}),false,id);rejected.push(id);
}
for(const path of [RULES_JS_BUILD_REPORT,'compatibility/rc/upstream-rules-js-build-individual-review.json',
 'compatibility/rc/upstream-rules-js-build-subjects.json.gz','scripts/upstream_rules_js_build_scope.py',
 'scripts/pack-library.mjs','projects/ngx-material-legacy/package.json','projects/ngx-material-legacy/README.md']){
 assert.equal(rulesJsBuildEntryEvidenceOk({root,read:p=>p===path?Buffer.concat([read(p),Buffer.from('\n')]):read(p),line,entry,body}),false,path);rejected.push('changed '+path);
}
assert.equal(rulesJsBuildEntryEvidenceOk({root,read,line:line==='main'?'21.x':'main',entry,body}),false);rejected.push('borrowed-other-line');
const changedBody=structuredClone(body);changedBody.upstream_vendor_security_clearance=true;
assert.equal(rulesJsBuildEntryEvidenceOk({root,read,line,entry,body:changedBody}),false);rejected.push('false-vendor-clearance');
let late=false;const current=p=>late&&p==='scripts/pack-library.mjs'?Buffer.concat([read(p),Buffer.from('\n')]):read(p);
assert.equal(rulesJsBuildEntryEvidenceOk({root,read:current,line,entry,body}),true);late=true;
assert.equal(rulesJsBuildEntryEvidenceOk({root,read:current,line,entry,body}),false);rejected.push('late-current-build-change');
const summary={line,result:'pass',cases,rejected,original_file_occurrences:135,original_hunks:195,
 canonical_applied:hash(read(packet.before.path))===packet.after_sha256,fresh_original_and_current_source_check:true,
 current_native_packed_or_floor_or_G11_qualified:false};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(summary));
