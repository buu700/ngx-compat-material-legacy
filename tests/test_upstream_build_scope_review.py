"""Finite complete-patch build applicability; this cannot pass the full audit."""
import json
import copy
import hashlib
from pathlib import Path
import subprocess
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]

class UpstreamBuildScopeTests(unittest.TestCase):
    def test_actual_checker_cannot_bypass_scope_by_relabelling_report(self):
        sha='5373ced467ba58315abf22bc96c0c24583467776'
        source=json.loads((ROOT/'compatibility/f10/upstream-sha-risk-bootstrap.json').read_text())
        source['commits']=[row for row in source['commits'] if row['sha']==sha];self.assertEqual(len(source['commits']),1)
        ledger=json.loads((ROOT/'compatibility/f10/disposition-ledger/ledger.json').read_text())
        entry=next(row for row in ledger['entries'] if row['sha']==sha)
        original=json.loads((ROOT/entry['evidence_report']).read_text())
        with tempfile.TemporaryDirectory(prefix='build-scope-checker-',dir=ROOT/'compatibility/rc/reports') as tmp:
            directory=Path(tmp);seed=directory/'seed.json';seed.write_text(json.dumps(source))
            for mutation in ('complete','omitted-role-and-batch','per-sha-narrative-substitute'):
                report=copy.deepcopy(original);row=copy.deepcopy(entry)
                if mutation=='omitted-role-and-batch':report.pop('role');row.pop('batch_id')
                elif mutation=='per-sha-narrative-substitute':report={'sha':sha,'decision':entry['reason']};row.pop('batch_id')
                path=directory/(mutation+'.json');raw=json.dumps(report).encode();path.write_bytes(raw)
                row['evidence_report']=path.relative_to(ROOT).as_posix();row['source_check']['evidence_report_sha256']=hashlib.sha256(raw).hexdigest()
                body=dict(ledger,entries=[row]);subject=directory/'ledger.json';subject.write_text(json.dumps(body))
                result=subprocess.run(['node','scripts/check-upstream-audit-disposition.mjs','--seed',str(seed),'--ledger',str(subject),'--report',str(directory/'observation.json'),'--admission','--line',original['line']],cwd=ROOT,capture_output=True,text=True)
                self.assertNotEqual(result.returncode,0,result.stdout+result.stderr)
                observation=json.loads(result.stdout)
                self.assertEqual(observation['missing_evidence'],0 if mutation=='complete' else 1,mutation)
                self.assertEqual(observation['g11_claim'],'not-passed')

    def test_complete_original_patches_and_candidate_context_are_bound(self):
        result=subprocess.run(['node','tests/upstream_build_scope_probe.mjs'],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        observation=json.loads(result.stdout)
        self.assertEqual(observation['cases'],14)
        self.assertEqual(observation['negative_controls'],20)
        self.assertEqual(observation['canonical_path_memberships'],1020)
