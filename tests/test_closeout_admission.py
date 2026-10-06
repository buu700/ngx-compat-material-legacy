"""Branch-native closeout rosters and subject rejection without product execution."""
from pathlib import Path
import importlib.util
import json
import os
import re
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('closeout_eligibility', ROOT / 'scripts/check-dependency-eligibility.py')
eligibility = importlib.util.module_from_spec(spec)
spec.loader.exec_module(eligibility)

class CloseoutAdmissionTests(unittest.TestCase):
    def test_both_lines_roster_the_present_producers(self):
        groups = {}
        for group, case in re.findall(r"\['([^']+)', '(upstream-audit/[^']+)',", (ROOT / 'scripts/check-upstream-audit-disposition.mjs').read_text()):
            groups.setdefault(group, []).append(case)
        checks = {c['check_id']: c for c in json.loads((ROOT / 'compatibility/rc/matrices/full-verify.json').read_text())['checks']}
        for line in ('main', '21.x'):
            self.assertEqual(checks['upstream-audit-disposition']['acceptance']['cases_by_line'][line], groups)
            self.assertEqual(checks['dependency-eligibility']['acceptance']['cases_by_line'][line], eligibility.MAIN_CASES)
        self.assertNotIn("'upstream-audit/current-advisories/not-satisfied-by-ledger', false", (ROOT / 'scripts/check-upstream-audit-disposition.mjs').read_text())

    def test_dependency_producer_rejects_foreign_line_before_lookup(self):
        major = json.loads((ROOT / 'projects/ngx-material-legacy/package.json').read_text())['version'].split('.')[0]
        wrong = '21.x' if major == '22' else 'main'
        with tempfile.TemporaryDirectory() as td:
            output = Path(td) / 'evidence/dependency-eligibility/test-invocation'
            output.mkdir(parents=True)
            env = {'RC_CHECK_ID': 'dependency-eligibility', 'RC_RUN_ID': 'test-run',
                   'RC_INVOCATION_ID': 'test-invocation', 'RC_ASSERTION_OUTPUT_DIR': str(output),
                   'RC_EVIDENCE_BINDING': json.dumps({'run_id': 'test-run', 'source_line': wrong})}
            with patch.dict(os.environ, env, clear=True):
                with self.assertRaisesRegex(SystemExit, 'line does not match'):
                    eligibility.coordinator_request(ROOT)

    def test_advisory_producer_runs_after_dependency_lookup(self):
        source = (ROOT / 'scripts/rc-verify.py').read_text().split('def main() -> int:', 1)[1]
        self.assertLess(source.index('"scripts/check-dependency-eligibility.py"'), source.index('"scripts/check-upstream-audit-disposition.mjs"'))
