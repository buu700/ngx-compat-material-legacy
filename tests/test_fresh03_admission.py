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
            if check_id == "source-policy":
                self.assertTrue(all(value is None for value in rows[check_id]["acceptance"]["cases_by_line"]["21.x"].values()))
            else:
                self.assertEqual(rows[check_id]["acceptance"]["cases_by_line"]["21.x"], cases)
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

    def test_symlinked_peer_declarations_are_compared(self) -> None:
        import os
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            real = root / "node_modules" / ".pnpm" / "core"
            real.mkdir(parents=True)
            (real / "package.json").write_text(json.dumps({"exports": {".": {"types": "./index.d.ts"}}}))
            (real / "index.d.ts").write_text(
                "export class StableThing {}\n"
                "/** @docs-private */\nexport class PrivateThing {}\n"
                "/** @deprecated */\nexport class OldThing {}\n"
            )
            linked_root = root / "node_modules" / "@angular"
            linked_root.mkdir(parents=True)
            os.symlink(real, linked_root / "core")
            names, files = POLICY.annotated_names(linked_root, "@docs-private")
            self.assertEqual(files, 1)
            self.assertIn("PrivateThing", names)
            authored = root / "src"
            authored.mkdir()
            (authored / "use.ts").write_text("import {StableThing} from '@angular/core';\n")
            observed = POLICY.evaluate(authored, {"rules": []}, None, linked_root)
            case = next(item for item in observed["cases"] if item["case_id"].endswith("installed-annotation-comparison"))
            self.assertEqual(case["result"], "pass", case)
            self.assertGreater(observed["annotation_files"], 0)
            (authored / "use.ts").write_text("import {PrivateThing,OldThing} from '@angular/core';\n")
            observed = POLICY.evaluate(authored, {"rules": []}, None, linked_root)
            self.assertEqual(observed["annotation_private_hits"][0]["name"], "PrivateThing")
            self.assertEqual(observed["annotation_deprecated_hits"][0]["name"], "OldThing")

    def test_blocked_record_stays_blocking(self) -> None:
        rows = {"braces@3.0.3": {"name": "braces", "version": "3.0.3", "vulns": [{"id": "GHSA-vfj7-8cjw-p6xm"}]}}
        record = {
            "package": "braces",
            "version": "3.0.3",
            "advisory_id": "GHSA-vfj7-8cjw-p6xm",
            "classification": "blocked",
            "fixed_version": None,
            "dependency_path": ["devDependency karma@6.4.4", "braces@3.0.3"],
            "reason": "No patched release exists, so a blocked classification stays blocking.",
        }
        classified = ELIGIBILITY.classify_live_findings(rows, ["braces@3.0.3"], {"braces@3.0.3": [record]})
        self.assertEqual(classified["blocked"], ["braces@3.0.3"])
        self.assertEqual(classified["excepted"], [])
        self.assertEqual(classified["unresolved"], [])

    def test_unverified_braces_claim_stays_unresolved(self) -> None:
        from datetime import datetime, timezone
        rows = {"braces@3.0.3": {"name": "braces", "version": "3.0.3", "vulns": [{"id": "GHSA-vfj7-8cjw-p6xm"}]}}
        dispositions = ELIGIBILITY.load_finding_dispositions(ROOT)
        record = dispositions["braces@3.0.3"][0]
        self.assertEqual(record["classification"], "pending-owner-authority")
        self.assertEqual(record["prior_unverified_record"]["classification"], "temporary-exception")
        self.assertIsNone(record["fixed_version"])
        self.assertEqual(record["registry_latest"], "3.0.3")
        self.assertEqual(record["expires_on"], "2026-11-04")
        during = datetime(2026, 10, 4, tzinfo=timezone.utc)
        classified = ELIGIBILITY.classify_live_findings(rows, ["braces@3.0.3"], dispositions, during)
        self.assertEqual(classified["excepted"], [])
        self.assertEqual(classified["blocked"], [])
        self.assertEqual(classified["unresolved"], ["braces@3.0.3"])
        after = datetime(2026, 11, 5, tzinfo=timezone.utc)
        expired = ELIGIBILITY.classify_live_findings(rows, ["braces@3.0.3"], dispositions, after)
        self.assertEqual(expired["excepted"], [])
        self.assertIn("braces@3.0.3", expired["unresolved"])

    def test_temporary_exception_rejects_a_standing_waiver(self) -> None:
        from datetime import datetime, timezone
        rows = {"braces@3.0.3": {"name": "braces", "version": "3.0.3", "vulns": [{"id": "GHSA-vfj7-8cjw-p6xm"}]}}
        record = {
            "package": "braces",
            "version": "3.0.3",
            "advisory_id": "GHSA-vfj7-8cjw-p6xm",
            "classification": "temporary-exception",
            "fixed_version": None,
            "granted_by": "someone",
            "granted_on": "2026-10-04",
            "expires_on": "2027-10-04",
            "authority": "A date more than ninety days out is a standing waiver, not a temporary exception.",
            "dependency_path": ["devDependency karma@6.4.4", "braces@3.0.3"],
            "reason": "The advisory is still present and this record must not retire it.",
        }
        now = datetime(2026, 10, 4, tzinfo=timezone.utc)
        classified = ELIGIBILITY.classify_live_findings(rows, ["braces@3.0.3"], {"braces@3.0.3": [record]}, now)
        self.assertEqual(classified["excepted"], [])
        self.assertIn("braces@3.0.3", classified["unresolved"])



