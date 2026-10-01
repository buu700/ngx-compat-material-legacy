#!/usr/bin/env python3
"""RC-02: CI pack lane must use a unique non-draft run directory."""
from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CI = (ROOT / ".github" / "workflows" / "ci.yml").read_text()


class CiFreshPackPathTests(unittest.TestCase):
    def test_ci_does_not_pack_into_artifacts_main_draft(self):
        # Refuse a literal --out pointing at the fixed draft path.
        self.assertIsNone(
            re.search(r"--out\s+artifacts/main/draft\b", CI),
            "CI must not pack into the fixed artifacts/main/draft path",
        )

    def test_ci_uses_entry_sha_run_directory(self):
        self.assertIn("artifacts/main/entry-${GITHUB_SHA}", CI)
        self.assertIn('test ! -e "$RUN"', CI)

    def test_ci_consumer_uses_run_dir_output(self):
        self.assertIn("steps.pack.outputs.run_dir", CI)
        self.assertIn("packed-consumer -- --run", CI)

    def test_ci_runs_artifact_bound_legacy_family(self):
        self.assertIn("test-legacy -- --family card --run", CI)
        self.assertIn("Upload entry run directory", CI)


if __name__ == "__main__":
    unittest.main()
