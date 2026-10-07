"""Object-return constructor adapters must not silently skip owned fields."""
from pathlib import Path
import subprocess,unittest
ROOT=Path(__file__).resolve().parents[1]
def typescript_available():
    return subprocess.run(['node','-e',"require('typescript')"],cwd=ROOT,capture_output=True).returncode==0
class ConstructorReturnFields(unittest.TestCase):
    @unittest.skipUnless(typescript_available(),'typescript is not installed')
    def test_all_actual_adapter_classes_and_emitted_field_negatives(self):
        code=r"""
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
function fields(clazz){return clazz.members.filter(member=>
 ts.isPropertyDeclaration(member)&&!(ts.getCombinedModifierFlags(member)&(ts.ModifierFlags.Static|ts.ModifierFlags.Ambient))
 ||ts.isConstructorDeclaration(member)&&member.parameters.some(p=>ts.getCombinedModifierFlags(p)&ts.ModifierFlags.ParameterPropertyModifier));}
const expected=new Set(['MatLegacyCellDef','MatLegacyHeaderCellDef','MatLegacyFooterCellDef','MatLegacyCell','MatLegacyHeaderCell','MatLegacyFooterCell','MatLegacyTextColumn','MatLegacyTabContent']);
for(const file of ['legacy-table/cell.ts','legacy-table/text-column.ts','legacy-tabs/tab-content.ts']){
 const source=ts.createSourceFile(file,readFileSync('projects/ngx-material-legacy/'+file,'utf8'),ts.ScriptTarget.Latest,true);
 for(const clazz of source.statements.filter(ts.isClassDeclaration)){
  if(!clazz.name||!expected.has(clazz.name.text))continue;
  assert.equal(fields(clazz).length,0,clazz.name.text+' has skipped instance initialization');
  expected.delete(clazz.name.text);
 }
}
assert.equal(expected.size,0,'every adapter class must be examined');
for(const member of ['field=1;','field!:number;','constructor(public field:number){}','constructor(readonly field:number){}']){
 const source=ts.createSourceFile('negative.ts','class Candidate {'+member+'}',ts.ScriptTarget.Latest,true);
 assert.ok(fields(source.statements[0]).length,member);
}
const erased=ts.createSourceFile('erased.ts','class Candidate {declare field:number;static field2=1;}',ts.ScriptTarget.Latest,true);
assert.equal(fields(erased.statements[0]).length,0);
// Native ECMAScript demonstrates the actual hazard, independent of the AST rule.
class Parent {constructor(){this.parentField=1;}}
class Child extends Parent {skippedField=2;constructor(){return Reflect.construct(Parent,[],new.target);}}
const child=new Child();assert.equal(child.parentField,1);assert.equal(child.skippedField,undefined);
assert.ok(child instanceof Child&&child instanceof Parent);
"""
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