class MinimumAgeExceptionTests(unittest.TestCase):
    PUBLISHED = datetime(2026, 9, 30, 14, 8, 9, 382000, tzinfo=timezone.utc)
    NOW = datetime(2026, 10, 6, 12, 0, tzinfo=timezone.utc)

    def record(self, **changes):
        base = {
            "package": "source-map-js", "version": "1.2.2",
            "classification": "temporary-exception",
            "published_at": "2026-09-30T14:08:09.382Z", "expires_at": "2026-10-07T14:08:09.382Z",
            "advisory": "GHSA-68fv-2mgg-jv7q", "granted_by": "Ryan Lester",
            "granted_on": "2026-10-06", "granted_at": "2026-10-06T03:43:00-04:00",
            "authority": "Ryan Lester granted this temporary minimum-age exception in the project group chat.",
            "reason": "GHSA-68fv-2mgg-jv7q is fixed only in 1.2.2, which is inside the seven-day window.",
        }
        base.update(changes)
        return base

    def assess(self, records, excludes, now=None):
        return ELIGIBILITY.assess_age_exceptions(
            records, excludes, now or self.NOW, lambda name, version: (self.PUBLISHED, ""))

    def test_committed_age_claim_requires_original_authority(self):
        records, error = ELIGIBILITY.load_age_exceptions(ROOT)
        excludes = ELIGIBILITY.pnpm_age_excludes((ROOT / "pnpm-workspace.yaml").read_text())
        self.assertIsNone(error)
        self.assertEqual(excludes, ["source-map-js@1.2.2"])
        result = self.assess(records, excludes)
        self.assertEqual(result["active"], {})
        self.assertTrue(any("owner authority pending" in problem for problem in result["problems"]))
        self.assertEqual(records[0]["classification"], "pending-owner-authority")
        self.assertEqual(records[0]["granted_by"], "Ryan Lester")
        # This fixture exercises date/scope mechanics only; it is not human authority.
        fixture=self.assess([self.record()], excludes)
        self.assertEqual(fixture["problems"], [])
        self.assertIn("source-map-js@1.2.2", fixture["active"])
        self.assertIn("chainman/minimum-age-exceptions.toml", (ROOT / "chainman.toml").read_text())
        self.assertIn("source-map-js@1.2.2:", (ROOT / "pnpm-lock.yaml").read_text())
        self.assertNotIn("source-map-js@1.2.1", (ROOT / "pnpm-lock.yaml").read_text())

    def test_missing_or_pending_classification_cannot_admit_age_grant(self):
        for classification in (None, "pending-owner-authority"):
            result=self.assess([self.record(classification=classification)], ["source-map-js@1.2.2"])
            self.assertEqual(result["active"], {})
            self.assertTrue(any("owner authority pending" in problem for problem in result["problems"]))
        records,_=ELIGIBILITY.load_age_exceptions(ROOT)
        expired=self.assess(records,["source-map-js@1.2.2"],datetime(2026,10,7,14,8,10,tzinfo=timezone.utc))
        self.assertTrue(any("expired" in problem and "remove it" in problem for problem in expired["problems"]))

    def test_expired_grant_still_configured_blocks(self):
        result = self.assess([self.record()], ["source-map-js@1.2.2"], datetime(2026, 10, 7, 14, 8, 10, tzinfo=timezone.utc))
        self.assertEqual(result["active"], {})
        self.assertTrue(any("expired" in problem and "remove it" in problem for problem in result["problems"]))

    def test_expiry_cannot_outlast_the_natural_window(self):
        result = self.assess([self.record(expires_at="2026-10-08T00:00:00Z")], ["source-map-js@1.2.2"])
        self.assertEqual(result["active"], {})
        self.assertTrue(any("outlasts" in problem for problem in result["problems"]))

    def test_blanket_or_unrecorded_excludes_block(self):
        for entry in ("source-map-js", "source-map-js@*", "@types/*", "source-map-js@^1.2.2", "other@1.0.0"):
            with self.subTest(entry=entry):
                result = self.assess([self.record()], ["source-map-js@1.2.2", entry])
                self.assertTrue(result["problems"], entry)

    def test_grant_must_cite_owner_and_advisory(self):
        for changes in ({"granted_by": ""}, {"authority": "ok"}, {"advisory": "none"},
                        {"reason": "no advisory named"}, {"granted_on": "2026-10-05"}):
            with self.subTest(changes=changes):
                result = self.assess([self.record(**changes)], ["source-map-js@1.2.2"])
                self.assertEqual(result["active"], {})
                self.assertTrue(result["problems"])

    def test_record_without_exclude_or_wrong_publish_time_is_not_active(self):
        self.assertTrue(self.assess([self.record()], [])["problems"])
        result = self.assess([self.record(published_at="2026-09-29T00:00:00Z")], ["source-map-js@1.2.2"])
        self.assertEqual(result["active"], {})
        self.assertTrue(any("differs from the registry" in problem for problem in result["problems"]))

    def test_exclude_parser_rejects_other_shapes(self):
        self.assertEqual(ELIGIBILITY.pnpm_age_excludes("minimumReleaseAgeExclude: []\n"), [])
        self.assertIsNone(ELIGIBILITY.pnpm_age_excludes("minimumReleaseAgeExclude: [a]\n"))
        self.assertIsNone(ELIGIBILITY.pnpm_age_excludes("a: 1\n"))
        self.assertEqual(ELIGIBILITY.pnpm_age_excludes(
            "minimumReleaseAgeExclude:\n  # note\n  - 'x@1.0.0'\nallowBuilds:\n  y: true\n"), ["x@1.0.0"])

    def test_active_exception_defers_only_its_age_finding(self):
        observation = ELIGIBILITY.evaluate(ROOT, self.NOW, lookup_performed=True, lookup={
            "result": "queried", "http_status": 200, "rows": {}, "uncovered": [], "age_unknown": [],
            "age_young": ["other@1.0.0"], "age_excepted": [{"citation": "source-map-js@1.2.2 grant"}],
            "age_exception_problems": [], "toolchain_ok": True, "unresolved": [],
        })
        case = next(c for c in observation["cases"] if c["case_id"].endswith("lock-transitive-coverage"))
        self.assertEqual(case["result"], "fail")
        self.assertIn("other@1.0.0", case["detail"])
        self.assertIn("source-map-js@1.2.2 grant", case["detail"])


