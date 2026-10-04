#!/usr/bin/env python3
"""The packaged migrate CLI rewrites a disposable Material 16.2.14 workspace."""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "fixtures/migration/cases.json"
PROVENANCE = ROOT / "reference/material-16.2.14/PROVENANCE.json"
CLI_BIN = ROOT / "migration/dist/package/bin/migrate-legacy.js"
MATRIX = ROOT / "compatibility/rc/matrices/full-verify.json"


def rewrite_ids(catalog: dict) -> list[str]:
    ids = []
    for case in catalog["cases"]:
        expected = case.get("expected_after")
        if isinstance(expected, str) and expected != case.get("before") and case.get("expect_ok") is not False:
            ids.append(case["id"])
    return ids


class OldWorkspaceCliTests(unittest.TestCase):
    def test_21x_binding_does_not_receive_assertions(self):
        script = r"""
import {assertionOutputDir} from './scripts/check-old-workspace-cli.mjs';
console.log(JSON.stringify(assertionOutputDir()));
"""
        env = os.environ.copy()
        env.update({
            "RC_CHECK_ID": "migration-packaged",
            "RC_RUN_ID": "not-a-21x-run",
            "RC_INVOCATION_ID": "oldworkspace21",
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
        source = (ROOT / "scripts/check-old-workspace-cli.mjs").read_text()
        self.assertNotIn(".tgz", source)
        self.assertNotIn("21.0.0", source)

    def test_cli_rewrites_sealed_material_16_workspace(self):
        catalog = json.loads(CATALOG.read_text())
        expected_ids = rewrite_ids(catalog)
        self.assertGreater(len(catalog["cases"]), len(expected_ids))
        self.assertTrue(expected_ids)
        provenance = json.loads(PROVENANCE.read_text())
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            out = tmp_path / "old-workspace-cli.json"
            invocation = "oldworkspacecli"
            assertion_dir = tmp_path / "evidence" / "migration-packaged" / invocation
            assertion_dir.mkdir(parents=True)
            env = os.environ.copy()
            env.update({
                "RC_CHECK_ID": "migration-packaged",
                "RC_RUN_ID": "old-workspace-cli",
                "RC_INVOCATION_ID": invocation,
                "RC_EVIDENCE_BINDING": json.dumps({"source_line": "main"}),
                "RC_ASSERTION_OUTPUT_DIR": str(assertion_dir),
            })
            result = subprocess.run(
                ["node", "scripts/check-old-workspace-cli.mjs", "--out", str(out)],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
                env=env,
            )
            self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
            report = json.loads(out.read_text())
            assertion_names = sorted(path.name for path in assertion_dir.iterdir())
            assertions = {
                path.stem: json.loads(path.read_text())
                for path in assertion_dir.iterdir()
            }
        self.assertEqual(report["result"], "pass")
        self.assertEqual(report["coverage"], "slice")
        self.assertEqual(report["line"], "main")
        self.assertEqual(report["group"], "old-workspace-cli")
        self.assertEqual(report["g04_claim"], "not-passed")
        self.assertEqual(report["g05_claim"], "not-passed")
        self.assertFalse(report["tarball_used"])
        self.assertEqual(report["cli"]["path"], "migration/dist/package/bin/migrate-legacy.js")
        cli_bytes = CLI_BIN.read_bytes()
        self.assertEqual(report["cli"]["sha256"], hashlib.sha256(cli_bytes).hexdigest())
        self.assertEqual(report["cli"]["bytes"], len(cli_bytes))
        self.assertEqual(report["discovered_fixture_count"], len(catalog["cases"]))
        self.assertEqual(report["case_ids"], expected_ids)
        self.assertEqual(report["workspace"]["material_version"], "16.2.14")
        self.assertEqual(
            report["workspace"]["material_manifest_sha256"],
            provenance["isolated_environment"]["material_manifest_sha256"],
        )
        self.assertTrue(report["workspace"]["material_manifest_matches_provenance"])
        self.assertTrue(report["workspace"]["legacy_button_entry"])
        self.assertTrue(report["workspace"]["package_json"])
        self.assertTrue(report["workspace"]["package_json_unchanged"])
        self.assertEqual(report["workspace"]["files_scanned"], len(expected_ids))
        self.assertEqual(report["workspace"]["applied"], len(expected_ids))
        self.assertEqual(report["workspace"]["blocking"], 0)
        argv = report["command_argv"]
        self.assertTrue(argv[1].endswith("migration/dist/package/bin/migrate-legacy.js"))
        self.assertNotIn("--apply", argv[0])
        self.assertEqual(argv[3:5], ["--apply", "--json"])
        self.assertTrue(all(not str(arg).endswith(".tgz") for arg in argv))
        by_id = {case["id"]: case for case in catalog["cases"]}
        self.assertEqual([change["case_id"] for change in report["changes"]], expected_ids)
        for change in report["changes"]:
            fixture = by_id[change["case_id"]]
            self.assertEqual(change["before"], fixture["before"])
            self.assertEqual(change["after"], fixture["expected_after"])
            self.assertNotEqual(change["before"], change["after"])
            self.assertTrue(change["changed"])
            self.assertTrue(change["applied"])
            self.assertTrue(change["path"].startswith("src/"))
        self.assertEqual(set(report["not_rostered"]), set(by_id) - set(expected_ids))
        for group, ids in report["other_groups"].items():
            self.assertIsNone(ids, group)
        for group, ids in report["cases_by_line_21x"].items():
            self.assertIsNone(ids, group)
        self.assertEqual(assertion_names, sorted(f"{case_id}.json" for case_id in expected_ids))
        for case_id in expected_ids:
            body = assertions[case_id]
            self.assertEqual(body["case_id"], case_id)
            self.assertEqual(body["result"], "pass")
            self.assertEqual(body["kind"], "assertion")
            self.assertEqual(body["group"], "old-workspace-cli")
            self.assertEqual(body["cli_path"], report["cli"]["path"])
            self.assertEqual(body["cli_sha256"], report["cli"]["sha256"])
            self.assertFalse(body["tarball_used"])
            self.assertEqual(body["g04_claim"], "not-passed")
            self.assertEqual(body["g05_claim"], "not-passed")
            self.assertEqual(body["material_version"], "16.2.14")
            self.assertIsNone(body["not_executed"]["packaged-schematic"])
            self.assertIsNone(body["not_executed"]["transaction-negatives"])
            self.assertIsNone(body["not_executed"]["frontend-parity"])
            self.assertIsNone(body["not_executed"]["21.x"])

        matrix = json.loads(MATRIX.read_text())
        row = next(item for item in matrix["checks"] if item["check_id"] == "migration-packaged")
        self.assertTrue(row["implemented"])
        main = row["acceptance"]["cases_by_line"]["main"]
        self.assertEqual(main["old-workspace-cli"], expected_ids)
        self.assertIsNone(main["packaged-schematic"])
        self.assertIsNone(main["transaction-negatives"])
        self.assertIsNone(main["frontend-parity"])
        for group, ids in row["acceptance"]["cases_by_line"]["21.x"].items():
            self.assertIsNone(ids, group)
        self.assertEqual(row["acceptance"]["gates"], ["G04", "G05"])


if __name__ == "__main__":
    unittest.main()
