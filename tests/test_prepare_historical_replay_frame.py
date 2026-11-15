# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest import mock

MODULE = Path(__file__).resolve().parents[1] / 'scripts/prepare-historical-replay-frame.py'
spec = importlib.util.spec_from_file_location('prepare_historical_replay_frame', MODULE)
frame = importlib.util.module_from_spec(spec)
spec.loader.exec_module(frame)

class FrameInspection(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.prior = Path.cwd()
        self.addCleanup(os.chdir, self.prior)
        os.chdir(self.root)
        self.git('init', '-q')
        self.git('config', 'user.email', 'fixture@example.invalid')
        self.git('config', 'user.name', 'Fixture')
        self.product = self.root / 'projects/ngx-material-legacy/a.ts'
        self.product.parent.mkdir(parents=True)
        self.product.write_text('old\n')
        self.git('add', '.')
        self.git('commit', '-qm', 'old')
        old = self.git('rev-parse', 'HEAD').strip()
        self.product.write_text('current\n')
        self.git('add', '.')
        self.git('commit', '-qm', 'current')
        self.patch = mock.patch.object(frame, 'OLD', old)
        self.patch.start()
        self.addCleanup(self.patch.stop)

    def git(self, *args):
        return subprocess.check_output(['git', *args], text=True)

    def test_current_and_real_history(self):
        result = frame.inspect(self.root)
        self.assertEqual(result['product_members'], 1)
        self.assertEqual(result['product_f10_changes'], [{'status': 'M', 'path': 'projects/ngx-material-legacy/a.ts'}])
        self.assertIn('identity inspection only', result['qualification'])

    def test_mutation_and_recovery(self):
        self.product.write_text('dirty\n')
        with self.assertRaisesRegex(ValueError, 'dirty'):
            frame.inspect(self.root)
        self.product.write_text('current\n')
        frame.inspect(self.root)

    def test_product_membership_and_recovery(self):
        extra = self.product.parent / 'untracked.ts'
        extra.write_text('extra\n')
        with self.assertRaisesRegex(ValueError, 'membership differs'):
            frame.inspect(self.root)
        extra.unlink()
        frame.inspect(self.root)

    def test_late_change_and_recovery(self):
        original_git = frame.git
        def changing_git(*args, **kwargs):
            result = original_git(*args, **kwargs)
            if args[0] == 'diff':
                self.product.write_text('late\n')
            return result
        with mock.patch.object(frame, 'git', changing_git):
            with self.assertRaisesRegex(ValueError, 'late physical change'):
                frame.inspect(self.root)
        self.product.write_text('current\n')
        frame.inspect(self.root)

if __name__ == '__main__':
    unittest.main()
