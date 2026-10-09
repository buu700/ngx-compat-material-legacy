import importlib.util
import unittest
import tempfile
import json
from unittest.mock import patch
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

    def test_published_theme_path_precedes_unused_component_copy(self):
        for family, name in [('legacy-select','_select-theme.scss'),('legacy-snack-bar','_snack-bar-theme.scss')]:
            record=join.path_owner(f'src/material/{family}/{name}')
            self.assertEqual(record['candidate_path'],f'projects/ngx-material-legacy/styles/{family}/{name}')
            self.assertEqual(len(record['source_candidates']),2)
            self.assertEqual(record['owned_kind'],'historical-sass')
            self.assertEqual(join.consistency(row('irrelevant',[dict(path=f'src/material/{family}/{name}',**record)]))['status'],'conflict-owned-source-touched')

    def test_ordinary_core_and_style_paths_do_not_imply_peer_delegation(self):
        for source in ['src/material/core/datetime/native-date-adapter.ts',
                       'src/material/core/theming/_theming.scss',
                       'src/material/progress-bar/_progress-bar-theme.scss']:
            record=join.path_owner(source)
            self.assertEqual(record['kind'],'owned-legacy')
            self.assertTrue(record['candidate_exists'])
            self.assertIn('required',record['reachability_proof'])
            self.assertEqual(join.consistency(row('inherited',[dict(path=source,**record)]))['status'],'question-owned-source-shadows-delegation')

    def test_source_git_commands_disable_implicit_cache_writes_and_fetches(self):
        args=join.git_command(Path('/readonly/cache.git'),'show','commit')
        self.assertIn('remote.origin.promisor=false',args)
        self.assertIn('extensions.partialClone=',args)
        self.assertIn('gc.auto=0',args)


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

    def test_present_peer_hunks_cannot_clear_a_shadowing_owned_path(self):
        owned={"kind":"owned-legacy","candidate_exists":True,"path":"src/material/core/datetime/native-date-adapter.ts"}
        result=join.consistency(row("inherited",[owned,self.peer],self.lines((3,3),(3,3))))
        self.assertEqual(result['status'],'question-owned-source-shadows-delegation')
        self.assertEqual(result['owned_paths'],[owned['path']])

    def test_non_applicable_touching_owned_source_is_a_conflict(self) -> None:
        owned = {"kind": "owned-legacy", "candidate_exists": True, "path": "src/material/legacy-menu/menu.ts"}
        self.assertEqual(join.consistency(row("irrelevant", [owned]))["status"], "conflict-owned-source-touched")
        self.assertEqual(join.consistency(row("irrelevant", [self.peer]))["status"], "consistent-no-owned-source")


class PendingRefreshTests(unittest.TestCase):
    def test_reopened_row_survives_refresh_and_queue(self):
        source={"kind":"delegated-peer","package":"@angular/material","module":"tabs","path":"src/material/tabs/tab-body.ts"}
        facts={line:{"floor_tag":version,"sha_is_ancestor_of_floor_tag":True,
                    "delegated_added_lines_present_in_installed_floor":2,"delegated_added_lines":5}
               for line,version in [("main","v22.1.7"),("21.x","v21.2.14")]}
        item={"sha":"0064b4218b375b30b65bf1c13530d8620f20d980","subject":"fix(material/tabs): remove IE animation workaround (#29899)",
              "diff_sha256":"8c5c7c7e24faef142a0320faf51bd61cecd10c7e06eeeeb15ddc0f53cb654083",
              "final_disposition":"already-adapted","bucket":"behavior-semantic","files":[source],"lines":facts,
              "sensitive_class":None,"defects":["behavior-without-individual-proof"],"evidence_report":"old-report.json"}
        entry={"sha":item["sha"],"subject":item["subject"],"files":[source["path"]],"bucket":"behavior-semantic",
               "final_disposition":"needs-individual-review","evidence_report":"new-individual-source-review.json"}
        join.refresh_ledger_row(item,entry)
        self.assertEqual(item["final_disposition"],"needs-individual-review")
        self.assertEqual(item["evidence_report"],entry["evidence_report"])
        self.assertEqual(item["defects"],["unresolved-disposition"])
        self.assertEqual(item["mechanical_consistency"]["status"],"unclassified")
        self.assertEqual(item["lines"],facts)
        class Context:
            prs_16=set()
            execution={}
            def read_note(self,sha):return {"source":"ledger","disposition":"owned-retained-source-reviewed-native-pending","text":""}
            def regression_tests(self,row):return []
        with tempfile.TemporaryDirectory() as tmp,patch.object(join,"QUEUE",Path(tmp)/"queue.json"):
            join.write_queue([item],{"symbol_uses":[]},Context())
            queue=json.loads(join.QUEUE.read_text())
        self.assertEqual(len(queue["items"]),1)
        self.assertEqual(queue["items"][0]["sha"],item["sha"])
        self.assertEqual(queue["items"][0]["current_disposition"],"needs-individual-review")
        self.assertEqual(queue["items"][0]["category"],"pending-disposition")
        self.assertEqual(queue["groups"],[])

    def test_every_pending_state_stays_open_even_with_a_proof_object(self):
        for disposition in ["open","needs-individual-review","security-review"]:
            with self.subTest(disposition=disposition):
                self.assertIn("unresolved-disposition",join.proof_defects({"final_disposition":disposition,"individual_proof":{"decision":"unadmitted"}},None))


if __name__ == "__main__":
    unittest.main()
