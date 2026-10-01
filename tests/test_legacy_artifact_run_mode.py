#!/usr/bin/env python3
"""RC-06.02: artifact-bound --run mode switch regressions."""
from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CI = (ROOT / ".github" / "workflows" / "ci.yml").read_text()
FAMILY = ROOT / "scripts" / "rc-test-legacy-family.mjs"
RESOLVE = ROOT / "scripts" / "resolve-run-library.mjs"
SUITE = ROOT / "scripts" / "run-legacy-artifact-suite.mjs"
VERIFY = ROOT / "scripts" / "rc-verify.py"
MATRIX = ROOT / "compatibility" / "rc" / "matrices" / "full-verify.json"


class LegacyArtifactRunModeTests(unittest.TestCase):
    def test_scripts_exist(self):
        self.assertTrue(FAMILY.is_file())
        self.assertTrue(RESOLVE.is_file())
        self.assertTrue(SUITE.is_file())

    def test_family_runner_requires_family_or_run(self):
        result = subprocess.run(
            ["node", str(FAMILY)],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 2)
        combined = result.stdout + result.stderr
        self.assertIn("--family", combined)
        self.assertIn("--run", combined)

    def test_family_runner_unknown_family_fails(self):
        result = subprocess.run(
            ["node", str(FAMILY), "--family", "not-a-real-family"],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 1)
        self.assertIn("Unknown historical family", result.stdout + result.stderr)

    def test_family_runner_missing_run_manifest_fails(self):
        result = subprocess.run(
            [
                "node",
                str(FAMILY),
                "--family",
                "card",
                "--run",
                "artifacts/main/entry-missing/run.json",
            ],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("Missing run manifest", result.stdout + result.stderr)

    def test_ci_wires_artifact_bound_family_against_entry_run(self):
        self.assertIn("Artifact-bound historical family", CI)
        self.assertIn("test-legacy -- --family card --run", CI)
        self.assertIn("Upload entry run directory", CI)
        self.assertIn("entry-${{ github.sha }}", CI)

    def test_full_verify_matrix_keeps_missing_cells(self):
        matrix = json.loads(MATRIX.read_text())
        required = [c for c in matrix["checks"] if c.get("required")]
        self.assertTrue(required)
        missing = [c["check_id"] for c in required if not c.get("implemented")]
        self.assertIn("historical-legacy-artifact", missing)

    def test_verify_without_out_refuses(self):
        result = subprocess.run(
            ["python3", str(VERIFY)],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 2)
        combined = result.stdout + result.stderr
        self.assertTrue("usage:" in combined or "requires --out" in combined)

    def test_resolve_helper_syntax(self):
        result = subprocess.run(
            ["node", "--check", str(RESOLVE)],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr)


class ResolveRunLibraryUnit(unittest.TestCase):
    def test_rehash_mismatch_fails(self):
        with tempfile.TemporaryDirectory(dir="/tmp") as td:
            run_dir = Path(td) / "entry"
            run_dir.mkdir()
            tarball = run_dir / "pkg.tgz"
            tarball.write_bytes(b"not-a-real-tarball-but-hashed")
            digest = __import__("hashlib").sha256(tarball.read_bytes()).hexdigest()
            run = {
                "schema_version": 1,
                "template": False,
                "stage": "draft",
                "purpose": "iteration",
                "run_id": "test-run",
                "source": {"line": "main"},
                "artifacts": [
                    {
                        "id": "library",
                        "path": "pkg.tgz",
                        "bytes": tarball.stat().st_size,
                        "sha256": "0" * 64,
                    }
                ],
            }
            (run_dir / "run.json").write_text(json.dumps(run) + "\n")
            # Invoke via node snippet importing the helper.
            script = f"""
import {{ resolveLibraryFromRun }} from '{RESOLVE.as_posix()}';
try {{
  resolveLibraryFromRun('{(run_dir / "run.json").as_posix()}');
  console.error('expected digest mismatch failure');
  process.exit(7);
}} catch (e) {{
  process.exit(1);
}}
"""
            # resolveLibraryFromRun calls process.exit, not throw.
            result = subprocess.run(
                ["node", "--input-type=module", "-e",
                 f"import {{ resolveLibraryFromRun }} from '{RESOLVE.as_posix()}';\n"
                 f"resolveLibraryFromRun('{(run_dir / 'run.json').as_posix()}');\n"],
                cwd=ROOT,
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 1)
            self.assertIn("do not match", result.stdout + result.stderr)
            # Ensure wrong digest was not somehow treated as the real one.
            self.assertNotEqual(digest, "0" * 64)


if __name__ == "__main__":
    unittest.main()
