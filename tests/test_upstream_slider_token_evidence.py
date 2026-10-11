# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""One individual original slider Sass decision must stay source/evidence bound."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SliderTokenEvidenceTests(unittest.TestCase):
    def test_current_receipt_and_recomputed_counterexamples(self):
        code = r'''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {sliderTokenEvidenceOk,SLIDER_TOKEN_SHA} from './scripts/upstream-slider-token-evidence.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(p);
const entry=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json')).entries.find(r=>r.sha===SLIDER_TOKEN_SHA);
const body=JSON.parse(read(entry.evidence_report)),diagnostic='compatibility/rc/slider-token-historical-sass-diagnostic.json.gz';
function observe(changeBody=()=>{},changes={},line=body.line){
 const e=structuredClone(entry),b=structuredClone(body);changeBody(b,e);
 for(const ref of b.evidence)if(Object.hasOwn(changes,ref.path)){ref.sha256=hash(changes[ref.path]);ref.bytes=changes[ref.path].length;}
 const bytes=Buffer.from(JSON.stringify(b,null,2)+'\n');e.source_check.evidence_report_sha256=hash(bytes);
 return sliderTokenEvidenceOk(b,e,p=>p===e.evidence_report?bytes:Object.hasOwn(changes,p)?changes[p]:read(p),line);
}
assert.equal(observe(),true);const rejected=[];
const reject=(id,action)=>{assert.equal(action(),false,id+' escaped');rejected.push(id);};
reject('wrong-line',()=>observe(()=>{},{},body.line==='main'?'21.x':'main'));
reject('changed-patch',()=>observe(()=>{},{[body.patch_file]:Buffer.concat([read(body.patch_file),Buffer.from('\nchanged')])}));
reject('missing-proof',()=>observe((b,e)=>{delete e.individual_proof;}));
reject('changed-commit-object',()=>observe(b=>{b.upstream_commit_object+='\nchanged';b.upstream_commit_object_sha256=hash(b.upstream_commit_object);}));
reject('false-native-disposition',()=>observe((b,e)=>{b.final_disposition=e.final_disposition='inherited';}));
reject('changed-style-source',()=>observe(()=>{},{'projects/ngx-material-legacy/styles/slider/_slider-theme.scss':Buffer.concat([read('projects/ngx-material-legacy/styles/slider/_slider-theme.scss'),Buffer.from('\n.changed-slider {color:red;}')])}));
reject('changed-producer',()=>observe(()=>{},{'scripts/review-upstream-slider-token-sass.mjs':Buffer.from('changed producer')}));
for(const[id,change]of [
 ['empty-css-roster',d=>{d.rows=[];}],
 ['missing-css-case',d=>{d.rows.pop();}],
 ['duplicate-css-case',d=>{d.rows[1]=structuredClone(d.rows[0]);}],
 ['forged-original-and-candidate-css',d=>{for(const role of ['original','actual']){const r=d.rows[0][role];r.css+='\n.wrong {color:red;}';r.css_sha256=hash(r.css);r.css_bytes=Buffer.byteLength(r.css);}}],
 ['source-pool-member-dropped',d=>{const key=d.rows[0].actual.loaded_sources_sha256,ss=d.source_sets[key].slice(1),newKey=hash(JSON.stringify(ss));delete d.source_sets[key];d.source_sets[newKey]=ss;for(const r of d.rows)r.actual.loaded_sources_sha256=newKey;}],
 ['program-identity-changed',d=>{d.rows[0].actual.program_sha256='0'.repeat(64);}],
 ['false-packed-credit',d=>{d.packed_artifact_used=true;}],
 ['false-native-credit',d=>{d.native_execution=true;}],
 ['false-full-inventory-credit',d=>{d.full_651_or_498_executed=true;}],
 ['false-g11-credit',d=>{d.g11_claim='passed';}],
 ['missing-drift-negative',d=>{d.rows[0].wrong_nonempty_css_rejected=false;}],
]){
 const d=JSON.parse(gunzipSync(read(diagnostic)));change(d);const bytes=gzipSync(Buffer.from(JSON.stringify(d,null,2)+'\n'),{mtime:0});
 reject(id,()=>observe(()=>{},{[diagnostic]:bytes}));
}
console.log(JSON.stringify({line:body.line,accepted_current_receipt:true,rejected:rejected.length,source_or_artifact_compile_executed:false}));
'''
        result = subprocess.run(['node', '--max-old-space-size=768', '--input-type=module', '-e', code],
                                cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertTrue(report['accepted_current_receipt'])
        self.assertEqual(report['rejected'], 18)
        self.assertFalse(report['source_or_artifact_compile_executed'])
