# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Exact historical projection and independently checked current source contracts."""
import json
import os
from pathlib import Path
import subprocess
import unittest
from tests.native_date_source_context import project_native_date_context

ROOT=Path(__file__).resolve().parents[1]


class NativeDateSourceContext(unittest.TestCase):
    def test_current_source_semantics_and_complete_predecessors(self):
        command=['node','scripts/run-historical-source-probe.mjs','native-date-context-source']
        if os.environ.get('NGX_NATIVE_DATE_CONTEXT_DIAGNOSTIC'):
            command.extend(['--report',os.environ['NGX_NATIVE_DATE_CONTEXT_DIAGNOSTIC']])
        result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=120)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-8000:])
        report=json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['complete_committed_source_preimages'],30)
        self.assertEqual(report['source_corruption_controls'],61)
        self.assertEqual(report['subject_and_capsule_corruption_controls'],7)
        self.assertEqual(report['preserved_ledger_verdicts'],1697)
        self.assertEqual(report['historical_frame_members'],23)
        self.assertEqual(report['historical_projection_controls'],79)
        self.assertEqual(report['current_native_guards'],24 if report['line']=='main' else 23)
        self.assertTrue(report['all_current_guards_reject_missing_coordinator'])
        self.assertEqual(report['authored_rows_same_candidate_and_decision'],167)
        self.assertEqual(report['changed_role_source_references'],10)
        self.assertEqual(report['current_added_historical_cases_retained'],3)
        self.assertEqual(report['new_SHA_or_role_closures'],0)
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])

    def test_python_projection_rejects_unreviewed_current_context(self):
        old,projected=project_native_date_context(ROOT)
        self.assertEqual(len(old['entries']),1697)
        task=json.loads((ROOT/'compatibility/rc/native-date-context-worksheet.json').read_bytes())
        original=subprocess.check_output(['git','--no-replace-objects','show',task['baseline']+':compatibility/f10/disposition-ledger/ledger.json'],cwd=ROOT)
        self.assertEqual(projected('compatibility/f10/disposition-ledger/ledger.json'),original)
        inputs=json.loads((ROOT/'compatibility/rc/native-date-context-inputs.json').read_bytes())
        outputs=json.loads((ROOT/'compatibility/rc/native-date-context-outputs.json').read_bytes())
        read=lambda p:(ROOT/p).read_bytes()
        entry=next(e for e in json.loads(read('compatibility/f10/disposition-ledger/ledger.json'))['entries'] if e['sha']=='b423c0e0b754b1f1d118d17e022981c357c3aa68')
        targets=['scripts/check-upstream-audit-disposition.mjs','scripts/packed-consumer-aot-smoke.mjs','scripts/native-date-packed-source-context.mjs',
                 'compatibility/f10/disposition-ledger/ledger.json',entry['evidence_report'],
                 'compatibility/f10/authored-dependency-dispositions.json','compatibility/f10/authored-dependency-current-dispositions.json',
                 'compatibility/rc/native-date-context-inputs.json','compatibility/rc/native-date-context-outputs.json',
                 inputs['prior']['path'],outputs['expected']['path'],'compatibility/rc/matrices/full-verify.json']
        for target in targets:
            with self.subTest(target=target),self.assertRaises((AssertionError,ValueError,KeyError)):
                project_native_date_context(ROOT,lambda p:read(p)+b'\n unreviewed' if p==target else read(p))
