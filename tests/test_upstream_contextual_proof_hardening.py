# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Production checker rejects unbound contextual evidence and wrong branch."""
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
import uuid

ROOT = Path(__file__).resolve().parents[1]


class ContextualProofHardeningTests(unittest.TestCase):
    def test_real_checker_rejects_context_and_dispatch_mutations(self):
        suffix = uuid.uuid4().hex
        member = ROOT / ('projects/ngx-material-legacy/legacy-menu/_proof_fixture_' + suffix + '.ts')
        review_path = ROOT / ('tests/_proof_review_' + suffix + '.json')
        try:
            raw = b'export const context = "original";\n'
            member.write_bytes(raw)
            ref = {'path': member.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(raw).hexdigest()}
            diff = 'diff --git a/fixture.ts b/fixture.ts\n--- a/fixture.ts\n+++ b/fixture.ts\n+new behavior\n'
            digest = hashlib.sha256(diff.encode()).hexdigest()
            sha = 'b' * 40
            proof = {'proof_kind': 'individual-contextual-source-review', 'source_conclusion_only': True,
                     'execution_claim': 'not-claimed', 'source_members': [ref], 'diff_sha256': digest,
                     'review_depth': 'individual-compatibility', 'affected_branches': ['main'],
                     'decision': 'The complete source review preserves the legacy contract and does not claim runtime execution.'}
            review = {'sha': sha, 'status': 'reviewed', 'diff': diff, 'diff_sha256': digest,
                      'source_conclusion_only': True, 'execution_claim': 'not-claimed', 'source_members': [ref],
                      'decision': proof['decision'], 'affected_branches': ['main'], 'final_disposition': 'do-not-adopt'}
            entry = {'sha': sha, 'bucket': 'behavior-semantic', 'subject': 'source-reviewed menu behavior',
                     'final_disposition': 'do-not-adopt', 'reason': proof['decision'], 'evidence_report': review_path.relative_to(ROOT).as_posix(),
                     'individual_proof': proof}
            with tempfile.TemporaryDirectory(prefix='context-proof-cli-') as temp:
                temp = Path(temp); seed = temp / 'seed.json'; ledger = temp / 'ledger.json'; report = temp / 'report.json'
                seed.write_text(json.dumps({'commits': [{'sha': sha}]}))
                def run(changed_entry, changed_review):
                    review_path.write_text(json.dumps(changed_review))
                    ledger.write_text(json.dumps({'g11_claim': 'not-passed', 'entries': [changed_entry]}))
                    result = subprocess.run(['node', 'scripts/check-upstream-audit-disposition.mjs', '--admission', '--line', 'main',
                                             '--seed', str(seed), '--ledger', str(ledger), '--report', str(report)],
                                            cwd=ROOT, capture_output=True, text=True, timeout=120)
                    self.assertTrue(report.is_file(), result.stderr)
                    return json.loads(report.read_text())
                self.assertEqual(run(entry, review)['insufficient_individual'], 0)
                adapted = copy.deepcopy(entry); adapted['final_disposition'] = 'already-adapted'
                adapted_review = copy.deepcopy(review); adapted_review['final_disposition'] = 'already-adapted'
                self.assertEqual(run(adapted, adapted_review)['insufficient_individual'], 0)
                generic, generic_review = copy.deepcopy(entry), copy.deepcopy(review)
                gp = generic['individual_proof']; gp['proof_kind'] = 'individual-complete-spec-source-applicability'
                gp.pop('source_members'); gp['source_evidence'] = [ref]; gp['source_evidence_scope'] = 'current'
                generic_review['individual_proof'] = copy.deepcopy(gp)
                self.assertEqual(run(generic, generic_review)['insufficient_individual'], 0)
                gr = copy.deepcopy(generic_review); gr['decision'] = 'Opposite conclusion'
                self.assertEqual(run(generic, gr)['insufficient_individual'], 1)
                gr = copy.deepcopy(generic_review); gr['affected_branches'] = ['21.x']
                self.assertEqual(run(generic, gr)['insufficient_individual'], 1)
                ambiguous, ambiguous_review = copy.deepcopy(generic), copy.deepcopy(generic_review)
                ambiguous['individual_proof'].pop('source_evidence_scope')
                ambiguous_review['individual_proof'] = copy.deepcopy(ambiguous['individual_proof'])
                self.assertEqual(run(ambiguous, ambiguous_review)['insufficient_individual'], 1)
                cases = []
                def add(name, change):
                    e, r = copy.deepcopy(entry), copy.deepcopy(review); change(e, r); cases.append((name, e, r))
                add('unknown kind', lambda e,r:e['individual_proof'].__setitem__('proof_kind', 'owned-menu-behavior'))
                add('missing kind', lambda e,r:e['individual_proof'].pop('proof_kind'))
                add('unknown source assertion', lambda e,r:e['individual_proof'].__setitem__('source_extra_claim', {'path': ref['path'], 'sha256': '0'*64}))
                add('nested source assertion', lambda e,r:e['individual_proof'].__setitem__('extra', {'source_members': [{'path': ref['path'], 'sha256': '0'*64}]}))
                def bogus(e,r):
                    e['individual_proof']['source_members'][0]['sha256']='0'*64
                    r['source_members'][0]['sha256']='0'*64
                add('bogus source', bogus)
                add('wrong branch', lambda e,r:e['individual_proof'].__setitem__('affected_branches', ['21.x']))
                add('review branch mismatch', lambda e,r:r.__setitem__('affected_branches', ['21.x']))
                add('review decision mismatch', lambda e,r:r.__setitem__('decision', 'Opposite conclusion'))
                add('entry reason mismatch', lambda e,r:e.__setitem__('reason', 'Opposite conclusion'))
                add('review disposition mismatch', lambda e,r:r.__setitem__('final_disposition', 'not-applicable'))
                def forged_metadata(e,r):
                    e['individual_proof']['source_members'][0]['semantic_claim']='unsupported'
                    r['source_members'][0]['semantic_claim']='unsupported'
                add('unvalidated source member metadata', forged_metadata)
                add('missing proof', lambda e,r:e.pop('individual_proof'))
                add('runtime claim', lambda e,r:e['individual_proof'].__setitem__('execution_claim', 'passed'))
                add('inherited claimed by context', lambda e,r:e.__setitem__('final_disposition', 'inherited'))
                def source_presence(e,r):
                    p=e['individual_proof'];p['proof_kind']='candidate-source-line-match';p['candidate_member']=ref
                    p['added_lines']=[{'upstream_added':'export const context', 'candidate_lines':[1]}]
                add('source presence only is not individual review', source_presence)
                def known_forgery(e,r):
                    e['individual_proof']['proof_kind']='individual-complete-spec-source-applicability'
                    e['individual_proof']['source_evidence']=[ref]
                add('known label without bound review', known_forgery)
                def nonbehavior(e,r):
                    e['bucket']='docs-build-batch-candidate';e['final_disposition']='not-applicable';e['individual_proof']['source_members'][0]['sha256']='0'*64
                add('explicit nonbehavior proof still validated', nonbehavior)
                def nonbehavior_missing_kind(e,r):
                    e['bucket']='docs-build-batch-candidate';e['final_disposition']='not-applicable';e['individual_proof'].pop('proof_kind')
                add('explicit nonbehavior proof requires kind', nonbehavior_missing_kind)
                for name, e, r in cases:
                    with self.subTest(name=name):
                        self.assertEqual(run(e,r)['insufficient_individual'], 1)
                member.write_bytes(b'export const context = "changed";\n')
                self.assertEqual(run(entry,review)['insufficient_individual'], 1)
        finally:
            member.unlink(missing_ok=True)
            review_path.unlink(missing_ok=True)


if __name__ == '__main__':
    unittest.main()
