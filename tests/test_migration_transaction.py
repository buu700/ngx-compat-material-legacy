#!/usr/bin/env python3
"""The packaged CLI bin executes transaction cases. Unexecuted groups stay null."""
from __future__ import annotations

import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MATRIX = ROOT / "compatibility/rc/matrices/full-verify.json"
CASE_IDS = [
    "blocked-file-writes-nothing",
    "dry-apply-parity",
    "second-apply-noop",
    "concurrent-edit-rejected",
    "before-write-hook-refuses",
]


class MigrationTransactionTests(unittest.TestCase):
    def test_packaged_cli_old_workspace_transaction(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            out = tmp_path / "migration-transaction.json"
            invocation = "transactionnegatives"
            assertion_dir = tmp_path / "evidence" / "migration-packaged" / invocation
            assertion_dir.mkdir(parents=True)
            env = os.environ.copy()
            env.update({
                "RC_CHECK_ID": "migration-packaged",
                "RC_RUN_ID": "transaction-negatives",
                "RC_INVOCATION_ID": invocation,
                "RC_EVIDENCE_BINDING": json.dumps({"source_line": "main"}),
                "RC_ASSERTION_OUTPUT_DIR": str(assertion_dir),
            })
            result = subprocess.run(
                ["node", "scripts/migration-transaction.mjs", "--out", str(out)],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
                env=env,
            )
            self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
            report = json.loads(out.read_text())
            assertions = {
                path.stem: json.loads(path.read_text())
                for path in assertion_dir.iterdir()
            }
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
        self.assertEqual(report["concurrent_edit"]["hook"], "MIGRATE_LEGACY_BEFORE_WRITE")
        self.assertIs(report["concurrent_edit"]["production_fault"], False)
        self.assertEqual(report["before_write_hook"]["hook"], "MIGRATE_LEGACY_BEFORE_WRITE")
        self.assertIs(report["before_write_hook"]["production_fault"], False)
        self.assertEqual(report["before_write_hook"]["exit"], 1)
        self.assertTrue(report["before_write_hook"]["files_unchanged"])
        self.assertFalse(report["transform_import"])
        self.assertEqual(report["cli_bin"], "package/bin/migrate-legacy.js")
        self.assertEqual(report["coverage"], "slice")
        self.assertEqual(report["g04_claim"], "not-passed")
        self.assertEqual(report["g05_claim"], "not-passed")
        self.assertEqual(report["case_ids"], CASE_IDS)
        failure = report["not_rostered_write_failure"]
        self.assertTrue(failure["executed"])
        self.assertFalse(failure["rostered"])
        self.assertTrue(failure["partial_commit"])
        self.assertIsNone(failure["case_id"])
        self.assertIsNone(failure["hook"])
        self.assertNotIn("write-failure-refused", report["case_ids"])
        self.assertIsNone(report["not_executed"]["packaged-schematic"])
        self.assertIsNone(report["not_executed"]["frontend-parity"])
        self.assertIsNone(report["not_executed"]["schematic-runner"])
        for group, ids in report["cases_by_line_21x"].items():
            self.assertIsNone(ids, group)
        self.assertEqual(sorted(assertions), sorted(CASE_IDS))
        for case_id in CASE_IDS:
            body = assertions[case_id]
            self.assertEqual(body["case_id"], case_id)
            self.assertEqual(body["result"], "pass")
            self.assertEqual(body["kind"], "assertion")
            self.assertEqual(body["line"], "main")
            self.assertEqual(body["group"], "transaction-negatives")
            self.assertEqual(body["cli_bin"], "package/bin/migrate-legacy.js")
            self.assertFalse(body["transform_import"])
            self.assertEqual(body["g04_claim"], "not-passed")
            self.assertEqual(body["g05_claim"], "not-passed")
            self.assertEqual(body["coverage"], "slice")
            self.assertNotIn("approved", body)
            self.assertIsNone(body["not_executed"]["packaged-schematic"])
            self.assertIsNone(body["not_executed"]["frontend-parity"])
            self.assertIsNone(body["not_executed"]["21.x"])
        self.assertEqual(assertions["concurrent-edit-rejected"]["hook"], "MIGRATE_LEGACY_BEFORE_WRITE")
        self.assertIs(assertions["concurrent-edit-rejected"]["production_fault"], False)
        self.assertEqual(assertions["before-write-hook-refuses"]["hook"], "MIGRATE_LEGACY_BEFORE_WRITE")
        self.assertIs(assertions["before-write-hook-refuses"]["production_fault"], False)
        self.assertTrue(assertions["before-write-hook-refuses"]["not_a_production_write_fault"])
        self.assertEqual(assertions["second-apply-noop"]["safe_edits"], 0)
        self.assertTrue(any("migration-schematic-runner.mjs" in item and "SchematicTestRunner" in item for item in report["limitations"]))

        matrix = json.loads(MATRIX.read_text())
        row = next(item for item in matrix["checks"] if item["check_id"] == "migration-packaged")
        main = row["acceptance"]["cases_by_line"]["main"]
        self.assertEqual(main["transaction-negatives"], CASE_IDS)
        self.assertEqual(main["old-workspace-cli"][0], "legacy-named-alias")
        self.assertIsNone(main["packaged-schematic"])
        self.assertEqual(main["frontend-parity"][0], "frontend-parity/legacy-named-alias")
        self.assertTrue(all(item.startswith("frontend-parity/") for item in main["frontend-parity"]))
        self.assertFalse(set(main["frontend-parity"]) & set(main["old-workspace-cli"]))
        self.assertFalse(set(main["frontend-parity"]) & set(CASE_IDS))
        for group, ids in row["acceptance"]["cases_by_line"]["21.x"].items():
            self.assertIsNone(ids, group)
        verify = (ROOT / "scripts/rc-verify.py").read_text()
        self.assertIn("scripts/migration-transaction.mjs", verify)
        self.assertNotIn("migration-schematic-runner.mjs", verify)
        self.assertIn("Does not mark migration-packaged accepted", verify)
        self.assertIn("coverage stays slice", verify)

    def test_21x_binding_does_not_receive_transaction_assertions(self):
        script = r"""
import {assertionOutputDir} from './scripts/migration-transaction.mjs';
console.log(JSON.stringify(assertionOutputDir()));
"""
        env = os.environ.copy()
        env.update({
            "RC_CHECK_ID": "migration-packaged",
            "RC_RUN_ID": "not-a-21x-run",
            "RC_INVOCATION_ID": "transaction21",
            "RC_EVIDENCE_BINDING": json.dumps({"source_line": "21.x"}),
            "RC_ASSERTION_OUTPUT_DIR": "/tmp/does-not-matter",
        })
        result = subprocess.run(
            ["node", "--input-type=module", "-e", script],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
            env=env,
        )
        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
        self.assertEqual(json.loads(result.stdout), None)


if __name__ == "__main__":
    unittest.main()
