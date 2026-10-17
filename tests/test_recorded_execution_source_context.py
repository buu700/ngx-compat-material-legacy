# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Current source/guard checks and finite exact Python history views."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import unittest
from tests.recorded_execution_source_context import recorded_source_context,recorded_historical_read,recorded_implementation_subject
from tests.native_date_source_context import project_native_date_context

ROOT=Path(__file__).resolve().parents[1]


class RecordedExecutionSourceContext(unittest.TestCase):
    def test_actual_current_definitions_and_preserved_source_subjects(self):
        command=['node','scripts/run-historical-source-probe.mjs','recorded-execution-source-context']
        if os.environ.get('NGX_RECORDED_SOURCE_CONTEXT_DIAGNOSTIC'):command.extend(['--report',os.environ['NGX_RECORDED_SOURCE_CONTEXT_DIAGNOSTIC']])
        result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=120)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-10000:])
        report=json.loads(result.stdout.strip().splitlines()[-1])
        main=report['line']=='main'
        self.assertEqual(report['complete_committed_source_preimages'],17)
        self.assertEqual(report['source_corruption_controls'],34)
        self.assertEqual(report['subject_and_capsule_corruption_controls'],33 if main else 32)
        self.assertEqual(report['historical_projection_controls'],28)
        self.assertEqual(report['preserved_ledger_verdicts'],1697)
        self.assertEqual(report['source_scopes_refreshed'],24 if main else 23)
        self.assertEqual(report['current_native_guards'],28 if main else 27)
        self.assertTrue(report['all_current_guards_reject_missing_coordinator'])
        self.assertEqual(report['preserved_current_proof_migrations'],4)
        self.assertEqual(report['authored_review_documents_unchanged'],79)
        self.assertEqual(report['frozen_reviewed'],1446);self.assertEqual(report['current_reviewed'],178)
        self.assertEqual(report['current_open'],130)
        self.assertEqual(report['current_owned_style_cells'],37)
        self.assertEqual(report['original_owned_style_cells_retained'],24)
        self.assertEqual(report['registered_original_programs'],25)
        self.assertTrue(report['original_programs_unchanged'])
        self.assertEqual(report['new_SHA_or_role_closures'],0)
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])

    def test_python_history_preserves_unknown_bytes_and_rejects_corrupt_inputs(self):
        read=lambda p:(ROOT/p).read_bytes()
        data,before,after,output=recorded_source_context(ROOT,read)
        history=recorded_historical_read(ROOT,read)
        self.assertIs(recorded_historical_read(ROOT,read),history)
        self.assertIs(recorded_historical_read(ROOT,history),history)
        self.assertEqual(recorded_implementation_subject(ROOT,before['ledger_path'],read),before['implementation_ledger_text'].encode())
        for source in before['sources']:
            with self.subTest(path=source['path']):
                self.assertEqual(history(source['path']),source['text'].encode())
                unknown=read(source['path'])+b'\n unreviewed'
                altered=lambda p:unknown if p==source['path'] else read(p)
                self.assertEqual(recorded_historical_read(ROOT,altered)(source['path']),unknown)
                with self.assertRaises((AssertionError,ValueError,KeyError)):project_native_date_context(ROOT,altered)
        for path in [output['inputs']['path'],'compatibility/rc/recorded-source-context-outputs.json',data['prior']['path'],output['expected']['path'],'scripts/recorded-execution-source-context.mjs']:
            with self.subTest(path=path),self.assertRaises((AssertionError,ValueError,KeyError)):
                recorded_source_context(ROOT,lambda p:read(p)+b'\n unreviewed' if p==path else read(p))
        # Historical input keeps a captured context, while the direct API checks
        # the live archive even after the parsed-data cache has been populated.
        for path in [output['inputs']['path'],'compatibility/rc/recorded-source-context-outputs.json',data['prior']['path'],output['expected']['path']]:
            corrupt=False
            def changing(p):return b'corrupt' if corrupt and p==path else read(p)
            captured=recorded_historical_read(ROOT,changing);corrupt=True
            with self.assertRaises((AssertionError,ValueError,KeyError)):recorded_source_context(ROOT,changing)
            self.assertEqual(captured(before['sources'][0]['path']),before['sources'][0]['text'].encode())
        with self.assertRaises(AssertionError):recorded_implementation_subject(ROOT,'unknown',read)
        with self.assertRaises(AssertionError):recorded_implementation_subject(ROOT,before['ledger_path'],lambda p:read(p)+b'\n' if p==before['ledger_path'] else read(p))
