import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("audit_join", ROOT / "scripts" / "build-upstream-audit-join.py")
join = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(join)


def row(disposition, files, lines=None):
    return {"final_disposition": disposition, "files": files, "lines": lines or {}}


class PathOwnerTests(unittest.TestCase):
    def test_kinds(self) -> None:
        owned = join.path_owner("src/material/legacy-button/button.ts")
        self.assertEqual(owned["kind"], "owned-legacy")
        self.assertTrue(owned["candidate_path"].startswith("projects/ngx-material-legacy/legacy-button/"))
        self.assertEqual(join.path_owner("src/cdk/a11y/live-announcer.ts"),
                         {"kind": "delegated-peer", "package": "@angular/cdk", "module": "a11y"})
        self.assertEqual(join.path_owner("src/cdk/a11y/live-announcer.spec.ts")["kind"], "test")
        self.assertEqual(join.path_owner("guides/theming.md")["kind"], "docs")
        self.assertEqual(join.path_owner("src/dev-app/menu/menu-demo.ts")["kind"], "demo")
        self.assertEqual(join.path_owner("package.json")["kind"], "tooling")


class ConsistencyTests(unittest.TestCase):
    peer = {"kind": "delegated-peer", "package": "@angular/cdk", "module": "a11y", "path": "src/cdk/a11y/x.ts"}

    def lines(self, main, other):
        return {
            "main": {"delegated_added_lines_present_in_installed_floor": main[0], "delegated_added_lines": main[1]},
            "21.x": {"delegated_added_lines_present_in_installed_floor": other[0], "delegated_added_lines": other[1]},
        }

    def test_inherited_statuses_never_decide(self) -> None:
        cases = {
            ((3, 3), (3, 3)): "consistent-added-lines-present-both-lines",
            ((1, 3), (2, 3)): "partial-added-lines-present",
            ((0, 3), (3, 3)): "question-added-lines-absent-on-a-line",
            ((0, 0), (0, 0)): "question-no-significant-added-lines",
        }
        for (main, other), status in cases.items():
            result = join.consistency(row("inherited", [self.peer], self.lines(main, other)))
            self.assertEqual(result["status"], status)
        self.assertEqual(join.consistency(row("inherited", [{"kind": "docs", "path": "a.md"}]))["status"],
                         "question-no-delegated-source")

    def test_non_applicable_touching_owned_source_is_a_conflict(self) -> None:
        owned = {"kind": "owned-legacy", "candidate_exists": True, "path": "src/material/legacy-menu/menu.ts"}
        self.assertEqual(join.consistency(row("irrelevant", [owned]))["status"], "conflict-owned-source-touched")
        self.assertEqual(join.consistency(row("irrelevant", [self.peer]))["status"], "consistent-no-owned-source")


if __name__ == "__main__":
    unittest.main()
