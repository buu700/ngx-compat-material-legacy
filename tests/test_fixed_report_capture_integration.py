# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Synthetic coordinator requests exercise the real Python capture and JS guard."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

from test_rc_verify_evidence_integration import ROOT, verify


class FixedReportCaptureIntegration(unittest.TestCase):
    def test_catalog_parity(self):
        rows = json.loads((ROOT / 'compatibility/rc/fixed-report-catalog.json').read_text())['reports']
        for key in ('script', 'check_id', 'path'):
            self.assertEqual(len({row[key] for row in rows}), len(rows))
        self.assertEqual(verify.FIXED_DETAILS, {r['script']: (r['check_id'], r['path']) for r in rows})

    def test_capture_and_dirty_negatives(self):
        # Each case starts with a fresh committed fixture. No qualification is claimed.
        for case in ('success', 'ignored-backup', 'ignored-foreign-backup', 'tracked', 'untracked-report', 'foreign-backup',
                     'symlink-backup', 'staged-source', 'staged-report', 'mutated-backup',
                     'hardlink-backup'):
            with self.subTest(case=case), tempfile.TemporaryDirectory() as temp:
                base = Path(temp); root = base / 'source'; root.mkdir()
                for rel in ('scripts/packed-consumer-evidence.mjs', 'projects/ngx-material-legacy/package.json',
                            'compatibility/rc/fixed-report-catalog.json'):
                    target = root / rel; target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(ROOT / rel, target)
                report = root / 'compatibility/rc/reports/sass-seal.json'
                report.parent.mkdir(parents=True); original = b'{"old":true}\n'; report.write_bytes(original)
                source = root / 'source.txt'; source.write_text('original\n')
                if case.startswith('ignored-'):
                    (root / '.gitignore').write_text('.saved-*\n')
                child = root / 'scripts/request.mjs'
                child.write_text("""import {coordinatorRequest} from './packed-consumer-evidence.mjs';
import {writeFileSync} from 'node:fs';
const r = coordinatorRequest('sass-seal');
if (r?.error) { console.error(r.error); process.exit(2); }
writeFileSync(r.outputDir + '/producer-reached.txt', 'reached');
writeFileSync('compatibility/rc/reports/sass-seal.json', '{\"fresh\":true}');
""")
                def git(*args):
                    return subprocess.run(['git', *args], cwd=root, capture_output=True, text=True, check=True).stdout.strip()
                git('init', '-q'); git('add', '.')
                git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'fixture')
                binding = dict(run_id='fixture', source_commit=git('rev-parse', 'HEAD'),
                               source_tree=git('rev-parse', 'HEAD^{tree}'), source_line='main', source_clean=True)
                out = base / 'run/evidence/sass-seal/invocation'; out.mkdir(parents=True)
                env = {**os.environ, 'RC_CHECK_ID': 'sass-seal', 'RC_RUN_ID': 'fixture',
                       'RC_INVOCATION_ID': 'invocation', 'RC_EVIDENCE_BINDING': json.dumps(binding),
                       'RC_ASSERTION_OUTPUT_DIR': str(out)}
                class Rejected(Exception): pass
                try:
                    with verify.capture_fixed_report(root, base / 'run', str(report.relative_to(root)), 'sass-seal') as detail:
                        backup, = report.parent.glob('.saved-sass-seal-*.json')
                        self.assertFalse(report.exists())
                        if case == 'tracked': source.write_text('changed\n')
                        if case == 'untracked-report': (report.parent / 'other.json').write_text('{}')
                        if case in ('foreign-backup', 'ignored-foreign-backup'): (report.parent / ('.saved-sass-seal-' + 'a' * 32 + '.json')).write_bytes(original)
                        if case == 'staged-source': source.write_text('changed\n'); git('add', 'source.txt')
                        if case == 'staged-report': git('add', str(report.relative_to(root)))
                        if case == 'mutated-backup': backup.write_bytes(b'changed')
                        if case == 'symlink-backup': backup.unlink(); backup.symlink_to(source)
                        if case == 'hardlink-backup': backup.unlink(); os.link(source, backup)
                        result = subprocess.run(['node', str(child)], cwd=root, env=env, capture_output=True, text=True)
                        success = case in ('success', 'ignored-backup')
                        self.assertEqual(result.returncode, 0 if success else 2, result.stderr)
                        self.assertEqual((out / 'producer-reached.txt').exists(), success)
                        if not success:
                            self.assertIn('dirty', result.stderr)
                            # Restore the original backup before the capture's finally block.
                            if case in ('symlink-backup', 'hardlink-backup'): backup.unlink(); backup.write_bytes(original)
                            if case == 'mutated-backup': backup.write_bytes(original)
                            raise Rejected()
                    self.assertEqual(json.loads(detail.read_text()), {'fresh': True})
                except Rejected:
                    pass
                self.assertEqual(report.read_bytes(), original)


if __name__ == '__main__':
    unittest.main()
