"""Only handoff integrity tests; no Angular/product code or network executes."""
from pathlib import Path
import hashlib
import json
import shutil
import tempfile
import unittest
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
import validate_handoff as v
BASE = Path(__file__).resolve().parents[1]

def dump(path, data):
    path.write_text(json.dumps(data, indent=2) + '\n')

def seal(root):
    rows = []
    for p in sorted(root.rglob('*')):
        if p.is_file() and p.name != 'MANIFEST.sha256' and '__pycache__' not in p.parts:
            rows.append(hashlib.sha256(p.read_bytes()).hexdigest() + '  ' + p.relative_to(root).as_posix())
    (root / 'MANIFEST.sha256').write_text('\n'.join(rows) + '\n')

class ValidatorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='codex-handoff-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'bundle'
        shutil.copytree(BASE, self.root, ignore=shutil.ignore_patterns('__pycache__'))

    def reject(self, reseal=True):
        if reseal:
            seal(self.root)
        with self.assertRaises((v.Invalid, OSError, ValueError, KeyError, TypeError)):
            v.validate(self.root)

    def change_json(self, name, fn):
        p = self.root / name
        data = json.loads(p.read_text())
        fn(data)
        dump(p, data)

    def test_good_package(self):
        result = v.validate(self.root)
        self.assertEqual(result['result'], 'pass')
        self.assertEqual(result['criteria'], 76)
        self.assertEqual(result['archive_index_entries'], {'main': 1724, '21.x': 1763})
        self.assertFalse(result['product_or_audit_admission_claimed'])

    def test_modified_document_hash(self):
        p = self.root / 'PLAN.md'; p.write_text(p.read_text() + '\nchanged\n')
        self.reject(False)

    def test_unlisted_file(self):
        (self.root / 'unlisted.txt').write_text('untracked')
        self.reject(False)

    def test_missing_archive(self):
        (self.root / 'evidence/main-closure.zip').unlink()
        self.reject()

    def test_wrong_branch_source(self):
        self.change_json('baseline.json', lambda x: x['lines']['21.x'].update(commit=x['lines']['main']['commit']))
        self.reject()

    def test_wrong_artifact_bytes_identity(self):
        self.change_json('baseline.json', lambda x: x['lines']['main']['artifacts'][0].update(sha256='0'*64))
        self.reject()

    def test_wrong_internal_run(self):
        self.change_json('baseline.json', lambda x: x['lines']['main'].update(run_id='invented'))
        self.reject()

    def test_bad_archive_digest(self):
        self.change_json('baseline.json', lambda x: x['lines']['main'].update(archive_sha256='0'*64))
        self.reject()

    def test_forged_summary_sass_success(self):
        self.change_json('evidence/main-summary.json', lambda x: x['sass_api'].update(passed=651, pending=0))
        self.reject()

    def test_floor_claims_must_match_archived_execution(self):
        for line in ('main', '21x'):
            with self.subTest(line=line):
                name = f'evidence/{line}-summary.json'
                original = (self.root / name).read_text()
                self.change_json(name, lambda x: x['known_accepted_scope_limits']['consumer_floors'].update(
                    coverage='full', node_18_executed=True, process_node_used_for_floor=True))
                self.reject()
                (self.root / name).write_text(original)

    def test_packaged_cli_claim_must_match_archived_execution(self):
        for line in ('main', '21x'):
            with self.subTest(line=line):
                name = f'evidence/{line}-summary.json'
                original = (self.root / name).read_text()
                self.change_json(name, lambda x: x['known_accepted_scope_limits']['old_workspace_cli'].update(tarball_used=True))
                self.reject()
                (self.root / name).write_text(original)

    def test_m3_claims_must_match_archived_execution(self):
        for line, kind, rendered in [('main', 'workspace', False), ('21x', 'packed', True)]:
            with self.subTest(line=line):
                name = f'evidence/{line}-summary.json'
                original = (self.root / name).read_text()
                self.change_json(name, lambda x: x['known_accepted_scope_limits']['m3_example'].update(
                    source_kind=kind, rendered_present=rendered))
                self.reject()
                (self.root / name).write_text(original)

    def test_missing_audit_domain_task(self):
        self.change_json('plan-index.json', lambda x: x.update(tasks=[t for t in x['tasks'] if t['id'] != 'A10']))
        self.reject()

    def test_false_task_completion(self):
        self.change_json('plan-index.json', lambda x: x['tasks'][0].update(status='passed'))
        self.reject()

    def test_removed_gate_even_with_rehashed_references(self):
        self.change_json('reference/release-gates.json', lambda x: x.update(gates=[g for g in x['gates'] if g['id'] != 'G11']))
        h = v.digest((self.root/'reference/release-gates.json').read_bytes())
        self.change_json('reference/source-hashes.json', lambda x: x['sha256'].update({'release-gates.json': h}))
        self.change_json('baseline.json', lambda x: x['references'].update({'release-gates.json': h}))
        self.reject()

    def test_dropped_original_spec_even_with_rehashed_reference(self):
        p = self.root / 'reference/historical-paths.csv'
        rows = p.read_text().splitlines();p.write_text('\n'.join(rows[:-1])+'\n')
        h = v.digest(p.read_bytes())
        self.change_json('reference/source-hashes.json', lambda x: x['sha256'].update({'historical-paths.csv': h}))
        self.change_json('baseline.json', lambda x: x['references'].update({'historical-paths.csv': h}))
        self.reject()

    def test_deleted_complete_audit_section(self):
        p = self.root / 'AUDIT.md';p.write_text(p.read_text().replace('## A08 —', '## Missing —'))
        self.reject()

    def test_impossible_dependency_order(self):
        self.change_json('plan-index.json', lambda x: x['tasks'][0].update(after=['R03']))
        self.reject()

    def test_dangling_work_packet_rejected_even_when_rehashed(self):
        p = self.root / 'AGENT-PROMPT.md'
        p.write_text(p.read_text() + '\nRead the active work packet before proceeding.\n')
        self.reject()

    def test_missing_traceability_note_rejected(self):
        self.change_json('plan-index.json', lambda x: x.pop('traceability_note'))
        self.reject()

    def test_task_cannot_point_to_another_existing_document(self):
        self.change_json('plan-index.json', lambda x: x['tasks'][2].update(document='PLAN.md'))
        self.reject()

    def test_closeout_section_must_exist_locally(self):
        p = self.root / 'CLOSEOUT.md'
        p.write_text(p.read_text().replace('## C02 —', '## Missing —'))
        self.reject()

    def test_maintainer_objective_cannot_disappear(self):
        p = self.root / 'PLAN.md'
        text = p.read_text()
        start = text.index('## Maintainer model')
        end = text.index('## Preserve the product and workflow architecture', start)
        p.write_text(text[:start] + text[end:])
        self.reject()

    def test_context_transition_is_required(self):
        p = self.root / 'AUDIT.md'
        p.write_text(p.read_text().replace('## C05-to-audit context transition', '## Other guidance'))
        self.reject()

    def test_context_fallback_must_be_explicit(self):
        p = self.root / 'AUDIT.md'
        p.write_text(p.read_text().replace('`same-agent-explicit`', '`reviewed`', 1))
        self.reject()

    def test_no_preloaded_reasoning_rule_is_required(self):
        p = self.root / 'AUDIT.md'
        p.write_text(p.read_text().replace(
            'Do not preload the closeout conversation or implementation reasoning',
            'Preload the closeout completion narrative', 1))
        self.reject()

    def test_planning_cannot_claim_product_runs(self):
        self.change_json('baseline.json', lambda x: x.update(product_tests_run_in_planning=True))
        self.reject()

if __name__ == '__main__':
    unittest.main()
