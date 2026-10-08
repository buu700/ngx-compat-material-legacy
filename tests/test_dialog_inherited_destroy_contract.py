"""The original inherited dialog destroy method cannot become a name-only waiver."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


def typescript_available():
    return subprocess.run(['node', '-e', "require('typescript')"], cwd=ROOT, capture_output=True).returncode == 0


class DialogInheritedDestroyContractTests(unittest.TestCase):
    @unittest.skipUnless(typescript_available(), 'TypeScript unavailable; inherited method review not executed')
    def test_real_derivation_exact_override_and_negative_shapes(self):
        script = r"""
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {originalInheritedDialogDestroy,deriveSurface,packedShape,compareSignatures,loadDifferences} from './scripts/api-surface.mjs';
const ts=createRequire(import.meta.url)('typescript');
const raw=readFileSync('reference/material-16.2.14/dialog-focus-sources/material-dialog-container.ts','utf8');
const original=ts.createSourceFile('original.ts',raw,ts.ScriptTarget.Latest,true);
const file='/original/src/material/dialog/dialog-container.ts';
const model=originalInheritedDialogDestroy(file,'_MatDialogContainerBase',original);
assert.deepEqual(model.signatures,['public method ngOnDestroy():void']);
assert.equal(originalInheritedDialogDestroy('/other/dialog-container.ts','_MatDialogContainerBase',original),null);
assert.equal(originalInheritedDialogDestroy(file,'DifferentClass',original),null);
assert.throws(()=>originalInheritedDialogDestroy(file,'_MatDialogContainerBase',
 ts.createSourceFile('changed.ts',raw+'\n// changed subject',ts.ScriptTarget.Latest,true)),/source identity mismatch/);
assert.throws(()=>originalInheritedDialogDestroy(file,'_MatDialogContainerBase',original,
 ()=>Buffer.from('tampered original declaration')),/member identity mismatch/);
const scratch=mkdtempSync(join(tmpdir(),'dialog-inherited-api-'));
try {
 const root=join(scratch,'src/material');
 mkdirSync(join(root,'legacy-dialog'),{recursive:true});mkdirSync(join(root,'dialog'),{recursive:true});
 // A one-export fixture exercises the actual derivation path with the complete
 // authentic original class file. It is not a full legacy API baseline.
 writeFileSync(join(root,'dialog/dialog-container.ts'),raw);
 writeFileSync(join(root,'legacy-dialog/public-api.ts'),
  "export {_MatDialogContainerBase as _MatLegacyDialogContainerBase} from '../dialog/dialog-container';\n");
 const surface=deriveSurface(root);assert.equal(surface.symbols.length,1);
 const symbol=surface.symbols[0];assert.deepEqual(symbol.shape.inheritedDialogDestroy,model);
 const candidateRaw=readFileSync('projects/ngx-material-legacy/legacy-dialog/internal/dialog-container-base.ts','utf8');
 const shape=text=>packedShape(ts.createSourceFile('candidate.ts',text,ts.ScriptTarget.Latest,true),'_MatDialogContainerBase');
 const candidate=shape(candidateRaw),differences=loadDifferences();
 assert.deepEqual(compareSignatures(symbol,candidate,differences).blocking,[]);
 for(const signature of ['public method ngOnDestroy(string):void','public method ngOnDestroy():boolean',
    'protected method ngOnDestroy():void','public method madeUp():void']){
  const bad={...candidate,signatures:candidate.signatures.filter(s=>!s.includes('method ngOnDestroy(')).concat(signature),
   ownSignatures:candidate.ownSignatures.filter(s=>!s.includes('method ngOnDestroy(')).concat(signature)};
  assert.ok(compareSignatures(symbol,bad,differences).blocking.includes(signature));
 }
 const noProof={...symbol,shape:{...symbol.shape,inheritedDialogDestroy:null}};
 assert.ok(compareSignatures(noProof,candidate,differences).blocking.includes('public method ngOnDestroy():void'));
} finally {rmSync(scratch,{recursive:true,force:true});}
"""
        result = subprocess.run(['node', '--input-type=module', '-e', script],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
