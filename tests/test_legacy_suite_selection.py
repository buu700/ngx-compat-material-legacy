"""Selection regressions run the real CLI with a disposable child runner.

No browser, install, or Angular test is invoked by these controller tests.
"""
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


@unittest.skipUnless(shutil.which("node"), "Node is required for the CLI regressions")
class SuiteSelectionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="legacy-suite-selection-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "scripts").mkdir()
        (self.root / "testing/legacy-runner").mkdir(parents=True)
        for name in ("run-legacy-artifact-suite.mjs", "resolve-run-library.mjs"):
            shutil.copy2(ROOT / "scripts" / name, self.root / "scripts" / name)
        self.inventory = self.root / "testing/legacy-runner/historical-inventory.json"
        self.inventory.write_text(json.dumps({"rows": [{"family": "card"}, {"family": "button"}]}))
        (self.root / "scripts/rc-test-legacy-family.mjs").write_text(
            "import fs from 'node:fs';\n"
            "fs.appendFileSync('child-calls.jsonl', JSON.stringify(process.argv.slice(2))+'\\n');\n"
            "process.exit(process.env.TEST_CHILD_EXIT ? Number(process.env.TEST_CHILD_EXIT) : 0);\n"
        )

    def invoke(self, *args, env=None):
        return subprocess.run(["node", "scripts/run-legacy-artifact-suite.mjs", *args],
                              cwd=self.root, text=True, capture_output=True, timeout=10, env=env)

    def reject(self, *args):
        result = self.invoke(*args)
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertFalse((self.root / "child-calls.jsonl").exists(), result.stdout)
        self.assertNotIn("families passed", result.stdout)

    def test_comma_only_selection_is_not_success(self):
        self.reject("--run", "absent.json", "--families", ",")

    def test_empty_whitespace_and_empty_segments_are_rejected(self):
        for value in ("", " ", ",,", "card,", ",card", "card,,button"):
            with self.subTest(value=value):
                self.reject("--run", "absent.json", "--families", value)

    def test_duplicate_families_do_not_inflate_coverage(self):
        self.reject("--run", "absent.json", "--families", "card,card")

    def test_conflicting_selectors_are_rejected(self):
        self.reject("--run", "absent.json", "--family", "card", "--families", "button")

    def test_duplicate_options_are_rejected(self):
        for flag, value in (("--family", "card"), ("--families", "card"), ("--run", "absent.json")):
            with self.subTest(flag=flag):
                args = ["--run", "absent.json"] if flag != "--run" else []
                self.reject(*args, flag, value, flag, value)

    def test_unused_tarball_and_unknown_arguments_are_rejected(self):
        self.reject("--run", "absent.json", "--tarball", "other.tgz")
        self.reject("--run", "absent.json", "--unknown")

    def test_unknown_family_rejected_before_any_known_child(self):
        self.reject("--run", "absent.json", "--families", "card,nonesuch")

    def test_empty_inventory_refuses_zero_family_success(self):
        self.inventory.write_text('{"rows":[]}')
        self.reject("--run", "absent.json")

    def test_invalid_inventory_refuses_before_child(self):
        for rows in (None, [None], [{}], [{"family": ""}], [{"family": " card "}]):
            with self.subTest(rows=rows):
                self.inventory.write_text(json.dumps({"rows": rows}))
                self.reject("--run", "absent.json")

    def test_default_and_explicit_selections_run_each_family_once(self):
        result = self.invoke("--run", "run.json", "--families", "card, button")
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = (self.root / "child-calls.jsonl").read_text().splitlines()
        self.assertEqual([json.loads(c)[1] for c in calls], ["card", "button"])
        (self.root / "child-calls.jsonl").unlink()
        result = self.invoke("--run", "run.json")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len((self.root / "child-calls.jsonl").read_text().splitlines()), 2)

    def test_child_failure_propagates(self):
        import os
        result = self.invoke("--run", "run.json", "--family", "card", env={**os.environ, "TEST_CHILD_EXIT": "7"})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("failed families: card", result.stderr)
        self.assertNotIn("families passed", result.stdout)


if __name__ == "__main__":
    unittest.main()
