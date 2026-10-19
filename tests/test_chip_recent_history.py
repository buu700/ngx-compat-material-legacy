# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Original stage assertions stay executed; no current runtime credit from history."""
import ast,gzip,hashlib,json,os,subprocess,unittest
from pathlib import Path
from tests.chip_recent_history import canonical_recorded_case
ROOT=Path(__file__).resolve().parents[1]
PREFIX='compatibility/rc/chip-recent-history-'
sha=lambda b:hashlib.sha256(b).hexdigest()
def assertions(source):
    return [ast.dump(n,include_attributes=False) for n in ast.walk(ast.parse(source)) if isinstance(n,ast.Assert)
            or isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute) and n.func.attr.startswith('assert')]
class ChipRecentHistory(unittest.TestCase):
    def test_standard_and_verify_lite_loaders_keep_exact_case_identity(self):
        data=json.loads((ROOT/(PREFIX+'inputs.json')).read_bytes())
        def ids(suite):
            result=[]
            for item in suite:
                if isinstance(item,unittest.TestSuite):result.extend(ids(item))
                else:result.append(item.id())
            return sorted(result)
        count=0
        for entry in data['entries']:
            normal=ids(unittest.TestLoader().loadTestsFromName(entry['module']))
            discovered=ids(unittest.TestLoader().discover(str(ROOT/'tests'),pattern=Path(entry['program']).name))
            self.assertEqual(normal,entry['case_ids'])
            self.assertEqual(sorted(canonical_recorded_case(entry,c) for c in discovered),entry['case_ids'])
            self.assertTrue(all(not c.startswith('tests.') for c in discovered))
            for case in normal:
                self.assertEqual(canonical_recorded_case(entry,case),case)
                for bad in ['foreign.'+case,'tests.'+case,case+'.extra',case.replace('.test_', '.missing_',1)]:
                    with self.assertRaises(AssertionError):canonical_recorded_case(entry,bad)
            count+=len(normal)
        self.assertEqual(count,19)
    def test_missing_cases_skips_dirty_graphs_and_unknown_inputs_reject(self):
        command=['node','tests/chip_recent_history_probe.mjs']
        if os.environ.get('NGX_CHIP_RECENT_BOUNDARY_DIAGNOSTIC'):command.append(os.environ['NGX_CHIP_RECENT_BOUNDARY_DIAGNOSTIC'])
        child=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=90)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-12000:]);r=json.loads(child.stdout)
        self.assertEqual(r['original_modules'],7);self.assertEqual(r['original_case_ids'],19)
        self.assertEqual(r['rejection_controls'],25);self.assertEqual(r['actual_original_modules_executed'],0)
        self.assertFalse(r['actual_current_source_native_packed_or_floor_qualified'])
    def test_complete_original_assertions_case_ids_and_current_contracts_preserved(self):
        data=json.loads((ROOT/(PREFIX+'inputs.json')).read_bytes());packed=(ROOT/data['prior']['path']).read_bytes()
        self.assertEqual(sha(packed),data['prior']['sha256']);raw=gzip.decompress(packed);self.assertEqual(sha(raw),data['prior']['raw_sha256']);prior=json.loads(raw)
        provenance=json.loads((ROOT/(PREFIX+'provenance.json')).read_bytes());self.assertEqual(len(provenance['stages']),7)
        total=0
        for e,record in zip(data['entries'],provenance['stages']):
            original=subprocess.check_output(['git','--no-replace-objects','show',e['frame']['commit']+':'+e['program']],cwd=ROOT)
            self.assertEqual(sha(original),e['program_sha256']);before=next(m['text'] for m in prior['python_preimages'] if m['path']==e['program'])
            self.assertEqual(sha(before.encode()),record['before_sha256'])
            for a,b in record['previous_historical_reader_substitutions']:
                self.assertEqual(before.count(a),1);before=before.replace(a,b)
            self.assertEqual(assertions(original),assertions(before));total+=len(assertions(original))
            current=(ROOT/e['program']).read_bytes();self.assertEqual(sha(current),record['wrapper_sha256'])
            tree=ast.parse(current);classes=[c for c in tree.body if isinstance(c,ast.ClassDef)];self.assertEqual(len(classes),1)
            methods=[m for m in classes[0].body if isinstance(m,ast.FunctionDef)]
            self.assertEqual(sorted(e['module']+'.'+classes[0].name+'.'+m.name for m in methods),e['case_ids'])
            for m in methods:
                self.assertEqual(len(m.body),1);call=m.body[0].value;self.assertEqual(call.func.id,'assert_recorded_case')
                self.assertEqual(ast.literal_eval(call.args[2]),e['id']);self.assertEqual(ast.unparse(call.args[3]),'self.id()')
        self.assertEqual(total,276)
        old=json.loads(prior['previous_replay_inputs']['text']);now=json.loads((ROOT/prior['previous_replay_inputs']['path']).read_bytes())
        from tests.older_audit_history import validate_registered_wrapper_successors
        validate_registered_wrapper_successors(ROOT,old,now)
        for m in prior['protected_members']:self.assertEqual(sha((ROOT/m['path']).read_bytes()),m['sha256'])
        for path in ['projects','testing','reference','fixtures','compatibility/f10']:
            self.assertEqual(subprocess.check_output(['git','diff','--name-only',data['source_parent'],'--',path],cwd=ROOT),b'')
if __name__=='__main__':unittest.main()
