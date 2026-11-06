"""Complete pinned tool archive/source populations are required for advisory admission."""
from pathlib import Path
import base64
import copy
import hashlib
import importlib.util
import io
import json
import tarfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("tool_eligibility", ROOT / "scripts/check-dependency-eligibility.py")
eligibility = importlib.util.module_from_spec(spec)
spec.loader.exec_module(eligibility)


class ToolAdvisoryCoverageTests(unittest.TestCase):
    def archive(self, extra=None):
        data = io.BytesIO()
        with tarfile.open(fileobj=data, mode="w:gz") as archive:
            raw = b'{"name":"example-tool","version":"1.2.3"}'
            member = tarfile.TarInfo("package/package.json")
            member.size = len(raw)
            archive.addfile(member, io.BytesIO(raw))
            if extra is not None:
                archive.addfile(extra)
        raw = data.getvalue()
        pin = {"name": "example-tool", "version": "1.2.3", "archive_bytes": len(raw),
               "archive_sha256": hashlib.sha256(raw).hexdigest(), "manifest_count": 1,
               "integrity": "sha512-" + base64.b64encode(hashlib.sha512(raw).digest()).decode()}
        manifest = [{"path": "package/package.json", "name": "example-tool", "version": "1.2.3",
                     "sha256": hashlib.sha256(b'{"name":"example-tool","version":"1.2.3"}').hexdigest(),
                     "bytes": len(b'{"name":"example-tool","version":"1.2.3"}')}]
        pin["manifest_population_sha256"] = hashlib.sha256(json.dumps(manifest, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        return raw, pin

    def fixture_lookup(self):
        # Genuine archive/source census; empty advisory responses are test fixtures only.
        inventory = json.loads((ROOT / "compatibility/rc/tool-advisory-census-diagnostic.json").read_text())
        return {"result": "queried", "http_status": 200, "error": "", "uncovered": [],
                "cutoff": eligibility.datetime.now(eligibility.timezone.utc).isoformat(),
                "expected_queries": len(inventory["queries"]), "inventory": inventory,
                "rows": [{**row, "vulns": []} for row in inventory["queries"]], "unresolved": []}

    def test_real_census_contains_tools_bundles_rust_and_git(self):
        observed = self.fixture_lookup()
        self.assertTrue(eligibility.tool_advisory_coverage_ok(ROOT, observed))
        inventory = observed["inventory"]
        self.assertEqual([(row["name"], len(row["manifests"])) for row in inventory["archives"]],
                         [("npm", 144), ("pnpm", 22), ("@pnpm/exe.linux-x64", 1)])
        self.assertEqual(inventory["cargo_populations"], {"registry": 765, "git": 1, "local": 108})
        ids = {row["id"] for row in observed["rows"]}
        self.assertIn("npm/http-cache-semantics@4.2.0", ids)
        self.assertTrue(any(key.startswith("crates.io/") for key in ids))
        self.assertTrue(any(key.startswith("git/node-semver@") for key in ids))
        self.assertTrue(any(key.startswith("git/pnpm@") for key in ids))

    def test_inventory_and_query_mutations_reject_false_coverage(self):
        clean = self.fixture_lookup()
        for fault in ["missing-row", "duplicate-row", "wrong-query", "wrong-catalog", "missing-bundle",
                      "wrong-native-pin", "missing-rust-source", "unknown-http", "truncated", "no-vuln-list", "stale-tool-query",
                      "renamed-bundled-package", "omit-query-and-row", "hidden-finding"]:
            observed = copy.deepcopy(clean)
            if fault == "missing-row": observed["rows"].pop()
            if fault == "duplicate-row": observed["rows"].append(copy.deepcopy(observed["rows"][0]))
            if fault == "wrong-query": observed["rows"][0]["query"] = {"commit": "0" * 40}
            if fault == "wrong-catalog": observed["inventory"]["catalog_sha256"] = "0" * 64
            if fault == "missing-bundle": observed["inventory"]["archives"][0]["manifests"].pop()
            if fault == "wrong-native-pin": observed["inventory"]["archives"][2]["integrity"] = "sha512-wrong"
            if fault == "missing-rust-source": observed["inventory"]["cargo_populations"]["registry"] -= 1
            if fault == "unknown-http": observed["http_status"] = 503
            if fault == "truncated": observed["uncovered"] = [observed["rows"][0]["id"]]
            if fault == "no-vuln-list": observed["rows"][0]["vulns"] = None
            if fault == "stale-tool-query": observed["cutoff"] = "2020-01-01T00:00:00Z"
            if fault == "renamed-bundled-package": observed["inventory"]["archives"][0]["manifests"][0]["name"] = "wrong"
            if fault == "omit-query-and-row": observed["inventory"]["queries"].pop(); observed["rows"].pop(); observed["expected_queries"] -= 1
            if fault == "hidden-finding": observed["rows"][0]["vulns"] = [{"id": "TEST-FINDING"}]
            self.assertFalse(eligibility.tool_advisory_coverage_ok(ROOT, observed), fault)

    def test_archive_authentication_and_population_are_required(self):
        raw, pin = self.archive()
        self.assertEqual(eligibility.inspect_tool_archive(raw, pin)[0]["name"], "example-tool")
        for field, value in [("archive_bytes", 0), ("archive_sha256", "0" * 64),
                             ("integrity", "sha512-wrong"), ("manifest_count", 0), ("version", "2.0.0")]:
            with self.assertRaises(ValueError, msg=field):
                eligibility.inspect_tool_archive(raw, {**pin, field: value})

    def test_archive_paths_links_and_duplicate_members_are_refused(self):
        for path in ["/tmp/escape", "package/../../escape", "package//other", "package/./other", "package/package.json"]:
            raw, pin = self.archive(tarfile.TarInfo(path))
            with self.assertRaises(ValueError, msg=path): eligibility.inspect_tool_archive(raw, pin)
        for kind in [tarfile.SYMTYPE, tarfile.LNKTYPE, tarfile.CHRTYPE]:
            member = tarfile.TarInfo("package/unsafe")
            member.type = kind
            member.linkname = "/tmp/escape"
            raw, pin = self.archive(member)
            with self.assertRaises(ValueError, msg=kind): eligibility.inspect_tool_archive(raw, pin)

    def test_failed_or_partial_tool_osv_response_is_unknown(self):
        inventory = self.fixture_lookup()["inventory"]
        for response in [(500, {}, "HTTP failure"), (200, {"results": []}, ""),
                         (200, {"results": [None] * len(inventory["queries"])}, ""),
                         (200, {"results": [{"error": "unknown commit"}] * len(inventory["queries"])}, "")]:
            with patch.object(eligibility, "_http_json", return_value=response):
                observed = eligibility.query_tool_advisories(inventory)
            self.assertEqual(observed["result"], "unknown")
            self.assertFalse(eligibility.tool_advisory_coverage_ok(ROOT, observed))

    def test_actual_tool_finding_is_retained_for_triage(self):
        inventory = self.fixture_lookup()["inventory"]
        results = [{} for _ in inventory["queries"]]
        results[0] = {"vulns": [{"id": "TEST-FINDING"}]}
        with patch.object(eligibility, "_http_json", return_value=(200, {"results": results}, "")):
            observed = eligibility.query_tool_advisories(inventory)
        self.assertTrue(eligibility.tool_advisory_coverage_ok(ROOT, observed))
        self.assertEqual(observed["unresolved"], [inventory["queries"][0]["id"]])

    def test_full_producer_queries_tool_npm_ages_and_blocks_tool_findings(self):
        tool = self.fixture_lookup()
        hit = next(row for row in tool["rows"] if row["id"] == "npm/http-cache-semantics@4.2.0")
        hit["vulns"] = [{"id": "TEST-FINDING"}]
        tool["unresolved"] = [hit["id"]]
        now = eligibility.datetime.now(eligibility.timezone.utc)
        aged = now - eligibility.timedelta(days=30)
        with patch.object(eligibility, "tool_advisory_subjects", return_value=tool["inventory"]), \
             patch.object(eligibility, "query_tool_advisories", return_value=tool), \
             patch.object(eligibility, "_osv_batch", side_effect=lambda packages, capture=None: (200, [{} for _ in packages], "")), \
             patch.object(eligibility, "_npm_publish_time", return_value=(aged, "")) as ages, \
             patch.object(eligibility, "_node_publish_time", return_value=(aged, "")), \
             patch.object(eligibility, "assess_age_exceptions", return_value={"active": {}, "expired": [], "problems": []}), \
             patch.object(eligibility, "refresh_exception_patch_status"), \
             patch.object(eligibility, "_remediation_notes", return_value=[]):
            live = eligibility.perform_lookup(ROOT, now)
        self.assertIn(unittest.mock.call("http-cache-semantics", "4.2.0", capture=unittest.mock.ANY), ages.call_args_list)
        self.assertIn("tool:npm/http-cache-semantics@4.2.0", live["unresolved"])
        observed = eligibility.evaluate(ROOT, now, lookup_performed=True, lookup=live)
        cases = {row["case_id"]: row["result"] for row in observed["cases"]}
        self.assertEqual(cases["dependency-eligibility/locks-tools-maturity/toolchain-advisory-coverage"], "pass")
        self.assertEqual(cases["dependency-eligibility/locks-tools-maturity/unresolved-findings-block"], "fail")


if __name__ == "__main__":
    unittest.main()
