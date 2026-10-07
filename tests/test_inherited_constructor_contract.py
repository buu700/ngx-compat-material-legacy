"""Unchanged base names cannot hide an inherited public constructor change."""
from pathlib import Path
import hashlib,json,subprocess,unittest
ROOT=Path(__file__).resolve().parents[1]
def typescript_available():
    return subprocess.run(['node','-e',"require('typescript')"],cwd=ROOT,capture_output=True).returncode==0
class InheritedConstructorContracts(unittest.TestCase):
    def test_untouched_reference_member_and_archive(self):
        folder=ROOT/'reference/material-16.2.14/cdk-inherited-constructors'
        provenance=json.loads((folder/'provenance.json').read_text())
        self.assertEqual(hashlib.sha256((folder/'table.d.ts').read_bytes()).hexdigest(),provenance['member_sha256'])
        factory=json.loads((ROOT/'reference/material-16.2.14/cdk-factory-metadata.json').read_text())
        self.assertEqual(provenance['archive_sha256'],factory['tarball_sha256'])
        self.assertEqual(provenance['scope'],['CdkHeaderRowDef','CdkFooterRowDef','CdkRowDef'])

    @unittest.skipUnless(typescript_available(),'typescript is not installed')
    def test_authenticated_signature_same_base_changes_and_shadow_rejection(self):
        code=r'''
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {originalInheritedConstructor,packedInheritedConstructor,compareSignatures,shapeProblems} from './scripts/api-surface.mjs';
const ts=createRequire(import.meta.url)('typescript');
const sf=text=>ts.createSourceFile('fixture.d.ts',text,ts.ScriptTarget.Latest,true);
for(const [name,parent] of [['MatLegacyHeaderRowDef','CdkHeaderRowDef'],['MatLegacyFooterRowDef','CdkFooterRowDef'],['MatLegacyRowDef','CdkRowDef']]){
 const original=originalInheritedConstructor('/original/src/material/legacy-table/row.ts',name);
 assert.deepEqual(original.signatures,['public constructor(TemplateRef<any>,IterableDiffers,any?)']);
 const candidate=sf(`import {${parent} as PeerBase} from '@angular/cdk/table'; export declare class ${name} extends PeerBase {}`);
 const expected=`export declare class ${parent} {constructor(template: TemplateRef<any>, _differs: IterableDiffers, _table?: any);}`;
 const match=packedInheritedConstructor(candidate,name,(spec)=>{assert.equal(spec,'@angular/cdk/table');return sf(expected);});
 assert.deepEqual(match.signatures,original.signatures);
 const historical={kind:'class',comparison:'signature',signatures:original.signatures,ownSignatures:[],ownConstructor:false,requiredConstructor:true,requiredProtected:[],heritage:['PeerBase'],inheritedConstructor:original};
 const symbol={symbol_id:`legacy-table/primary/${name}`,shape:historical};
 const shape=observed=>({...historical,signatures:observed.signatures,requiredConstructor:false,inheritedConstructor:observed});
 assert.deepEqual(compareSignatures(symbol,shape(match),[]).blocking,[]);
 assert.deepEqual(shapeProblems(compareSignatures(symbol,shape(match),[])),[]);
 for(const text of [`export declare class ${parent} {}`,`export declare class ${parent} {constructor(...args: unknown[]);}`,`export declare class ${parent} {constructor(template: TemplateRef<any>, _differs: IterableDiffers);}`]){
  const observed=packedInheritedConstructor(candidate,name,()=>sf(text));
  assert.ok(compareSignatures(symbol,shape(observed),[]).blocking.length);
 }
 for(const text of [`declare class ${parent} {constructor(template: TemplateRef<any>, _differs: IterableDiffers, _table?: any);} export declare class ${name} extends ${parent} {}`,`import {${parent}} from './shadow'; export declare class ${name} extends ${parent} {}`]){
  const observed=packedInheritedConstructor(sf(text),name,()=>{throw Error('shadow must not resolve as public CDK');});
  assert.deepEqual(observed.signatures,['unresolved inherited constructor']);
 }
 assert.equal(originalInheritedConstructor('/other/table.ts',name),null);
}
assert.equal(originalInheritedConstructor('/original/src/material/legacy-table/row.ts','Unknown'),null);
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr or result.stdout)
