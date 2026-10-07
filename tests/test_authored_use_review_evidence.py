"""Source-review bindings reject status-only, stale and wrong-scope closure."""
import subprocess,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class AuthoredUseReviewEvidenceTests(unittest.TestCase):
    def test_exact_synthetic_binding_and_mutations(self):
        script=r"""
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {authoredUseReviewEvidence} from './scripts/authored-use-inventory.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const row={file:'legacy-example/example.ts',module:'@angular/cdk/example',symbol:'PublicExample',disposition:'closed',status:'reviewed'};
const source=Buffer.from('synthetic candidate fixture, not a shipped import');
const evidence=Buffer.from('synthetic independent source fixture, not actual qualification');
const sourcePath='projects/ngx-material-legacy/'+row.file;
const reviewPath='compatibility/f10/authored-use-reviews/synthetic.json';
const review={...row,conclusion:'stable-public-peer',reviewer:'unit-test fixture',decision:'Synthetic structural fixture validates identity binding only; it makes no real public API or release assurance claim.',candidate_source_sha256:sha(source),independent_evidence:[{path:'reference/synthetic-source.txt',sha256:sha(evidence)}]};
const good={schema_version:1,line:'main',status:'reviewed',reviews:[review]};
function observe(body=good,changeRow={},changeFiles={},line='main'){
 const bytes=Buffer.from(JSON.stringify(body));
 const files={[sourcePath]:source,'reference/synthetic-source.txt':evidence,[reviewPath]:bytes,...changeFiles};
 return authoredUseReviewEvidence({symbol_uses:[{...row,source_review:{path:reviewPath,sha256:sha(bytes)},...changeRow}]},line,p=>files[p],sha);
}
assert.equal(observe().reviewed,1);
assert.equal(observe().insufficient,0);
for(const bad of [
 {...good,line:'21.x'}, {...good,status:'pending'}, {...good,reviews:[]},
 {...good,reviews:[review,review]},
 {...good,reviews:[{...review,symbol:'Other'}]},
 {...good,reviews:[{...review,decision:'closed'}]},
 {...good,reviews:[{...review,reviewer:''}]},
 {...good,reviews:[{...review,conclusion:'security-review'}]},
 {...good,reviews:[{...review,conclusion:'test-only'}]},
 {...good,reviews:[{...review,independent_evidence:[]}]},
 {...good,reviews:[{...review,independent_evidence:[{path:sourcePath,sha256:sha(source)}]}]},
 {...good,reviews:[{...review,independent_evidence:[{path:reviewPath,sha256:sha(evidence)}]}]},
]) assert.equal(observe(bad).insufficient,1);
assert.equal(observe(good,{}, {[sourcePath]:Buffer.from('changed candidate')}).insufficient,1);
assert.equal(observe(good,{}, {'reference/synthetic-source.txt':Buffer.from('changed evidence')}).insufficient,1);
assert.equal(observe(good,{}, {[sourcePath]:null}).insufficient,1);
assert.equal(observe(good,{source_review:null}).insufficient,1);
assert.equal(observe(good,{source_review:{path:reviewPath,sha256:'f'.repeat(64)}}).insufficient,1);
assert.equal(observe(good,{}, {},'21.x').insufficient,1);
assert.equal(observe(good,{source_review:{path:'unregistered/synthetic.json',sha256:'f'.repeat(64)}}).insufficient,1);
"""
        result=subprocess.run(['node','--input-type=module','-e',script],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
