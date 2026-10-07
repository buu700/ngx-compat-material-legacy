"""Review hashes must bind to actual patch bytes; markers cannot be individual proof."""
from pathlib import Path
import hashlib,json,shutil,subprocess,tempfile,unittest
ROOT=Path(__file__).resolve().parents[1]

class UpstreamPatchBinding(unittest.TestCase):
    def test_inline_archived_and_negative_patch_subjects(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'scripts').mkdir();(root/'evidence').mkdir()
            for name in ('check-upstream-audit-disposition.mjs','upstream-advisory-admission.mjs','authored-use-inventory.mjs'):
                shutil.copyfile(ROOT/'scripts'/name,root/'scripts'/name)
            sha='1'*40
            patch='diff --git a/doc.md b/doc.md\n--- a/doc.md\n+++ b/doc.md\n@@ -1 +1 @@\n-old\n+new\n'
            digest=hashlib.sha256(patch.encode()).hexdigest()
            proof={'diff_sha256':digest,'review_depth':'individual-compatibility','affected_branches':['main'],
                   'decision':'Complete original documentation hunk inspected; no executable or packaged source changes.'}
            row={'sha':sha,'bucket':'docs-build-batch-candidate','subject':'docs: a11y guidance','files':['doc.md'],
                 'final_disposition':'not-applicable','reason':proof['decision'],'affected_branches':['main'],
                 'evidence_report':'evidence/review.json','individual_proof':proof}
            def write(name,body):(root/name).write_text(json.dumps(body))
            write('seed.json',{'commits':[{'sha':sha}]})
            reference=ROOT/'compatibility/f10/authored-dependency-inventory-seed.json'
            (root/'compatibility/f10').mkdir(parents=True)
            shutil.copyfile(reference,root/'compatibility/f10/authored-dependency-inventory-seed.json')
            write('symbols.json',{'status':'closed','symbol_uses':[{**row,'disposition':'closed','status':'reviewed'} for row in json.loads(reference.read_text())['symbol_uses']]})
            write('ledger.json',{'g11_claim':'not-passed','entries':[row]})
            def check(body,ok):
                write('evidence/review.json',body)
                result=subprocess.run(['node',str(root/'scripts/check-upstream-audit-disposition.mjs'),
                    '--seed',str(root/'seed.json'),'--ledger',str(root/'ledger.json'),
                    '--symbols',str(root/'symbols.json'),'--report',str(root/'report.json'),
                    '--admission','--line','main'],text=True,capture_output=True)
                data=json.loads(result.stdout)
                self.assertEqual(result.returncode==0,ok,result.stderr)
                self.assertEqual(data['insufficient_sensitive'],0 if ok else 1)
            good={'sha':sha,'diff_sha256':digest,'diff':patch}
            check(good,True)
            for body in ({**good,'diff':patch+'+tampered\n'},{**good,'diff_sha256':'b'*64},
                         {'sha':sha,'diff_sha256':digest},{**good,'sha':'2'*40}):
                check(body,False)
            (root/'evidence/original.patch').write_text(patch)
            archived={'sha':sha,'diff_sha256':digest,'patch_file':'evidence/original.patch'}
            check(archived,True)
            (root/'evidence/original.patch').write_text(patch+'+tampered\n');check(archived,False)
            for path in ('evidence/missing.patch','../outside.patch','/outside.patch','evidence/../original.patch'):
                check({**archived,'patch_file':path},False)
            (root/'evidence/linked.patch').symlink_to(root/'evidence/original.patch')
            check({**archived,'patch_file':'evidence/linked.patch'},False)
            (root/'linked').symlink_to(root/'evidence',target_is_directory=True)
            check({**archived,'patch_file':'linked/original.patch'},False)
