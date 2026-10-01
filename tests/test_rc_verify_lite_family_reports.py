from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("rc_verify_lite", ROOT / "scripts/rc-verify-lite.py")
assert spec and spec.loader
lite = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lite)


def _valid_family_report(candidate: str) -> dict:
    return {
        "schema_version": 1,
        "runner": "test",
        "mode": "normal",
        "totals": {"executed": 1, "passed": 1, "failed": 0, "skipped": 0},
        "failures": [],
        "mapped_specs": [
            {
                "historical_path": "src/material/legacy-card/testing/card-harness.spec.ts",
                "candidate": candidate,
                "disposition": "executed",
            }
        ],
    }


def _valid_sass_aggregate() -> dict:
    return {
        "schema_version": 1,
        "role": "all-legacy aggregate membership",
        "historical_sha256": "a" * 64,
        "historical_includes": ["card-theme"],
        "owned_includes": ["card-theme"],
        "same_order": True,
        "owned_only_includes": [],
        "companions_in_owned_only": [],
        "limitations": ["fixture"],
    }


class FamilyReportClassifier(unittest.TestCase):
    def test_sass_aggregate_beside_valid_family_report_passes(self):
        candidate = "projects/ngx-material-legacy/legacy-card/testing/card-harness.spec.ts"
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            reports = root / "compatibility/rc/reports"
            reports.mkdir(parents=True)
            (reports / "legacy-aggregate.json").write_text(
                json.dumps(_valid_sass_aggregate(), indent=2) + "\n"
            )
            (reports / "legacy-card.json").write_text(
                json.dumps(_valid_family_report(candidate), indent=2) + "\n"
            )
            candidate_path = root / candidate
            candidate_path.parent.mkdir(parents=True)
            candidate_path.write_text("// fixture\n")
            # Broad legacy-*.json would still see the aggregate; registry dispatch must not.
            self.assertEqual(
                sorted(p.name for p in reports.glob("legacy-*.json")),
                ["legacy-aggregate.json", "legacy-card.json"],
            )
            lite.check_family_reports(
                {candidate},
                {"card"},
                reports_dir=reports,
                root=root,
            )

    def test_malformed_genuine_family_report_fails(self):
        candidate = "projects/ngx-material-legacy/legacy-card/testing/card-harness.spec.ts"
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            reports = root / "compatibility/rc/reports"
            reports.mkdir(parents=True)
            (reports / "legacy-aggregate.json").write_text(
                json.dumps(_valid_sass_aggregate(), indent=2) + "\n"
            )
            bad = _valid_family_report(candidate)
            del bad["totals"]
            (reports / "legacy-card.json").write_text(json.dumps(bad, indent=2) + "\n")
            candidate_path = root / candidate
            candidate_path.parent.mkdir(parents=True)
            candidate_path.write_text("// fixture\n")
            with self.assertRaises(SystemExit) as ctx:
                lite.check_family_reports(
                    {candidate},
                    {"card"},
                    reports_dir=reports,
                    root=root,
                )
            self.assertEqual(ctx.exception.code, 1)

    def test_inventory_families_are_explicit_registry(self):
        families = lite.inventory_families(
            [{"family": "card"}, {"family": "select"}, {"family": "card"}]
        )
        self.assertEqual(families, {"card", "select"})
        self.assertNotIn("aggregate", families)


if __name__ == "__main__":
    unittest.main()
