"""Full-membership upstream documentation identity and admission controls."""
from pathlib import Path
import json
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class UpstreamCommentScopeTests(unittest.TestCase):
    def test_original_programs_and_admission_reject_non_documentation_changes(self):
        run = subprocess.run(['node', 'tests/upstream_comment_scope_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
        report = json.loads(run.stdout)
        self.assertEqual(report['subjects'], 10)
        self.assertEqual(report['complete_changed_files'], 32)
        self.assertEqual(report['unchanged_noncomment_tokens'], 45167)
        self.assertEqual(report['source_negative_controls'], 12)
        self.assertEqual(report['scope_negative_controls'], 14)
        self.assertFalse(report['actual_upstream_or_product_runtime_executed'])
        self.assertFalse(report['native_or_packed_qualified'])
        self.assertEqual(report['g11_claim'], 'not-passed')

    def test_shipped_checker_rejects_the_recovered_cdk_file_being_omitted(self):
        report_path = 'compatibility/f10/disposition-ledger/evidence/closeout-ten-comment-source-review.json'
        report = json.loads((ROOT / report_path).read_text())
        config = next(row for row in report['reviews'] if row['sha'].startswith('e85c8656'))
        config['members'] = [m for m in config['members'] if m['path'] != 'src/cdk/dialog/dialog-config.ts']
        self.assertEqual(len(config['members']), 1)
        ledger = json.loads((ROOT / 'compatibility/f10/disposition-ledger/ledger.json').read_text())
        affected = [row['sha'] for row in report['reviews']]
        with tempfile.TemporaryDirectory(prefix='.comment-review-test-', dir=ROOT) as tmp:
            temporary = Path(tmp)
            bad_report = temporary / 'review.json'
            bad_report.write_text(json.dumps(report))
            for entry in ledger['entries']:
                if entry['sha'] in affected:
                    entry['evidence_report'] = str(bad_report.relative_to(ROOT))
            bad_ledger = temporary / 'ledger.json'
            bad_ledger.write_text(json.dumps(ledger))
            run = subprocess.run(['node', 'scripts/check-upstream-audit-disposition.mjs',
                '--ledger', str(bad_ledger), '--admission', '--line', report['line'],
                '--report', str(temporary / 'result.json')], cwd=ROOT, capture_output=True, text=True)
            self.assertNotEqual(run.returncode, 0, run.stdout + run.stderr)
            baseline = json.loads((ROOT / 'compatibility/rc/upstream-comment-admission-diagnostic.json').read_text())
            observed = json.loads(run.stdout)
            self.assertEqual(observed['missing_evidence'], baseline['missing_evidence'] + 10)
            self.assertEqual(observed['g11_claim'], 'not-passed')
