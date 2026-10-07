"""Branch-native closeout rosters and subject rejection without product execution."""
from pathlib import Path
import importlib.util
import json
import os
import re
import tempfile
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('closeout_eligibility', ROOT / 'scripts/check-dependency-eligibility.py')
eligibility = importlib.util.module_from_spec(spec)
spec.loader.exec_module(eligibility)

class CloseoutAdmissionTests(unittest.TestCase):
    def test_both_lines_roster_the_present_producers(self):
        groups = {}
        for group, case in re.findall(r"\['([^']+)', '(upstream-audit/[^']+)',", (ROOT / 'scripts/check-upstream-audit-disposition.mjs').read_text()):
            groups.setdefault(group, []).append(case)
        checks = {c['check_id']: c for c in json.loads((ROOT / 'compatibility/rc/matrices/full-verify.json').read_text())['checks']}
        for line in ('main', '21.x'):
            self.assertEqual(checks['upstream-audit-disposition']['acceptance']['cases_by_line'][line], groups)
            self.assertEqual(checks['dependency-eligibility']['acceptance']['cases_by_line'][line], eligibility.MAIN_CASES)
        self.assertNotIn("'upstream-audit/current-advisories/not-satisfied-by-ledger', false", (ROOT / 'scripts/check-upstream-audit-disposition.mjs').read_text())

    def test_dependency_producer_rejects_foreign_line_before_lookup(self):
        major = json.loads((ROOT / 'projects/ngx-material-legacy/package.json').read_text())['version'].split('.')[0]
        wrong = '21.x' if major == '22' else 'main'
        with tempfile.TemporaryDirectory() as td:
            output = Path(td) / 'evidence/dependency-eligibility/test-invocation'
            output.mkdir(parents=True)
            env = {'RC_CHECK_ID': 'dependency-eligibility', 'RC_RUN_ID': 'test-run',
                   'RC_INVOCATION_ID': 'test-invocation', 'RC_ASSERTION_OUTPUT_DIR': str(output),
                   'RC_EVIDENCE_BINDING': json.dumps({'run_id': 'test-run', 'source_line': wrong})}
            with patch.dict(os.environ, env, clear=True):
                with self.assertRaisesRegex(SystemExit, 'line does not match'):
                    eligibility.coordinator_request(ROOT)

    def test_advisory_producer_runs_after_dependency_lookup(self):
        source = (ROOT / 'scripts/rc-verify.py').read_text().split('def main() -> int:', 1)[1]
        self.assertLess(source.index('"scripts/check-dependency-eligibility.py"'), source.index('"scripts/check-upstream-audit-disposition.mjs"'))


ELIGIBILITY=eligibility

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
        self.assertEqual(excludes, ["http-cache-semantics@4.3.0", "source-map-js@1.2.2"])
        self.assertTrue(any("http-cache-semantics@4.3.0 has no single owner grant" in problem for problem in self.assess(records, excludes)["problems"]))
        result = self.assess(records, excludes)
        self.assertEqual(result["active"], {})
        self.assertTrue(any("owner authority pending" in problem for problem in result["problems"]))
        self.assertEqual(records[0]["classification"], "pending-owner-authority")
        self.assertEqual(records[0]["granted_by"], "Ryan Lester")
        # This fixture exercises date/scope mechanics only; it is not human authority.
        fixture=self.assess([self.record()], ["source-map-js@1.2.2"])
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


class OriginalAuthorityTests(unittest.TestCase):
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
