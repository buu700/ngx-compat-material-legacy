# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Actual card12 maintained dispatch on candidate_fixture5; no compiler/packed run."""
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import sass_ordinary_card_gate as gate
import sass_mixin_argument_admission as argument
import test_ordinary_card_gate as gate_tests
from test_current_sass_source import candidate_fixture, NODE


class OrdinaryCardEntryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='ngx-ordinary-card-entry-')
        cls.root = Path(cls.temp.name)
        cls.line = candidate_fixture(cls.root)
        for path in ['fixtures/sass/function-contracts.json', 'scripts/sass-ordinary-card-gate.mjs', 'scripts/sass_ordinary_card_gate.py', 'scripts/sass_ordinary_card_css.py',
                     'compatibility/rc/ordinary-card-public-bridge-model-v1.mjs', 'compatibility/rc/ordinary-card-public-bridge-model-v2.mjs',
                     'compatibility/rc/ordinary-card-public-bridge-original-cases-v1.json']:
            target = cls.root / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes((ROOT / path).read_bytes())
        cls.packet = json.loads((ROOT / 'compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json').read_bytes())
        cls.branch = cls.packet['branches'][cls.line]
        cls.originals = json.loads((ROOT / 'compatibility/rc/ordinary-card-public-bridge-original-cases-v1.json').read_bytes())
        cls.rows = cls.originals['cases'][:12]
        cls.oracle, cls.catalog, cls.provenance, cls.lock = [json.loads((ROOT / cls.packet[k]['path']).read_bytes()) for k in ['oracle', 'catalog', 'provenance', 'reference_lock']]
        # Exercise the actual root cache constructor used by maintained admission.
        cls.context = gate._context(cls.root)
        cls.descriptor = gate.ordinary_card_gate_descriptor(cls.context)
        modules = {r['path']: r for r in cls.descriptor['source']['source_modules']}
        cls.sources = []
        for row in next(iter(cls.branch['source_sets'].values())):
            current = modules.get('projects/ngx-material-legacy/' + row['path']) if row['root'] == 0 else None
            cls.sources.append(dict(row, sha256=current['sha256'], bytes=current['bytes']) if current else dict(row))
        spec = importlib.util.spec_from_file_location('card_entry_actual_coordinator', ROOT / 'scripts/rc-verify.py')
        cls.coordinator = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.coordinator)
        cls.coordinator.ROOT = cls.root
        cls.checks, cls.rejects, cls.js = [], [], None

    @classmethod
    def tearDownClass(cls):
        try:
            destination = os.environ.get('ORDINARY_CARD_ENTRY_REPORT')
            if destination:
                result = 'pass' if len(cls.checks) == 12 and len(cls.rejects) == 7 and cls.js is not None else 'incomplete'
                report = dict(result=result, line=cls.line, checks=cls.checks, rejected=cls.rejects, js=cls.js,
                    actual_current_source_fixture=True, source_population=len(cls.sources), maintained_default_dispatches=4,
                    maintained_argument_dispatches=8, Sass_compiles=0, actual_artifact_runs=0, workspace_card_applied=False, g11_claim='not-passed')
                with Path(destination).open('x') as output:
                    output.write(json.dumps(report, indent=2) + '\n')
        finally:
            gate._ROOT_CONTEXTS.pop(cls.root, None)
            cls.temp.cleanup()

    def model(self, row):
        return gate_tests.OrdinaryCardGateTests.model(self, row)

    def test_01_actual_default_inventory_writer_and_coordinator(self):
        child = subprocess.run([NODE, 'tests/ordinary_card_entry_probe.mjs', str(self.root)], cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        result = json.loads(child.stdout)
        self.assertEqual(result['result'], 'pass')
        self.assertEqual(result['api_ids'], 651)
        self.assertTrue(result['preexisting_failures_preserved'])
        self.assertEqual(result['descriptor'], self.descriptor)
        assertions = result.pop('default_assertions')
        self.assertEqual(len(assertions), 4)
        result['default_assertion_payload_sha256'] = hashlib.sha256(json.dumps(assertions, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
        for record in assertions:
            self.coordinator.ACTIVE_RUN = SimpleNamespace(**record['active'])
            self.assertTrue(self.coordinator._sass_seal_assertion_ok(record['body'], record['invocation']))
            self.checks.append('actual-default-coordinator/' + record['body']['case_id'])
            bad = copy.deepcopy(record['body'])
            del bad['current_ordinary_card']
            self.assertFalse(self.coordinator._sass_seal_assertion_ok(bad, record['invocation']))
            self.rejects.append('missing-default-capsule/' + record['body']['case_id'])
        self.__class__.js = result

    def test_02_actual_eight_argument_admission_and_foreign_capsule(self):
        rows = [r for r in self.rows if r['case_id'].startswith('mixin-argument/')]
        self.assertEqual(len(rows), 8)
        for row in rows:
            args = self.model(row)
            args.pop('context')
            self.assertTrue(argument.mixin_argument_assertion_ok(**args), row['case_id'])
            self.checks.append('actual-argument-admission/' + row['case_id'])
        for name, change in [('missing-capsule', lambda b: b.pop('current_ordinary_card')),
                             ('descriptor', lambda b: b['current_ordinary_card']['source']['source_modules'].pop())]:
            args = self.model(rows[0]);args.pop('context');change(args['body'])
            self.assertFalse(argument.mixin_argument_assertion_ok(**args), name)
            self.rejects.append(name)
        args = self.model(rows[0])
        args['body']['case_id'] = 'function-value/foreign'
        self.coordinator.ACTIVE_RUN = args['active']
        self.assertFalse(self.coordinator._sass_seal_assertion_ok(args['body'], args['invocation']))
        self.rejects.append('foreign-card-capsule')


if __name__ == '__main__':
    unittest.main()
