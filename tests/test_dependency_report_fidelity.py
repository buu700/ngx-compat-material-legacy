# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Report fidelity for the exact dependency producer; no live network or clearance fixture."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import shutil
import unittest
from unittest.mock import patch
from datetime import datetime, timedelta, timezone

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("dependency_fidelity", ROOT / "scripts/check-dependency-eligibility.py")
eligibility = importlib.util.module_from_spec(spec)
spec.loader.exec_module(eligibility)


class Response:
    def __init__(self, status, body):
        self.status = status
        self.body = body
    def __enter__(self): return self
    def __exit__(self, *_): return False
    def read(self): return self.body


class DependencyReportFidelityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="dependency-fidelity-source-")
        cls.root = Path(cls.temp.name)
        members = eligibility.physical_subject_binding(ROOT)["members"]
        paths = {row["path"] for row in members if not row.get("missing_or_linked")}
        paths.add("compatibility/rc/reports/pinned-dependency-advisories.json")
        for name in paths:
            source = ROOT / name
            if source.is_file():
                target = cls.root / name
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, target)
        (cls.root / "compatibility/rc/dependency-dispositions").mkdir(parents=True, exist_ok=True)
        binding = eligibility.physical_subject_binding(cls.root)
        assert binding["physical_inputs_valid"], [row for row in binding["members"] if row.get("missing_or_linked")]

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def now(self): return datetime.now(timezone.utc)

    def no_network_context(self, *, osv_results=None, mutate=None):
        now = self.now()
        aged = now - timedelta(days=30)
        tool = {"queries": []}
        advisories = {"result": "queried", "http_status": 200, "rows": [], "uncovered": [], "error": ""}
        patches = [
            patch.object(eligibility, "lock_packages", return_value=[(f"fixture-{i}", "1.0.0") for i in range(12)]),
            patch.object(eligibility, "tool_advisory_subjects", return_value=tool),
            patch.object(eligibility, "query_tool_advisories", return_value=advisories),
            patch.object(eligibility, "_npm_publish_time", return_value=(aged, "")),
            patch.object(eligibility, "_node_publish_time", return_value=(aged, "")),
            patch.object(eligibility, "assess_age_exceptions", return_value={"active": {}, "expired": [], "problems": []}),
            patch.object(eligibility, "load_finding_dispositions", return_value={}),
            patch.object(eligibility, "refresh_exception_patch_status"),
            patch.object(eligibility, "tool_advisory_coverage_ok", return_value=True),
            patch.object(eligibility, "classify_tool_findings", return_value={"unresolved": [], "errors": []}),
            patch.object(eligibility, "_remediation_notes", side_effect=lambda unresolved, rows, now, capture=None: [{"detail": x} for x in unresolved]),
        ]
        return patches

    def test_all_ordered_raw_rows_and_findings_survive_normalization_and_writer(self):
        now = self.now()
        long_summary = "raw-summary-" + "x" * 300
        expected = None
        def fake_urlopen(request, timeout):
            nonlocal expected
            queries = json.loads(request.data)["queries"]
            expected = [{"vulns": [{"id": f"FIXTURE-{i}", "summary": long_summary,
                                    "affected": [{"package": query["package"]}]}]}
                        if i < 12 else {} for i, query in enumerate(queries)]
            return Response(200, json.dumps({"results": expected}).encode())
        # ExitStack keeps all finite local mocks active through the producer.
        from contextlib import ExitStack
        with ExitStack() as stack:
            for item in self.no_network_context(): stack.enter_context(item)
            stack.enter_context(patch("urllib.request.urlopen", side_effect=fake_urlopen))
            live = eligibility.perform_lookup(self.root, now)
        raw = live["lookup_evidence"]["osv"]
        self.assertEqual(raw["results"], expected)
        self.assertEqual(len(raw["results"]), len(raw["queries"]))
        self.assertEqual(len(live["lookup_evidence"]["unresolved"]), 12)
        self.assertEqual(len(live["lookup_evidence"]["remediation"]), 12)
        self.assertEqual(len(live["lookup_evidence"]["npm_age"]), 12)
        self.assertEqual(len(live["lookup_evidence"]["vendor_age"]),
                         len(json.loads((self.root / "compatibility/vendored-sass-manifest.json").read_text())["packages"]))
        self.assertGreater(len(raw["results"][0]["vulns"][0]["summary"]), 240)
        self.assertEqual(raw["http_status"], 200)
        self.assertEqual(raw["response_sha256"], hashlib.sha256(json.dumps({"results": expected}).encode()).hexdigest())
        self.assertTrue(live["subject_binding_valid"])
        with ExitStack() as stack:
            stack.enter_context(patch.object(eligibility, "lock_packages", return_value=[(f"fixture-{i}", "1.0.0") for i in range(12)]))
            stack.enter_context(patch.object(eligibility, "tool_advisory_coverage_ok", return_value=True))
            observed = eligibility.evaluate(self.root, now, lookup_performed=True, lookup=live)
        self.assertEqual(observed["complete_unresolved"], live["unresolved"])
        self.assertEqual(observed["complete_remediation"], live["remediation"])
        for key in ("age_unknown", "age_young", "age_excepted", "age_exception_problems", "age_exceptions_expired", "uncovered"):
            self.assertEqual(live["lookup_evidence"][key], live[key])
        # Exercise complete vendor error-list serialization beyond the summary sample size.
        observed["vendor"]["missing_files"] = [f"fixture-missing-{i}" for i in range(16)]
        observed["vendor"]["license_missing"] = [f"fixture-license-{i}" for i in range(16)]
        with tempfile.TemporaryDirectory() as directory:
            run = Path(directory); output = run / "evidence/dependency-eligibility/fixture"; output.mkdir(parents=True)
            request = {"root": self.root, "output": output, "run_dir": run, "run_id": "fixture-run", "invocation": "fixture",
                       "line": live["subject_binding"]["line"], "binding": {"run_id": "fixture-run", "source_line": live["subject_binding"]["line"]}}
            self.assertFalse(eligibility.write_acceptance(request, observed))
            assertion = json.loads((output / "eligibility-observations.json").read_text())
            self.assertEqual(assertion["lookup_evidence"]["osv"]["results"], expected)
            self.assertEqual(assertion["vendor"], observed["vendor"])
            self.assertEqual(len(assertion["complete_unresolved"]), len(live["unresolved"]))
            self.assertEqual(assertion["source_binding"]["population_sha256"], live["subject_binding"]["population_sha256"])

    def test_osv_http_failure_and_malformed_rows_are_preserved_not_passed(self):
        packages = [("one", "1.0.0"), ("two", "2.0.0")]
        for status, body in [(503, {"results": [{"vulns": [{"id": "raw"}]}, {}]}),
                             (200, {"results": [{}]}), (200, {"error": "malformed"})]:
            with self.subTest(status=status, body=body), patch("urllib.request.urlopen", return_value=Response(status, json.dumps(body).encode())):
                capture = {}
                observed_status, results, error = eligibility._osv_batch(packages, capture=capture)
                self.assertEqual(observed_status, status)
                self.assertEqual(capture["parsed_response"], body)
                self.assertEqual(capture["queries"][0]["package"]["name"], "one")
                self.assertEqual(capture["response_bytes"], len(json.dumps(body).encode()))
                self.assertEqual(results, body.get("results"))
                self.assertTrue(status != 200 or len(results or []) != len(packages) or error)

    def test_late_lock_or_source_edit_invalidates_physical_binding(self):
        original = (self.root / "pnpm-lock.yaml").read_bytes()
        source = self.root / "scripts/fidelity-source-fixture.py"
        try:
            before = eligibility.physical_subject_binding(self.root)
            (self.root / "pnpm-lock.yaml").write_bytes(original + b"\n# late lookup mutation\n")
            self.assertNotEqual(before, eligibility.physical_subject_binding(self.root))
            (self.root / "pnpm-lock.yaml").write_bytes(original)
            source.write_text("# late source mutation\n")
            self.assertNotEqual(before, eligibility.physical_subject_binding(self.root))
            source.unlink()
            self.assertEqual(before, eligibility.physical_subject_binding(self.root))
        finally:
            (self.root / "pnpm-lock.yaml").write_bytes(original)
            source.unlink(missing_ok=True)

    def test_lookup_callback_lock_drift_rejects_existing_direct_pin_case(self):
        from contextlib import ExitStack
        now = self.now()
        lock = self.root / "pnpm-lock.yaml"
        original = lock.read_bytes()
        def changed_batch(packages, capture=None):
            lock.write_bytes(original + b"\n# changed during OSV callback\n")
            if capture is not None:
                capture.update(queries=[{"package": {"name": name, "ecosystem": "npm"}, "version": version}
                                        for name, version in packages], parsed_response={"results": [{} for _ in packages]},
                               http_status=200, response_sha256="fixture-only", response_bytes=1)
            return 200, [{} for _ in packages], ""
        try:
            with ExitStack() as stack:
                for item in self.no_network_context(): stack.enter_context(item)
                stack.enter_context(patch.object(eligibility, "_osv_batch", side_effect=changed_batch))
                live = eligibility.perform_lookup(self.root, now)
            self.assertFalse(live["subject_binding_valid"])
            observed = eligibility.evaluate(self.root, now, lookup_performed=True, lookup=live)
            self.assertFalse(observed["source_binding_valid"])
            direct = next(row for row in observed["cases"] if row["case_id"].endswith("/direct-pin-shape"))
            self.assertEqual(direct["result"], "fail")
            self.assertIn("changed during execution", direct["detail"])
        finally:
            lock.write_bytes(original)

    def test_non200_and_truncated_batch_survive_full_lookup(self):
        from contextlib import ExitStack
        now = self.now()
        for status, truncate in ((503, False), (200, True)):
            def fake_urlopen(request, timeout):
                queries = json.loads(request.data)["queries"]
                results = [{"vulns": [{"id": f"RAW-{i}", "extra": {"keep": i}}]}
                           for i in range(len(queries) - int(truncate))]
                return Response(status, json.dumps({"results": results}).encode())
            with self.subTest(status=status, truncate=truncate), ExitStack() as stack:
                for item in self.no_network_context(): stack.enter_context(item)
                stack.enter_context(patch("urllib.request.urlopen", side_effect=fake_urlopen))
                live = eligibility.perform_lookup(self.root, now)
                raw = live["lookup_evidence"]["osv"]
                self.assertEqual(raw["http_status"], status)
                self.assertEqual(len(raw["results"]), len(raw["queries"]) - int(truncate))
                self.assertEqual(raw["results"][0]["vulns"][0]["extra"], {"keep": 0})
                self.assertEqual(live["result"], "unknown")
                self.assertFalse(live["security_clearance"] == "passed")

    def test_foreign_line_or_source_commit_is_rejected_before_acceptance(self):
        current = eligibility.physical_subject_binding(self.root)
        positive = {"lookup_source_binding": current, "source_binding_valid": True,
                    "cases": [{"case_id": "dependency-eligibility/locks-tools-maturity/direct-pin-shape",
                               "result": "pass", "detail": "observed"}]}
        self.assertTrue(eligibility.enforce_final_subject_binding(positive, self.root,
                        {"source_line": current["line"]}))
        self.assertEqual(positive["cases"][0]["result"], "pass")
        for foreign in ({"source_line": "main" if current["line"] == "21.x" else "21.x"},
                        {"source_line": current["line"], "source_commit": "f" * 40},
                        {"source_line": current["line"], "source_tree": "f" * 40}):
            with self.subTest(foreign=foreign):
                observed = {"lookup_source_binding": current, "source_binding_valid": True,
                            "cases": [{"case_id": "dependency-eligibility/locks-tools-maturity/direct-pin-shape",
                                       "result": "pass", "detail": "observed"}]}
                self.assertFalse(eligibility.enforce_final_subject_binding(observed, self.root, foreign))
                self.assertEqual(observed["cases"][0]["result"], "fail")

    def test_registry_age_and_tool_osv_transport_keep_hashes_without_registry_body(self):
        now = self.now()
        registry_body = json.dumps({"time": {"1.0.0": now.isoformat()}, "large": "x" * 10000}).encode()
        with patch("urllib.request.urlopen", return_value=Response(200, registry_body)):
            transport = {}
            published, error = eligibility._npm_publish_time("fixture", "1.0.0", capture=transport)
        self.assertEqual(error, "")
        self.assertEqual(published, now)
        self.assertEqual(transport["response_sha256"], hashlib.sha256(registry_body).hexdigest())
        self.assertEqual(transport["response_bytes"], len(registry_body))
        self.assertEqual(transport["selected_publish_time"], now.isoformat())
        self.assertNotIn("large", json.dumps(transport))
        subject = {"queries": [{"id": "npm/fixture@1.0.0", "query": {"package": {"name": "fixture", "ecosystem": "npm"}, "version": "1.0.0"}}]}
        body = {"results": [{"vulns": [{"id": "RAW", "extra": {"field": "retained"}}]}]}
        with patch("urllib.request.urlopen", return_value=Response(200, json.dumps(body).encode())):
            tool = eligibility.query_tool_advisories(subject)
        self.assertEqual(tool["transport"]["parsed_response"], body)
        self.assertEqual(tool["transport"]["queries"], [subject["queries"][0]["query"]])
        self.assertEqual(tool["rows"][0]["vulns"][0]["extra"], {"field": "retained"})

    def test_late_vendor_license_and_disposition_population_invalidate_binding(self):
        manifest = json.loads((self.root / "compatibility/vendored-sass-manifest.json").read_text())
        license = self.root / "projects/ngx-material-legacy/styles/vendor/mdc" / manifest["packages"][0] / "LICENSE"
        original = license.read_bytes()
        disposition = self.root / "compatibility/rc/dependency-dispositions/fidelity-fixture.json"
        before = eligibility.physical_subject_binding(self.root)
        try:
            license.write_bytes(original + b"\nlate license change\n")
            self.assertNotEqual(before, eligibility.physical_subject_binding(self.root))
            license.write_bytes(original)
            disposition.write_text("{}\n")
            self.assertNotEqual(before, eligibility.physical_subject_binding(self.root))
        finally:
            license.write_bytes(original)
            disposition.unlink(missing_ok=True)
        self.assertEqual(before, eligibility.physical_subject_binding(self.root))

    def test_transport_failure_and_non_json_response_remain_unknown(self):
        with patch("urllib.request.urlopen", side_effect=OSError("fixture transport failed")):
            capture = {}
            status, results, error = eligibility._osv_batch([("fixture", "1.0.0")], capture=capture)
        self.assertIsNone(status)
        self.assertIsNone(results)
        self.assertIn("fixture transport failed", error)
        self.assertEqual(capture["error"], error)
        self.assertEqual(len(capture["queries"]), 1)
        body = b"not valid JSON"
        with patch("urllib.request.urlopen", return_value=Response(200, body)):
            capture = {}
            status, results, error = eligibility._osv_batch([("fixture", "1.0.0")], capture=capture)
        self.assertEqual(status, 200)
        self.assertIsNone(results)
        self.assertTrue(error)
        self.assertTrue(capture["error"])
        self.assertEqual(capture["response_sha256"], hashlib.sha256(body).hexdigest())
        self.assertEqual(capture["response_bytes"], len(body))

    def test_bootstrap_evidence_and_conditional_http_are_retained(self):
        path = self.root / "compatibility/tooling-release-evidence.json"
        original = path.read_bytes()
        before = eligibility.physical_subject_binding(self.root)
        try:
            path.write_bytes(original + b"\n")
            self.assertNotEqual(before, eligibility.physical_subject_binding(self.root))
        finally:
            path.write_bytes(original)
        now = self.now()
        body = {"id": "FIXTURE", "affected": [{"package": {"name": "fixture", "ecosystem": "npm"},
                "ranges": [{"type": "SEMVER", "events": [{"introduced": "0"}, {"fixed": "2.0.0"}]}]}]}
        def responses(request, timeout):
            if request.full_url.startswith("https://api.osv.dev/"):
                return Response(200, json.dumps(body).encode())
            return Response(200, json.dumps({"time": {"2.0.0": now.isoformat()}}).encode())
        with patch("urllib.request.urlopen", side_effect=responses):
            capture = []
            notes = eligibility._remediation_notes(["fixture@1.0.0"], {
                "fixture@1.0.0": {"name": "fixture", "version": "1.0.0", "vulns": [{"id": "FIXTURE"}]}},
                now, capture=capture)
        self.assertEqual(len(notes), 1)
        self.assertEqual([row["kind"] for row in capture], ["advisory-detail", "fixed-release-age"])
        self.assertEqual(capture[0]["http"]["parsed_response"], body)
        self.assertEqual(capture[1]["http"]["selected_publish_time"], now.isoformat())

    def test_exception_queries_and_complete_http_evidence_reach_writer(self):
        from contextlib import ExitStack
        now = self.now()
        aged = now - timedelta(days=30)
        original_publish = eligibility._npm_publish_time
        detail = {"id": "FIXTURE", "extra": {"retain": "conditional-detail"}}
        def responses(request, timeout):
            if request.full_url.endswith("querybatch"):
                count = len(json.loads(request.data)["queries"])
                return Response(200, json.dumps({"results": [{} for _ in range(count)]}).encode())
            if request.full_url.startswith("https://api.osv.dev/"):
                return Response(200, json.dumps(detail).encode())
            return Response(200, json.dumps({"time": {"1.0.0": aged.isoformat()}}).encode())
        def assess(records, excludes, instant, registry, load_error):
            registry("fixture-age-exception", "1.0.0")
            return {"active": {}, "expired": [], "problems": []}
        def refresh(rows, dispositions, instant, lookup=None):
            lookup("https://api.osv.dev/v1/vulns/FIXTURE", timeout=45)
        with ExitStack() as stack:
            for item in self.no_network_context(): stack.enter_context(item)
            stack.enter_context(patch("urllib.request.urlopen", side_effect=responses))
            stack.enter_context(patch.object(eligibility, "_npm_publish_time", side_effect=original_publish))
            stack.enter_context(patch.object(eligibility, "assess_age_exceptions", side_effect=assess))
            stack.enter_context(patch.object(eligibility, "refresh_exception_patch_status", side_effect=refresh))
            live = eligibility.perform_lookup(self.root, now)
            observed = eligibility.evaluate(self.root, now, lookup_performed=True, lookup=live)
        evidence = live["lookup_evidence"]
        self.assertEqual(len(evidence["exception_age_http"]), 1)
        self.assertEqual(evidence["exception_age_http"][0]["http"]["selected_publish_time"], aged.isoformat())
        self.assertEqual(len(evidence["exception_patch_http"]), 1)
        self.assertEqual(evidence["exception_patch_http"][0]["http"]["parsed_response"], detail)
        with tempfile.TemporaryDirectory() as directory:
            run = Path(directory); output = run / "evidence/dependency-eligibility/fixture"; output.mkdir(parents=True)
            request = {"root": self.root, "output": output, "run_dir": run, "run_id": "fixture-run",
                       "invocation": "fixture", "line": live["subject_binding"]["line"],
                       "binding": {"source_line": live["subject_binding"]["line"]}}
            self.assertFalse(eligibility.write_acceptance(request, observed))
            written = json.loads((output / "eligibility-observations.json").read_text())
        self.assertEqual(written["lookup_evidence"], evidence)

    def test_late_tool_policy_catalog_and_proof_inputs_block_final_writer(self):
        catalog = json.loads((self.root / "compatibility/toolchain-advisory-subjects.json").read_text())
        paths = ["SECURITY.md", "compatibility/rc/tool-advisory-dispositions.json",
                 catalog["pnpm_source"]["cargo_lock"]["path"],
                 catalog["pnpm_source"]["registry_attestations"]["path"],
                 "compatibility/rc/tool-advisory-triage/private-profile-remaining-result.json"]
        before = eligibility.physical_subject_binding(self.root)
        for name in paths:
            with self.subTest(name=name):
                path = self.root / name
                original = path.read_bytes()
                try:
                    path.write_bytes(original + b"\n")
                    observed = {"lookup_source_binding": before, "source_binding_valid": True,
                                "cases": [{"case_id": "dependency-eligibility/locks-tools-maturity/direct-pin-shape",
                                           "result": "pass", "detail": "observed"}]}
                    self.assertFalse(eligibility.enforce_final_subject_binding(observed, self.root))
                    self.assertEqual(observed["cases"][0]["result"], "fail")
                finally:
                    path.write_bytes(original)
        extra = self.root / "compatibility/rc/tool-advisory-triage/fidelity-extra.json"
        try:
            extra.write_text("{}\n")
            self.assertNotEqual(before, eligibility.physical_subject_binding(self.root))
        finally:
            extra.unlink(missing_ok=True)
        self.assertEqual(before, eligibility.physical_subject_binding(self.root))

    def test_linked_required_input_cannot_form_a_valid_final_binding(self):
        with tempfile.TemporaryDirectory() as directory:
            link = Path(directory) / "linked-source-root"
            link.symlink_to(self.root, target_is_directory=True)
            with self.assertRaises(ValueError):
                eligibility.physical_subject_binding(link)
        path = self.root / ".npmrc"
        original = path.read_bytes()
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "same-npmrc"
            target.write_bytes(original)
            try:
                path.unlink()
                path.symlink_to(target)
                binding = eligibility.physical_subject_binding(self.root)
                self.assertFalse(binding["physical_inputs_valid"])
                observed = {"lookup_source_binding": binding, "source_binding_valid": True,
                            "cases": [{"case_id": "dependency-eligibility/locks-tools-maturity/direct-pin-shape",
                                       "result": "pass", "detail": "observed"}]}
                self.assertFalse(eligibility.enforce_final_subject_binding(observed, self.root))
            finally:
                path.unlink(missing_ok=True)
                path.write_bytes(original)

    def test_vendor_observation_reads_selected_root_only(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            rel = "projects/ngx-material-legacy/styles/vendor/mdc/fixture/file.scss"
            file = root / rel; file.parent.mkdir(parents=True)
            file.write_text("selected-root\n")
            (file.parent / "LICENSE").write_text("MIT\n")
            manifest = root / "compatibility/vendored-sass-manifest.json"; manifest.parent.mkdir(parents=True)
            manifest.write_text(json.dumps({"files": [{"dest": rel, "rewritten_sha256": hashlib.sha256(file.read_bytes()).hexdigest()}],
                                            "packages": ["fixture"], "license": "MIT"}))
            result = eligibility.vendor_observations(root, manifest)
            self.assertEqual(result["hash_mismatches"], [])
            self.assertEqual(result["missing_files"], [])
            file.write_text("foreign-bytes\n")
            self.assertEqual(eligibility.vendor_observations(root, manifest)["hash_mismatches"], [rel])


if __name__ == "__main__": unittest.main()
