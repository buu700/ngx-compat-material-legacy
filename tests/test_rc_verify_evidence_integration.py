"""Coordinator regressions; subprocesses below are synthetic fixtures only."""
from __future__ import annotations
import contextlib
import importlib.util
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from test_rc_acceptance import CompleteFixture, write_json
import rc_acceptance as acceptance


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


verify = load('rc_verify_test', 'rc-verify.py')
_BRIDGE_COMPONENTS = (
    'badge', 'bottom-sheet', 'button-toggle', 'datepicker', 'divider', 'expansion',
    'grid-list', 'icon', 'sidenav', 'stepper', 'sort', 'toolbar', 'tree',
)
lite = load('rc_lite_test', 'rc-verify-lite.py')


class CoordinatorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='rc-coordinator-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.f = CompleteFixture(self.root)
        for id in ['owned-legacy-select','owned-legacy-snack-bar','owned-legacy-button','05-custom-map-nested']:
            for relative in [f'fixtures/sass/{id}.scss',f'reference/material-16.2.14/sass-css/{id}.css']:
                target=self.root/relative;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((ROOT/relative).read_bytes())
        for relative in ['fixtures/migration/cases.json','reference/material-16.2.14/PROVENANCE.json','toolchain-lock.json']:
            write_json(self.root / relative, acceptance.read_json(ROOT / relative))
        write_json(self.root / "compatibility/rc/matrices/full-verify.json", acceptance.read_json(ROOT / "compatibility/rc/matrices/full-verify.json"))
        write_json(self.root / "compatibility/rc/consumer-floor-plan.json", acceptance.read_json(ROOT / "compatibility/rc/consumer-floor-plan.json"))
        self.run = verify.RunEvidence(self.f.run, self.f.run_dir, self.f.matrix_sha)
        self.root_patch = patch.object(verify, 'ROOT', self.root)
        self.root_patch.start()
        self.addCleanup(self.root_patch.stop)
        self.run_patch = patch.object(verify, 'ACTIVE_RUN', self.run)
        self.run_patch.start()
        self.addCleanup(self.run_patch.stop)
        self.fixed = self.root / 'compatibility/rc/reports/browser-matrix-slice.json'
        write_json(self.fixed, {'result': 'pass', 'age': 'old'})
        self.old = self.fixed.read_bytes()

    def test_capture_removes_old_before_child_and_restores_it(self):
        rel = self.fixed.relative_to(self.root)
        with verify.capture_fixed_report(self.root, self.f.run_dir, str(rel), 'browser-matrix') as out:
            self.assertFalse(self.fixed.exists())
            write_json(self.fixed, {'result': 'pass', 'age': 'new'})
        self.assertEqual(self.fixed.read_bytes(), self.old)
        self.assertEqual(acceptance.read_json(out)['age'], 'new')

    def test_no_new_report_cannot_reuse_old_pass(self):
        rel = self.fixed.relative_to(self.root)
        with self.assertRaisesRegex(acceptance.EvidenceError, 'did not produce'):
            with verify.capture_fixed_report(self.root, self.f.run_dir, str(rel), 'browser-matrix'):
                pass
        self.assertEqual(self.fixed.read_bytes(), self.old)
        self.assertFalse((self.f.run_dir / 'reports/details/browser-matrix.json').exists())

    def test_corrupt_child_report_cannot_be_indexed(self):
        rel = self.fixed.relative_to(self.root)
        with self.assertRaisesRegex(acceptance.EvidenceError, 'duplicate JSON'):
            with verify.capture_fixed_report(self.root, self.f.run_dir, str(rel), 'browser-matrix'):
                self.fixed.write_text('{"result":"fail","result":"pass"}')
        self.assertEqual(self.fixed.read_bytes(), self.old)

    def test_interrupt_restores_old_report(self):
        rel = self.fixed.relative_to(self.root)
        with self.assertRaises(KeyboardInterrupt):
            with verify.capture_fixed_report(self.root, self.f.run_dir, str(rel), 'browser-matrix'):
                raise KeyboardInterrupt()
        self.assertEqual(self.fixed.read_bytes(), self.old)

    def test_source_report_symlink_is_refused_without_touching_target(self):
        other = self.root / 'other.json'
        self.fixed.rename(other)
        self.fixed.symlink_to(other)
        with self.assertRaisesRegex(acceptance.EvidenceError, 'symlink'):
            with verify.capture_fixed_report(self.root, self.f.run_dir, str(self.fixed.relative_to(self.root)), 'browser-matrix'):
                self.fail('must not invoke child')
        self.assertEqual(other.read_bytes(), self.old)

    def test_new_symlink_is_refused_and_original_restored(self):
        other = self.root / 'other.json'
        other.write_bytes(b'{"outside":true}')
        with self.assertRaisesRegex(acceptance.EvidenceError, 'regular detail'):
            with verify.capture_fixed_report(self.root, self.f.run_dir, str(self.fixed.relative_to(self.root)), 'browser-matrix'):
                self.fixed.symlink_to(other)
        self.assertEqual(other.read_bytes(), b'{"outside":true}')
        self.assertEqual(self.fixed.read_bytes(), self.old)

    def test_missing_detail_after_zero_exit_becomes_failure(self):
        with patch.object(verify.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0)):
            with contextlib.redirect_stderr(io.StringIO()):
                code = verify.run_node('scripts/run-browser-matrix-slice.mjs', ['--run', 'synthetic.json'])
        self.assertNotEqual(code, 0)
        self.assertNotEqual(self.run.exit_codes['browser-matrix'], 0)
        self.assertEqual(self.fixed.read_bytes(), self.old)

    def test_nonzero_child_with_passing_json_stays_nonzero(self):
        def child(*args, **kwargs):
            write_json(self.fixed, {'result': 'pass'})
            self.assertEqual(kwargs['env']['RC_RUN_ID'], self.f.run['run_id'])
            self.assertTrue(kwargs['env']['RC_INVOCATION_ID'])
            return subprocess.CompletedProcess([], 7)
        with patch.object(verify.subprocess, 'run', side_effect=child):
            code = verify.run_node('scripts/run-browser-matrix-slice.mjs', [])
        self.assertEqual(code, 7)
        self.assertEqual(self.run.exit_codes['browser-matrix'], 7)
        self.assertEqual(self.fixed.read_bytes(), self.old)

    def test_success_detail_is_run_local_and_hashed(self):
        def child(*args, **kwargs):
            write_json(self.fixed, {'result': 'pass'})
            return subprocess.CompletedProcess([], 0)
        with patch.object(verify.subprocess, 'run', side_effect=child):
            self.assertEqual(verify.run_node('scripts/run-browser-matrix-slice.mjs', []), 0)
        record = self.run.outputs['browser-matrix'][0]
        acceptance.checked_file(self.f.run_dir, record, 'detail')
        self.assertEqual(self.fixed.read_bytes(), self.old)

    def test_source_smoke_is_not_labeled_as_library_consumption(self):
        path = self.f.run_dir / 'reports/motion-smoke.json'
        path.unlink()
        verify.write_check_report(self.f.run_dir, self.f.run['run_id'], 'main', 'motion-smoke', exit_code=0)
        report = acceptance.read_json(path)
        self.assertEqual(report['subject_kind'], 'source')
        self.assertEqual(report['subject_ids'], ['source'])
        self.assertEqual(report['artifacts'], {})
        self.assertEqual(report['coverage'], 'slice')

    def _real_migration_ids(self):
        matrix = acceptance.read_json(verify.MATRIX_PATH)
        row = next(item for item in matrix["checks"] if item["check_id"] == "migration-packaged")
        return row, acceptance.expected_cases(row, "main")

    def _write_migration_assertions(self, ids):
        invocation = self.run.invocation("migration-packaged")
        directory = self.f.run_dir / acceptance.assertion_directory("migration-packaged", invocation)
        directory.mkdir(parents=True, exist_ok=True)
        for case_id in ids:
            from migration_workspace_fixture import workspace_receipt
            from migration_workspace_admission import old_workspace_ids
            if case_id in old_workspace_ids(ROOT) or case_id == 'old-workspace/upgraded-consumer':
                write_json(directory / f"{case_id.replace('/', '__')}.json", workspace_receipt(ROOT, self.run, case_id, invocation))
                continue
            write_json(directory / f"{case_id.replace('/', '__')}.json", {
                "case_id": case_id,
                "result": "pass",
                "kind": "assertion",
                "line": "main",
            })
        return directory

    def test_complete_main_migration_report_uses_real_ids_and_is_not_overwritten(self):
        row, ids = self._real_migration_ids()
        for group, group_ids in row["acceptance"]["cases_by_line"]["21.x"].items():
            self.assertIsNone(group_ids, group)
        self._write_migration_assertions(ids)
        path = self.f.run_dir / "reports/migration-packaged.json"
        path.unlink()
        verify.write_migration_packaged_report(self.f.run_dir, self.f.run["run_id"], "main", exit_code=0)
        report = acceptance.read_json(path)
        self.assertEqual(report["coverage"], "complete")
        self.assertEqual(report["line"], "main")
        self.assertEqual(report["result"], "pass")
        self.assertEqual(report["exit_code"], 0)
        self.assertEqual(set(report["expected_case_ids"]), set(ids))
        self.assertEqual(set(report["discovered_case_ids"]), set(ids))
        self.assertEqual(set(report["executed_case_ids"]), set(ids))
        self.assertEqual(set(report["passed_case_ids"]), set(ids))
        self.assertEqual(report["passed"], len(ids))
        self.assertEqual(report["failed"], 0)
        self.assertEqual(report["skipped"], 0)
        self.assertEqual(report["failed_case_ids"], [])
        self.assertEqual(report["skipped_case_ids"], [])
        self.assertEqual(report["unresolved_case_ids"], [])
        self.assertEqual(report["exceptions"], [])
        self.assertEqual(report["subject_kind"], "artifact")
        self.assertEqual(report["subject_ids"], ["library", "migrate-cli"])
        for item in self.f.run["artifacts"]:
            self.assertEqual(report["artifacts"][item["id"]], {"sha256": item["sha256"], "bytes": item["bytes"]})
        self.assertEqual(len(report["case_results"]), len(ids))
        paths = {item["path"] for item in report["outputs"]}
        prefix = acceptance.assertion_directory("migration-packaged", report["invocation_id"]) + "/"
        self.assertTrue(paths)
        for item in report["case_results"]:
            self.assertEqual(item["result"], "pass")
            self.assertEqual(item["kind"], "assertion")
            self.assertTrue(set(item["output_paths"]) <= paths)
        for output in report["outputs"]:
            self.assertTrue(output["path"].startswith(prefix))
            self.assertNotEqual(Path(output["path"]).name, "run.json")
            acceptance.checked_file(self.f.run_dir, output, "assertion")
        self.assertNotIn("g04_claim", report)
        self.assertNotIn("g05_claim", report)
        self.assertNotIn("approved", report)
        before = path.read_bytes()
        verify.write_check_report(self.f.run_dir, self.f.run["run_id"], "main", "migration-packaged", exit_code=0)
        self.assertEqual(path.read_bytes(), before)

    def test_failed_migration_child_stays_incomplete_slice(self):
        _, ids = self._real_migration_ids()
        self._write_migration_assertions(ids)
        path = self.f.run_dir / "reports/migration-packaged.json"
        path.unlink()
        verify.write_migration_packaged_report(
            self.f.run_dir, self.f.run["run_id"], "main", exit_code=7,
        )
        report = acceptance.read_json(path)
        self.assertEqual(report["coverage"], "slice")
        self.assertEqual(report["result"], "fail")
        self.assertEqual(report["exit_code"], 7)

    def test_missing_or_copied_migration_assertion_stays_slice(self):
        _, ids = self._real_migration_ids()
        directory = self._write_migration_assertions(ids[:-1])
        path = self.f.run_dir / "reports/migration-packaged.json"
        path.unlink()
        verify.write_migration_packaged_report(self.f.run_dir, self.f.run["run_id"], "main", exit_code=0)
        self.assertEqual(acceptance.read_json(path)["coverage"], "slice")
        copied = directory / f"{ids[-1].replace('/', '__')}.json"
        copied.write_bytes(self.f.run_path.read_bytes())
        path.unlink()
        verify.write_migration_packaged_report(self.f.run_dir, self.f.run["run_id"], "main", exit_code=0)
        self.assertEqual(acceptance.read_json(path)["coverage"], "slice")

    def test_21x_migration_report_does_not_roster_main_cases(self):
        _, ids = self._real_migration_ids()
        self._write_migration_assertions(ids)
        path = self.f.run_dir / "reports/migration-packaged.json"
        path.unlink()
        with patch.object(verify, "expected_cases", side_effect=AssertionError("21.x must not roster main cases")):
            verify.write_migration_packaged_report(
                self.f.run_dir, self.f.run["run_id"], "21.x", exit_code=0,
            )
        report = acceptance.read_json(path)
        self.assertEqual(report["coverage"], "slice")
        self.assertEqual(report["line"], "21.x")

    _M3_GROUPS = {
        "current-only": "inclusion-order", "legacy-only": "inclusion-order",
        "current-then-legacy": "inclusion-order", "legacy-then-current": "inclusion-order",
        "nested-theme-scope": "nested-lazy-overlay", "lazy-body-overlay": "nested-lazy-overlay",
        "current-shared-scope": "shared-style-boundary", "legacy-shared-scope": "shared-style-boundary",
    }
    _M3_ORDER_FACTS = {
        "current-only": (True, False, 10, -1),
        "legacy-only": (False, True, -1, 10),
        "current-then-legacy": (True, True, 10, 20),
        "legacy-then-current": (True, True, 20, 10),
    }

    def _m3_body(self, case_id, invocation, **changes):
        from test_m3_rendered_coexistence import render
        if not hasattr(self, "_rendered_fixture_bodies"):
            library = next(item for item in self.f.run["artifacts"] if item["id"] == "library")
            self._rendered_fixture_bodies = render(bodies={"tarball": library["sha256"], "run_id": self.f.run["run_id"], "invocation": invocation})["bodies"]
        body = json.loads(json.dumps(self._rendered_fixture_bodies[case_id]))
        body["invocation_id"] = invocation
        body.update(changes)
        return body

    def test_m3_wrong_but_nonempty_or_unpacked_assertion_stays_slice(self):
        _, ids = self._real_line_ids("m3-coexistence")
        self.assertEqual(sorted(ids), sorted(self._M3_GROUPS))

        def rendered_with(case_id, **changes):
            body = self._m3_body(case_id, "x")["rendered"]
            body = json.loads(json.dumps(body))
            for key, value in changes.items():
                if key == "equal_observed":
                    next(c for c in body["checks"] if c["expect"] == "equal")["properties"][0]["observed"] = value
                elif key == "differ_observed":
                    for prop in next(c for c in body["checks"] if c["expect"] == "differ")["properties"]:
                        prop["observed"] = value
                else:
                    body[key] = value
            return body

        library = next(item for item in self.f.run["artifacts"] if item["id"] == "library")
        bad = {
            "workspace compile": ("current-only", {"source_kind": "workspace"}),
            "foreign tarball": ("legacy-only", {"tarball_sha256": "ef" * 32}),
            "missing tarball": ("legacy-only", {"tarball_sha256": None}),
            "wrong peer": ("nested-theme-scope", {"peer_version": "22.0.0"}),
            "wrong-but-nonempty equal": ("lazy-body-overlay", {"rendered": rendered_with("lazy-body-overlay", equal_observed="rgb(1, 2, 3)")}),
            "unthemed differ": ("current-only", {"rendered": rendered_with("current-only", differ_observed="rgba(0, 0, 0, 0)")}),
            "empty observed": ("legacy-then-current", {"rendered": rendered_with("legacy-then-current", equal_observed="")}),
            "no checks": ("legacy-shared-scope", {"rendered": rendered_with("legacy-shared-scope", checks=[])}),
            "failed render": ("legacy-shared-scope", {"rendered": rendered_with("legacy-shared-scope", result="fail")}),
            "undetected negative": ("current-shared-scope", {"rendered": rendered_with(
                "current-shared-scope", contamination_negative={"detected": False, "rostered": False})}),
            "crossed order facts": ("current-then-legacy", {"packed_compile": {
                "m3_present": True, "m2_present": True, "m3_index": 30, "m2_index": 20}}),
            "wrong group": ("nested-theme-scope", {"group": "inclusion-order"}),
            "other run": ("current-only", {"run_id": "another-run"}),
        }
        self.assertTrue(library["sha256"])
        for label, (case_id, changes) in bad.items():
            with self.subTest(label=label):
                directory = self._write_line_assertions("m3-coexistence", ids)
                write_json(directory / f"{case_id}.json",
                           self._m3_body(case_id, self.run.invocation("m3-coexistence"), **changes))
                path = self.f.run_dir / "reports/m3-coexistence.json"
                if path.exists():
                    path.unlink()
                verify.write_line_coordinator_report(
                    self.f.run_dir, self.f.run["run_id"], "main", "m3-coexistence", exit_code=0,
                )
                self.assertEqual(acceptance.read_json(path)["coverage"], "slice")
        directory = self._write_line_assertions("m3-coexistence", ids)
        path = self.f.run_dir / "reports/m3-coexistence.json"
        path.unlink()
        verify.write_line_coordinator_report(
            self.f.run_dir, self.f.run["run_id"], "main", "m3-coexistence", exit_code=0,
        )
        self.assertEqual(acceptance.read_json(path)["coverage"], "complete")

    def test_m3_producer_bodies_satisfy_the_coordinator(self):
        from test_m3_rendered_coexistence import render
        _, ids = self._real_line_ids("m3-coexistence")
        self._bridge_peer()
        invocation = self.run.invocation("m3-coexistence")
        library = next(item for item in self.f.run["artifacts"] if item["id"] == "library")
        bodies = render(bodies={"tarball": library["sha256"], "run_id": self.f.run["run_id"],
                                "invocation": invocation})["bodies"]
        self.assertEqual(sorted(bodies), sorted(ids))
        directory = self.f.run_dir / acceptance.assertion_directory("m3-coexistence", invocation)
        directory.mkdir(parents=True, exist_ok=True)
        for case_id, body in bodies.items():
            self.assertTrue(verify._m3_assertion_ok(body, invocation), case_id)
            write_json(directory / f"{case_id}.json", body)
        path = self.f.run_dir / "reports/m3-coexistence.json"
        path.unlink()
        verify.write_line_coordinator_report(
            self.f.run_dir, self.f.run["run_id"], "main", "m3-coexistence", exit_code=0,
        )
        self.assertEqual(acceptance.read_json(path)["coverage"], "complete")

    def _sass_seal_bodies(self, ids, *, tarball=None):
        invocation = self.run.invocation("sass-seal")
        self.run.manifest['oracles']['current_peer'] += [{'id':'@angular/material','version':'22.1.7'},{'id':'@angular/cdk','version':'22.1.7'},{'id':'@angular/core','version':'22.1.7'}]
        library = next(item for item in self.f.run["artifacts"] if item["id"] == "library")
        oracle_sha = verify.evidence_sha256(verify.SASS_API_ORACLE)
        bodies = {}
        for case_id in ids:
            body = {"case_id": case_id, "result": "pass", "kind": "assertion"}
            if case_id.startswith('owned-style/'):
                from owned_style_fixture import style_receipt
                body=style_receipt(ROOT,self.run,case_id,invocation)
            elif case_id.startswith(verify._SASS_API_PREFIXES):
                body.update({
                    "group": "sass-api-and-values", "check_id": "sass-seal", "line": "main",
                    "run_id": self.f.run["run_id"], "invocation_id": invocation,
                    "tarball_sha256": tarball or library["sha256"], "oracle_sha256": oracle_sha,
                })
            bodies[case_id] = body
        return invocation, bodies

    def _write_sass_seal(self, bodies, invocation):
        directory = self.f.run_dir / acceptance.assertion_directory("sass-seal", invocation)
        directory.mkdir(parents=True, exist_ok=True)
        for case_id, body in bodies.items():
            write_json(directory / f"{case_id.replace('/', '__')}.json", body)
        path = self.f.run_dir / "reports/sass-seal.json"
        if path.exists():
            path.unlink()
        verify.write_line_coordinator_report(
            self.f.run_dir, self.f.run["run_id"], "main", "sass-seal", exit_code=0,
        )
        return acceptance.read_json(path)

    def test_sass_seal_pending_api_cases_keep_the_report_incomplete(self):
        row, ids = self._real_line_ids("sass-seal")
        api = row["acceptance"]["cases_by_line"]["main"]["sass-api-and-values"]
        self.assertEqual(len(api), 651)
        self.assertEqual(row["acceptance"]["cases_by_line"]["main"]["isolation-negatives"],
                         ["archived-import", "mutated-golden", "hidden-resolution", "api-drift"])
        decisions = acceptance.read_json(ROOT / "compatibility/rc/sass-pending-decisions.json")
        pending = {item["case_id"] for d in decisions["decisions"] for item in d["cases"]}
        self.assertTrue(pending <= set(ids))
        invocation, bodies = self._sass_seal_bodies(ids)
        report = self._write_sass_seal({k: v for k, v in bodies.items() if k not in pending}, invocation)
        self.assertEqual(report["coverage"], "slice")

    def test_sass_seal_api_assertions_must_bind_the_run_library(self):
        _, ids = self._real_line_ids("sass-seal")
        invocation, bodies = self._sass_seal_bodies(ids, tarball="0" * 64)
        self.assertFalse(verify._sass_seal_assertion_ok(bodies["variable/indigo-palette"], invocation))
        self.assertTrue(verify._sass_seal_assertion_ok(bodies["owned-legacy-card"], invocation))
        self.assertEqual(self._write_sass_seal(bodies, invocation)["coverage"], "slice")
        _, good = self._sass_seal_bodies(ids)
        stale = dict(good["mixin-css/core"], oracle_sha256="f" * 64)
        self.assertFalse(verify._sass_seal_assertion_ok(stale, invocation))
        other = dict(good["mixin/core"], invocation_id="other")
        self.assertFalse(verify._sass_seal_assertion_ok(other, invocation))

    def test_sass_seal_complete_only_with_every_rostered_assertion(self):
        _, ids = self._real_line_ids("sass-seal")
        invocation, bodies = self._sass_seal_bodies(ids)
        for body in bodies.values():
            self.assertTrue(verify._sass_seal_assertion_ok(body, invocation), body["case_id"])
        self.assertEqual(self._write_sass_seal(bodies, invocation)["coverage"], "complete")

    def _real_line_ids(self, check_id):
        matrix = acceptance.read_json(verify.MATRIX_PATH)
        row = next(item for item in matrix["checks"] if item["check_id"] == check_id)
        return row, acceptance.expected_cases(row, "main")

    def _write_line_assertions(self, check_id, ids):
        invocation = self.run.invocation(check_id)
        directory = self.f.run_dir / acceptance.assertion_directory(check_id, invocation)
        directory.mkdir(parents=True, exist_ok=True)
        if check_id == "m3-coexistence":
            self._bridge_peer()
            for case_id in ids:
                write_json(directory / f"{case_id}.json", self._m3_body(case_id, invocation))
            return directory
        for case_id in ids:
            if check_id == "consumer-floors" and case_id.startswith(("library/", "cli/")):
                from consumer_floor_fixture import write_floor_receipt
                write_json(directory / f"{case_id.replace('/', '__')}.json", write_floor_receipt(ROOT, verify.ACTIVE_RUN, case_id, invocation))
                continue
            write_json(directory / f"{case_id.replace('/', '__')}.json", {
                "case_id": case_id,
                "result": "pass",
                "kind": "assertion",
                "line": "main",
            })
        return directory

    def test_complete_main_line_reports_use_real_ids_and_are_not_overwritten(self):
        forbidden = ("approved", "g01_claim", "g07_claim", "g12_claim", "g13_claim")
        for check_id in ("m3-coexistence", "consumer-floors", "release-metadata"):
            with self.subTest(check_id=check_id):
                row, ids = self._real_line_ids(check_id)
                self.assertTrue(row["implemented"])
                for group, group_ids in row["acceptance"]["cases_by_line"]["21.x"].items():
                    if check_id == "consumer-floors" and group in ("library-runtime", "cli-runtime-floors"):
                        self.assertTrue(group_ids)
                    else:
                        self.assertIsNone(group_ids, group)
                self._write_line_assertions(check_id, ids)
                path = self.f.run_dir / f"reports/{check_id}.json"
                path.unlink()
                verify.write_line_coordinator_report(
                    self.f.run_dir, self.f.run["run_id"], "main", check_id, exit_code=0,
                )
                report = acceptance.read_json(path)
                self.assertEqual(report["coverage"], "complete")
                self.assertEqual(report["line"], "main")
                self.assertEqual(report["result"], "pass")
                self.assertEqual(report["exit_code"], 0)
                self.assertEqual(report["subject_kind"], row["acceptance"]["subject_kind"])
                self.assertEqual(report["subject_ids"], row["acceptance"]["subject_ids"])
                self.assertEqual(set(report["expected_case_ids"]), set(ids))
                self.assertEqual(set(report["discovered_case_ids"]), set(ids))
                self.assertEqual(set(report["executed_case_ids"]), set(ids))
                self.assertEqual(set(report["passed_case_ids"]), set(ids))
                self.assertEqual(report["passed"], len(ids))
                self.assertEqual(report["failed"], 0)
                self.assertEqual(report["skipped"], 0)
                self.assertEqual(report["failed_case_ids"], [])
                self.assertEqual(report["skipped_case_ids"], [])
                self.assertEqual(report["unresolved_case_ids"], [])
                self.assertEqual(report["exceptions"], [])
                for item in self.f.run["artifacts"]:
                    if item["id"] in report["subject_ids"]:
                        self.assertEqual(report["artifacts"][item["id"]], {"sha256": item["sha256"], "bytes": item["bytes"]})
                self.assertEqual(set(report["artifacts"]), set(report["subject_ids"]))
                self.assertEqual(len(report["case_results"]), len(ids))
                paths = {item["path"] for item in report["outputs"]}
                prefix = acceptance.assertion_directory(check_id, report["invocation_id"]) + "/"
                self.assertTrue(paths)
                for item in report["case_results"]:
                    self.assertEqual(item["result"], "pass")
                    self.assertEqual(item["kind"], "assertion")
                    self.assertTrue(set(item["output_paths"]) <= paths)
                    self.assertTrue(item["output_paths"][0].startswith(prefix))
                for output in report["outputs"]:
                    self.assertTrue(output["path"].startswith(prefix))
                    acceptance.checked_file(self.f.run_dir, output, "assertion")
                for name in forbidden:
                    self.assertNotIn(name, report)
                if check_id == "consumer-floors":
                    self.assertIn("current-runtime-satisfies", ids)
                    self.assertIn("below-floor-rejected", ids)
                    self.assertTrue(any("including Node 18" in item for item in report["limitations"]))
                if check_id == "release-metadata":
                    self.assertTrue(any("No instruction file was compared" in item for item in report["limitations"]))
                    self.assertEqual(
                        [item for item in ids if item in {
                            "baseline-repository", "baseline-tag", "baseline-commit", "baseline-git-tag", "repository",
                        }],
                        ["baseline-repository", "baseline-tag", "baseline-commit", "baseline-git-tag", "repository"],
                    )
                if check_id == "m3-coexistence":
                    self.assertTrue(any("not rostered" in item for item in report["limitations"]))
                    self.assertFalse(any("contamination" in case_id for case_id in ids))
                before = path.read_bytes()
                verify.write_check_report(self.f.run_dir, self.f.run["run_id"], "main", check_id, exit_code=0)
                self.assertEqual(path.read_bytes(), before)

    def test_failed_or_non_main_line_report_stays_incomplete_slice(self):
        for check_id in ("m3-coexistence", "consumer-floors", "release-metadata"):
            with self.subTest(check_id=check_id):
                _, ids = self._real_line_ids(check_id)
                self._write_line_assertions(check_id, ids)
                path = self.f.run_dir / f"reports/{check_id}.json"
                path.unlink()
                verify.write_line_coordinator_report(
                    self.f.run_dir, self.f.run["run_id"], "main", check_id, exit_code=7,
                )
                report = acceptance.read_json(path)
                self.assertEqual(report["coverage"], "slice")
                self.assertEqual(report["result"], "fail")
                self.assertEqual(report["exit_code"], 7)
                path.unlink()
                with patch.object(verify, "expected_cases", side_effect=AssertionError("21.x must not roster main cases")):
                    verify.write_line_coordinator_report(
                        self.f.run_dir, self.f.run["run_id"], "21.x", check_id, exit_code=0,
                    )
                report = acceptance.read_json(path)
                self.assertEqual(report["coverage"], "slice")
                self.assertEqual(report["line"], "21.x")

    def test_missing_presence_or_copied_line_assertion_stays_slice(self):
        for check_id in ("m3-coexistence", "consumer-floors", "release-metadata"):
            with self.subTest(check_id=check_id):
                _, ids = self._real_line_ids(check_id)
                directory = self._write_line_assertions(check_id, ids[:-1])
                presence = directory / f"{ids[-1].replace('/', '__')}.json"
                write_json(presence, {"case_id": ids[-1], "result": "pass", "kind": "presence", "line": "main"})
                path = self.f.run_dir / f"reports/{check_id}.json"
                path.unlink()
                verify.write_line_coordinator_report(
                    self.f.run_dir, self.f.run["run_id"], "main", check_id, exit_code=0,
                )
                self.assertEqual(acceptance.read_json(path)["coverage"], "slice")
                presence.write_bytes(self.f.run_path.read_bytes())
                path.unlink()
                verify.write_line_coordinator_report(
                    self.f.run_dir, self.f.run["run_id"], "main", check_id, exit_code=0,
                )
                self.assertEqual(acceptance.read_json(path)["coverage"], "slice")

    def test_source_only_contract_needs_no_manifest_artifact(self):
        row, _ = self._real_line_ids("companion-bridge-tokens")
        self.assertEqual(row["acceptance"]["subject_ids"], ["source"])
        self.assertEqual(verify._contract_artifacts(row), {})
        library = next(item for item in self.run.manifest["artifacts"] if item["id"] == "library")
        mixed_row = {"acceptance": {"subject_ids": ["source", "library"]}}
        self.assertEqual(verify._contract_artifacts(mixed_row),
                         {"library": {"sha256": library["sha256"], "bytes": library["bytes"]}})
        self.run.manifest["artifacts"] = []
        self.assertEqual(verify._contract_artifacts(row), {})
        # A real artifact subject still needs its manifest artifact.
        self.assertIsNone(verify._contract_artifacts({"acceptance": {"subject_ids": ["library"]}}))
        self.assertIsNone(verify._contract_artifacts(mixed_row))

    def _bridge_peer(self):
        self.run.manifest["oracles"]["current_peer"] = [
            *self.run.manifest["oracles"]["current_peer"],
            {"id": "@angular/material", "version": "22.1.7"},
        ]

    def _bridge_body(self, case_id, invocation, **changes):
        rest = case_id[len("--mat-"):]
        component = next(name for name in sorted(_BRIDGE_COMPONENTS, key=len, reverse=True)
                         if rest.startswith(name + "-"))
        value = "rgba(0, 0, 0, 0.87)"
        body = {
            "schema_version": 1,
            "kind": "assertion",
            "check_id": "companion-bridge-tokens",
            "line": "main",
            "case_id": case_id,
            "result": "pass",
            "run_id": self.f.run["run_id"],
            "invocation_id": invocation,
            "token": case_id,
            "component": component,
            "allowed_key": rest[len(component) + 1:],
            "peer_package": "@angular/material",
            "peer_version": "22.1.7",
            "peer_source_file": f"{component}/_m2-{component}.scss",
            "peer_source_sha256": "a" * 64,
            "expected_peer": value,
            "candidate": value,
            "scenarios": [{"id": "contract", "match": True, "selector_checks": [
                {"selector": ":root", "expected_peer": value, "candidate": value, "match": True}]}],
        }
        body.update(changes)
        return body

    def _write_bridge_assertions(self, ids, overrides=None):
        invocation = self.run.invocation("companion-bridge-tokens")
        directory = self.f.run_dir / acceptance.assertion_directory("companion-bridge-tokens", invocation)
        directory.mkdir(parents=True, exist_ok=True)
        for case_id in ids:
            changes = (overrides or {}).get(case_id, {})
            write_json(directory / f"{case_id[2:]}.json", self._bridge_body(case_id, invocation, **changes))
        return directory

    def _bridge_report(self, line="main", exit_code=0):
        path = self.f.run_dir / "reports/companion-bridge-tokens.json"
        if path.exists():
            path.unlink()
        verify.write_line_coordinator_report(
            self.f.run_dir, self.f.run["run_id"], line, "companion-bridge-tokens", exit_code=exit_code,
        )
        return path, acceptance.read_json(path)

    def test_complete_main_bridge_token_report_and_not_overwritten(self):
        self._bridge_peer()
        row, ids = self._real_line_ids("companion-bridge-tokens")
        self.assertTrue(row["implemented"])
        self.assertEqual(list(row["acceptance"]["cases_by_line"]["main"]), ["compiled-override-tokens"])
        self.assertEqual(len(ids), 196)
        self.assertTrue(all(case_id.startswith("--mat-") for case_id in ids))
        for group, group_ids in row["acceptance"]["cases_by_line"]["21.x"].items():
            self.assertIsNone(group_ids, group)
        self._write_bridge_assertions(ids)
        path, report = self._bridge_report()
        self.assertEqual(report["coverage"], "complete")
        self.assertEqual(report["result"], "pass")
        self.assertEqual(report["subject_kind"], "source")
        self.assertEqual(report["subject_ids"], ["source"])
        self.assertEqual(report["artifacts"], {})
        self.assertEqual(report["expected_case_ids"], ids)
        self.assertEqual(report["passed"], 196)
        self.assertEqual(len(report["outputs"]), 196)
        for name in ("approved", "g06_claim", "g07_claim", "g08_claim", "g06_g07_g08_claim"):
            self.assertNotIn(name, report)
        before = path.read_bytes()
        verify.write_check_report(self.f.run_dir, self.f.run["run_id"], "main", "companion-bridge-tokens", exit_code=0)
        self.assertEqual(path.read_bytes(), before)

    def test_failed_child_or_21x_bridge_token_report_stays_slice(self):
        self._bridge_peer()
        _, ids = self._real_line_ids("companion-bridge-tokens")
        self._write_bridge_assertions(ids)
        _, report = self._bridge_report(exit_code=1)
        self.assertEqual(report["coverage"], "slice")
        self.assertEqual(report["result"], "fail")
        with patch.object(verify, "expected_cases", side_effect=AssertionError("21.x must not roster main cases")):
            _, report = self._bridge_report(line="21.x")
        self.assertEqual(report["coverage"], "slice")
        self.assertEqual(report["line"], "21.x")

    def test_missing_copied_or_foreign_bridge_token_assertion_stays_slice(self):
        self._bridge_peer()
        _, ids = self._real_line_ids("companion-bridge-tokens")
        last = ids[-1]
        directory = self._write_bridge_assertions(ids[:-1])
        self.assertEqual(self._bridge_report()[1]["coverage"], "slice")
        (directory / f"{last[2:]}.json").write_bytes(self.f.run_path.read_bytes())
        self.assertEqual(self._bridge_report()[1]["coverage"], "slice")
        for changes in (
            {"run_id": "another-run"},
            {"invocation_id": "another-invocation"},
            {"peer_version": "21.2.14"},
            {"peer_package": "@angular/cdk"},
            {"peer_source_file": None},
            {"peer_source_file": "toolbar/_toolbar-theme.scss"},
            {"scenarios": []},
        ):
            with self.subTest(changes=changes):
                self._write_bridge_assertions(ids, {last: changes})
                self.assertEqual(self._bridge_report()[1]["coverage"], "slice")
        self._write_bridge_assertions(ids)
        self.assertEqual(self._bridge_report()[1]["coverage"], "complete")

    def test_wrong_but_nonempty_bridge_token_stays_slice(self):
        self._bridge_peer()
        _, ids = self._real_line_ids("companion-bridge-tokens")
        token = "--mat-toolbar-container-background-color"
        self.assertIn(token, ids)
        wrong = [
            {"candidate": "whitesmoke", "expected_peer": "white"},
            {"result": "fail", "candidate": "whitesmoke", "expected_peer": "white"},
            {"scenarios": [{"id": "contract", "match": True, "selector_checks": [
                {"selector": ".mat-toolbar.mat-accent", "expected_peer": "#ff4081",
                 "candidate": "#3f51b5", "match": True}]}]},
            {"candidate": "", "expected_peer": ""},
        ]
        for changes in wrong:
            with self.subTest(changes=changes):
                self._write_bridge_assertions(ids, {token: changes})
                self.assertEqual(self._bridge_report()[1]["coverage"], "slice")

    def test_bridge_token_peer_version_comes_from_run_oracles(self):
        _, ids = self._real_line_ids("companion-bridge-tokens")
        self._write_bridge_assertions(ids)
        # The synthetic manifest names no @angular/material peer, so no assertion binds.
        self.assertEqual(self._bridge_report()[1]["coverage"], "slice")

    _COMPUTED_ROSTER = {
        "thirteen-companion-dimensions": [
            "badge/color/content/background-color",
            "toolbar/color/toolbar/background-color",
            "badge/density/not-applicable",
        ],
        "independent-peer-oracle": ["badge/peer-oracle", "toolbar/peer-oracle"],
    }
    _SHA = "ab" * 32

    def _computed_matrix(self):
        """A fixture matrix that rosters companion-computed-styles main cases."""
        matrix = acceptance.read_json(verify.MATRIX_PATH)
        row = next(item for item in matrix["checks"] if item["check_id"] == "companion-computed-styles")
        real = row["acceptance"]["cases_by_line"]["main"]
        for group, ids in self._COMPUTED_ROSTER.items():
            for case_id in ids:
                self.assertIn(case_id, real[group])
        row["acceptance"]["cases_by_line"]["main"] = {
            group: list(ids) for group, ids in self._COMPUTED_ROSTER.items()}
        path = self.root / "fixture-full-verify.json"
        write_json(path, matrix)
        matrix_patch = patch.object(verify, "MATRIX_PATH", path)
        matrix_patch.start()
        self.addCleanup(matrix_patch.stop)
        self._bridge_peer()
        return [case_id for ids in self._COMPUTED_ROSTER.values() for case_id in ids]

    def _computed_body(self, case_id, invocation, **changes):
        library = next(item for item in self.f.run["artifacts"] if item["id"] == "library")
        parts = case_id.split("/")
        companion = parts[0]
        body = {
            "schema_version": 1,
            "kind": "assertion",
            "check_id": "companion-computed-styles",
            "line": "main",
            "case_id": case_id,
            "result": "pass",
            "run_id": self.f.run["run_id"],
            "invocation_id": invocation,
            "peer_package": "@angular/material",
            "peer_version": "22.1.7",
            "peer_package_json_sha256": self._SHA,
            "tarball_sha256": library["sha256"],
            "oracle_css_sha256": self._SHA,
            "candidate_css_sha256": self._SHA,
            "companion": companion,
            "peer_source_file": f"{companion}/_m2-{companion}.scss",
            "peer_source_sha256": self._SHA,
        }
        if parts[1] == "peer-oracle":
            body.update({
                "group": "independent-peer-oracle",
                "oracle_isolation": {"peer_only": True, "legacy_package_loaded": False},
                "applicable_dimensions": ["color"],
                "sensitivity": {"color": {"kind": "light-vs-dark", "ok": True, "witness": "x"}},
            })
        elif parts[2] == "not-applicable":
            body.update({
                "group": "thirteen-companion-dimensions", "dimension": parts[1], "not_applicable": True,
                "peer_mixin": f"mat.{companion}-{parts[1]}", "peer_emitted_tokens": [],
            })
        else:
            light, dark = "rgb(255, 64, 129)", "rgb(66, 66, 66)"
            body.update({
                "group": "thirteen-companion-dimensions", "dimension": parts[1],
                "element": parts[2], "property": parts[3], "token": f"--mat-{companion}-background-color",
                "scenarios": [
                    {"scenario": "light", "oracle": light, "candidate": light, "oracle_token": light, "match": True},
                    {"scenario": "dark", "oracle": dark, "candidate": dark, "oracle_token": dark, "match": True},
                ],
                "negative": {"scenario": "light", "injected": "rgb(1, 2, 3)", "observed": "rgb(1, 2, 3)",
                             "oracle": light, "sentinel_consumed": True, "mismatch_detected": True},
            })
        body.update(changes)
        return body

    def _write_computed_assertions(self, ids, overrides=None):
        invocation = self.run.invocation("companion-computed-styles")
        directory = self.f.run_dir / acceptance.assertion_directory("companion-computed-styles", invocation)
        directory.mkdir(parents=True, exist_ok=True)
        for case_id in ids:
            changes = (overrides or {}).get(case_id, {})
            write_json(directory / f"{case_id.replace('/', '__')}.json",
                       self._computed_body(case_id, invocation, **changes))
        return directory

    def _computed_report(self, line="main", exit_code=0):
        path = self.f.run_dir / "reports/companion-computed-styles.json"
        if path.exists():
            path.unlink()
        verify.write_line_coordinator_report(
            self.f.run_dir, self.f.run["run_id"], line, "companion-computed-styles", exit_code=exit_code,
        )
        return path, acceptance.read_json(path)

    def test_real_computed_styles_main_roster_and_null_21x(self):
        row, ids = self._real_line_ids("companion-computed-styles")
        self.assertTrue(row["implemented"])
        self.assertEqual(row["acceptance"]["subject_ids"], ["library"])
        groups = row["acceptance"]["cases_by_line"]["main"]
        self.assertEqual(len(groups["independent-peer-oracle"]), 13)
        self.assertEqual(len(ids), len(set(ids)))
        for group, group_ids in row["acceptance"]["cases_by_line"]["21.x"].items():
            self.assertIsNone(group_ids, f"21.x/{group}")
        # Synthetic run: no assertion files were written, so the report stays a slice.
        self._bridge_peer()
        _, report = self._computed_report()
        self.assertEqual(report["coverage"], "slice")

    _PRODUCER_BODIES = """
import * as cases from './scripts/companion-computed-cases.mjs';
import * as producer from './scripts/check-companion-computed-styles.mjs';
const input = JSON.parse(process.argv[1]);
const dims = input.ids.filter((id) => !id.endsWith('/peer-oracle'));
const rostered = cases.BINDINGS.filter((b) => dims.includes(b.id));
const notApplicable = dims.filter((id) => id.endsWith('/not-applicable')).map((id) => {
  const [companion, dimension] = id.split('/');
  return {id, companion, dimension, peer_mixin: `mat.${companion}-${dimension}`,
    peer_source_file: `${companion}/_m2-${companion}.scss`, peer_source_sha256: 'ab'.repeat(32)};
});
const sentinels = cases.sentinelTable(rostered);
const observations = {};
for (const b of rostered) {
  const per = Object.fromEntries(b.scenarios.map((s, i) => {
    const v = `rgb(${i + 10}, 9, 9)`;
    return [s, {found: true, value: v, token_value: v}];
  }));
  observations[b.id] = {oracle: per, candidate: per, negative: {found: true, value: sentinels[b.token].marker}};
}
const dimensionTokens = {};
for (const c of cases.COMPANIONS) {
  dimensionTokens[c] = {peer_source_file: `${c}/_m2-${c}.scss`, peer_source_sha256: 'ab'.repeat(32),
    dimensions: Object.fromEntries(cases.DIMENSIONS.map((d) => [d, {tokens: []}]))};
}
const identity = {package: '@angular/material', version: '22.1.7', package_json_sha256: 'cd'.repeat(32)};
const isolation = {peer_only: true, legacy_package_loaded: false};
const assessed = producer.assessAll({roster: {rostered, notApplicable}, observations, sentinels, dimensionTokens, identity, isolation});
assessed.oracleCases = assessed.oracleCases.filter((r) => input.ids.includes(r.case_id));
const bodies = producer.assertionBodies(assessed, {line: 'main', runId: input.run_id, invocationId: input.invocation,
  identity, dimensionTokens, oracleCssSha256: 'ef'.repeat(32), candidateCssSha256: '01'.repeat(32),
  tarballSha256: input.tarball_sha256, browser: 'Chrome', isolation});
producer.writeAssertionFiles(input.dir, bodies);
console.log(JSON.stringify(bodies.map((b) => [b.case_id, b.result])));
"""

    def test_producer_assertion_bodies_satisfy_the_coordinator(self):
        ids = self._computed_matrix()
        invocation = self.run.invocation("companion-computed-styles")
        directory = self.f.run_dir / acceptance.assertion_directory("companion-computed-styles", invocation)
        library = next(item for item in self.f.run["artifacts"] if item["id"] == "library")
        payload = {"ids": ids, "run_id": self.f.run["run_id"], "invocation": invocation,
                   "tarball_sha256": library["sha256"], "dir": str(directory)}
        result = subprocess.run(["node", "--input-type=module", "-e", self._PRODUCER_BODIES, json.dumps(payload)],
                                cwd=ROOT, text=True, capture_output=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(sorted(json.loads(result.stdout)), sorted([case_id, "pass"] for case_id in ids))
        self.assertEqual(self._computed_report()[1]["coverage"], "complete")

    def test_computed_token_owner_allows_only_the_datepicker_density_icon_button(self):
        self._computed_matrix()
        invocation = self.run.invocation("companion-computed-styles")
        allowed = self._computed_body("datepicker/density/popup-next-button-touch-target/display", invocation,
                                      token="--mat-icon-button-touch-target-display")
        self.assertTrue(verify._computed_style_assertion_ok(allowed, invocation))
        for case_id, token in (
            ("datepicker/color/popup-next-button-touch-target/display", "--mat-icon-button-touch-target-display"),
            ("badge/color/badge/background-color", "--mat-icon-button-touch-target-display"),
            ("datepicker/density/popup-next-button-touch-target/display", "--mat-badge-background-color"),
        ):
            with self.subTest(case_id=case_id, token=token):
                body = self._computed_body(case_id, invocation, token=token)
                self.assertFalse(verify._computed_style_assertion_ok(body, invocation))

    def test_null_computed_styles_roster_stays_slice(self):
        self._computed_matrix()
        matrix = acceptance.read_json(verify.MATRIX_PATH)
        row = next(item for item in matrix["checks"] if item["check_id"] == "companion-computed-styles")
        row["acceptance"]["cases_by_line"]["main"]["independent-peer-oracle"] = None
        write_json(verify.MATRIX_PATH, matrix)
        self._write_computed_assertions(self._COMPUTED_ROSTER["thirteen-companion-dimensions"])
        self.assertEqual(self._computed_report()[1]["coverage"], "slice")

    def test_complete_main_computed_styles_report_and_not_overwritten(self):
        ids = self._computed_matrix()
        self._write_computed_assertions(ids)
        path, report = self._computed_report()
        self.assertEqual(report["coverage"], "complete")
        self.assertEqual(report["result"], "pass")
        self.assertEqual(report["line"], "main")
        self.assertEqual(report["subject_kind"], "artifact")
        self.assertEqual(report["subject_ids"], ["library"])
        library = next(item for item in self.f.run["artifacts"] if item["id"] == "library")
        self.assertEqual(report["artifacts"], {"library": {"sha256": library["sha256"], "bytes": library["bytes"]}})
        self.assertEqual(report["expected_case_ids"], ids)
        self.assertEqual(report["passed"], len(ids))
        self.assertEqual(len(report["outputs"]), len(ids))
        prefix = acceptance.assertion_directory("companion-computed-styles", report["invocation_id"]) + "/"
        for output in report["outputs"]:
            self.assertTrue(output["path"].startswith(prefix))
            acceptance.checked_file(self.f.run_dir, output, "assertion")
        for name in ("approved", "g06_claim", "g07_claim", "g08_claim", "g06_g07_g08_claim"):
            self.assertNotIn(name, report)
        before = path.read_bytes()
        verify.write_check_report(self.f.run_dir, self.f.run["run_id"], "main", "companion-computed-styles", exit_code=0)
        self.assertEqual(path.read_bytes(), before)

    def test_failed_child_or_21x_computed_styles_report_stays_slice(self):
        ids = self._computed_matrix()
        self._write_computed_assertions(ids)
        _, report = self._computed_report(exit_code=1)
        self.assertEqual(report["coverage"], "slice")
        self.assertEqual(report["result"], "fail")
        self.assertEqual(report["exit_code"], 1)
        with patch.object(verify, "expected_cases", side_effect=AssertionError("21.x must not roster main cases")):
            _, report = self._computed_report(line="21.x")
        self.assertEqual(report["coverage"], "slice")
        self.assertEqual(report["line"], "21.x")

    def test_missing_copied_or_foreign_computed_styles_assertion_stays_slice(self):
        ids = self._computed_matrix()
        last = ids[-1]
        directory = self._write_computed_assertions(ids[:-1])
        self.assertEqual(self._computed_report()[1]["coverage"], "slice")
        missing = directory / f"{last.replace('/', '__')}.json"
        missing.write_bytes(self.f.run_path.read_bytes())
        self.assertEqual(self._computed_report()[1]["coverage"], "slice")
        for changes in (
            {"run_id": "another-run"},
            {"invocation_id": "another-invocation"},
            {"peer_version": "21.2.14"},
            {"peer_version": None},
            {"peer_package": "@angular/cdk"},
            {"kind": "presence"},
            {"line": "21.x"},
            {"tarball_sha256": "cd" * 32},
            {"peer_source_file": "badge/_m2-badge.scss"},
            {"group": "thirteen-companion-dimensions"},
            {"oracle_isolation": {"peer_only": False, "legacy_package_loaded": False}},
            {"oracle_isolation": {"peer_only": True, "legacy_package_loaded": True}},
            {"sensitivity": {"color": {"ok": False}}},
            {"sensitivity": {}},
        ):
            with self.subTest(changes=changes):
                self._write_computed_assertions(ids, {last: changes})
                self.assertEqual(self._computed_report()[1]["coverage"], "slice")
        self._write_computed_assertions(ids)
        self.assertEqual(self._computed_report()[1]["coverage"], "complete")
        # A copied passing assertion gives the case two files, not exactly one.
        (directory / "copy.json").write_bytes(missing.read_bytes())
        self.assertEqual(self._computed_report()[1]["coverage"], "slice")

    def test_wrong_but_nonempty_computed_value_stays_slice(self):
        ids = self._computed_matrix()
        case_id = "toolbar/color/toolbar/background-color"
        good = self._computed_body(case_id, "x")
        light = good["scenarios"][0]
        wrong_light = {**light, "candidate": "rgb(245, 245, 245)"}
        wrong = [
            {"scenarios": [wrong_light, good["scenarios"][1]]},
            {"scenarios": [{**wrong_light, "match": True}, good["scenarios"][1]]},
            {"result": "fail"},
            {"scenarios": [{**light, "oracle": "", "candidate": ""}]},
            {"scenarios": [{**light, "oracle_token": ""}]},
            {"scenarios": []},
            {"scenarios": [light, light]},
            {"negative": {**good["negative"], "sentinel_consumed": False}},
            {"negative": {**good["negative"], "mismatch_detected": False}},
            {"negative": {**good["negative"], "observed": light["oracle"]}},
            {"negative": None},
            {"property": "color"},
            {"token": "--mat-badge-background-color"},
            {"not_applicable": True},
        ]
        for changes in wrong:
            with self.subTest(changes=changes):
                self._write_computed_assertions(ids, {case_id: changes})
                self.assertEqual(self._computed_report()[1]["coverage"], "slice")
        keyword_light = {**light, "oracle_token": ""}
        for changes, coverage in (
            ({"peer_declared_keyword": "unset", "scenarios": [keyword_light]}, "complete"),
            ({"peer_declared_keyword": "bogus", "scenarios": [keyword_light]}, "slice"),
            ({"peer_declared_keyword": None, "scenarios": [keyword_light]}, "slice"),
        ):
            with self.subTest(keyword=changes["peer_declared_keyword"]):
                self._write_computed_assertions(ids, {case_id: changes})
                self.assertEqual(self._computed_report()[1]["coverage"], coverage)
        na = "badge/density/not-applicable"
        for changes in ({"peer_emitted_tokens": ["--mat-badge-x"]}, {"peer_emitted_tokens": None},
                        {"peer_mixin": "mat.badge-theme"}, {"peer_source_sha256": None}):
            with self.subTest(not_applicable=changes):
                self._write_computed_assertions(ids, {na: changes})
                self.assertEqual(self._computed_report()[1]["coverage"], "slice")

    def test_cli_slice_does_not_claim_packaged_schematic_subject(self):
        path = self.f.run_dir / 'reports/migration-packaged.json'
        path.unlink()
        verify.write_check_report(self.f.run_dir, self.f.run['run_id'], 'main', 'migration-packaged', exit_code=0)
        report = acceptance.read_json(path)
        self.assertEqual(report['subject_ids'], ['migrate-cli'])
        self.assertEqual(set(report['artifacts']), {'migrate-cli'})
        self.assertEqual(report['coverage'], 'slice')

    def test_full_child_report_not_overwritten_by_process_wrapper(self):
        path = self.f.run_dir / 'reports/packed-consumer.json'
        before = path.read_bytes()
        verify.write_check_report(self.f.run_dir, self.f.run['run_id'], 'main', 'packed-consumer', exit_code=0)
        self.assertEqual(path.read_bytes(), before)

    def test_partial_child_report_is_retained_not_upgraded(self):
        path = self.f.run_dir / 'reports/packed-consumer.json'
        report = acceptance.read_json(path)
        report.pop('coverage')
        write_json(path, report)
        verify.write_check_report(self.f.run_dir, self.f.run['run_id'], 'main', 'packed-consumer', exit_code=0)
        wrapped = acceptance.read_json(path)
        self.assertEqual(wrapped['coverage'], 'slice')
        self.assertTrue(wrapped['outputs'])
        for record in wrapped['outputs']:
            acceptance.checked_file(self.f.run_dir, record, 'child details')

    def test_failed_first_migration_child_cannot_be_overwritten_by_second(self):
        self.run.record_exit('migration-packaged', 7)
        self.run.record_exit('migration-packaged', 0)
        self.assertEqual(self.run.exit_codes['migration-packaged'], 7)

    def test_full_verifier_lock_rejects_concurrent_owner(self):
        with verify.verifier_lock(self.root):
            with self.assertRaisesRegex(acceptance.EvidenceError, 'another full verifier'):
                with verify.verifier_lock(self.root):
                    self.fail('must not enter')
        with verify.verifier_lock(self.root):
            pass

    def test_valid_fully_implemented_matrix_passes_lite_structure_guard(self):
        with patch.object(lite, 'ROOT', self.root), patch.object(lite.subprocess, 'run', return_value=subprocess.CompletedProcess([], 2, '', 'usage: --out')):
            lite.check_full_verify_refuses_subsets()

    def test_malformed_genuine_family_report_is_not_ignored(self):
        report_path = self.root / 'family.json'
        for invalid in (-1, True):
            report = {'totals': {'executed': invalid, 'passed': invalid, 'failed': 0, 'skipped': 0}, 'failures': [], 'mapped_specs': []}
            write_json(report_path, report)
            with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
                lite.check_family_report(report_path, set(), root=self.root)

    def test_interrupted_pack_keeps_assigned_identity_and_nonzero_exit(self):
        out = self.root / 'artifacts/interrupted-pack'
        out.mkdir()
        with patch.object(verify, 'pack_environment', return_value=(self.f.run['environment'], self.f.run['oracles'])), \
                patch.object(verify.subprocess, 'run', side_effect=KeyboardInterrupt):
            with self.assertRaises(KeyboardInterrupt):
                verify.execute_pack(out, 'main', self.f.run['execution_inputs'], self.f.matrix_sha)
        record = acceptance.read_json(out / 'pack-execution.json')
        self.assertEqual(record['status'], 'interrupted')
        self.assertEqual(record['exit_code'], 130)
        self.assertTrue(record['invocation_id'])
        self.assertEqual(record['binding']['phase'], 'prepack')
        self.assertIsNotNone(record['finished_at'])
        self.assertFalse((out / 'run.json').exists())

    def test_pack_launch_failure_preserves_input_only_record(self):
        out = self.root / 'artifacts/unlaunched-pack'
        out.mkdir()
        with patch.object(verify, 'pack_environment', return_value=(self.f.run['environment'], self.f.run['oracles'])), \
                patch.object(verify.subprocess, 'run', side_effect=OSError('synthetic launch failure')):
            with self.assertRaises(OSError):
                verify.execute_pack(out, 'main', self.f.run['execution_inputs'], self.f.matrix_sha)
        record = acceptance.read_json(out / 'pack-execution.json')
        self.assertEqual(record['status'], 'launch-failed')
        self.assertEqual(record['exit_code'], 1)
        self.assertNotIn('artifacts_sha256', record['binding'])


class CurrentBindingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='rc-current-binding-')
        self.addCleanup(self.temp.cleanup)
        self.f = CompleteFixture(Path(self.temp.name))
        self.candidate = 'projects/ngx-material-legacy/legacy-card/testing/card-harness.spec.ts'
        p = self.f.root / self.candidate
        p.parent.mkdir(parents=True)
        p.write_text('// synthetic test fixture')
        self.row = {'candidate': self.candidate, 'historical_path': 'src/material/legacy-card/testing/card-harness.spec.ts',
                    'execution': {'bound_to_current_head': True}}
        self.report = {'run_id': self.f.run['run_id'], 'line': 'main', 'subject_mode': 'artifact',
            'artifact_sha256': self.f.run['artifacts'][0]['sha256'], 'totals': {'executed': 1, 'passed': 1, 'failed': 0, 'skipped': 0},
            'failures': [], 'mapped_specs': [{'candidate': self.candidate, 'historical_path': self.row['historical_path']}]}
        self.report_path = self.f.run_dir / 'reports/legacy-card.json'
        self.save()
        def git(cmd, **kwargs):
            value = 'a' * 40 if cmd[-1] == 'HEAD' else 'b' * 40
            return subprocess.CompletedProcess(cmd, 0, value + '\n', '')
        self.mock = patch.object(lite.subprocess, 'run', side_effect=git)
        self.mock.start()
        self.addCleanup(self.mock.stop)

    def save(self):
        write_json(self.report_path, self.report)
        self.row['execution']['receipt'] = {'run_manifest': self.f.run_path.relative_to(self.f.root).as_posix(),
            'report': {'path': self.report_path.relative_to(self.f.run_dir).as_posix(),
                'bytes': self.report_path.stat().st_size, 'sha256': acceptance.sha256_file(self.report_path)}}

    def test_bound_current_source_receipt_is_accepted(self):
        lite.check_current_binding(self.row, root=self.f.root)

    def test_claim_without_receipt_is_rejected(self):
        del self.row['execution']['receipt']
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            lite.check_current_binding(self.row, root=self.f.root)

    def test_old_source_receipt_is_rejected(self):
        self.f.run['source']['commit'] = '0' * 40
        write_json(self.f.run_path, self.f.run)
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            lite.check_current_binding(self.row, root=self.f.root)

    def test_wrong_original_mapping_is_rejected(self):
        self.report['mapped_specs'][0]['historical_path'] = 'unrelated'
        self.save()
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            lite.check_current_binding(self.row, root=self.f.root)

    def test_tampered_receipt_or_artifact_is_rejected(self):
        (self.f.run_dir / 'library.tgz').write_bytes(b'tamper')
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            lite.check_current_binding(self.row, root=self.f.root)


class InputDriftTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='rc-input-drift-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        package = self.root / 'projects/ngx-material-legacy/package.json'
        package.parent.mkdir(parents=True)
        package.write_text('{"version":"22.0.0-rc.0"}\n')
        source = self.root / 'projects/ngx-material-legacy/legacy-button/button.ts'
        source.parent.mkdir(parents=True)
        source.write_text('export const button = 1;\n')
        checker = self.root / 'scripts/checker.py'
        checker.parent.mkdir(parents=True)
        checker.write_text('print(1)\n')
        (self.root / 'pnpm-lock.yaml').write_text('lock: 1\n')
        (self.root / 'toolchain-lock.json').write_text('{"node":"24.21.0"}\n')
        (self.root / 'chainman.lock').write_text('b' * 40 + '\n')
        matrix = self.root / 'compatibility/rc/matrices/full-verify.json'
        matrix.parent.mkdir(parents=True)
        matrix.write_text('{"checks":[]}\n')
        self.git = self._git()
        self.git('add', '.')
        self.git('commit', '-qm', 'Synthetic input fixture')

    def _git(self):
        env = {**os.environ, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null'}
        def git(*args):
            return subprocess.run(['git', *args], cwd=self.root, env=env, capture_output=True, text=True, check=True).stdout.strip()
        git('init', '-q')
        git('config', 'user.name', 'Synthetic verifier test')
        git('config', 'user.email', 'synthetic@example.invalid')
        git('config', 'core.hooksPath', '/dev/null')
        return git

    def _change(self, relative, text):
        before = verify.observe_inputs(self.root)
        path = self.root / relative
        path.write_text(text)
        after = verify.observe_inputs(self.root)
        named = {item['path']: item for item in verify.describe_input_drift(before, after)}
        self.assertIn(relative, named)
        row = named[relative]
        self.assertEqual(row['change'], 'changed')
        self.assertNotEqual(row['before_sha256'], row['after_sha256'])
        self.assertNotEqual(before['fingerprint']['inputs_sha256'], after['fingerprint']['inputs_sha256'])
        return row

    def test_unchanged_observation_has_no_drift(self):
        before = verify.observe_inputs(self.root)
        after = verify.observe_inputs(self.root)
        self.assertEqual(verify.describe_input_drift(before, after), [])
        self.assertEqual(before['fingerprint'], after['fingerprint'])

    def test_product_lock_matrix_and_checker_mutations_are_named(self):
        self.assertEqual(self._change('projects/ngx-material-legacy/legacy-button/button.ts', 'export const button = 2;\n')['role'], 'product-source')
        self.git('checkout', '--', '.')
        self.assertEqual(self._change('pnpm-lock.yaml', 'lock: 2\n')['role'], 'lock')
        self.git('checkout', '--', '.')
        self.assertEqual(self._change('compatibility/rc/matrices/full-verify.json', '{"checks":["x"]}\n')['role'], 'matrix')
        self.git('checkout', '--', '.')
        self.assertEqual(self._change('scripts/checker.py', 'print(2)\n')['role'], 'checker')

    def test_deleted_and_new_paths_are_named(self):
        before = verify.observe_inputs(self.root)
        (self.root / 'projects/ngx-material-legacy/legacy-button/button.ts').unlink()
        after = verify.observe_inputs(self.root)
        missing = {item['path']: item for item in verify.describe_input_drift(before, after)}
        self.assertEqual(missing['projects/ngx-material-legacy/legacy-button/button.ts']['change'], 'missing')
        self.assertIsNone(missing['projects/ngx-material-legacy/legacy-button/button.ts']['after_sha256'])
        self.git('checkout', '--', '.')
        before = verify.observe_inputs(self.root)
        (self.root / 'scripts/new-checker.py').write_text('print(3)\n')
        after = verify.observe_inputs(self.root)
        created = {item['path']: item for item in verify.describe_input_drift(before, after)}
        self.assertEqual(created['scripts/new-checker.py']['change'], 'new')
        self.assertEqual(created['scripts/new-checker.py']['role'], 'checker')
        self.assertIsNone(created['scripts/new-checker.py']['before_sha256'])

    def test_motion_receipt_is_not_rewritten_for_a_coordinated_run(self):
        receipt = ROOT / 'compatibility/pack-proof/motion-lifecycle-smoke.json'
        original = receipt.read_bytes()
        self.addCleanup(lambda: receipt.write_bytes(original))
        out = self.root / 'motion-out'
        out.mkdir()
        env = {**os.environ, 'RC_CHECK_ID': 'motion-smoke', 'RC_ASSERTION_OUTPUT_DIR': str(out)}
        result = subprocess.run(['node', 'scripts/motion-lifecycle-smoke.mjs'], cwd=ROOT, env=env, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, result.stderr[-2000:])
        self.assertEqual(receipt.read_bytes(), original)
        written = json.loads((out / 'motion-lifecycle-smoke.json').read_text())
        self.assertEqual(written['status'], 'ok')


if __name__ == '__main__':
    unittest.main()
