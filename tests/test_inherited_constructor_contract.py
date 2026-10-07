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

    def test_untouched_material_constructor_members(self):
        folder=ROOT/'reference/material-16.2.14/material-inherited-constructors'
        provenance=json.loads((folder/'provenance.json').read_text())
        factory=json.loads((ROOT/'reference/material-16.2.14/factory-metadata.json').read_text())
        self.assertEqual(provenance['archive_sha256'],factory['tarball_sha256'])
        self.assertEqual([r['scope'] for r in provenance['members']],[['MatMenuItem'],['MatTabLabel','MatTabContent']])
        for record in provenance['members']:
            data=(folder/(record['archive_member'].split('/')[1]+'.d.ts')).read_bytes()
            self.assertEqual(len(data),record['bytes'])
            self.assertEqual(hashlib.sha256(data).hexdigest(),record['member_sha256'])

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
for(const [name,parent,parameters,signature] of [
 ['MatLegacyCellDef','CdkCellDef','template: TemplateRef<any>','public constructor(TemplateRef<any>)'],
 ['MatLegacyHeaderCellDef','CdkHeaderCellDef','template: TemplateRef<any>','public constructor(TemplateRef<any>)'],
 ['MatLegacyFooterCellDef','CdkFooterCellDef','template: TemplateRef<any>','public constructor(TemplateRef<any>)'],
 ['MatLegacyHeaderCell','CdkHeaderCell','columnDef: CdkColumnDef, elementRef: ElementRef','public constructor(CdkColumnDef,ElementRef)'],
 ['MatLegacyFooterCell','CdkFooterCell','columnDef: CdkColumnDef, elementRef: ElementRef','public constructor(CdkColumnDef,ElementRef)'],
 ['MatLegacyCell','CdkCell','columnDef: CdkColumnDef, elementRef: ElementRef','public constructor(CdkColumnDef,ElementRef)'],
 ['MatLegacyTextColumn','CdkTextColumn','table: CdkTable<T>, options: TextColumnOptions<T>','public constructor(CdkTable<T>,TextColumnOptions<T>)'],
]) {
 const original=originalInheritedConstructor('/original/src/material/legacy-table/cell.ts',name);
 assert.deepEqual(original.signatures,[signature]);
 const candidate=sf(`import {${parent}} from '@angular/cdk/table'; export declare class ${name}<T> extends ${parent}<T> {}`);
 const matching=packedInheritedConstructor(candidate,name,()=>sf(`export declare class ${parent}<T> {constructor(${parameters});}`));
 assert.deepEqual(matching.signatures,original.signatures);
 const missing=packedInheritedConstructor(candidate,name,()=>sf(`export declare class ${parent}<T> {}`));
 assert.deepEqual(missing.signatures,['public constructor()']);
 assert.notDeepEqual(missing.signatures,original.signatures);
 const wrong=packedInheritedConstructor(candidate,name,()=>sf(`export declare class ${parent}<T> {constructor(...args: unknown[]);}`));
 assert.notDeepEqual(wrong.signatures,original.signatures);
}
for(const [family,name,parent,spec,count,parameters] of [
 ['legacy-menu','MatLegacyMenuItem','MatMenuItem','@angular/material/menu',2,'elementRef: ElementRef<HTMLElement>, document: any, focusMonitor: FocusMonitor, parentMenu: MatMenuPanel<MatMenuItem> | undefined, changeDetectorRef: ChangeDetectorRef'],
 ['legacy-tabs','MatLegacyTabLabel','MatTabLabel','@angular/material/tabs',1,'templateRef: TemplateRef<any>, viewContainerRef: ViewContainerRef, closestTab: any'],
 ['legacy-tabs','MatLegacyTabContent','MatTabContent','@angular/material/tabs',1,'template: TemplateRef<any>'],
]) {
 const original=originalInheritedConstructor(`/original/src/material/${family}/fixture.ts`,name);
 assert.equal(original.parent,parent);assert.equal(original.signatures.length,count);
 const candidate=sf(`import {${parent} as PeerBase} from '${spec}'; export declare class ${name} extends PeerBase {}`);
 const declaration=`export declare class ${parent} {constructor(${parameters});${count===2?'constructor(elementRef: ElementRef<HTMLElement>, document?: any, focusMonitor?: FocusMonitor, parentMenu?: MatMenuPanel<MatMenuItem>, changeDetectorRef?: ChangeDetectorRef);':''}}`;
 const matching=packedInheritedConstructor(candidate,name,(requested)=>{assert.equal(requested,spec);return sf(declaration);});
 assert.deepEqual(matching.signatures,original.signatures);
 const missing=packedInheritedConstructor(candidate,name,()=>sf(`export declare class ${parent} {}`));
 assert.deepEqual(missing.signatures,['public constructor()']);
 assert.notDeepEqual(missing.signatures,original.signatures);
 const shadow=sf(`import {${parent}} from './shadow'; export declare class ${name} extends ${parent} {}`);
 assert.deepEqual(packedInheritedConstructor(shadow,name,()=>{throw Error('shadow public parent');}).signatures,['unresolved inherited constructor']);
 assert.equal(originalInheritedConstructor('/original/src/material/legacy-table/fixture.ts',name),null);
}
assert.equal(originalInheritedConstructor('/original/src/material/legacy-table/row.ts','Unknown'),null);
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr or result.stdout)
