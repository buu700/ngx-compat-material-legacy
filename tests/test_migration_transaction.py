#!/usr/bin/env python3
"""The packaged CLI reports dry-run/apply parity, idempotence, and a rejected concurrent edit."""
from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class MigrationTransactionTests(unittest.TestCase):
    def test_packaged_cli_old_workspace_transaction(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "migration-transaction.json"
            result = subprocess.run(
                ["node", "scripts/migration-transaction.mjs", "--out", str(out)],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
            report = json.loads(out.read_text())
            self.assertTrue(report["blocked"]["dry_apply_parity"])
            self.assertEqual(report["blocked"]["applied"], 0)
            self.assertTrue(report["clean"]["idempotent"])
            self.assertEqual(report["clean"]["first_safe_edits"], report["clean"]["dry_apply_safe_edits"])
            self.assertEqual(report["clean"]["second_safe_edits"], 0)
            self.assertEqual(report["concurrent_edit"]["exit"], 1)
            self.assertEqual(report["concurrent_edit"]["applied"], 0)
            self.assertTrue(report["concurrent_edit"]["concurrent_edit"])
            self.assertTrue(report["concurrent_edit"]["legacy_import_preserved"])
            self.assertTrue(report["concurrent_edit"]["cli_rewrite_absent"])


if __name__ == "__main__":
    unittest.main()
