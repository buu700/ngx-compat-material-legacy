"""The new owner grant is exact,temporary and does not clear security review."""
import importlib.util,json,unittest
from datetime import datetime,timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('braces_eligibility',ROOT/'scripts/check-dependency-eligibility.py');ELIGIBILITY=importlib.util.module_from_spec(spec);spec.loader.exec_module(ELIGIBILITY)

class BracesExceptionTests(unittest.TestCase):
    def test_new_braces_authority_does_not_validate_the_historical_claim(self) -> None:
        import copy
        rows = {'braces@3.0.3': {'name':'braces','version':'3.0.3','vulns':[{'id':'GHSA-vfj7-8cjw-p6xm'}]}}
        dispositions=ELIGIBILITY.load_finding_dispositions(ROOT);record=dispositions['braces@3.0.3'][0]
        self.assertEqual(record['classification'],'temporary-exception');self.assertTrue(record['_dependency_scope_ok'])
        self.assertEqual(record['prior_unverified_record']['classification'],'temporary-exception')
        self.assertEqual(record['granted_on'],'2026-10-07');self.assertEqual(record['prior_unverified_record']['granted_on'],'2026-10-04')
        self.assertIn("I'll defer to your recommendations",record['authority']);self.assertIsNone(record['fixed_version']);self.assertEqual(record['expires_on'],'2026-11-04')
        current=datetime(2026,10,7,23,tzinfo=timezone.utc)
        self.assertEqual(ELIGIBILITY.classify_live_findings(rows,['braces@3.0.3'],dispositions,current)['excepted'],[])
        rows['braces@3.0.3']['vulns'][0].update(patch_lookup_result='queried',available_fixed_versions=[])
        self.assertEqual(ELIGIBILITY.classify_live_findings(rows,['braces@3.0.3'],dispositions,current)['excepted'],['braces@3.0.3'])
        for day in [datetime(2026,10,4,tzinfo=timezone.utc),datetime(2026,11,5,tzinfo=timezone.utc)]:
            classified=ELIGIBILITY.classify_live_findings(rows,['braces@3.0.3'],dispositions,day);self.assertEqual(classified['excepted'],[]);self.assertIn('braces@3.0.3',classified['unresolved'])
        pending=copy.deepcopy(dispositions);pending['braces@3.0.3'][0]['classification']='pending-owner-authority'
        self.assertEqual(ELIGIBILITY.classify_live_findings(rows,['braces@3.0.3'],pending,current)['excepted'],[])
        wrong=copy.deepcopy(rows);wrong['braces@3.0.3']['vulns'].append({'id':'GHSA-unreviewed'})
        self.assertEqual(ELIGIBILITY.classify_live_findings(wrong,['braces@3.0.3'],dispositions,current)['excepted'],[])

    def test_braces_no_patch_grant_requires_fresh_detail_and_stops_on_a_patch(self) -> None:
        import copy
        now=datetime(2026,10,7,23,tzinfo=timezone.utc);dispositions=ELIGIBILITY.load_finding_dispositions(ROOT);advisory='GHSA-vfj7-8cjw-p6xm'
        body={'id':advisory,'affected':[{'package':{'ecosystem':'npm','name':'braces'},'ranges':[{'type':'SEMVER','events':[{'introduced':'0'},{'last_affected':'3.0.3'}]}]}]}
        for status,value,error,expected in [(200,body,'',True),(503,None,'unavailable',False),(200,{},'',False),(200,{**body,'id':'foreign'},'',False),(200,{**body,'affected':[]},'',False),(200,{**body,'affected':[{'package':[]} ]},'',False),(200,{**body,'affected':[{'package':{'ecosystem':'npm','name':'braces'},'ranges':[{'type':'SEMVER','events':[{'introduced':'0'},{'fixed':True}]}]}]},'',False)]:
            rows={'braces@3.0.3':{'name':'braces','version':'3.0.3','vulns':[{'id':advisory}]}}
            ELIGIBILITY.refresh_exception_patch_status(rows,dispositions,now,lambda *args,**kwargs:(status,value,error))
            classified=ELIGIBILITY.classify_live_findings(rows,['braces@3.0.3'],dispositions,now);self.assertEqual(bool(classified['excepted']),expected)
        fixed=copy.deepcopy(body);fixed['affected'][0]['ranges'][0]['events']=[{'introduced':'0'},{'fixed':'3.0.4'}]
        rows={'braces@3.0.3':{'name':'braces','version':'3.0.3','vulns':[{'id':advisory}]}}
        ELIGIBILITY.refresh_exception_patch_status(rows,dispositions,now,lambda *args,**kwargs:(200,fixed,''))
        self.assertEqual(rows['braces@3.0.3']['vulns'][0]['available_fixed_versions'],['3.0.4'])
        classified=ELIGIBILITY.classify_live_findings(rows,['braces@3.0.3'],dispositions,now);self.assertEqual(classified['excepted'],[]);self.assertIn('braces@3.0.3',classified['unresolved'])

    def test_braces_grant_rejects_additional_or_changed_dependency_paths(self) -> None:
        import copy,tempfile
        record=ELIGIBILITY.load_finding_dispositions(ROOT)['braces@3.0.3'][0];self.assertTrue(ELIGIBILITY.karma_braces_scope_ok(ROOT,record))
        wrong=copy.deepcopy(record);wrong['dependency_paths'].append(['devDependency other@1.0.0','braces@3.0.3']);self.assertFalse(ELIGIBILITY.karma_braces_scope_ok(ROOT,wrong))
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);manifest=json.loads((ROOT/'package.json').read_bytes());text=(ROOT/'pnpm-lock.yaml').read_text();(root/'package.json').write_text(json.dumps(manifest));(root/'pnpm-lock.yaml').write_text(text)
            self.assertTrue(ELIGIBILITY.karma_braces_scope_ok(root,record))
            for additional in ['\n  other@1.0.0:\n    dependencies:\n      braces: 3.0.3\n','\n  other@1.0.0:\n    dependencies:\n      chokidar: 3.6.0\n','\n  other@1.0.0:\n    dependencies:\n      aliased: braces@3.0.3\n']:
                (root/'pnpm-lock.yaml').write_text(text+additional);self.assertFalse(ELIGIBILITY.karma_braces_scope_ok(root,record))
            (root/'pnpm-lock.yaml').write_text(text);manifest['dependencies']={'karma':'6.4.4'};(root/'package.json').write_text(json.dumps(manifest));self.assertFalse(ELIGIBILITY.karma_braces_scope_ok(root,record))

