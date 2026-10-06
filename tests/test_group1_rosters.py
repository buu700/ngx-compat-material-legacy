"""Browser-free roster regressions for FIN-07 B group 1."""
from __future__ import annotations
import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class Group1RosterTests(unittest.TestCase):
    def test_motion_host_motion_roster_matches_derived_cases(self):
        matrix = json.loads((ROOT / "compatibility/rc/matrices/full-verify.json").read_text())
        row = next(c for c in matrix["checks"] if c["check_id"] == "motion-smoke")
        derived = json.loads(subprocess.check_output(
            ["node", "--input-type=module", "-e",
             "import {HOST_MOTION_CASES} from './scripts/motion-lifecycle-smoke.mjs';"
             "console.log(JSON.stringify(HOST_MOTION_CASES));"],
            cwd=ROOT, text=True,
        ))
        self.assertEqual(row["acceptance"]["cases_by_line"]["21.x"]["host-motion"], derived)
        self.assertEqual(len(derived), 46)

    def test_companion_bridge_roster_matches_allowed_lists(self):
        matrix = json.loads((ROOT / "compatibility/rc/matrices/full-verify.json").read_text())
        row = next(c for c in matrix["checks"] if c["check_id"] == "companion-bridge-tokens")
        derived = json.loads(subprocess.check_output(
            ["node", "--input-type=module", "-e",
             "import {readFileSync} from 'node:fs';"
             "import {parseAllowedLists, rosterCaseIds} from './scripts/companion-bridge-peer-oracle.mjs';"
             "const allowed = parseAllowedLists(readFileSync("
             "'projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss','utf8'));"
             "console.log(JSON.stringify(rosterCaseIds(allowed)));"],
            cwd=ROOT, text=True,
        ))
        self.assertEqual(row["acceptance"]["cases_by_line"]["21.x"]["compiled-override-tokens"], derived)
        self.assertEqual(len(derived), 161)
        self.assertIsNone(row["acceptance"]["cases_by_line"]["main"]["compiled-override-tokens"])

    def test_release_metadata_is_implemented_with_21x_roster(self):
        matrix = json.loads((ROOT / "compatibility/rc/matrices/full-verify.json").read_text())
        row = next(c for c in matrix["checks"] if c["check_id"] == "release-metadata")
        self.assertTrue(row["implemented"])
        line = row["acceptance"]["cases_by_line"]["21.x"]
        self.assertEqual(len(line["package-metadata-license"]), 8)
        self.assertEqual(len(line["instructions-provenance"]), 5)
        for ids in row["acceptance"]["cases_by_line"]["main"].values():
            self.assertIsNone(ids)


if __name__ == "__main__":
    unittest.main()
