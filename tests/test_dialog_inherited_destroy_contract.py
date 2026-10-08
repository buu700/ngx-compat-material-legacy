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
import {originalInheritedDialogDestroy,originalInheritedDialogContract,diParamsOf,deriveSurface,packedShape,compareSignatures,loadDifferences} from './scripts/api-surface.mjs';
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
assert.throws(()=>originalInheritedDialogContract(file,'_MatDialogContainerBase',original,
 path=>path.endsWith('cdk-portal.d.ts')?Buffer.from('changed portal'):readFileSync(path)),/portal member identity mismatch/);
let reads=0;
assert.throws(()=>originalInheritedDialogContract(file,'_MatDialogContainerBase',original,
 path=>path.endsWith('cdk-dialog.d.ts')&&++reads===2?Buffer.from('changed second read'):readFileSync(path)),/member identity mismatch/);
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
 const shape=(text,name='_MatDialogContainerBase')=>packedShape(ts.createSourceFile('candidate.ts',text,ts.ScriptTarget.Latest,true),name);
 const candidate=shape(candidateRaw),differences=loadDifferences();
 const inherited=originalInheritedDialogContract(file,'_MatDialogContainerBase',original);
 assert.equal(inherited.signatures.length,16);
 assert.ok(inherited.signatures.includes('public readonly prop _config:MatDialogConfig'));
 assert.ok(symbol.shape.signatures.includes('protected prop _document:Document'));
 assert.ok(symbol.shape.signatures.includes('public method attachTemplatePortal<T>(TemplatePortal<T>):EmbeddedViewRef<T>'));
 assert.ok(candidate.signatures.includes(symbol.shape.signatures.find(s=>s.includes(' constructor('))));
 assert.equal(candidate.publicPortalParent,true);
 for(const version of ['21.2.14','22.1.7']) {
  const path=`compatibility/rc/dialog-public-container-peer-sources/cdk-${version}-_portal-directives-chunk.d.ts`;
  const peer=shape(readFileSync(path,'utf8'),'BasePortalOutlet');
  assert.deepEqual(peer.signatures.filter(s=>!s.includes('static ')).sort(),[...inherited.ancestor_signatures].sort());
 }

 const current=compareSignatures(symbol,candidate,differences);
 const wrongParent={...candidate,publicPortalParent:false};
 for(const name of ['detach():void','dispose():void','hasAttached():boolean'])
  assert.ok(compareSignatures(symbol,wrongParent,differences).blocking.includes('public method '+name));
 // Exact original signatures are restored. Authentic inheritance is evidence,
 // not permission to add a waiver or to claim the entire API has passed.
 assert.deepEqual(current.blocking,[]);
 for(const added of ['public method _addAriaLabelledBy(string):void','public method _removeAriaLabelledBy(string):void','public readonly prop _focusTrapped:Observable<void>']) {
  const extra={...candidate,signatures:candidate.signatures.concat(added),ownSignatures:candidate.ownSignatures.concat(added)};
  assert.ok(compareSignatures(symbol,extra,differences).blocking.includes(added));
 }
 const wrongFocus=shape(candidateRaw.replace('protected _trapFocus(): void','protected _trapFocus(options?: FocusOptions): void'));
 assert.ok(compareSignatures(symbol,wrongFocus,differences).blocking.includes('protected method _trapFocus():void'));
 assert.ok(!current.blocking.includes('public method ngOnDestroy():void'));
 const ctor=source=>source.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='_MatDialogContainerBase');
 const actualSource=ts.createSourceFile('candidate.ts',candidateRaw,ts.ScriptTarget.Latest,true);
 const oldDI=diParamsOf(ctor(original),original),newDI=diParamsOf(ctor(actualSource),actualSource);
 assert.deepEqual(newDI.map(p=>[p.ident,p.optional]),oldDI.map(p=>[p.ident,p.optional]));
 assert.equal(newDI.length,8);assert.equal(newDI[2].spec,'@angular/core');
 assert.equal(newDI[7].optional,false);
 const noConfig={...candidate,signatures:candidate.signatures.filter(s=>!s.includes('prop _config:')),
  ownSignatures:candidate.ownSignatures.filter(s=>!s.includes('prop _config:'))};
 assert.ok(compareSignatures(symbol,noConfig,differences).blocking.includes('public readonly prop _config:MatDialogConfig'));

 for(const signature of ['public method ngOnDestroy(string):void','public method ngOnDestroy():boolean',
    'protected method ngOnDestroy():void','public method madeUp():void']){
  const bad={...candidate,signatures:candidate.signatures.filter(s=>!s.includes('method ngOnDestroy(')).concat(signature),
   ownSignatures:candidate.ownSignatures.filter(s=>!s.includes('method ngOnDestroy(')).concat(signature)};
  assert.ok(compareSignatures(symbol,bad,differences).blocking.includes(signature));
 }
 const noProof={...symbol,shape:{...symbol.shape,inheritedDialogDestroy:null,inheritedDialogContract:null,signatures:symbol.shape.ownSignatures}};
 assert.ok(compareSignatures(noProof,candidate,differences).blocking.includes('public method ngOnDestroy():void'));
} finally {rmSync(scratch,{recursive:true,force:true});}
"""
        result = subprocess.run(['node', '--input-type=module', '-e', script],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
