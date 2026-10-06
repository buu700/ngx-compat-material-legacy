#!/usr/bin/env python3
"""21.x package name, version, license, and provenance fields are compared."""
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


MISMATCH = {
    "libraryManifest": {
        "name": "@ngx-compat/material-legacy",
        "version": "21.0.0-rc.0",
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
        "current_reference_tag": "v22.2.0",
        "current_reference_full_commit": None,
        "source_adaptations": [],
        "repository": "https://github.com/example/not-this-repo.git",
    },
    "provenanceText": "no provenance facts here",
}


class ReleaseMetadataTests(unittest.TestCase):
    def test_mismatch_and_missing_license_text_fail(self):
        report = node_eval(
            """
import {compareReleaseMetadata, rosterReleaseMetadata, unmatchedProvenanceFields} from './scripts/check-release-metadata.mjs';
const input = JSON.parse(process.argv[1]);
const drifted = compareReleaseMetadata(input);
const missing = compareReleaseMetadata({...input, libraryLicense: '', rootLicense: ''});
const refused = [
  ...unmatchedProvenanceFields(input.provenance, input.provenanceText),
  ...drifted.comparisons
    .filter(item => item.group === 'instructions-provenance' && item.result !== 'pass')
    .map(item => ({field: item.field, case_id: item.case_id, reason: 'provenance field does not match'})),
];
const roster = rosterReleaseMetadata(drifted.comparisons, refused);
console.log(JSON.stringify({
  drifted: drifted.comparisons.filter(item => item.result !== 'pass').map(item => item.case_id),
  drifted_errors: drifted.errors,
  missing_errors: missing.errors,
  missing_license: missing.comparisons.find(item => item.case_id === 'library-license-text'),
  roster,
  refused: refused.map(item => item.case_id),
  library_version: drifted.comparisons.find(item => item.case_id === 'library-version').left.value,
}));
""",
            MISMATCH,
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
        self.assertEqual(report["library_version"], "21.0.0-rc.0")
        for case_id in ("baseline-repository", "baseline-tag", "baseline-commit", "baseline-git-tag", "repository",
                        "current-reference-tag", "current-reference-commit", "source-adaptations"):
            self.assertNotIn(case_id, report["roster"]["instructions-provenance"] or [])
        self.assertIn("library-name", report["roster"]["package-metadata-license"])
        self.assertNotIn("readme-instructions", json.dumps(report["roster"]))

    def test_instruction_ids_and_failed_provenance_are_not_rostered(self):
        report = node_eval(
            """
import {rosterReleaseMetadata} from './scripts/check-release-metadata.mjs';
const roster = rosterReleaseMetadata([
  {group: 'package-metadata-license', case_id: 'library-name', result: 'pass'},
  {group: 'package-metadata-license', case_id: 'readme-instructions', result: 'pass'},
  {group: 'instructions-provenance', case_id: 'baseline-tag', result: 'fail'},
  {group: 'instructions-provenance', case_id: 'baseline-commit', result: 'pass'},
  {group: 'instructions-provenance', case_id: 'migration-instructions', result: 'pass'},
], [{case_id: 'current-reference-tag', field: 'current_reference_tag'}]);
console.log(JSON.stringify(roster));
"""
        )
        self.assertEqual(report["package-metadata-license"], ["library-name"])
        self.assertEqual(report["instructions-provenance"], ["baseline-commit"])

    def test_21x_roster_matches_executed_fields(self):
        matrix = json.loads((ROOT / "compatibility/rc/matrices/full-verify.json").read_text())
        validate_matrix(matrix)
        row = next(item for item in matrix["checks"] if item["check_id"] == "release-metadata")
        self.assertTrue(row["implemented"])
        self.assertTrue(row["required"])
        self.assertEqual(row["acceptance"]["gates"], ["G01", "G13"])
        expected = node_eval(
            """
import {compareReleaseMetadata, rosterReleaseMetadata, unmatchedProvenanceFields} from './scripts/check-release-metadata.mjs';
import {readFileSync, existsSync} from 'node:fs';
const read = (path) => readFileSync(path, 'utf8');
const json = (path) => JSON.parse(read(path));
const provenance = json('compatibility/provenance.json');
const provenanceText = read('projects/ngx-material-legacy/SOURCE-PROVENANCE.md');
const cliLicensePresent = existsSync('migration/dist/package/LICENSE');
const compared = compareReleaseMetadata({
  libraryManifest: json('projects/ngx-material-legacy/package.json'),
  libraryDeclared: json('compatibility/library-package-metadata.json'),
  libraryLicense: read('projects/ngx-material-legacy/LICENSE'),
  rootLicense: read('LICENSE'),
  cliManifest: json('migration/dist/package/package.json'),
  cliRecord: json('compatibility/migrate-legacy-cli-artifact.json'),
  cliLicensePresent,
  cliLicense: cliLicensePresent ? read('migration/dist/package/LICENSE') : '',
  provenance,
  provenanceText,
});
const refused = unmatchedProvenanceFields(provenance, provenanceText);
const roster = rosterReleaseMetadata(compared.comparisons, refused);
console.log(JSON.stringify({
  roster,
  errors: compared.errors,
  approved: Object.hasOwn(compared, 'approved'),
  libraryVersion: compared.comparisons.find(item => item.case_id === 'library-version').left.value,
  refused: refused.map(item => item.case_id),
}));
"""
        )
        self.assertEqual(expected["errors"], [])
        self.assertFalse(expected["approved"])
        self.assertEqual(expected["libraryVersion"], "21.0.0-rc.0")
        self.assertNotEqual(expected["libraryVersion"], "22.0.0-rc.0")
        main = row["acceptance"]["cases_by_line"]["main"]
        for group, ids in main.items():
            self.assertIsNone(ids, group)
        line = row["acceptance"]["cases_by_line"]["21.x"]
        self.assertEqual(line["package-metadata-license"], expected["roster"]["package-metadata-license"])
        self.assertEqual(line["instructions-provenance"], expected["roster"]["instructions-provenance"])
        rostered = line["package-metadata-license"] + line["instructions-provenance"]
        for case_id in expected["refused"]:
            self.assertNotIn(case_id, rostered)
        self.assertNotIn("current-reference-tag", rostered)
        self.assertNotIn("current-reference-commit", rostered)
        self.assertNotIn("source-adaptations", rostered)
        self.assertTrue(all("instruction" not in case_id for case_id in rostered))

    def test_workspace_writes_slice_assertions_for_rostered_fields(self):
        version_before = json.loads((ROOT / "projects/ngx-material-legacy/package.json").read_text())["version"]
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
            report = json.loads(out.read_text())
            self.assertEqual(report["result"], "pass")
            self.assertEqual(report["coverage"], "slice")
            self.assertEqual(report["line"], "21.x")
            self.assertEqual(report["g01_claim"], "not-passed")
            self.assertEqual(report["g13_claim"], "not-passed")
            self.assertNotIn("approved", report)
            self.assertFalse(report.get("approved") is True)
            self.assertFalse(report["version_rewritten"])
            self.assertEqual(report["observed_library_version"], "21.0.0-rc.0")
            self.assertEqual(report["instruction_case_ids"], [])
            refused = {item["case_id"] for item in report["refused_fields"]}
            self.assertIn("current-reference-tag", refused)
            self.assertIn("current-reference-commit", refused)
            self.assertIn("source-adaptations", refused)
            ids = report["rostered_groups"]["package-metadata-license"] + report["rostered_groups"]["instructions-provenance"]
            self.assertTrue(ids)
            self.assertTrue(refused.isdisjoint(ids))
            names = sorted(path.name for path in assertion_dir.iterdir())
            self.assertEqual(names, sorted(f"{case_id}.json" for case_id in ids))
            for comparison in report["comparisons"]:
                self.assertEqual(comparison["result"], "pass")
                if comparison["case_id"] not in ids:
                    self.assertFalse((assertion_dir / f"{comparison['case_id']}.json").exists())
                    continue
                body = json.loads((assertion_dir / f"{comparison['case_id']}.json").read_text())
                self.assertEqual(body["case_id"], comparison["case_id"])
                self.assertEqual(body["field"], comparison["field"])
                self.assertEqual(body["result"], "pass")
                self.assertEqual(body["kind"], "assertion")
                self.assertEqual(body["line"], "21.x")
                self.assertEqual(body["g01_claim"], "not-passed")
                self.assertEqual(body["g13_claim"], "not-passed")
                self.assertNotIn("approved", body)
                self.assertIsNone(body["not_executed"]["main"]["package-metadata-license"])
                self.assertIsNone(body["not_executed"]["main"]["instructions-provenance"])
            self.assertNotIn("coverage", json.loads((assertion_dir / f"{ids[0]}.json").read_text()))
        version_after = json.loads((ROOT / "projects/ngx-material-legacy/package.json").read_text())["version"]
        self.assertEqual(version_after, version_before)
        self.assertEqual(version_after, "21.0.0-rc.0")

    def test_main_binding_writes_no_assertions(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            out = tmp_path / "release-metadata.json"
            invocation = "mainmetadata"
            assertion_dir = tmp_path / "evidence" / "release-metadata" / invocation
            assertion_dir.mkdir(parents=True)
            env = os.environ.copy()
            env.update({
                "RC_CHECK_ID": "release-metadata",
                "RC_RUN_ID": "line-main",
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
            self.assertEqual(list(assertion_dir.iterdir()), [])
            report = json.loads(out.read_text())
            self.assertEqual(report["coverage"], "slice")
            self.assertEqual(report["g01_claim"], "not-passed")
            self.assertEqual(report["g13_claim"], "not-passed")


if __name__ == "__main__":
    unittest.main()
