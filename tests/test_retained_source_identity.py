"""Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT."""
from pathlib import Path
import subprocess
import unittest

class RetainedSourceIdentityTest(unittest.TestCase):
    def test_actual_sass_annotations_and_strict_source_selectors(self):
        root = Path(__file__).resolve().parents[1]
        subprocess.run(['node', 'tests/retained_source_identity_probe.mjs'], cwd=root, check=True, timeout=60)

if __name__ == '__main__':
    unittest.main()
