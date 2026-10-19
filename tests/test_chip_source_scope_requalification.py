# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Source bindings move without rewriting original judgments or runtime credit."""
import copy,gzip,hashlib,json,os,subprocess,unittest
from pathlib import Path
from tests.ripple_global_options_integration import historical_protected_bytes, historical_task_diff
ROOT=Path(__file__).resolve().parents[1]
PREFIX='compatibility/rc/chip-source-scope-requalification-'
sha=lambda b:hashlib.sha256(b).hexdigest()
def rows(text):
    dec=json.JSONDecoder();i=text.index('[',text.index('"entries"'))+1;out=[]
    while True:
        while text[i].isspace() or text[i]==',':i+=1
        if text[i]==']':return out
        row,end=dec.raw_decode(text,i);out.append((row,text[i:end]));i=end
class ChipSourceScopeRequalification(unittest.TestCase):
    def test_all_current_guards_unknown_bytes_and_native_requirements(self):
        cmd=['node','tests/chip_source_scope_requalification_probe.mjs']
        if os.environ.get('NGX_SOURCE_SCOPE_DIAGNOSTIC'):cmd.append(os.environ['NGX_SOURCE_SCOPE_DIAGNOSTIC'])
        c=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True,timeout=90)
        self.assertEqual(c.returncode,0,(c.stdout+c.stderr)[-8000:]);r=json.loads(c.stdout)
        self.assertEqual(r['subjects'],87);self.assertEqual(r['rejection_controls'],23)
        self.assertEqual(r['native_profiles_requiring_coordinator'],34 if r['line']=='main' else 33)
        self.assertFalse(r['actual_native_browser_or_floor_execution'])
    def test_exact87_pointer_updates_preserve_originals_and_unrelated_raw_rows(self):
        w=json.loads((ROOT/(PREFIX+'worksheet.json')).read_bytes());ref=w['prior'];packed=(ROOT/ref['path']).read_bytes()
        self.assertEqual(sha(packed),ref['sha256']);raw=gzip.decompress(packed);self.assertEqual(sha(raw),ref['raw_sha256']);p=json.loads(raw)
        selected={f['sha'] for f in p['selected']};old=rows(p['ledger_text']);text=(ROOT/p['ledger_path']).read_text();new=rows(text);restored=text;changed=0
        self.assertEqual(len(new),1697)
        for (a,x),(b,y) in zip(old,new):
            self.assertEqual(a['sha'],b['sha'])
            if a['sha'] in selected:
                expected=copy.deepcopy(a);expected['evidence_report']=b['evidence_report']
                if expected.get('source_check',{}).get('evidence_report_sha256'):
                    expected['source_check']['evidence_report_sha256']=sha((ROOT/b['evidence_report']).read_bytes())
                self.assertEqual(expected,b);changed+=1;restored=restored.replace(y,x,1)
            else:self.assertEqual(x,y)
        self.assertEqual(changed,87);self.assertEqual(restored,p['ledger_text'])
        for m in p['reports']+p['product_members']+p['authored_members']:
            self.assertEqual(sha(historical_protected_bytes(ROOT,m['path'])),m['sha256'],m['path'])
        g=p['guard_before'];before=g['text'];after=(ROOT/g['path']).read_text()
        start="    const contextPath='compatibility/f10/disposition-ledger/evidence/closeout-fourteen-build-scope-review.json';\n    assert.equal(body.candidate_context.path,contextPath);"
        replacement="    // The current copy preserves the original review and rebinds its complete\n    // product snapshot. Both paths still require the same strict build proof.\n    const contextPath=body.candidate_context.path;\n    assert.ok(['compatibility/f10/disposition-ledger/evidence/closeout-fourteen-build-scope-review.json',\n      'compatibility/rc/chip-source-scope-requalification-build.json'].includes(contextPath));"
        self.assertEqual(before.count(start),1);self.assertEqual(after,before.replace(start,replacement))
    def test_full_CLI_removes_only87_source_failures_and_grants_no_runtime_credit(self):
        before=json.loads((ROOT/'compatibility/rc/chip-focus-role-requalification-cli-after.json').read_bytes())
        after=json.loads((ROOT/(PREFIX+'cli-after.json')).read_bytes())
        expected=[f for f in before['evidence_failures'] if not f['reason'].startswith('invalid-')]
        self.assertEqual(after['evidence_failures'],expected)
        w=json.loads((ROOT/(PREFIX+'worksheet.json')).read_bytes())
        self.assertEqual(len(expected),0 if w['line']=='main' else 1359)
        self.assertEqual(after['artifact_behavior_evidence'],before['artifact_behavior_evidence'])
        for field in ['authored_use_review_evidence','current_authored_use_inventory','security_clearance']:
            self.assertEqual(after[field],before[field])
        self.assertEqual(after['disposition_admission'],'incomplete');self.assertEqual(after['g11_claim'],'not-passed')
        self.assertTrue(after['current_authored_use_inventory']['source_snapshot_valid'])
        self.assertFalse(after['current_authored_use_inventory']['ready'])
if __name__=='__main__':unittest.main()
