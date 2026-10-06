"""Exercise source replacement failure/recovery without browser or framework builds."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class MigrationFileTransactionTests(unittest.TestCase):
    def test_production_writer_failure_paths(self):
        run=subprocess.run(['node','--test','tests/migration/file-transaction.test.cjs'],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(run.returncode,0,run.stdout+run.stderr)
