#!/usr/bin/env python3
"""Declared package name, version, license, and provenance fields are compared."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from rc_acceptance import validate_matrix  # noqa: E402


def node_eval(script: str, payload: dict | None = None) -> dict:
    args = ["node", "--input-type=module", "-e", script]
    if payload is not None:
        args.append(json.dumps(payload))
    result = subprocess.run(
        args,
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise AssertionError(result.stderr or result.stdout)
    return json.loads(result.stdout)


class ReleaseMetadataTests(unittest.TestCase):
    def test_mismatch_and_missing_license_text_fail(self):
        report = node_eval(
            """
import {compareReleaseMetadata} from './scripts/check-release-metadata.mjs';
const input = JSON.parse(process.argv[1]);
const drifted = compareReleaseMetadata(input);
const missing = compareReleaseMetadata({...input, libraryLicense: '', rootLicense: ''});
console.log(JSON.stringify({
  drifted: drifted.comparisons.filter(item => item.result !== 'pass').map(item => item.case_id),
  drifted_errors: drifted.errors,
  missing_errors: missing.errors,
  missing_license: missing.comparisons.find(item => item.case_id === 'library-license-text'),
}));
""",
            {
                "libraryManifest": {
                    "name": "@ngx-compat/material-legacy",
                    "version": "22.0.0-rc.0",
                    "license": "MIT",
                    "repository": {"url": "git+https://github.com/buu700/ngx-compat-material-legacy.git"},
                },
                "libraryDeclared": {
                    "name": "@ngx-compat/other",
                    "version": "0.0.0",
                    "license": "Apache-2.0",
                },
                "libraryLicense": "Copyright (c) 2023 Google LLC.\nCopyright (c) 2026 Ryan Lester.\nPermission is hereby granted, free of charge\nThe above copyright notice and this permission notice shall be included\nTHE SOFTWARE IS PROVIDED \"AS IS\"\n",
                "rootLicense": "not the same license\n",
                "cliManifest": {"name": "cli", "version": "nope", "license": "MIT"},
                "cliRecord": {"package_name": "other-cli", "version": "1.2.3"},
                "cliLicense": "Copyright (c) 2023 Google LLC.\nCopyright (c) 2026 Ryan Lester.\nPermission is hereby granted, free of charge\nThe above copyright notice and this permission notice shall be included\nTHE SOFTWARE IS PROVIDED \"AS IS\"\n",
                "provenance": {
                    "baseline_repository": "https://github.com/angular/components",
                    "baseline_tag": "16.2.14",
                    "baseline_full_commit": "df60e733c60e572ba538f6ad0ceff3e63e527b53",
                    "baseline_git_tag": "baseline/angular-components-16.2.x",
                    "repository": "https://github.com/example/not-this-repo.git",
                },
                "provenanceText": "no provenance facts here",
            },
        )
        self.assertIn("library-name", report["drifted"])
        self.assertIn("library-version", report["drifted"])
        self.assertIn("library-license", report["drifted"])
        self.assertIn("library-license-text", report["drifted"])
        self.assertIn("cli-name", report["drifted"])
        self.assertIn("cli-version", report["drifted"])
        self.assertIn("baseline-commit", report["drifted"])
        self.assertIn("repository", report["drifted"])
        self.assertTrue(any("SOURCE-PROVENANCE.md" in error or "provenance" in error for error in report["drifted_errors"]))
        self.assertTrue(any("projects/ngx-material-legacy/LICENSE" in error for error in report["missing_errors"]))
        self.assertFalse(report["missing_license"]["left"]["clauses_present"])

    def test_main_roster_matches_executed_fields(self):
        matrix = json.loads((ROOT / "compatibility/rc/matrices/full-verify.json").read_text())
        validate_matrix(matrix)
        row = next(item for item in matrix["checks"] if item["check_id"] == "release-metadata")
        self.assertTrue(row["implemented"])
        self.assertTrue(row["required"])
        expected = node_eval(
            """
