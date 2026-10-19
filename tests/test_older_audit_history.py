# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Historical source cohorts cannot replace live current native obligations."""
import ast,copy,hashlib,json,os,subprocess,unittest
from pathlib import Path
from tests.older_audit_history import _inputs,mixed_context_before_history,validate_complete_older_receipt
from tests.chip_recent_history import canonical_recorded_case
ROOT=Path(__file__).resolve().parents[1]
class OlderAuditHistory(unittest.TestCase):
    def test_cohort_boundaries_and_current_coherence(self):
        cmd=['node','tests/older_audit_history_probe.mjs']
        if os.environ.get('NGX_OLDER_AUDIT_BOUNDARY_DIAGNOSTIC'):cmd.append(os.environ['NGX_OLDER_AUDIT_BOUNDARY_DIAGNOSTIC'])
        child=subprocess.run(cmd,cwd=ROOT,text=True,capture_output=True,timeout=90)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-12000:]);r=json.loads(child.stdout)
        self.assertEqual((r['registered_modules'],r['registered_original_cases'],r['diagnostic_cases']),(20,50,8))
        self.assertEqual(r['rejection_controls'],20);self.assertEqual(r['actual_original_cases_executed'],0)
        self.assertFalse(r['actual_native_or_packed_or_floor_qualified'])
    def test_partial_or_forged_receipts_never_satisfy_standard_wrappers(self):
        data,_,_,_=_inputs(ROOT)
        good={'line':data['line'],'id':data['id'],'complete_registered_module_set':True,
              'selected_modules':[e['module'] for e in data['entries']],'case_ids':data['case_ids'],
              'current_guard_passed_before_and_after':True,'original_program_unchanged':True,
              'historical_post_execution_clean':True,'temporary_graph_removed':True,
              'actual_current_source_native_packed_or_floor_qualified':False,'g11_claim':'not-passed'}
        validate_complete_older_receipt(data,good)
        for mutate in [lambda r:r.update(complete_registered_module_set=False),lambda r:r['case_ids'].pop(),
                       lambda r:r['selected_modules'].pop(),lambda r:r.update(original_program_unchanged=False),
                       lambda r:r.update(current_guard_passed_before_and_after=False),
                       lambda r:r.update(actual_current_source_native_packed_or_floor_qualified=True),
                       lambda r:r.update(g11_claim='passed')]:
            bad=copy.deepcopy(good);mutate(bad)
            with self.assertRaises(AssertionError):validate_complete_older_receipt(data,bad)
    def test_exact_old_programs_all_case_names_and_four_live_methods_preserved(self):
        data,prior,_,_=_inputs(ROOT);self.assertEqual((len(data['entries']),len(data['case_ids'])),(20,50));count=0
        for entry in data['entries']:
            old=subprocess.check_output(['git','--no-replace-objects','show',data['frame']['commit']+':'+entry['program']],cwd=ROOT)
            self.assertEqual(hashlib.sha256(old).hexdigest(),entry['program_sha256'])
            before=next(p['text'] for p in prior['preimages'] if p['path']==entry['program']);current=(ROOT/entry['program']).read_text()
            self.assertEqual(hashlib.sha256(current.encode()).hexdigest(),entry['wrapper_sha256'])
            a,b=ast.parse(before),ast.parse(current);classes=[n for n in b.body if isinstance(n,ast.ClassDef)];self.assertEqual(len(classes),1)
            methods=[n for n in classes[0].body if isinstance(n,ast.FunctionDef) and n.name.startswith('test_')]
            ids=sorted(entry['module']+'.'+classes[0].name+'.'+m.name for m in methods);self.assertEqual(ids,entry['case_ids']);count+=len(ids)
            def collected(suite):
                result=[]
                for item in suite:
                    if isinstance(item,unittest.TestSuite):result.extend(collected(item))
                    else:result.append(item.id())
                return sorted(result)
            normal=collected(unittest.TestLoader().loadTestsFromName(entry['module']))
            discovered=collected(unittest.TestLoader().discover(str(ROOT/'tests'),pattern=Path(entry['program']).name))
            self.assertEqual(normal,ids)
            self.assertEqual(sorted(canonical_recorded_case(entry,c) for c in discovered),ids)
            for case in ids:
                self.assertEqual(canonical_recorded_case(entry,case.removeprefix('tests.')),case)
            if entry['module']=='tests.test_audit_test_context':
                originals={m.name:m for n in a.body if isinstance(n,ast.ClassDef) for m in n.body if isinstance(m,ast.FunctionDef)}
                for m in methods:
                    if m.name!='test_exact_original_methods_and_finite_reader_edits':
                        self.assertEqual(ast.get_source_segment(before,originals[m.name]),ast.get_source_segment(current,m))
                self.assertEqual(mixed_context_before_history(ROOT),before)
            else:
                self.assertEqual(before.encode(),old)
                for m in methods:
                    self.assertEqual(len(m.body),1);call=m.body[0].value
                    self.assertEqual(call.func.id,'assert_recorded_older_case');self.assertEqual(ast.literal_eval(call.args[2]),entry['module'])
        self.assertEqual(count,50)
        for member in prior['protected']:
            if member['path']=='tests/test_current_audit_native.py':continue
            self.assertEqual(hashlib.sha256((ROOT/member['path']).read_bytes()).hexdigest(),member['sha256'])
        path='tests/test_current_audit_native.py';old=subprocess.check_output(['git','--no-replace-objects','show',prior['source_parent']+':'+path],cwd=ROOT).decode()
        source=(ROOT/path).read_text();original="        self.assertNotEqual(expected,before);self.assertEqual((ROOT/'tests/test_audit_test_context.py').read_text(),expected)"
        replacement="        current=(ROOT/'tests/test_audit_test_context.py').read_text()\n        if 'from tests.older_audit_history import assert_recorded_older_case' in current:\n            from tests.older_audit_history import mixed_context_before_history\n            current=mixed_context_before_history(ROOT)\n        self.assertNotEqual(expected,before);self.assertEqual(current,expected)"
        self.assertEqual(old.count(original),1);self.assertEqual(source,old.replace(original,replacement))
        self.assertEqual(subprocess.check_output(['git','diff','--name-only',prior['source_parent'],'--','projects','testing','reference','fixtures','compatibility/f10'],cwd=ROOT),b'')
if __name__=='__main__':unittest.main()
