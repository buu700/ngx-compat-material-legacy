#!/usr/bin/env python3
"""FRESH-03 producers keep reviewed case ids and reject incomplete eligibility."""
from __future__ import annotations

import importlib.util
import json
import unittest
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


POLICY = load("check_source_policy", "check-source-policy.py")
ELIGIBILITY = load("check_dependency_eligibility", "check-dependency-eligibility.py")


class Fresh03AdmissionTests(unittest.TestCase):
    def test_matrix_main_ids_match_the_producers(self) -> None:
        matrix = json.loads((ROOT / "compatibility/rc/matrices/full-verify.json").read_text())
        rows = {row["check_id"]: row for row in matrix["checks"]}
        import re
        audit_text = (ROOT / "scripts/check-upstream-audit-disposition.mjs").read_text()
        audit_ids = re.findall(r"'(upstream-audit/[^']+)'", audit_text)
        audit_groups = {}
        for group, case_id in re.findall(
            r"\['([^']+)', '(upstream-audit/[^']+)',", audit_text
        ):
            audit_groups.setdefault(group, []).append(case_id)
        for check_id, cases in (
            ("upstream-audit-disposition", audit_groups),
            ("source-policy", POLICY.MAIN_CASES),
            ("dependency-eligibility", ELIGIBILITY.MAIN_CASES),
        ):
            self.assertTrue(rows[check_id]["implemented"])
            self.assertEqual(rows[check_id]["acceptance"]["cases_by_line"]["main"], cases)
            self.assertTrue(all(value is None for value in rows[check_id]["acceptance"]["cases_by_line"]["21.x"].values()))
        self.assertEqual(len(audit_ids), sum(len(v) for v in audit_groups.values()))

    def test_stored_query_mutations_stay_unknown_or_blocked(self) -> None:
        now = datetime(2026, 10, 3, tzinfo=timezone.utc)
        peers = {"exact_packages": {"@angular/core": "22.1.7"}}
        clean = {
            "result": "queried",
            "http_status": 200,
            "cutoff": "2026-10-02T18:00:00Z",
            "endpoint": "https://api.osv.dev/v1/querybatch",
            "packages": [{"name": "@angular/core", "version": "22.1.7", "vulns": []}],
        }
        self.assertTrue(ELIGIBILITY.assess_stored_query(clean, peers, now)["ok"])
        for mutated, token in (
            ({**clean, "http_status": 500}, "unknown"),
            ({**clean, "result": "failed"}, "unknown"),
            ({**clean, "cutoff": "2020-01-01T00:00:00Z"}, "stale"),
            ({**clean, "cutoff": "2099-01-01T00:00:00Z"}, "future"),
            ({**clean, "truncated": True}, "truncated"),
        ):
            assessed = ELIGIBILITY.assess_stored_query(mutated, peers, now)
            self.assertFalse(assessed["ok"], mutated)
            self.assertEqual(assessed["result"], "unknown")
            self.assertTrue(any(token in error for error in assessed["errors"]), assessed)
        finding = json.loads(json.dumps(clean))
        finding["packages"][0]["vulns"] = [{"id": "GHSA-test"}]
        blocked = ELIGIBILITY.assess_stored_query(finding, peers, now)
        self.assertFalse(blocked["ok"])
        self.assertEqual(blocked["result"], "blocked")

    def test_current_tree_is_not_eligible_or_policy_clean(self) -> None:
        now = datetime(2026, 10, 3, tzinfo=timezone.utc)
        eligibility = ELIGIBILITY.evaluate(ROOT, now, lookup_performed=False)
        failed = {item["case_id"] for item in eligibility["cases"] if item["result"] != "pass"}
        self.assertIn("dependency-eligibility/locks-tools-maturity/lookup-http-known", failed)
        self.assertIn("dependency-eligibility/locks-tools-maturity/lock-transitive-coverage", failed)
        self.assertIn("dependency-eligibility/vendor-provenance-license/vendor-advisory", failed)
        self.assertGreater(eligibility["uncovered_lock_packages"], 0)
        self.assertEqual(eligibility["security_clearance"], "not-passed")
        passed = {item["case_id"] for item in eligibility["cases"] if item["result"] == "pass"}
        self.assertIn("dependency-eligibility/vendor-provenance-license/manifest-hashes", passed)
        policy = POLICY.evaluate(ROOT / "projects/ngx-material-legacy", POLICY.load_policy(POLICY.POLICY), None, None)
        policy_failed = {item["case_id"] for item in policy["cases"] if item["result"] != "pass"}
        self.assertNotIn("source-policy/authored-boundary/no-animations-module", policy_failed)
        self.assertNotIn("source-policy/authored-boundary/no-deep-internal", policy_failed)
        self.assertNotIn("source-policy/authored-boundary/no-private-namespace-member", policy_failed)
        self.assertIn("source-policy/authored-boundary/installed-annotation-comparison", policy_failed)
        self.assertEqual(policy["authored_violation_count"], 0)
        self.assertEqual(policy["annotation_files"], 0)


    def test_http_200_lookup_is_not_clearance(self) -> None:
        now = datetime(2026, 10, 3, tzinfo=timezone.utc)
        peers = json.loads((ROOT / "compatibility/peers-22.proposed.json").read_text())
        rows = {
            f"{name}@{version}": {"name": name, "version": version, "vulns": []}
            for name, version in peers["exact_packages"].items()
        }
        lookup = {
            "http_status": 200,
            "result": "queried",
            "truncated": False,
            "cutoff": "2026-10-03T12:00:00+00:00",
            "rows": rows,
            "uncovered": ["left-out@1.0.0"],
            "age_unknown": ["left-out@1.0.0: publish time missing"],
            "age_young": [],
            "toolchain_ok": False,
            "toolchain_detail": "node unknown",
            "vendor_ok": False,
            "vendor_detail": "vendor version was not on the registry",
            "unresolved": [],
        }
        observed = ELIGIBILITY.evaluate(ROOT, now, lookup_performed=True, lookup=lookup)
        self.assertEqual(observed["security_clearance"], "not-passed")
        failed = {item["case_id"] for item in observed["cases"] if item["result"] != "pass"}
        self.assertIn("dependency-eligibility/locks-tools-maturity/lock-transitive-coverage", failed)
        self.assertIn("dependency-eligibility/locks-tools-maturity/toolchain-age-known", failed)
        self.assertIn("dependency-eligibility/vendor-provenance-license/vendor-advisory", failed)
        self.assertIn("dependency-eligibility/locks-tools-maturity/lookup-http-known", 
                      {item["case_id"] for item in observed["cases"] if item["result"] == "pass"})

if __name__ == "__main__":
    unittest.main()
