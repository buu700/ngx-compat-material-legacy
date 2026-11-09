# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://material.angular.dev/license
"""Portable, physical controls for the one window-table SSR admission scope.

These tests do not execute SSR or qualify a library artifact.  The archive
fixture exercises package-image verification on real, bounded tar members.
"""
import io
import json
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class WindowSsrControlTests(unittest.TestCase):
    def test_roster_source_validator_and_physical_archive_controls(self):
        with tempfile.TemporaryDirectory(prefix="window-ssr-controls-") as temp:
            frame = Path(temp) / "frame"
            frame.mkdir()
            shutil.copytree(ROOT / "scripts", frame / "scripts")
            shutil.copytree(ROOT / "testing", frame / "testing")
            shutil.copytree(ROOT / "projects" / "ngx-material-legacy",
                            frame / "projects" / "ngx-material-legacy")
            scope = "compatibility/rc/window-table-ssr-inherited-scope-main.json"
            css_inputs = "compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json"
            composition_cases = "compatibility/rc/ordinary-checkbox-button-legacy-composition-cases-v1.json"
            matrix = "compatibility/rc/matrices/full-verify.json"
            exports = "compatibility/rc/matrices/library-exports.json"
            composition_baseline = "compatibility/rc/ordinary-checkbox-button-legacy-composition-known-before-v1.json"
            retention = "compatibility/rc/current-sass-legacy-retention-reference-v1.json"
            card_cases = "compatibility/rc/ordinary-card-public-bridge-original-cases-v1.json"
            card_successor = "compatibility/rc/ordinary-card-c04-successor-inputs-v1.json"
            for path in (scope, matrix, exports, css_inputs, composition_cases, composition_baseline, retention, card_cases, card_successor):
                target = frame / path
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(ROOT / path, target)
            # Some checker modules import maintained RC source helpers directly.
            for source in (ROOT / "compatibility" / "rc").glob("*.mjs"):
                shutil.copyfile(source, frame / "compatibility" / "rc" / source.name)
            # Copy the complete authenticated source scope into the mutable frame.
            for member in json.loads((ROOT / scope).read_text())["members"]:
                path = member["path"]
                target = frame / path
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(ROOT / path, target)
            (frame / "tests").mkdir(exist_ok=True)
            names = ("csp-ssr-window-table-contract.mjs",
                     "csp-ssr-window-validator-negatives.mjs",
                     "csp-ssr-window-artifact-image.mjs")
            for name in names:
                shutil.copyfile(ROOT / "tests" / name, frame / "tests" / name)
            # The peer FESM is read from the pinned workspace, not replaced by a stub.
            (frame / "node_modules").symlink_to(ROOT / "node_modules",
                                                target_is_directory=True)

            def run(name, *args):
                result = subprocess.run(["node", str(frame / "tests" / name), *map(str, args)],
                                        cwd=frame, capture_output=True, text=True, timeout=60)
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
                return json.loads(result.stdout)

            contract = run(names[0])
            self.assertTrue(contract["rosterPositive"])
            self.assertEqual(len(contract["controls"]), 9)
            self.assertTrue(contract["wrongPeerRejected"])
            self.assertFalse(contract["liveSsrOrAuditClaim"])

            validator = run(names[1])
            for key in ("wrongSha", "wrongPatch", "physicalSourceDrift",
                        "physicalScopeDrift", "loadedValidatorDrift",
                        "loadedDispatchDrift", "recovery"):
                self.assertTrue(validator[key], key)
            self.assertFalse(validator["liveRunExecuted"])

            archive = Path(temp) / "synthetic.tgz"
            with tarfile.open(archive, "w:gz", format=tarfile.USTAR_FORMAT) as tar:
                for path, data in (
                    ("package/package.json", b'{"name":"fixture-only"}\n'),
                    ("package/fesm2022/ngx-compat-material-legacy-legacy-table.mjs",
                     b"export const fixtureOnly = true;\n"),
                ):
                    member = tarfile.TarInfo(path)
                    member.size = len(data)
                    tar.addfile(member, io.BytesIO(data))
            image = run(names[2], archive, Path(temp) / "image-control")
            self.assertEqual(image["positive"]["files"], 2)
            for key in ("byteDrift", "extra", "missing", "symlink", "wrongHash", "recovery"):
                self.assertTrue(image[key], key)


if __name__ == "__main__":
    unittest.main()
