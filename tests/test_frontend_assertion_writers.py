"""Execute both real assertion writers on full synthetic source fixtures."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class FrontendAssertionWriterTests(unittest.TestCase):
    def test_both_writer_paths_and_roster_negatives(self):
        code=r'''
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {writeAssertions as parity,matrixGroups,rewriteCases,sha256} from './scripts/check-frontend-parity.mjs';
import {writeAssertions as schematic} from './scripts/check-packaged-schematic.mjs';
const manifest=JSON.parse(readFileSync('projects/ngx-material-legacy/package.json'));
const line=manifest.version.startsWith('22.')?'main':'21.x',foreign=line==='main'?'21.x':'main';
const groups=matrixGroups();
const fixtures=rewriteCases(JSON.parse(readFileSync('fixtures/migration/cases.json')));
assert.equal(fixtures.length,14);
const temp=mkdtempSync(join(tmpdir(),'frontend-writer-regression-'));
try {
 for(const [group,writer] of [['frontend-parity',parity],['packaged-schematic',schematic]]) {
  const matches=fixtures.map(item=>({case_id:group+'/'+item.id,fixture_case_id:item.id,path:'src/'+item.id+'.fixture',before:item.before,after:item.expected_after,expected_after:item.expected_after,before_sha256:sha256(item.before),after_sha256:sha256(item.expected_after),expected_after_sha256:sha256(item.expected_after),cli_after_sha256:sha256(item.expected_after),schematic_after_sha256:sha256(item.expected_after),outputs_match:true,matches_expected_after:true,rewritten:true}));
  const report={result:'pass',coverage:'slice',line,case_ids:matches.map(m=>m.case_id),matches,g04_claim:'not-passed',g05_claim:'not-passed',schematic_test_runner:false,schematic_host:'ng-generate',transform_import:false,cli_comparison:false,expectation:'expected_after',cli_bin:'package/bin/migrate-legacy.js',not_rostered:{'packaged-schematic':null},disagreements:[],[`cases_by_line_${foreign==='main'?'main':'21x'}`]:Object.fromEntries(Object.keys(groups[foreign]).map(k=>[k,null]))};
  assert.deepEqual(report.case_ids,groups[line][group]);
  const output=join(temp,group);mkdirSync(output);
  const written=writer(output,report);assert.equal(written.length,14);assert.equal(readdirSync(output).length,14);
  for(const filename of written){const body=JSON.parse(readFileSync(join(output,filename)));assert.equal(body.group,group);assert.equal(body.line,line);assert.equal(body.kind,'assertion');assert.equal(body.result,'pass');assert.ok(report.case_ids.includes(body.case_id));}
  const missing=structuredClone(report);missing.case_ids.pop();missing.matches.pop();assert.throws(()=>writer(output,missing),/roster/);
  const foreignReport=structuredClone(report);foreignReport[`cases_by_line_${foreign==='main'?'main':'21x'}`][group]=['copied-proof'];assert.throws(()=>writer(output,foreignReport),/copy/);
 }
} finally {rmSync(temp,{recursive:true,force:true});}
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,text=True,capture_output=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