class RemediationObservationTests(unittest.TestCase):
    VULN = {"affected": [
        {"package": {"ecosystem": "npm", "name": "source-map-js"},
         "ranges": [{"type": "SEMVER", "events": [{"introduced": "1.0.0"}, {"fixed": "1.2.2"}]}]},
        {"package": {"ecosystem": "npm", "name": "other"},
         "ranges": [{"type": "SEMVER", "events": [{"introduced": "0"}, {"fixed": "9.9.9"}]}]},
    ]}

    def test_fixed_versions_only_cover_the_affected_package_range(self):
        self.assertEqual(ELIGIBILITY.fixed_versions(self.VULN, "source-map-js", "1.2.1"), ["1.2.2"])
        self.assertEqual(ELIGIBILITY.fixed_versions(self.VULN, "source-map-js", "1.2.2"), [])
        self.assertEqual(ELIGIBILITY.fixed_versions(self.VULN, "source-map-js", "0.6.2"), [])
        self.assertEqual(ELIGIBILITY.fixed_versions(self.VULN, "source-map-js", "not-semver"), [])

    def test_under_maturity_fix_is_observed_not_cleared(self):
        from datetime import timedelta
        published = datetime(2026, 9, 30, 14, 8, tzinfo=timezone.utc)
        young = ELIGIBILITY.remediation_note("source-map-js@1.2.1", "GHSA-x", ["1.2.2"], published,
                                             published + timedelta(days=6))
        self.assertEqual(young["state"], "fixed-release-under-maturity")
        self.assertEqual(young["eligible_at"], (published + timedelta(days=7)).isoformat())
        self.assertIn("under the seven-day minimumReleaseAge", young["detail"])
        mature = ELIGIBILITY.remediation_note("source-map-js@1.2.1", "GHSA-x", ["1.2.2"], published,
                                              published + timedelta(days=8))
        self.assertEqual(mature["state"], "fixed-release-eligible")
        none = ELIGIBILITY.remediation_note("source-map-js@1.2.1", "GHSA-x", [], None, published)
        self.assertEqual(none["state"], "no-fixed-release")
        for note in (young, mature, none):
            self.assertNotIn("classification", note)

    def test_remediation_note_does_not_resolve_the_finding(self):
        rows = {"source-map-js@1.2.1": {"name": "source-map-js", "version": "1.2.1", "vulns": [{"id": "GHSA-x"}]}}
        classified = ELIGIBILITY.classify_live_findings(rows, ["source-map-js@1.2.1"], {})
        self.assertEqual(classified["unresolved"], ["source-map-js@1.2.1"])


if __name__ == "__main__":
    unittest.main()
