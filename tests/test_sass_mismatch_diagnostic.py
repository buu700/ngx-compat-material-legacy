"""Complete CSS diagnostic stream retains every mismatch and its subject."""
import subprocess,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class SassMismatchDiagnosticTests(unittest.TestCase):
    def test_full_round_trip_large_unicode_errors_and_subject_negatives(self):
        code=r"""
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {mixinMismatchArchive,emitMixinMismatchArchive} from './scripts/sass-mismatch-diagnostic.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const failed=Array.from({length:104},(_,i)=>({case_id:'mixin-argument/probe/'+i,mixin:'probe',variant:'custom',argument:'$theme',call:'@include probe($theme)',line:'main',identity:{compiler:'fixture'},result:'fail',expected:{css:'.original {content:"é";}\n'.repeat(200)},actual:{css:'.candidate-'+i+' {color:red;}\n'.repeat(200)},error:null}));
failed.push({case_id:'mixin-argument/probe/error',line:'main',result:'fail',error:'compile refused'});
const results=[...failed,{case_id:'mixin-argument/pass',result:'pass'}];
const tarball='a'.repeat(64),lines=[];
const header=emitMixinMismatchArchive(results,'main',tarball,line=>lines.push(line));
assert.deepEqual(JSON.parse(lines[0].slice('sass-mixin-difference-header '.length)),header);
const chunks=lines.slice(1).map(line=>JSON.parse(line.slice('sass-mixin-difference-chunk '.length)));
assert.equal(chunks.length,header.chunk_count);
assert.ok(chunks.length>1);
chunks.forEach((chunk,index)=>{assert.equal(chunk.index,index);assert.equal(chunk.total,chunks.length);assert.ok(chunk.data.length<=3000);});
const gzip=Buffer.from(chunks.map(chunk=>chunk.data).join(''),'base64');
assert.equal(gzip.length,header.gzip_bytes);assert.equal(sha(gzip),header.gzip_sha256);
const raw=gunzipSync(gzip);assert.equal(raw.length,header.raw_bytes);assert.equal(sha(raw),header.raw_sha256);
const body=JSON.parse(raw);assert.equal(body.scope,'diagnostic-only');assert.equal(body.source_line,'main');assert.equal(body.tarball_sha256,tarball);
assert.equal(body.cases.length,105);assert.equal(header.case_count,105);
failed.slice(0,104).forEach((row,i)=>{assert.deepEqual(body.cases[i].expected,row.expected);assert.deepEqual(body.cases[i].actual,row.actual);assert.equal(body.cases[i].case_id,row.case_id);});
assert.equal(body.cases[104].expected,null);assert.equal(body.cases[104].actual,null);assert.equal(body.cases[104].error,'compile refused');
assert.throws(()=>mixinMismatchArchive([...failed,failed[0]],'main',tarball),/duplicate/);
for(const [line,digest] of [['wrong',tarball],['main','wrong']])assert.throws(()=>mixinMismatchArchive(results,line,digest),/subject/);
assert.throws(()=>mixinMismatchArchive(null,'main',tarball),/subject/);
const mutated=Buffer.from(gzip);mutated[mutated.length-1]^=1;assert.notEqual(sha(mutated),header.gzip_sha256);
assert.throws(()=>gunzipSync(gzip.subarray(0,gzip.length-1)));
assert.throws(()=>mixinMismatchArchive(failed,'21.x',tarball),/Wrong-line/);
"""
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
