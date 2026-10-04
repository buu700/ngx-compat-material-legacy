#!/usr/bin/env python3
"""ng generate from the packed library rewrites fixtures to expected_after."""
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
            ids.append(f"packaged-schematic/{case['id']}")
    return ids


class PackagedSchematicTests(unittest.TestCase):
    def test_21x_binding_does_not_receive_assertions(self):
        script = r"""
import {assertionOutputDir} from './scripts/check-packaged-schematic.mjs';
console.log(JSON.stringify(assertionOutputDir()));
"""
        env = os.environ.copy()
        env.update({
            "RC_CHECK_ID": "migration-packaged",
            "RC_RUN_ID": "not-a-21x-run",
            "RC_INVOCATION_ID": "packagedschematic21",
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

    def test_ng_generate_matches_expected_after(self):
        source = (ROOT / "scripts/check-packaged-schematic.mjs").read_text()
        parity = (ROOT / "scripts/check-frontend-parity.mjs").read_text()
        self.assertNotIn("SchematicTestRunner", source)
        self.assertNotIn("SchematicTestRunner", parity)
        self.assertIn("installAndNgGenerate", source)
        self.assertIn("installAndNgGenerate", parity)
        self.assertNotIn("outputs_match", source)
        ids = expected_ids()
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            out = tmp_path / "packaged-schematic.json"
            invocation = "packagedschematic"
            assertion_dir = tmp_path / "evidence" / "migration-packaged" / invocation
            assertion_dir.mkdir(parents=True)
            env = os.environ.copy()
            env.update({
                "RC_CHECK_ID": "migration-packaged",
                "RC_RUN_ID": "packaged-schematic",
                "RC_INVOCATION_ID": invocation,
                "RC_EVIDENCE_BINDING": json.dumps({"source_line": "main"}),
                "RC_ASSERTION_OUTPUT_DIR": str(assertion_dir),
            })
            result = subprocess.run(
                ["node", "scripts/check-packaged-schematic.mjs", "--out", str(out)],
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
        self.assertEqual(report["mismatches"], [])
        self.assertFalse(report["transform_import"])
        self.assertFalse(report["schematic_test_runner"])
        self.assertFalse(report["cli_comparison"])
        self.assertEqual(report["expectation"], "expected_after")
        self.assertEqual(report["schematic_host"], "ng-generate")
        self.assertEqual(report["schematic_collection"], "@ngx-compat/material-legacy:migrate-legacy")
        self.assertEqual(report["coverage"], "slice")
        self.assertEqual(report["g04_claim"], "not-passed")
        self.assertEqual(report["g05_claim"], "not-passed")
        self.assertEqual(report["node_version"], "22.22.3")
        self.assertTrue(report["node_binary"].endswith("/node"))
        self.assertEqual(report["command"][1:], [
            "node_modules/@angular/cli/bin/ng.js",
            "generate",
            "@ngx-compat/material-legacy:migrate-legacy",
            "--acknowledge-companion-bridges",
            "--acknowledge-aggregates",
            "--defaults",
        ])
        self.assertNotIn("approved", report)
        for group, group_ids in report["cases_by_line_21x"].items():
            self.assertIsNone(group_ids, group)
        self.assertEqual(sorted(assertions), sorted(case_id.replace("/", "__") for case_id in ids))
        catalog = {case["id"]: case for case in json.loads(CATALOG.read_text())["cases"]}
        for case_id in ids:
            body = assertions[case_id.replace("/", "__")]
            fixture_id = case_id.split("/", 1)[1]
            self.assertEqual(body["case_id"], case_id)
            self.assertEqual(body["fixture_case_id"], fixture_id)
            self.assertEqual(body["result"], "pass")
            self.assertEqual(body["kind"], "assertion")
            self.assertEqual(body["line"], "main")
            self.assertEqual(body["group"], "packaged-schematic")
            self.assertTrue(body["matches_expected_after"])
            self.assertTrue(body["rewritten"])
            self.assertEqual(body["after_sha256"], body["expected_after_sha256"])
            self.assertNotEqual(body["before_sha256"], body["after_sha256"])
            self.assertFalse(body["cli_comparison"])
            self.assertEqual(body["expectation"], "expected_after")
            self.assertFalse(body["schematic_test_runner"])
            self.assertEqual(body["schematic_host"], "ng-generate")
            self.assertFalse(body["transform_import"])
            self.assertEqual(body["g04_claim"], "not-passed")
            self.assertEqual(body["g05_claim"], "not-passed")
            self.assertEqual(body["node_version"], "22.22.3")
            self.assertNotIn("approved", body)
            self.assertNotIn("outputs_match", body)
            self.assertNotIn("cli_after_sha256", body)
            for group_ids in body["cases_by_line_21x"].values():
                self.assertIsNone(group_ids)
            fixture = catalog[fixture_id]
            self.assertNotEqual(fixture["before"], fixture["expected_after"])

        matrix = json.loads(MATRIX.read_text())
        row = next(item for item in matrix["checks"] if item["check_id"] == "migration-packaged")
        main = row["acceptance"]["cases_by_line"]["main"]
        self.assertEqual(main["packaged-schematic"], ids)
        self.assertEqual(main["old-workspace-cli"][0], "legacy-named-alias")
        self.assertEqual(main["transaction-negatives"][0], "blocked-file-writes-nothing")
        self.assertEqual(main["frontend-parity"][0], "frontend-parity/legacy-named-alias")
        self.assertFalse(set(main["packaged-schematic"]) & set(main["old-workspace-cli"]))
        self.assertFalse(set(main["packaged-schematic"]) & set(main["transaction-negatives"]))
        self.assertFalse(set(main["packaged-schematic"]) & set(main["frontend-parity"]))
        for group, group_ids in row["acceptance"]["cases_by_line"]["21.x"].items():
            self.assertIsNone(group_ids, group)
        verify = (ROOT / "scripts/rc-verify.py").read_text()
        self.assertIn("scripts/check-packaged-schematic.mjs", verify)
        self.assertIn("Does not mark migration-packaged accepted", verify)
        self.assertIn("Does not claim G04 or G05", verify)
        self.assertIn("packaged-schematic compares ng generate output with expected_after", verify)
        self.assertNotIn("migration-schematic-runner.mjs", verify)


if __name__ == "__main__":
    unittest.main()