import {compareReleaseMetadata, idsFor} from './scripts/check-release-metadata.mjs';
import {readFileSync} from 'node:fs';
const read = (path) => readFileSync(path, 'utf8');
const json = (path) => JSON.parse(read(path));
const compared = compareReleaseMetadata({
  libraryManifest: json('projects/ngx-material-legacy/package.json'),
  libraryDeclared: json('compatibility/library-package-metadata.json'),
  libraryLicense: read('projects/ngx-material-legacy/LICENSE'),
  rootLicense: read('LICENSE'),
  cliManifest: json('migration/dist/package/package.json'),
  cliRecord: json('compatibility/migrate-legacy-cli-artifact.json'),
  cliLicense: read('migration/dist/package/LICENSE'),
  provenance: json('compatibility/provenance.json'),
  provenanceText: read('projects/ngx-material-legacy/SOURCE-PROVENANCE.md'),
});
console.log(JSON.stringify({
  packageIds: idsFor(compared.comparisons, 'package-metadata-license'),
  provenanceIds: idsFor(compared.comparisons, 'instructions-provenance'),
  errors: compared.errors,
  approved: Object.hasOwn(compared, 'approved'),
}));
"""
        )
        self.assertEqual(expected["errors"], [])
        self.assertFalse(expected["approved"])
        main = row["acceptance"]["cases_by_line"]["main"]
        self.assertEqual(main["package-metadata-license"], expected["packageIds"])
        self.assertEqual(main["instructions-provenance"], expected["provenanceIds"])
        for group, ids in row["acceptance"]["cases_by_line"]["21.x"].items():
            self.assertIsNone(ids, group)

    def test_workspace_writes_one_assertion_per_field(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            out = tmp_path / "release-metadata.json"
            invocation = "workspacemetadata"
            assertion_dir = tmp_path / "evidence" / "release-metadata" / invocation
            assertion_dir.mkdir(parents=True)
            env = os.environ.copy()
            env.update({
                "RC_CHECK_ID": "release-metadata",
                "RC_RUN_ID": "workspace-metadata",
                "RC_INVOCATION_ID": invocation,
                "RC_EVIDENCE_BINDING": json.dumps({"source_line": "main"}),
                "RC_ASSERTION_OUTPUT_DIR": str(assertion_dir),
            })
            result = subprocess.run(
                ["node", "scripts/check-release-metadata.mjs", "--out", str(out)],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
                env=env,
            )
            self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
            report = json.loads(out.read_text())
            self.assertEqual(report["result"], "pass")
            self.assertEqual(report["coverage"], "slice")
            self.assertEqual(report["g01_claim"], "not-passed")
            self.assertEqual(report["g13_claim"], "not-passed")
            self.assertNotIn("approved", report)
            self.assertFalse(report.get("approved") is True)
            ids = report["rostered_groups"]["package-metadata-license"] + report["rostered_groups"]["instructions-provenance"]
            self.assertEqual(len(ids), len(report["comparisons"]))
            names = sorted(path.name for path in assertion_dir.iterdir())
            self.assertEqual(len(names), len(ids))
            for comparison in report["comparisons"]:
                self.assertEqual(comparison["result"], "pass")
                body = json.loads((assertion_dir / f"{comparison['case_id']}.json").read_text())
                self.assertEqual(body["case_id"], comparison["case_id"])
                self.assertEqual(body["field"], comparison["field"])
                self.assertEqual(body["result"], "pass")
                self.assertEqual(body["kind"], "assertion")
                self.assertEqual(body["line"], "main")
                self.assertEqual(body["g01_claim"], "not-passed")
                self.assertEqual(body["g13_claim"], "not-passed")
                self.assertNotIn("approved", body)
                self.assertIsNone(body["not_executed"]["21.x"]["package-metadata-license"])
                self.assertIsNone(body["not_executed"]["21.x"]["instructions-provenance"])

    def test_21x_binding_writes_no_assertions(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            out = tmp_path / "release-metadata.json"
            invocation = "line21metadata"
            assertion_dir = tmp_path / "evidence" / "release-metadata" / invocation
            assertion_dir.mkdir(parents=True)
            env = os.environ.copy()
            env.update({
                "RC_CHECK_ID": "release-metadata",
                "RC_RUN_ID": "line-21",
                "RC_INVOCATION_ID": invocation,
                "RC_EVIDENCE_BINDING": json.dumps({"source_line": "21.x"}),
                "RC_ASSERTION_OUTPUT_DIR": str(assertion_dir),
            })
            result = subprocess.run(
                ["node", "scripts/check-release-metadata.mjs", "--out", str(out)],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
                env=env,
            )
            self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
            self.assertEqual(list(assertion_dir.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
