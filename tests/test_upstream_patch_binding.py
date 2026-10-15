# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Review hashes bind to actual patch bytes; fixture labels cannot qualify G11."""
from pathlib import Path
import hashlib,json,shutil,subprocess,tempfile,unittest
ROOT=Path(__file__).resolve().parents[1]

class UpstreamPatchBinding(unittest.TestCase):
    def test_inline_archived_and_negative_patch_subjects(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'scripts').mkdir();(root/'evidence').mkdir()
            # Discover imports with the existing TS parser. The checker and each
            # transitive helper run unchanged, rather than a rewritten fixture.
            copy_source = r'''
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript'),[source,target]=process.argv.slice(1),seen=new Set();
function copy(file){
 assert.ok(file.startsWith(source+'/scripts/'));if(seen.has(file))return;seen.add(file);
 const bytes=readFileSync(file),destination=resolve(target,relative(source,file));
 mkdirSync(dirname(destination),{recursive:true});writeFileSync(destination,bytes);
 assert.deepEqual(readFileSync(destination),bytes);
 const sf=ts.createSourceFile(file,bytes.toString(),ts.ScriptTarget.Latest,true);assert.equal(sf.parseDiagnostics.length,0);
 for(const node of sf.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier?.text.startsWith('.'))
  copy(resolve(dirname(file),node.moduleSpecifier.text));
}
copy(resolve(source,'scripts/check-upstream-audit-disposition.mjs'));assert.ok(seen.size>4);
'''
            copied=subprocess.run(['node','--input-type=module','-e',copy_source,str(ROOT),str(root)],
                                  cwd=ROOT,text=True,capture_output=True)
            self.assertEqual(copied.returncode,0,copied.stdout+copied.stderr)
            product=root/'projects/ngx-material-legacy';product.mkdir(parents=True)
            (product/'fixture.ts').write_text('// Synthetic patch-validator discovery input; no real peer API.\n')
            line='21.x' if json.loads((ROOT/'projects/ngx-material-legacy/package.json').read_text())['version'].startswith('21.') else 'main'
            sha='1'*40
            patch='diff --git a/doc.md b/doc.md\n--- a/doc.md\n+++ b/doc.md\n@@ -1 +1 @@\n-old\n+new\n'
            digest=hashlib.sha256(patch.encode()).hexdigest()
            proof={'diff_sha256':digest,'review_depth':'individual-compatibility','affected_branches':[line],
                   'decision':'Complete original documentation hunk inspected; no executable or packaged source changes.'}
            row={'sha':sha,'bucket':'docs-build-batch-candidate','subject':'docs: a11y guidance','files':['doc.md'],
                 'final_disposition':'not-applicable','reason':proof['decision'],'affected_branches':[line],
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
                    '--admission','--line',line],cwd=root,text=True,capture_output=True)
                self.assertTrue(result.stdout,result.stderr)
                data=json.loads(result.stdout)
                # This fixture isolates patch proof. Its closed authored-use labels
                # deliberately have no source reviews, so whole admission fails.
                self.assertNotEqual(result.returncode,0,result.stderr)
                self.assertEqual(data['disposition_admission'],'incomplete')
                self.assertEqual(data['authored_use_review_evidence']['insufficient'],1736)
                self.assertEqual(data['insufficient_sensitive'],0 if ok else 1)
                self.assertEqual(data['g11_claim'],'not-passed')
                self.assertEqual(data['current_authored_use_inventory']['current_source_files'],1)
                self.assertEqual(data['current_authored_use_inventory']['additional_uses'],0)
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
