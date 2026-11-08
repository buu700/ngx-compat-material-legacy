# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Whole select member replay, genuine public framework callbacks and explicit protocols."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SelectRenderRuntimeTests(unittest.TestCase):
    def test_content_initialization_font_transfer_and_teardown(self):
        requested_report = os.environ.get('CLOSEOUT_SELECT_RENDER_REPORT')
        temporary = None
        temporary_path = None
        environment = os.environ.copy()
        if requested_report:
            report_argument = requested_report
            report_path = Path(requested_report)
            report_read_path = report_path if report_path.is_absolute() else ROOT / report_path
        else:
            temporary = tempfile.TemporaryDirectory(prefix='select-render-report-')
            temporary_path = Path(temporary.name)
            report_path = temporary_path / 'report.json'
            report_read_path = report_path
            report_argument = str(report_path)
            environment['CLOSEOUT_SELECT_RENDER_REPORT'] = report_argument
        try:
            command = ['node', '--max-old-space-size=512', 'tests/select_render_runtime_probe.mjs',
                       report_argument]
            result = subprocess.run(command, cwd=ROOT, env=environment,
                                    capture_output=True, text=True, timeout=120)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertTrue(report_read_path.is_file())
            report = json.loads(report_read_path.read_text())
        finally:
            if temporary is not None:
                temporary.cleanup()
        if temporary_path is not None:
            self.assertFalse(temporary_path.exists(), 'default temporary report directory must be removed')
        summary = json.loads(result.stdout)
        self.assertEqual(summary['subjects'], 10)
        self.assertEqual(len(report['results']), 10)
        expected = {
            ('original', 'zoneful'): [],
            ('main', 'zoneful'): [
                'wrong-ripple-coercion',
                'removed-stability-guard',
                'content-readiness-preempts-zone-stability',
                'removed-once-only-completion',
                'lookup-error-leaks-zone-subscription',
            ],
            ('main', 'zoneless'): [
                'wrong-ripple-coercion',
                'prior-zone-only-font-wait',
                'missing-zoneless-content-readiness',
                'destroy-retains-early-stream',
                'destroy-retains-render-subscription',
                'retained-render-handle',
                'lookup-error-leaks-zone-subscription',
            ],
            ('21.x', 'zoneful'): [
                'wrong-ripple-coercion',
                'removed-stability-guard',
                'content-readiness-preempts-zone-stability',
                'removed-once-only-completion',
                'lookup-error-leaks-zone-subscription',
            ],
            ('21.x', 'zoneless'): [
                'wrong-ripple-coercion',
                'prior-zone-only-font-wait',
                'missing-zoneless-content-readiness',
                'destroy-retains-early-stream',
                'destroy-retains-render-subscription',
                'retained-render-handle',
                'lookup-error-leaks-zone-subscription',
            ],
        }
        expected_rows = {
            (line, mode, production)
            for line, mode in expected
            for production in (False, True)
            if line != 'original' or mode == 'zoneful'
        }
        self.assertEqual({(row['line'], row['mode'], row['production'])
                          for row in report['results']}, expected_rows)
        for row in report['results']:
            self.assertEqual([mutation['id'] for mutation in row['mutations']],
                             expected[(row['line'], row['mode'])])
            self.assertTrue(all(mutation['rejected'] for mutation in row['mutations']))
        self.assertEqual(summary['mutation_rejections'],
                         sum(len(ids) for (line, mode), ids in expected.items()
                             for row in report['results']
                             if (row['line'], row['mode']) == (line, mode)))
        self.assertFalse(summary['native_executed'])
        self.assertFalse(summary['actual_legacy_instances_qualified'])
