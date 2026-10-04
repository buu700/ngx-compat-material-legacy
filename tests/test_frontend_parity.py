#!/usr/bin/env python3
"""Packaged CLI and ng generate rewrite the same fixture bytes."""
from __future__ import annotations

import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MATRIX = ROOT / "compatibility/rc/matrices/full-verify.json"
CATALOG = ROOT / "fixtures/migration/cases.json"


def expected_ids() -> list[str]:
    catalog = json.loads(CATALOG.read_text())
    ids = []
    for case in catalog["cases"]:
        expected = case.get("expected_after")
        if isinstance(expected, str) and expected != case.get("before") and case.get("expect_ok") is not False:
            ids.append(f"frontend-parity/{case['id']}")
    return ids


class FrontendParityTests(unittest.TestCase):
    def test_21x_binding_does_not_receive_assertions(self):
        script = r"""
import {assertionOutputDir} from './scripts/check-frontend-parity.mjs';
console.log(JSON.stringify(assertionOutputDir()));
"""
        env = os.environ.copy()
        env.update({
            "RC_CHECK_ID": "migration-packaged",
            "RC_RUN_ID": "not-a-21x-run",
            "RC_INVOCATION_ID": "frontendparity21",
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
        self.assertEqual(result.stdout.strip(), "null")

    def test_packaged_frontends_match(self):
        source = (ROOT / "scripts/check-frontend-parity.mjs").read_text()
        self.assertNotIn("SchematicTestRunner", source)
        self.assertNotIn("rewriteLegacyTypescriptImports", source)
        self.assertNotIn("rewriteSassModuleSource", source)
        self.assertNotIn("migration-schematic-runner.mjs", source)
        ids = expected_ids()
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            out = tmp_path / "frontend-parity.json"
            invocation = "frontendparity"
            assertion_dir = tmp_path / "evidence" / "migration-packaged" / invocation
            assertion_dir.mkdir(parents=True)
            env = os.environ.copy()
            env.update({
                "RC_CHECK_ID": "migration-packaged",
                "RC_RUN_ID": "frontend-parity",
                "RC_INVOCATION_ID": invocation,
                "RC_EVIDENCE_BINDING": json.dumps({"source_line": "main"}),
                "RC_ASSERTION_OUTPUT_DIR": str(assertion_dir),
            })
            result = subprocess.run(
                ["node", "scripts/check-frontend-parity.mjs", "--out", str(out)],
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
        self.assertEqual(report["case_ids"], ids)
        self.assertEqual(report["disagreements"], [])
        self.assertTrue(report["same_fixture"])
        self.assertFalse(report["transform_import"])
        self.assertFalse(report["schematic_test_runner"])
        self.assertEqual(report["schematic_host"], "ng-generate")
        self.assertEqual(report["schematic_collection"], "@ngx-compat/material-legacy:migrate-legacy")
        self.assertEqual(report["cli_bin"], "package/bin/migrate-legacy.js")
        self.assertEqual(report["coverage"], "slice")
        self.assertEqual(report["g04_claim"], "not-passed")
        self.assertEqual(report["g05_claim"], "not-passed")
        self.assertIsNone(report["not_rostered"]["packaged-schematic"])
        for group, group_ids in report["cases_by_line_21x"].items():
            self.assertIsNone(group_ids, group)
        self.assertIn("--apply", report["commands"]["cli"])
        self.assertIn("package/bin/migrate-legacy.js", report["commands"]["cli"])
        self.assertIn("generate", report["commands"]["schematic"])
        self.assertIn("@ngx-compat/material-legacy:migrate-legacy", report["commands"]["schematic"])
        self.assertNotIn("approved", report)
        self.assertEqual(sorted(assertions), sorted(case_id.replace("/", "__") for case_id in ids))
        for case_id in ids:
            body = assertions[case_id.replace("/", "__")]
            self.assertEqual(body["case_id"], case_id)
            self.assertEqual(body["result"], "pass")
            self.assertEqual(body["kind"], "assertion")
            self.assertEqual(body["line"], "main")
            self.assertEqual(body["group"], "frontend-parity")
            self.assertTrue(body["outputs_match"])
            self.assertTrue(body["rewritten"])
            self.assertEqual(body["cli_after_sha256"], body["schematic_after_sha256"])
            self.assertEqual(body["after_sha256"], body["cli_after_sha256"])
            self.assertFalse(body["schematic_test_runner"])
            self.assertEqual(body["schematic_host"], "ng-generate")
            self.assertFalse(body["transform_import"])
            self.assertEqual(body["g04_claim"], "not-passed")
            self.assertEqual(body["g05_claim"], "not-passed")
            self.assertNotIn("approved", body)
            self.assertIsNone(body["not_rostered"]["packaged-schematic"])
            self.assertIsNone(body["not_rostered"]["21.x"])

        matrix = json.loads(MATRIX.read_text())
        row = next(item for item in matrix["checks"] if item["check_id"] == "migration-packaged")
        main = row["acceptance"]["cases_by_line"]["main"]
        self.assertEqual(main["frontend-parity"], ids)
        self.assertIsNone(main["packaged-schematic"])
        self.assertEqual(main["old-workspace-cli"][0], "legacy-named-alias")
        self.assertEqual(main["transaction-negatives"][0], "blocked-file-writes-nothing")
        for group, group_ids in row["acceptance"]["cases_by_line"]["21.x"].items():
            self.assertIsNone(group_ids, group)
        verify = (ROOT / "scripts/rc-verify.py").read_text()
        self.assertIn("scripts/check-frontend-parity.mjs", verify)
        self.assertIn("Does not mark migration-packaged accepted", verify)
        self.assertIn("packaged-schematic stays null", verify)
        self.assertNotIn("migration-schematic-runner.mjs", verify)


if __name__ == "__main__":
    unittest.main()
