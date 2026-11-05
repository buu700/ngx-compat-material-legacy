# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Current tool successors,old assertions,and actual composite owner admission."""
from pathlib import Path
import ast,json,os,subprocess,unittest
ROOT=Path(__file__).resolve().parents[1]
class BrowserReferenceOwnerTests(unittest.TestCase):
    def test_source_successors_and_original_assertions_are_preserved(self):
        packet=json.loads((ROOT/'compatibility/rc/c04-browser-owner-inputs.json').read_bytes())
        for row in packet['code_transitions']:
            if not row['after']['path'].endswith('.py'):continue
            before=subprocess.check_output(['git','--no-replace-objects','show',packet['source_parent']+':'+row['before']['path']],cwd=ROOT)
            a=ast.parse(before);b=ast.parse((ROOT/row['after']['path']).read_bytes())
            names=lambda tree:[node.name for node in ast.walk(tree)if isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef))]
            self.assertEqual(names(a),names(b))
        command=['node','tests/browser_reference_owner_probe.mjs','--source']
        if os.environ.get('BROWSER_OWNER_SOURCE_REPORT'):command.append(os.environ['BROWSER_OWNER_SOURCE_REPORT'])
        child=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=240)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-10000:]);report=json.loads(child.stdout)
        self.assertTrue(report['before_owner_byte_identical']);self.assertFalse(report['actual_owner_byte_identical']);self.assertTrue(report['current_owner_successor_authenticated']);self.assertEqual(report['code_transitions'],8);self.assertEqual(len(report['source_preservation']),6)
        self.assertGreater(report['cold_current_tool_mutants_rejected'],10);self.assertGreater(report['late_all_source_mutants_rejected'],100)
        self.assertTrue(report['unknown_frame_not_translated']);self.assertTrue(report['current_nonphysical_callback_rejected']);self.assertEqual(report['current_nonphysical_callbacks_rejected'],2);self.assertTrue(report['historical_unknown_passthrough_assertions_authenticated_as_DATA']);self.assertTrue(report['source_context_grants_no_canonical_admission']);self.assertTrue(report['public_snapshots_do_not_change_private_guards']);self.assertTrue(report['canonical_ledger_unchanged'])
        self.assertFalse(report['actual_complete_owner_or_retained_roster_executed']);self.assertFalse(report['current_native_packed_or_floor_or_g11_credit'])
    def test_actual_prepare_epoch_raw_reads_and_all_metadata_stages(self):
        from current_sass_canonical_test_scope import current_canonical_test_frame
        frame = current_canonical_test_frame(ROOT)
        child=subprocess.run(['node','tests/browser_reference_owner_probe.mjs','--runtime'],cwd=ROOT,capture_output=True,text=True,timeout=1800)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-10000:]);report=json.loads(child.stdout)
        self.assertTrue(report['actual_prepare_and_epoch_called']);self.assertEqual(report['preserved_source_admissions'],88 if report['line']=='21.x'else 13);self.assertEqual(report['source_admissions'],frame['individual_source_reviews']);self.assertEqual(report['base_class_removal_source_admissions'],frame['base_class_decisions']);self.assertEqual(report['source_admissions']-report['table_local_compilation_source_admissions']-report['base_class_removal_source_admissions'],89);self.assertFalse(report['external_browser_context_physically_applied']);self.assertTrue(report['historical_browser_stage_relation_verified']);frame['assert_current']();self.assertEqual(report['table_local_compilation_source_admissions'],1);self.assertEqual(report['legacy_removal_source_admissions'],1)
        self.assertEqual(report['browser_metadata_entries'],18 if report['line']=='main'else 16);self.assertEqual(report['selected_entries'],9 if report['line']=='main'else 8)
        self.assertEqual(report['preserved_checker_metadata_entries'],13 if report['line']=='main'else 5);self.assertEqual(report['preserved_inventory_metadata_entries'],20 if report['line']=='main'else 19)
        self.assertEqual(report['public_current_paths'],report['current_context_bound_sources']-1);self.assertEqual(report['preserved_epoch_late_controls_rejected'],12);self.assertEqual(report['actual_epoch_late_controls_rejected']-report['table_epoch_late_controls_rejected'],20);self.assertEqual(report['table_epoch_late_controls_rejected'],6)
        self.assertEqual(report['public_historical_projection_paths'],['compatibility/f10/disposition-ledger/ledger.json']);self.assertFalse(report['full_retained_roster_executed']);self.assertFalse(report['current_native_packed_or_floor_or_g11_credit'])
if __name__=='__main__':unittest.main()
